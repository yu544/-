<script setup>
import { computed, ref, watch } from 'vue'
import axios from 'axios'

const props = defineProps({
  course: { type: Object, required: true },
})

const ex = computed(() => props.course.exercise ?? {})
const quiz = computed(() => ex.value.conceptQuiz ?? { singleChoice: [], trueFalse: [] })

const code = ref(String(ex.value.defaultCode ?? ''))
watch(
  () => ex.value.defaultCode,
  (v) => {
    if (v != null) code.value = String(v)
  },
)

const JUDGE0_LANGUAGE_C = 50

const builtinTests = [
  { tianji: [90, 85, 70], qi: [95, 88, 75] },
  { tianji: [1], qi: [2] },
  { tianji: [10, 20, 30], qi: [15, 25, 35] },
  { tianji: [100, 50, 50, 50], qi: [60, 60, 60, 60] },
]

const runLoading = ref(false)
const runResult = ref(null)
const runError = ref('')

async function runJudge0() {
  runError.value = ''
  runResult.value = null
  runLoading.value = true
  try {
    const resp = await axios.post('/api/judge0/run', {
      languageId: JUDGE0_LANGUAGE_C,
      sourceCode: code.value,
      testcases: builtinTests,
    })
    runResult.value = resp.data
  } catch (e) {
    runError.value =
      e?.response?.data?.message ??
      e?.message ??
      '请求失败。请确认已运行 node server/index.js，并在环境变量中配置 JUDGE0_BASE_URL 指向可用 Judge0。'
  } finally {
    runLoading.value = false
  }
}

const hintLoading = ref(false)
const hintLevel = ref(1)
const hintText = ref('')

async function fetchHint(level) {
  hintLevel.value = level
  hintLoading.value = true
  hintText.value = ''
  try {
    const resp = await axios.post('/api/ai/hints', {
      level,
      problemTitle: ex.value.title ?? '',
      problemStatement: ex.value.problemStatement ?? '',
      userCode: code.value,
    })
    hintText.value = resp.data?.hint ?? ''
  } catch {
    hintText.value = '提示服务暂不可用，请确认后端已启动。'
  } finally {
    hintLoading.value = false
  }
}

const singlePicked = ref({})
const tfPicked = ref({})
const challengeOpen = ref({})

function pickSingle(qIdx, choiceIdx, answerIndex) {
  singlePicked.value = {
    ...singlePicked.value,
    [qIdx]: {
      choiceIdx,
      answerIndex,
      correct: choiceIdx === answerIndex,
    },
  }
}

function pickTf(qIdx, answer, correctAnswer) {
  tfPicked.value = {
    ...tfPicked.value,
    [qIdx]: {
      answer,
      correctAnswer,
      correct: answer === correctAnswer,
    },
  }
}

function optionStateSingle(qIdx, optIdx) {
  const p = singlePicked.value[qIdx]
  if (!p) return ''
  if (optIdx === p.answerIndex) return 'good'
  if (optIdx === p.choiceIdx && !p.correct) return 'bad'
  if (optIdx === p.choiceIdx && p.correct) return 'sel'
  return ''
}

function optionStateTf(qIdx, optVal) {
  const p = tfPicked.value[qIdx]
  if (!p) return ''
  if (optVal === p.correctAnswer) return 'good'
  if (optVal === p.answer && !p.correct) return 'bad'
  if (optVal === p.answer && p.correct) return 'sel'
  return ''
}

function challengeHint(ch, idx) {
  const title = String(ch?.title ?? '')
  if (title.includes('变体一')) {
    return '提示：本题贪心依赖“局部最优可推出全局最优”的结构。马匹扩展到 5 匹（甚至任意 n）时，只要胜负规则不变（仅比较大小，胜+200/负-200/平0），排序 + 双指针策略仍成立。可从交换论证角度思考：把非最优交换成当前最优不会变差。'
  }
  if (title.includes('变体二')) {
    return '提示：当“差值 > 10 才算胜”后，胜负不再只由大小关系决定，原贪心的关键比较条件被破坏。可先重建状态：定义有效胜利边，再考虑 DP/搜索或带约束匹配策略，并用小规模数据验证是否存在反例。'
  }
  return `思考方向：${ch?.prompt ?? ''}`
}

function toggleChallengeHint(idx) {
  challengeOpen.value = {
    ...challengeOpen.value,
    [idx]: !challengeOpen.value[idx],
  }
}
</script>

