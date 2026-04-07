import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'

// 兼容本地把密钥写入 `.env.local` 的常见约定
dotenv.config({ path: ['.env.local', '.env'] })

const app = express()
const port = process.env.PORT ? Number(process.env.PORT) : 3001

app.use(cors())
app.use(express.json({ limit: '2mb' }))

function sortAsc(arr) {
  return [...arr].sort((a, b) => a - b)
}

function compare(a, b) {
  if (a > b) return 'win'
  if (a < b) return 'lose'
  return 'draw'
}

function scoreOf(result) {
  if (result === 'win') return 200
  if (result === 'lose') return -200
  return 0
}

/**
 * 与前端 RaceSimulator 保持一致：输出总银币（win=+200, lose=-200, draw=0）
 */
function greedyRaceMoney(tianjiArr, qiArr) {
  const t = sortAsc(tianjiArr)
  const q = sortAsc(qiArr)

  let i = 0
  let j = t.length - 1
  let k = 0
  let l = q.length - 1

  let money = 0

  for (let round = 0; round < t.length; round++) {
    const tStrong = t[j]
    const tWeak = t[i]
    const qStrong = q[l]
    const qWeak = q[k]

    if (tStrong > qStrong) {
      money += 200
      j--
      l--
    } else if (tWeak > qWeak) {
      money += 200
      i++
      k++
    } else {
      const res = compare(tWeak, qStrong)
      money += scoreOf(res)
      i++
      l--
    }
  }

  return money
}

function makeStdin(tianji, qi) {
  const n = tianji.length
  return `${n}\n${tianji.join(' ')}\n${qi.join(' ')}\n`
}

function base64Encode(s) {
  return Buffer.from(String(s), 'utf8').toString('base64')
}
function base64Decode(s) {
  return Buffer.from(String(s), 'base64').toString('utf8')
}

function normalizeOpenAiApiKey(raw) {
  const k = String(raw ?? '').trim()
  if (k.startsWith('deepseeksk-')) return k.slice('deepseek'.length)
  const lastSk = k.lastIndexOf('sk-')
  if (lastSk >= 0 && !k.startsWith('sk-')) return k.slice(lastSk)
  return k
}

/**
 * 走 OpenAI 兼容的 Chat Completions。本仓库默认 DeepSeek；用官方 OpenAI 时设置：
 * OPENAI_BASE_URL=https://api.openai.com/v1  OPENAI_MODEL=gpt-4o-mini
 */
function llmEndpointConfig() {
  const rawBase = String(process.env.OPENAI_BASE_URL ?? process.env.DEEPSEEK_API_BASE ?? '').trim()
  // DeepSeek 官方示例为 https://api.deepseek.com/chat/completions；OpenAI 为 …/v1/chat/completions
  const baseUrl = (rawBase || 'https://api.deepseek.com').replace(/\/$/, '')
  const modelRaw = String(process.env.OPENAI_MODEL ?? process.env.DEEPSEEK_MODEL ?? '').trim()
  const model = modelRaw || 'deepseek-chat'
  return { baseUrl, model }
}

const judge0BaseUrl = process.env.JUDGE0_BASE_URL // e.g. http://localhost:2358 or https://ce.judge0.com

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function judge0RunOne({ languageId, sourceCode, stdin, timeoutMs = 15000 }) {
  if (!judge0BaseUrl) {
    throw new Error('JUDGE0_BASE_URL 未配置')
  }

  const submitUrl = `${judge0BaseUrl.replace(/\/$/, '')}/submissions?base64_encoded=true&wait=false`

  const submissionPayload = {
    source_code: base64Encode(sourceCode),
    language_id: languageId,
    stdin: base64Encode(stdin),
    redirect_stderr_to_stdout: true,
  }

  const submitResp = await fetch(submitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionPayload),
  })

  if (!submitResp.ok) {
    const text = await submitResp.text()
    throw new Error(`Judge0 submit failed: ${submitResp.status} ${text}`)
  }

  const { token } = await submitResp.json()
  if (!token) throw new Error('Judge0 did not return token')

  const pollUrl = `${judge0BaseUrl.replace(/\/$/, '')}/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,exit_code`

  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pollResp = await fetch(pollUrl)
    if (!pollResp.ok) {
      const text = await pollResp.text()
      throw new Error(`Judge0 poll failed: ${pollResp.status} ${text}`)
    }

    const data = await pollResp.json()
    const statusId = data?.status?.id ?? data?.status
    if (statusId && statusId !== 1 && statusId !== 2) {
      // 1=In Queue, 2=Processing, 3=Accepted ...
      const stdout = data.stdout ? base64Decode(data.stdout) : ''
      const compileOutput = data.compile_output ? base64Decode(data.compile_output) : ''
      const stderr = data.stderr ? base64Decode(data.stderr) : ''
      return { statusId, stdout, stderr, compileOutput, exitCode: data.exit_code }
    }

    await sleep(400)
  }

  throw new Error('Judge0 timeout')
}

