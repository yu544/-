<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import axios from 'axios'

const props = defineProps({
  course: { type: Object, required: true },
})

const editorEl = ref(null)
let monacoEditor = null
let monacoRef = null

const code = ref(String(props.course.exercise?.defaultCode ?? ''))
const running = ref(false)
const runResult = ref(null)
const runError = ref('')

const languageId = 50 // Judge0: C（不同部署可能 ID 不同；必要时可在服务端/前端配置）
const languageLabel = computed(() => (props.course.exercise?.language === 'c' ? 'C 语言' : '语言'))

// ------------------------ AI 分级提示 ------------------------
const hintLevel = ref(1) // 1/2/3
const hintLoading = ref(false)
const hintText = ref('')

async function generateHint() {
  hintLoading.value = true
  hintText.value = ''
  try {
    const resp = await axios.post('/api/ai/hints', {
      level: hintLevel.value,
      problemTitle: props.course.exercise?.title ?? '田忌赛马',
      problemStatement: props.course.exercise?.problemStatement ?? '',
      userCode: code.value,
    })
    const data = resp.data
    hintText.value = data?.hint ?? ''
  } catch (e) {
    hintText.value = e?.response?.data?.message ?? e?.message ?? '生成提示失败'
  } finally {
    hintLoading.value = false
  }
}

const testcases = computed(() => {
  const baseN = props.course.simulation?.defaultHorses ?? 3
  const tClassic = props.course.simulation?.classicTianji ?? [90, 85, 70]
  const qClassic = props.course.simulation?.classicQi ?? [95, 88, 75]

  const t1 = tClassic.slice(0, 3)
  const q1 = qClassic.slice(0, 3)

  // 变体：把齐王稍微“拉大/拉小”
  const t2 = t1.map((x, i) => clamp(x + (i % 2 === 0 ? 5 : -5)))
  const q2 = q1.map((x, i) => clamp(x + (i % 2 === 0 ? -3 : 3)))

  // 变体：n=4 扩展（使用经典数据填充 + padding）
  const t3 = [...tClassic.slice(0, Math.min(4, tClassic.length))]
  while (t3.length < 4) t3.push(clamp(t3[t3.length - 1] - 7))
  const q3 = [...qClassic.slice(0, Math.min(4, qClassic.length))]
  while (q3.length < 4) q3.push(clamp(q3[q3.length - 1] - 6))

  const makeTc = (tianji, qi) => ({
    tianji: tianji.map(Number),
    qi: qi.map(Number),
  })

  return [makeTc(t1, q1), makeTc(t2, q2), makeTc(t3, q3)]
})

function clamp(x) {
  return Math.max(0, Math.min(100, Math.round(Number(x))))
}

function syncCodeFromEditor() {
  if (monacoEditor) code.value = monacoEditor.getValue()
}

async function initMonaco() {
  const monaco = await import('monaco-editor')
  monacoRef = monaco
  if (!editorEl.value) return

  monacoEditor = monaco.editor.create(editorEl.value, {
    value: code.value,
    language: 'c',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
  })

  monacoEditor.onDidChangeModelContent(() => {
    syncCodeFromEditor()
  })
}

onMounted(() => {
  initMonaco().catch(() => {})
})

onBeforeUnmount(() => {
  if (monacoEditor) monacoEditor.dispose()
  monacoEditor = null
  monacoRef = null
})

async function run() {
  running.value = true
  runError.value = ''
  runResult.value = null
  syncCodeFromEditor()

  try {
    const payload = {
      languageId,
      sourceCode: code.value,
      testcases: testcases.value,
    }

    const resp = await axios.post('/api/judge0/run', payload)
    runResult.value = resp.data
  } catch (e) {
    runError.value = e?.response?.data?.message ?? e?.message ?? '运行失败'
  } finally {
    running.value = false
  }
}

function verdictText() {
  if (!runResult.value) return ''
  if (!runResult.value.ok) return '未运行成功'
  return runResult.value.overall ? 'Accepted（全部通过）' : 'Wrong Answer（至少有用例不通过）'
}