<template>
  <div class="ex">
    <section class="block">
      <h3 class="h">{{ ex.title }}</h3>
      <pre class="stmt">{{ ex.problemStatement }}</pre>
    </section>

    <section class="block">
      <div class="row">
        <span class="lbl">代码（C · Judge0 language_id={{ JUDGE0_LANGUAGE_C }}）</span>
        <div class="row-actions">
          <button type="button" class="btn" :disabled="hintLoading" @click="fetchHint(1)">提示 L1</button>
          <button type="button" class="btn ghost" :disabled="hintLoading" @click="fetchHint(2)">L2</button>
          <button type="button" class="btn ghost" :disabled="hintLoading" @click="fetchHint(3)">L3</button>
        </div>
      </div>
      <textarea v-model="code" class="editor" spellcheck="false" />
      <p v-if="hintText" class="hint">{{ hintText }}</p>
    </section>

    <section class="block">
      <button type="button" class="btn primary" :disabled="runLoading" @click="runJudge0">
        {{ runLoading ? '判题中…' : '运行内置测试（Judge0）' }}
      </button>
      <p v-if="runError" class="err">{{ runError }}</p>
      <div v-if="runResult?.ok" class="verdict" :class="{ pass: runResult.overall }">
        {{ runResult.overall ? '全部通过' : '部分未通过' }} · {{ runResult.passedCount }}/{{ runResult.total }}
      </div>
      <ul v-if="runResult?.results?.length" class="cases">
        <li v-for="r in runResult.results" :key="r.testIndex" :class="{ fail: !r.passed }">
          #{{ r.testIndex + 1 }} 期望 {{ r.expectedOutput }}，输出「{{ r.actualOutput }}」
          <span v-if="r.compileOutput" class="suberr">{{ r.compileOutput.slice(0, 200) }}</span>
        </li>
      </ul>
    </section>

    <section v-if="quiz.singleChoice?.length" class="block">
      <h3 class="h">概念单选</h3>
      <div v-for="(q, idx) in quiz.singleChoice" :key="'s' + idx" class="q">
        <div class="qq">{{ idx + 1 }}. {{ q.q }}</div>
        <div class="opts">
          <button
            v-for="(opt, j) in q.options"
            :key="j"
            type="button"
            class="opt"
            :class="optionStateSingle(idx, j)"
            @click="pickSingle(idx, j, q.answerIndex)"
          >
            {{ opt }}
          </button>
        </div>
        <div v-if="singlePicked[idx]" class="answer">
          <div class="answer-row">
            <span class="answer-k">正确答案：</span>
            <span class="answer-v">{{ q.options?.[q.answerIndex] ?? `选项 ${q.answerIndex + 1}` }}</span>
            <span class="answer-tag" :class="{ ok: singlePicked[idx].correct, no: !singlePicked[idx].correct }">
              {{ singlePicked[idx].correct ? '你答对了' : '你答错了' }}
            </span>
          </div>
          <p class="exp">{{ q.explain }}</p>
        </div>
      </div>
    </section>

    <section v-if="quiz.trueFalse?.length" class="block">
      <h3 class="h">判断题</h3>
      <div v-for="(q, idx) in quiz.trueFalse" :key="'t' + idx" class="q">
        <div class="qq">{{ idx + 1 }}. {{ q.q }}</div>
        <div class="opts">
          <button
            type="button"
            class="opt"
            :class="optionStateTf(idx, true)"
            @click="pickTf(idx, true, q.answer === true)"
          >
            正确
          </button>
          <button
            type="button"
            class="opt"
            :class="optionStateTf(idx, false)"
            @click="pickTf(idx, false, q.answer === false)"
          >
            错误
          </button>
        </div>
        <div v-if="tfPicked[idx]" class="answer">
          <div class="answer-row">
            <span class="answer-k">正确答案：</span>
            <span class="answer-v">{{ (q.answer === true) ? '正确' : '错误' }}</span>
            <span class="answer-tag" :class="{ ok: tfPicked[idx].correct, no: !tfPicked[idx].correct }">
              {{ tfPicked[idx].correct ? '你答对了' : '你答错了' }}
            </span>
          </div>
          <p class="exp">{{ q.explain }}</p>
        </div>
      </div>
    </section>

    <section v-if="ex.expansionChallenges?.length" class="block">
      <h3 class="h">拓展思考</h3>
      <div v-for="(ch, i) in ex.expansionChallenges" :key="i" class="ch challenge-grid">
        <div class="challenge-left">
          <div class="ch-t">{{ ch.title }}</div>
          <p class="ch-p">{{ ch.prompt }}</p>
          <button type="button" class="hint-toggle" @click="toggleChallengeHint(i)">
            {{ challengeOpen[i] ? '收起提示' : '显示思考提示' }}
          </button>
        </div>
        <div v-if="challengeOpen[i]" class="challenge-right">
          <div class="hint-k">思考提示</div>
          <p class="hint-v">{{ challengeHint(ch, i) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ex {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.block {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}
:global(.dark) .block {
  background: rgba(22, 23, 29, 0.55);
}
.h {
  margin: 0 0 10px;
  font-size: 1.05rem;
  color: var(--text-h);
}
.stmt {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.75;
  color: var(--text);
}
.row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 8px;
}
.lbl {
  font-weight: 900;
  color: var(--text-h);
  font-size: 14px;
}
.row-actions {
  display: flex;
  gap: 8px;
}
.editor {
  width: 100%;
  min-height: 220px;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  color: var(--text-h);
  box-sizing: border-box;
}
.hint {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--brand-bg-subtle);
  border: 1px solid var(--border);
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.7;
}
.btn {
  border-radius: 12px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--text-h);
  font-weight: 900;
  padding: 8px 14px;
  cursor: pointer;
}
.btn.ghost {
  background: transparent;
  font-weight: 800;
}
.btn.primary {
  background: linear-gradient(135deg, rgba(245, 166, 35, 0.35), rgba(26, 47, 90, 0.12));
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.err {
  color: #b91c1c;
  font-weight: 700;
  margin: 8px 0 0;
}
.verdict {
  margin-top: 10px;
  font-weight: 900;
  color: var(--text-h);
}
.verdict.pass {
  color: #15803d;
}
.cases {
  margin: 8px 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
}
.cases li.fail {
  color: #b91c1c;
}
.suberr {
  display: block;
  font-size: 12px;
  opacity: 0.85;
  margin-top: 4px;
}
.q {
  margin-bottom: 14px;
}
.qq {
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 8px;
  line-height: 1.6;
}
.opts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.opt {
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 700;
  color: var(--text);
}
.opt.sel {
  border-color: var(--accent-border);
}
.opt.good {
  border-color: rgba(21, 128, 61, 0.55);
  background: rgba(21, 128, 61, 0.12);
}
.opt.bad {
  border-color: rgba(185, 28, 28, 0.55);
  background: rgba(185, 28, 28, 0.1);
}
.answer {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(26, 47, 90, 0.04);
}
.answer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;
}
.answer-k {
  font-weight: 900;
  color: var(--text-h);
}
.answer-v {
  font-weight: 800;
  color: var(--text);
}
.answer-tag {
  font-size: 12px;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}