app.post('/api/judge0/run', async (req, res) => {
  try {
    const body = req.body ?? {}
    const languageId = Number(body.languageId ?? 50)
    const sourceCode = String(body.sourceCode ?? '')
    const testcases = Array.isArray(body.testcases) ? body.testcases : []

    if (!sourceCode.trim()) {
      return res.status(400).json({ ok: false, message: 'sourceCode 不能为空' })
    }
    if (testcases.length === 0) {
      return res.status(400).json({ ok: false, message: 'testcases 不能为空' })
    }

    const results = []
    for (let i = 0; i < testcases.length; i++) {
      const tc = testcases[i]
      const tianji = Array.isArray(tc.tianji) ? tc.tianji.map(Number) : []
      const qi = Array.isArray(tc.qi) ? tc.qi.map(Number) : []

      const expectedOutput = greedyRaceMoney(tianji, qi)
      const stdin = makeStdin(tianji, qi)

      const run = await judge0RunOne({ languageId, sourceCode, stdin })
      const actual = run.stdout.trim()
      const passed = actual === String(expectedOutput)

      results.push({
        testIndex: i,
        stdin,
        expectedOutput,
        actualOutput: actual,
        passed,
        statusId: run.statusId,
        compileOutput: run.compileOutput,
        exitCode: run.exitCode,
      })
    }

    const passedCount = results.filter((r) => r.passed).length
    res.json({
      ok: true,
      overall: passedCount === results.length,
      passedCount,
      total: results.length,
      results,
    })
  } catch (err) {
    res.status(500).json({ ok: false, message: err?.message ?? String(err) })
  }
})

app.post('/api/ai/hints', async (req, res) => {
  try {
    const body = req.body ?? {}
    const level = Number(body.level ?? 1)
    const problemTitle = String(body.problemTitle ?? '田忌赛马')
    const problemStatement = String(body.problemStatement ?? '')
    const userCode = String(body.userCode ?? '')

    // 无密钥时提供可用的“离线提示”（保证演示可跑）
    const offlineHints = {
      1: `提示（思路）：\n1) 将田忌、齐王的战力分别按升序排序；\n2) 使用“双指针”构造每一轮田忌出场选择：尽量用更强/更弱的马去对抗对应的齐王马。\n3) 逐场比较胜负并累计银币，记录每一步的决策理由。`,
      2: `提示（贪心关键点）：\n- 若田忌“最强”能赢齐王“最强”，就用最强对最强（保证这一轮赢）。\n- 否则，如果田忌“最弱”能赢齐王“最弱”，就用最弱对最弱（以最小代价拿分）。\n- 否则用“最弱”去对“最强”（主动亏一场，保留强马争取后续胜场）。\n- 每轮更新指针：双指针向内收缩。`,
      3: `提示（参考答案方向）：\n1) sort(tianji), sort(qi)\n2) i/j 指向 tianji 的最左/最右；k/l 指向 qi 的最左/最右\n3) 循环 n 次：\n   - 若 tianji[j] > qi[l]：用 tianji[j] vs qi[l]，赢，j--, l--\n   - 否则若 tianji[i] > qi[k]：用 tianji[i] vs qi[k]，赢，i++, k++\n   - 否则：用 tianji[i] vs qi[l]，比较胜负（多为输，可能平），i++, l--\n4) 累计 money 输出即可。\n（你可以把每轮的选择加入 steps[]，用于页面回放。）`,
    }

    const hintText = offlineHints[level] ?? offlineHints[1]

    const apiKey = normalizeOpenAiApiKey(process.env.OPENAI_API_KEY)
    if (!apiKey) {
      return res.json({ ok: true, level, hint: hintText, provider: 'offline' })
    }

    const { baseUrl, model } = llmEndpointConfig()
    const messages = [
      {
        role: 'system',
        content:
          '你是教学助手。请给出分级提示：不要直接给出完整可复制的代码；可以解释思路、关键决策与必要的伪代码。',
      },
      {
        role: 'user',
        content: `题目：${problemTitle}\n\n题干摘要：${problemStatement}\n\n用户代码（可能不完整，仅用于理解）：\n${userCode}\n\n需要提示等级：${level}\n请输出中文提示文本。`,
      },
    ]

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
      }),
    })

    if (!resp.ok) {
      // 保底：避免前端提示功能完全不可用（演示优先）
      const text = await resp.text().catch(() => '')
      return res.json({
        ok: true,
        level,
        hint: hintText,
        provider: 'offline',
        llmError: text ? String(text).slice(0, 400) : undefined,
      })
    }

    const data = await resp.json()
    const content = data?.choices?.[0]?.message?.content ?? ''

    return res.json({
      ok: true,
      level,
      hint: content || hintText,
      provider: baseUrl.includes('deepseek') ? 'deepseek' : 'openai-compatible',
    })
  } catch (err) {
    res.status(500).json({ ok: false, message: err?.message ?? String(err) })
  }
})