// ------------------------ 概念测验（单选 / 判断） ------------------------
const quizSingle = computed(() => props.course.exercise?.conceptQuiz?.singleChoice ?? [])
const quizTF = computed(() => props.course.exercise?.conceptQuiz?.trueFalse ?? [])
const expansions = computed(() => props.course.exercise?.expansionChallenges ?? [])

const singlePicks = ref({})
const tfPicks = ref({})

function pickSingle(qIdx, optIdx) {
  singlePicks.value = { ...singlePicks.value, [qIdx]: optIdx }
}

function pickTf(qIdx, val) {
  tfPicks.value = { ...tfPicks.value, [qIdx]: val }
}

const quizScore = computed(() => {
  let ok = 0
  let total = 0
  quizSingle.value.forEach((q, idx) => {
    total++
    const p = singlePicks.value[idx]
    if (p !== undefined && p === q.answerIndex) ok++
  })
  quizTF.value.forEach((q, idx) => {
    total++
    const p = tfPicks.value[idx]
    if (p !== undefined && !!p === !!q.answer) ok++
  })
  return { ok, total }
})
</script>

<template>
  <div class="exercise">
    <div class="exercise-head">
      <div class="left">
        <div class="section-label">编程题</div>
        <div class="kicker">{{ props.course.exercise.title }}</div>
        <div class="stmt pre-wrap">{{ props.course.exercise.problemStatement }}</div>
      </div>
      <div class="right">
        <div class="lang">{{ languageLabel }}</div>
        <div class="tests">预置测试用例：{{ testcases.length }} 个</div>
      </div>
    </div>

    <div class="quiz-card" v-if="quizSingle.length || quizTF.length">
      <div class="section-label">概念测验</div>
      <div class="quiz-head">
        <div class="quiz-title">单选题 · 判断题</div>
        <div v-if="quizScore.total" class="quiz-score">
          得分：<strong>{{ quizScore.ok }}</strong> / {{ quizScore.total }}
        </div>
      </div>

      <div v-for="(q, idx) in quizSingle" :key="'s' + idx" class="quiz-q">
        <div class="quiz-q-title">{{ idx + 1 }}. {{ q.q }}</div>
        <div class="quiz-options">
          <button
            v-for="(opt, oi) in q.options"
            :key="oi"
            type="button"
            class="opt-btn"
            :class="{
              picked: singlePicks[idx] === oi,
              good: singlePicks[idx] !== undefined && oi === q.answerIndex,
              bad: singlePicks[idx] === oi && oi !== q.answerIndex,
            }"
            @click="pickSingle(idx, oi)"
          >
            {{ String.fromCharCode(65 + oi) }}. {{ opt }}
          </button>
        </div>
        <div v-if="singlePicks[idx] !== undefined" class="quiz-explain">
          {{ q.explain }}
        </div>
      </div>

      <div v-for="(q, idx) in quizTF" :key="'t' + idx" class="quiz-q">
        <div class="quiz-q-title">{{ quizSingle.length + idx + 1 }}. {{ q.q }}</div>
        <div class="tf-row">
          <button
            type="button"
            class="tf-btn"
            :class="{ picked: tfPicks[idx] === true, good: tfPicks[idx] !== undefined && q.answer === true && tfPicks[idx] === true, bad: tfPicks[idx] === true && q.answer !== true }"
            @click="pickTf(idx, true)"
          >
            正确
          </button>
          <button
            type="button"
            class="tf-btn"
            :class="{ picked: tfPicks[idx] === false, good: tfPicks[idx] !== undefined && q.answer === false && tfPicks[idx] === false, bad: tfPicks[idx] === false && q.answer !== false }"
            @click="pickTf(idx, false)"
          >
            错误
          </button>
        </div>
        <div v-if="tfPicks[idx] !== undefined" class="quiz-explain">{{ q.explain }}</div>
      </div>
    </div>

    <div v-if="expansions.length" class="expand-card">
      <div class="section-label">拓展思考</div>
      <div v-for="(ex, i) in expansions" :key="i" class="expand-item">
        <div class="expand-title">{{ ex.title }}</div>
        <p class="expand-body">{{ ex.prompt }}</p>
      </div>
    </div>

    <div class="editor-card">
      <div class="editor-top">
        <div class="editor-title">在线代码 · Monaco Editor</div>
        <div class="actions">
          <button class="btn primary" type="button" :disabled="running" @click="run">▶ 运行测试</button>
        </div>
      </div>
      <div ref="editorEl" class="editor"></div>
      <div v-if="runError" class="error">
        {{ runError }}
      </div>
    </div>

    <div class="result-card">
      <div class="result-title">
        运行结果：<strong>{{ verdictText() }}</strong>
      </div>

      <div v-if="runResult?.ok && runResult.results" class="tests-res">
        <div class="overall">
          通过 {{ runResult.passedCount }} / {{ runResult.total }}
        </div>

        <div class="res-list">
          <div v-for="r in runResult.results" :key="r.testIndex" class="res-item" :class="{ pass: r.passed, fail: !r.passed }">
            <div class="res-top">
              <span class="tag">用例 #{{ r.testIndex + 1 }}</span>
              <span class="status">{{ r.passed ? '通过' : '不通过' }}</span>
            </div>
            <div class="line"><span class="muted">expected:</span> <span class="mono">{{ r.expectedOutput }}</span></div>
            <div class="line"><span class="muted">actual:</span> <span class="mono">{{ r.actualOutput }}</span></div>
            <div v-if="r.compileOutput" class="compile">
              <div class="compile-title">编译/运行信息</div>
              <pre class="pre">{{ r.compileOutput }}</pre>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty">
        点击“运行测试”查看 Judge0 执行结果（需要你在后端配置 `JUDGE0_BASE_URL`）。
      </div>
    </div>

    <div class="hint-card">
      <div class="section-label">AI 辅助</div>
      <div class="hint-top">
        <div class="hint-title">分级提示 · 参赛亮点</div>
        <div class="hint-levels" role="radiogroup" aria-label="提示等级">
          <label class="hint-option">
            <input type="radio" value="1" v-model.number="hintLevel" />
            思路提示
          </label>
          <label class="hint-option">
            <input type="radio" value="2" v-model.number="hintLevel" />
            贪心关键点
          </label>
          <label class="hint-option">
            <input type="radio" value="3" v-model.number="hintLevel" />
            查看参考答案方向
          </label>
        </div>
      </div>

      <div class="hint-actions">
        <button class="btn primary" type="button" :disabled="hintLoading" @click="generateHint">
          {{ hintLoading ? '生成中...' : '生成提示' }}
        </button>
        <div class="hint-note">
          提示将优先给出“可理解的方向”，避免直接给出完整可复制答案。
        </div>
      </div>

      <div v-if="hintText" class="hint-body">
        <pre class="hint-pre">{{ hintText }}</pre>
      </div>
      <div v-else class="hint-empty">点击“生成提示”获取分级帮助。</div>
    </div>
  </div>