.answer-tag.ok {
  border-color: rgba(21, 128, 61, 0.55);
  background: rgba(21, 128, 61, 0.12);
  color: #15803d;
}
.answer-tag.no {
  border-color: rgba(185, 28, 28, 0.55);
  background: rgba(185, 28, 28, 0.1);
  color: #b91c1c;
}
.exp {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text);
  line-height: 1.7;
}
.ch {
  margin-bottom: 12px;
}
.challenge-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.25);
}
:global(.dark) .challenge-grid {
  background: rgba(22, 23, 29, 0.45);
}
.ch-t {
  font-weight: 900;
  color: var(--text-h);
}
.ch-p {
  margin: 6px 0 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text);
}
.challenge-right {
  border-left: 1px dashed var(--border);
  padding-left: 12px;
}
.hint-toggle {
  margin-top: 8px;
  border-radius: 10px;
  border: 1px solid var(--accent-border);
  background: var(--accent-bg);
  color: var(--text-h);
  font-size: 12px;
  font-weight: 800;
  padding: 6px 10px;
  cursor: pointer;
}
.hint-toggle:hover {
  filter: brightness(1.03);
}
.hint-k {
  font-size: 12px;
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 6px;
}
.hint-v {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text);
}
@media (max-width: 860px) {
  .challenge-grid {
    grid-template-columns: 1fr;
  }
  .challenge-right {
    border-left: none;
    border-top: 1px dashed var(--border);
    padding-left: 0;
    padding-top: 10px;
  }
}
</style>