app.post('/api/ai/home', async (req, res) => {
  try {
    const body = req.body ?? {}
    const rawMessages = Array.isArray(body.messages) ? body.messages : []
    const trimmed = rawMessages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: String(m.content ?? '').slice(0, 8000),
      }))

    const systemContent = `你是「策算学堂 StratAlgo Academy」微课教学平台首页的智能学习向导。
站点参加全国大学生计算机设计大赛·微课与 AI 辅助教学赛道，以《田忌赛马的算法密码：从古代兵法到贪心策略》等微课为核心，提供：微课视频、虚拟仿真实验（可调参对战与策略对比）、课件资料、编程练习与自动判题、学生反馈与可视化等。
请用简洁、分段、友好的中文回答；介绍功能时引导用户点击「微课列表」「查看示例微课」；算法问题以启发为主；勿编造站内不存在的按钮名称；若用户索要某道 OJ 可提交的完整标程，请只给思路与伪代码。`

    const offlineReply =
      '当前服务端未读取到 OPENAI_API_KEY（请在本目录的 .env.local 中配置并重启 node server/index.js）。离线说明：请用顶部导航进入「微课列表」或「查看示例微课」，在详情页可看视频、打开「虚拟仿真实验」「练习测试」等模块。'

    const apiKey = normalizeOpenAiApiKey(process.env.OPENAI_API_KEY)
    if (!apiKey) {
      return res.json({ ok: true, reply: offlineReply, provider: 'offline' })
    }

    if (trimmed.length === 0) {
      return res.status(400).json({ ok: false, message: 'messages 不能为空' })
    }

    const messages = [{ role: 'system', content: systemContent }, ...trimmed]
    const { baseUrl, model } = llmEndpointConfig()

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.55,
        max_tokens: 1024,
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '')
      return res.json({
        ok: true,
        reply: `暂时无法连接大模型接口（${String(errText).slice(0, 280)}）。请检查密钥、网络或 OPENAI_BASE_URL。`,
        provider: 'offline',
      })
    }

    const data = await resp.json()
    const reply = String(data?.choices?.[0]?.message?.content ?? '').trim()
    return res.json({
      ok: true,
      reply: reply || '（模型未返回内容，请稍后再试。）',
      provider: baseUrl.includes('deepseek') ? 'deepseek' : 'openai-compatible',
    })
  } catch (err) {
    res.status(500).json({ ok: false, message: err?.message ?? String(err) })
  }
})

app.get('/api/health', (req, res) => res.json({ ok: true }))

// 本地演示用：直接从项目外层目录读取指定 mp4 文件
// 前端使用 src="/videos/<filename>"，由 Vite 代理到这里。
const allowedVideoFiles = new Set(['116cc8a9afc0e22415e1952d1962fa60.mp4'])
app.get('/videos/:file', (req, res) => {
  const file = String(req.params.file ?? '')
  if (!allowedVideoFiles.has(file)) return res.status(404).send('video not found')

  // 后端启动目录是 microcourse-site，因此 mp4 在它的父目录：../<file>
  const filePath = path.resolve(process.cwd(), '..', file)
  res.sendFile(filePath, (err) => {
    if (err) res.status(404).send('video not found')
  })
})

app.listen(port, () => {
  const llm = llmEndpointConfig()
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`[server] LLM ${llm.baseUrl}/chat/completions · model=${llm.model}`)
})