</template>

<style scoped>
.section-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--brand-soft);
  margin-bottom: 8px;
}

.pre-wrap {
  white-space: pre-wrap;
}

.exercise {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quiz-card,
.expand-card {
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
}

.quiz-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.quiz-title {
  font-weight: 900;
  color: var(--text-h);
}

.quiz-score {
  font-size: 14px;
  color: var(--text);
}

.quiz-q {
  margin-bottom: 18px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.quiz-q:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.quiz-q-title {
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 10px;
  line-height: 1.55;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opt-btn {
  text-align: left;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.opt-btn:hover {
  border-color: rgba(245, 166, 35, 0.4);
  background: rgba(245, 166, 35, 0.06);
}
.opt-btn.picked {
  border-color: rgba(26, 47, 90, 0.35);
  background: var(--brand-bg-subtle);
}
.opt-btn.good {
  border-color: rgba(22, 163, 74, 0.45);
  background: rgba(22, 163, 74, 0.1);
}
.opt-btn.bad {
  border-color: rgba(220, 38, 38, 0.45);
  background: rgba(220, 38, 38, 0.08);
}

.tf-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tf-btn {
  min-width: 100px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-weight: 800;
  cursor: pointer;
  transition: background 0.15s;
}
.tf-btn.picked {
  background: var(--brand-bg-subtle);
}
.tf-btn.good {
  border-color: rgba(22, 163, 74, 0.45);
  background: rgba(22, 163, 74, 0.1);
}
.tf-btn.bad {
  border-color: rgba(220, 38, 38, 0.45);
  background: rgba(220, 38, 38, 0.08);
}

.quiz-explain {
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.22);
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
}

.expand-item {
  margin-top: 14px;
}
.expand-item:first-child {
  margin-top: 0;
}
.expand-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 6px;
}
.expand-body {
  margin: 0;
  color: var(--text);
  line-height: 1.7;
  font-size: 15px;
}

.exercise-head {
  display: grid;
  grid-template-columns: 1fr 0.38fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .exercise-head {
    grid-template-columns: 1fr;
  }
}

.kicker {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 8px;
}

.stmt {
  color: var(--text);
  line-height: 1.8;
}

.right {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(26, 47, 90, 0.04);
  padding: 12px;
}

:global(.dark) .right {
  background: rgba(26, 47, 90, 0.08);
  border-color: rgba(46, 48, 58, 0.95);
}

.lang {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 8px;
}

.tests {
  color: var(--text);
  font-family: var(--mono);
  font-size: 13px;
}

.editor-card {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}

:global(.dark) .editor-card {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.editor-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.editor-title {
  font-weight: 900;
  color: var(--text-h);
}

.editor {
  height: 360px;
  border-radius: 14px;
  overflow: hidden;
}

.btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 900;
  color: var(--text-h);
}

.btn.primary {
  background: #1a2f5a;
  border-color: #1a2f5a;
  color: #fff;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error {
  margin-top: 10px;
  color: #dc2626;
  font-weight: 900;
  white-space: pre-wrap;
}

.result-card {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(26, 47, 90, 0.04);
  padding: 14px;
}

.result-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.empty {
  color: var(--text);
}

.overall {
  font-weight: 900;
  margin-bottom: 10px;
}

.res-list {
  display: grid;
  gap: 10px;
}

.res-item {
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.55);
  padding: 12px;
}

:global(.dark) .res-item {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.res-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tag {
  font-family: var(--mono);
  font-weight: 900;
  color: var(--text-h);
}

.status {
  font-weight: 900;
}

.res-item.pass .status {
  color: #16a34a;
}

.res-item.fail .status {
  color: #dc2626;
}

.line {
  margin-top: 6px;
  color: var(--text);
}

.muted {
  opacity: 0.7;
  margin-right: 8px;
  font-weight: 900;
}

.mono {
  font-family: var(--mono);
  font-weight: 900;
}

.compile {
  margin-top: 12px;
}

.compile-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 6px;
}

.pre {
  margin: 0;
  max-height: 160px;
  overflow: auto;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.06);
}

:global(.dark) .pre {
  background: rgba(255, 255, 255, 0.06);
}

.hint-card {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(26, 47, 90, 0.04);
  padding: 14px;
}

.hint-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.hint-title {
  font-weight: 900;
  color: var(--text-h);
}

.hint-levels {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.hint-option {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--text);
  font-weight: 800;
}

.hint-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hint-note {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}

.hint-empty {
  margin-top: 12px;
  color: var(--text);
}

.hint-body {
  margin-top: 12px;
}

.hint-pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--mono);
  font-weight: 800;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(26, 47, 90, 0.12);
  background: rgba(26, 47, 90, 0.04);
}
</style>

