<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import Sortable from 'sortablejs'
import courses from '../../data/courses.json'

const props = defineProps({
  // 允许从外部传入课程配置；这里默认用 courses.json 的第一门课
  courseId: { type: String, default: 'tianji-qiwei' },
})

const course = computed(() => courses.find((c) => c.id === props.courseId) ?? courses[0])

const nMin = 3
const nMax = 5

const horsesCount = ref(course.value.simulation?.defaultHorses ?? 3)

const tianji = ref([])
const qi = ref([])

function clamp01to100(x) {
  const n = Number(x)
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function seededClassic(n) {
  const tClassic = course.value.simulation?.classicTianji ?? [90, 85, 70]
  const qClassic = course.value.simulation?.classicQi ?? [95, 88, 75]
  const pad = (arr) => {
    const out = [...arr]
    while (out.length < n) out.push(Math.max(0, Math.min(100, arr[arr.length - 1] - 5 * (out.length - arr.length + 1))))
    return out.slice(0, n)
  }
  return { t: pad(tClassic), q: pad(qClassic) }
}

function randomArray(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 101))
}

function resetFromClassic() {
  const { t, q } = seededClassic(horsesCount.value)
  tianji.value = t
  qi.value = q
}

function randomizeAll() {
  tianji.value = randomArray(horsesCount.value)
  qi.value = randomArray(horsesCount.value)
}

function initArrays() {
  horsesCount.value = clamp01to100(horsesCount.value)
  if (horsesCount.value < nMin) horsesCount.value = nMin
  if (horsesCount.value > nMax) horsesCount.value = nMax
  resetFromClassic()
}

watch(
  () => horsesCount.value,
  (n) => {
    const nn = Math.max(nMin, Math.min(nMax, Number(n)))
    if (nn !== n) horsesCount.value = nn
    // 保持长度一致
    const { t, q } = seededClassic(nn)
    tianji.value = t
    qi.value = q
  }
)

onMounted(() => {
  initArrays()
  initCustomSortable()
})

// ------------------------ 策略与对战逻辑 ------------------------

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

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
 * 田忌赛马（典型贪心解法）
 * - 两边都按战力升序排序
 * - 每轮尽量用“能赢的最合适马”去对抗
 * - 记录步骤用于步骤回放
 */
function greedyRace(tianjiArr, qiArr) {
  const t = sortAsc(tianjiArr)
  const q = sortAsc(qiArr)

  let i = 0
  let j = t.length - 1
  let k = 0
  let l = q.length - 1

  let money = 0
  const steps = []
  const n = t.length

  for (let round = 0; round < n; round++) {
    const tStrong = t[j]
    const tWeak = t[i]
    const qStrong = q[l]
    const qWeak = q[k]

    let chosenT
    let chosenQ
    let result
    let reason

    if (tStrong > qStrong) {
      // 强对强，必赢
      chosenT = tStrong
      chosenQ = qStrong
      result = 'win'
      reason = '田忌最强可战胜齐王最强（强对强必赢）'
      j--
      l--
    } else if (tWeak > qWeak) {
      // 弱对弱，也能赢
      chosenT = tWeak
      chosenQ = qWeak
      result = 'win'
      reason = '田忌最弱也能战胜齐王最弱（弱对弱必赢）'
      i++
      k++
    } else {
      // 否则用最弱去换掉最弱，尽量减少损失
      chosenT = tWeak
      chosenQ = qWeak
      result = compare(chosenT, chosenQ)
      if (result === 'win') reason = '出现“弱对弱”赢的情况'
      else if (result === 'draw') reason = '弱对弱战力相等（平）'
      else reason = '田忌最弱不敌齐王最弱（用弱对弱，避免强马白用）'
      i++
      k++
    }

    const delta = scoreOf(result)
    money += delta
    steps.push({ round: round + 1, tianji: chosenT, qi: chosenQ, result, delta, reason })
  }

  return { money, steps }
}

function randomStrategy(tianjiArr, qiArr) {
  const tSorted = sortAsc(tianjiArr)
  const qSorted = sortAsc(qiArr)
  const tOrder = shuffle(tSorted)
  const qOrder = qSorted
  const steps = tOrder.map((tv, idx) => {
    const qv = qOrder[idx]
    const result = compare(tv, qv)
    const delta = scoreOf(result)
    return {
      round: idx + 1,
      tianji: tv,
      qi: qv,
      result,
      delta,
      reason: '随机匹配：按随机顺序与齐王升序马对抗',
    }
  })
  const money = steps.reduce((s, x) => s + x.delta, 0)
  return { money, steps }
}

function customStrategy(tianjiOrder, qiArr) {
  const tOrder = [...tianjiOrder]
  const qOrder = sortAsc(qiArr) // 保持齐王升序，更便于与贪心对比
  const steps = tOrder.map((tv, idx) => {
    const qv = qOrder[idx]
    const result = compare(tv, qv)
    const delta = scoreOf(result)
    return { round: idx + 1, tianji: tv, qi: qv, result, delta, reason: '自定义顺序：使用拖拽后的田忌出场顺序' }
  })
  const money = steps.reduce((s, x) => s + x.delta, 0)
  return { money, steps }
}

// ------------------------ UI 状态 ------------------------

const strategy = ref('greedy') // greedy | random | custom

const playing = ref(false)
const autoPlay = ref(true)
const playDelay = ref(700) // ms
const currentRound = ref(0) // 已播放到第 currentRound 场（0..n）
const moneyNow = ref(0)
const currentSteps = ref([])

const matchList = computed(() => currentSteps.value.slice(0, currentRound.value))

const resultPanel = computed(() => {
  const totalWins = matchList.value.filter((s) => s.result === 'win').length
  const totalLoses = matchList.value.filter((s) => s.result === 'lose').length
  const totalDraws = matchList.value.filter((s) => s.result === 'draw').length
  return { totalWins, totalLoses, totalDraws, money: moneyNow.value }
})

const strategyResults = reactive({
  greedy: null,
  random: null,
  custom: null,
})

const barChartEl = ref(null)
let barChart = null

const strategiesWithResult = computed(() => {
  return Object.entries(strategyResults)
    .filter(([, v]) => v && typeof v.money === 'number')
    .map(([k, v]) => ({ key: k, money: v.money }))
})

const chartReady = computed(() => strategiesWithResult.value.length >= 2)

function strategyLabel(key) {
  if (key === 'greedy') return '贪心'
  if (key === 'random') return '随机'
  if (key === 'custom') return '自定义'
  return key
}

function renderBarChart() {
  if (!barChartEl.value) return
  if (!chartReady.value) return

  const xData = strategiesWithResult.value.map((s) => strategyLabel(s.key))
  const yData = strategiesWithResult.value.map((s) => s.money)

  if (!barChart) {
    barChart = echarts.init(barChartEl.value)
  }

  barChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 10, right: 10, top: 30, bottom: 10 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { interval: 0 },
    },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}' } },
    series: [
      {
        type: 'bar',
        data: yData,
        itemStyle: {
          borderRadius: [10, 10, 0, 0],
        },
      },
    ],
  })
}

watch(chartReady, async () => {
  await nextTick()
  renderBarChart()
})

watch(
  strategiesWithResult,
  async () => {
    await nextTick()
    renderBarChart()
  },
  { deep: true }
)

const greedySteps = computed(() => strategyResults.greedy?.steps ?? [])
const greedyOrder = computed(() => greedySteps.value.map((s) => s.tianji))
const selectedGreedyStep = ref(0)

watch(
  greedySteps,
  () => {
    selectedGreedyStep.value = 0
  },
  { deep: true }
)

let timer = null
onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  timer = null
  destroyCustomSortable()
  if (barChart) barChart.dispose()
  barChart = null
})

function stopPlaying() {
  if (timer) window.clearInterval(timer)
  timer = null
  playing.value = false
}

function prepareRun() {
  const n = horsesCount.value
  const tArr = tianji.value.slice(0, n)
  const qArr = qi.value.slice(0, n)

  let res
  if (strategy.value === 'greedy') res = greedyRace(tArr, qArr)
  else if (strategy.value === 'random') res = randomStrategy(tArr, qArr)
  else res = customStrategy(tArr, qArr)

  strategyResults[strategy.value] = res
  currentSteps.value = res.steps
  currentRound.value = 0
  moneyNow.value = 0
}

function tickNext() {
  if (currentRound.value >= currentSteps.value.length) return false
  const step = currentSteps.value[currentRound.value]
  currentRound.value += 1
  moneyNow.value += step.delta
  return true
}

async function start() {
  stopPlaying()
  prepareRun()
  await nextTick()

  playing.value = true
  if (!autoPlay.value) return

  timer = window.setInterval(() => {
    const ok = tickNext()
    if (!ok) {
      stopPlaying()
    }
  }, playDelay.value)
}

function prev() {
  if (playing.value) stopPlaying()
  const newRound = Math.max(0, currentRound.value - 1)
  // 重新计算 moneyNow
  const list = currentSteps.value.slice(0, newRound)
  moneyNow.value = list.reduce((s, x) => s + x.delta, 0)
  currentRound.value = newRound
}

function nextManual() {
  if (playing.value) stopPlaying()
  tickNext()
}

function replay() {
  stopPlaying()
  currentRound.value = 0
  moneyNow.value = 0
}

function resultFor(key) {
  const r = strategyResults[key]
  if (!r) return null
  return { money: r.money, steps: r.steps }
}

// ------------------------ 自定义拖拽 ------------------------

const customListRef = ref(null)
let sortable = null

function initCustomSortable() {
  nextTick(() => {
    if (!customListRef.value) return
    destroyCustomSortable()
    sortable = new Sortable(customListRef.value, {
      animation: 120,
      ghostClass: 'sortable-ghost',
      handle: '.drag-handle',
      onEnd: (evt) => {
        const from = evt.oldIndex
        const to = evt.newIndex
        if (from === to) return
        const a = [...tianji.value]
        const [moved] = a.splice(from, 1)
        a.splice(to, 0, moved)
        tianji.value = a
      },
    })
  })
}

function destroyCustomSortable() {
  if (sortable) sortable.destroy()
  sortable = null
}

watch(
  () => horsesCount.value,
  () => {
    nextTick(() => initCustomSortable())
  }
)
</script>

<template>
  <div class="sim">
    <div class="sim-grid">
      <section class="panel">
        <h3 class="panel-title">参数配置</h3>

        <div class="row">
          <div class="label">马匹数量</div>
          <div class="segmented">
            <button
              v-for="n in [3, 4, 5]"
              :key="n"
              type="button"
              class="seg-btn"
              :class="{ active: horsesCount === n }"
              @click="horsesCount = n"
            >
              {{ n }} 匹
            </button>
          </div>
        </div>

        <div class="row">
          <div class="label">田忌马匹战力</div>
          <div class="horse-list" ref="customListRef">
            <div v-for="(v, idx) in tianji" :key="'t-' + idx" class="horse-item">
              <span class="drag-handle" aria-hidden="true">⋮⋮</span>
              <input
                class="range"
                type="range"
                min="0"
                max="100"
                :value="v"
                @input="tianji[idx] = clamp01to100(($event.target).value)"
              />
              <input class="num" type="number" min="0" max="100" v-model.number="tianji[idx]" />
            </div>
          </div>

          <div class="hint">拖拽顺序仅在“自定义排列”策略下生效。</div>
        </div>

        <div class="row">
          <div class="label">齐王马匹战力</div>
          <div class="horse-list">
            <div v-for="(v, idx) in qi" :key="'q-' + idx" class="horse-item">
              <span class="drag-handle drag-disabled" aria-hidden="true">⋮⋮</span>
              <input
                class="range"
                type="range"
                min="0"
                max="100"
                :value="v"
                @input="qi[idx] = clamp01to100(($event.target).value)"
              />
              <input class="num" type="number" min="0" max="100" v-model.number="qi[idx]" />
            </div>
          </div>
        </div>

        <div class="quick-actions">
          <button type="button" class="btn" @click="randomizeAll">随机生成</button>
          <button type="button" class="btn" @click="resetFromClassic">使用经典数据</button>
          <button type="button" class="btn ghost" @click="replay">重置对战</button>
        </div>
      </section>

      <section class="panel">
        <h3 class="panel-title">策略选择 & 对战演示</h3>

        <div class="row">
          <div class="label">策略</div>
          <div class="radio-grid">
            <label class="radio-card">
              <input type="radio" value="greedy" v-model="strategy" />
              <span class="radio-title">贪心算法（最优）</span>
              <span class="radio-desc">双指针贪心，输出最优出场顺序</span>
            </label>
            <label class="radio-card">
              <input type="radio" value="random" v-model="strategy" />
              <span class="radio-title">随机匹配</span>
              <span class="radio-desc">打乱田忌升序后的出场顺序</span>
            </label>
            <label class="radio-card">
              <input type="radio" value="custom" v-model="strategy" />
              <span class="radio-title">自定义排列</span>
              <span class="radio-desc">使用拖拽后的田忌顺序</span>
            </label>
          </div>
        </div>

        <div class="row">
          <div class="label">动画速度</div>
          <input class="speed" type="range" min="250" max="1200" step="50" v-model.number="playDelay" />
          <div class="speed-tag">{{ playDelay }} ms/场</div>
        </div>

        <div class="controls">
          <label class="check">
            <input type="checkbox" v-model="autoPlay" />
            自动播放
          </label>
          <button class="btn primary" type="button" :disabled="playing" @click="start">
            ▶ 开始对战
          </button>
          <div class="control-right">
            <button class="btn" type="button" @click="prev" :disabled="playing || currentRound <= 0">上一场</button>
            <button class="btn" type="button" @click="nextManual" :disabled="playing || currentRound >= currentSteps.length">
              下一场
            </button>
            <button class="btn ghost" type="button" @click="replay" :disabled="playing">重播</button>
          </div>
        </div>

        <div class="arena">
          <div class="match-header">
            <div class="arena-title">逐场动画</div>
            <div class="progress">
              第 {{ currentRound }} 场 / 共 {{ horsesCount }} 场
            </div>
          </div>

          <div class="match-body" v-if="currentRound < currentSteps.length">
            <div class="horse-track">
              <div class="horse-chip">田忌</div>
              <div class="horse-value">
                🐴 {{ currentSteps[currentRound]?.tianji ?? '-' }}
              </div>
            </div>
            <div class="vs">VS</div>
            <div class="horse-track">
              <div class="horse-chip">齐王</div>
              <div class="horse-value">
                🐴 {{ currentSteps[currentRound]?.qi ?? '-' }}
              </div>
            </div>
          </div>

          <div class="finished" v-else>
            <div class="finished-title">对战完成</div>
          </div>

          <div class="scoreboard">
            <div class="score-item">银币：<strong>{{ resultPanel.money }}</strong></div>
            <div class="score-item">胜：{{ resultPanel.totalWins }} </div>
            <div class="score-item">负：{{ resultPanel.totalLoses }} </div>
            <div class="score-item">平：{{ resultPanel.totalDraws }} </div>
          </div>

          <div class="match-list">
            <div class="match-list-head">本策略已播放场次</div>
            <div class="match-items">
              <div v-for="s in matchList" :key="'m-' + s.round" class="match-item">
                <div class="round-tag">第 {{ s.round }} 场</div>
                <div class="match-line">
                  <span class="t-val">田忌 {{ s.tianji }}</span>
                  <span class="arrow">→</span>
                  <span class="q-val">齐王 {{ s.qi }}</span>
                </div>
                <div class="result" :class="s.result">{{ s.result === 'win' ? '胜' : s.result === 'lose' ? '负' : '平' }}</div>
                <div class="reason">{{ s.reason }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section class="charts" aria-label="对比分析">
      <div class="charts-head">结果对比</div>

      <div v-if="chartReady" ref="barChartEl" class="bar-chart"></div>
      <div v-else class="empty-chart">至少完成两个策略对战后，将展示对比柱状图。</div>

      <div v-if="strategyResults.greedy" class="greedy-detail">
        <div class="detail-block">
          <div class="detail-title">最优出场顺序展示</div>
          <div class="order-list">
            <span v-for="(v, idx) in greedyOrder" :key="'o-' + idx" class="order-pill">
              {{ v }}
            </span>
          </div>
        </div>

        <div class="detail-block">
          <div class="detail-title">算法步骤回放</div>
          <div class="step-list">
            <button
              v-for="s in greedySteps"
              :key="'step-' + s.round"
              type="button"
              class="step-item"
              :class="{ active: s.round - 1 === selectedGreedyStep }"
              @click="selectedGreedyStep = s.round - 1"
            >
              <div class="step-top">
                <span class="step-round">第 {{ s.round }} 场</span>
                <span class="step-res" :class="s.result">{{ s.result === 'win' ? '胜' : s.result === 'lose' ? '负' : '平' }}</span>
              </div>
              <div class="step-body">
                田忌 {{ s.tianji }} vs 齐王 {{ s.qi }}
              </div>
              <div class="step-reason">{{ s.reason }}</div>
            </button>
          </div>
        </div>
      </div>
    </section>

    <div class="note">
      提示：当前“对战演示”已实现贪心/随机/自定义出场顺序与逐场动画。多策略柱状对比与步骤回放增强将在后续完成。
    </div>
  </div>
</template>

<style scoped>
.sim {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sim-grid {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .sim-grid {
    grid-template-columns: 1fr;
  }
}

.panel {
  background: rgba(255, 255, 255, 0.65);
  border: 1px solid rgba(229, 228, 231, 0.95);
  border-radius: 16px;
  padding: 14px;
}

:global(.dark) .panel {
  background: rgba(22, 23, 29, 0.8);
  border-color: rgba(46, 48, 58, 0.95);
}

.panel-title {
  margin: 0 0 12px;
  font-size: 18px;
  color: var(--text-h);
}

.row {
  margin-bottom: 14px;
}

.label {
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 8px;
}

.segmented {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.seg-btn {
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  font-weight: 800;
  color: var(--text-h);
}

:global(.dark) .seg-btn {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.seg-btn.active {
  border-color: rgba(245, 166, 35, 0.45);
  background: rgba(245, 166, 35, 0.12);
}

.horse-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.horse-item {
  display: grid;
  grid-template-columns: 26px 1fr 110px;
  gap: 10px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(26, 47, 90, 0.05);
  border: 1px solid rgba(26, 47, 90, 0.1);
}

:global(.dark) .horse-item {
  background: rgba(26, 47, 90, 0.08);
  border-color: rgba(46, 48, 58, 0.9);
}

.drag-handle {
  text-align: center;
  cursor: grab;
  color: rgba(26, 47, 90, 0.6);
  font-weight: 900;
}

.drag-disabled {
  cursor: default;
  opacity: 0.35;
}

.range {
  width: 100%;
}

.num {
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(229, 228, 231, 1);
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-h);
}

:global(.dark) .num {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.hint {
  margin-top: 6px;
  color: var(--text);
  font-size: 13px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-weight: 800;
  color: var(--text-h);
}

:global(.dark) .btn {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.btn.primary {
  background: #1a2f5a;
  border-color: #1a2f5a;
  color: white;
}

.btn.ghost {
  background: rgba(26, 47, 90, 0.05);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.radio-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.radio-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  background: rgba(255, 255, 255, 0.65);
}

:global(.dark) .radio-card {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.radio-card input {
  margin: 0;
}

.radio-title {
  font-weight: 900;
  color: var(--text-h);
}

.radio-desc {
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
}

.speed {
  width: 100%;
}

.speed-tag {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text-h);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.check {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-weight: 800;
  color: var(--text-h);
}

.control-right {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.arena {
  margin-top: 14px;
  border-top: 1px solid rgba(229, 228, 231, 0.9);
  padding-top: 14px;
}

.match-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: baseline;
  margin-bottom: 12px;
}

.arena-title {
  font-weight: 900;
  color: var(--text-h);
}

.progress {
  font-family: var(--mono);
  color: var(--text);
  font-size: 13px;
}

.match-body {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(26, 47, 90, 0.12);
  background: rgba(26, 47, 90, 0.05);
}

.horse-track {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.horse-chip {
  font-weight: 900;
  color: var(--text-h);
}

.horse-value {
  font-size: 30px;
  font-weight: 900;
  color: var(--text-h);
}

.vs {
  font-weight: 900;
  color: var(--text-h);
}

.finished-title {
  padding: 18px;
  border-radius: 16px;
  border: 1px dashed rgba(26, 47, 90, 0.25);
  color: var(--text-h);
  font-weight: 900;
  text-align: center;
}

.scoreboard {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 12px;
  font-weight: 800;
  color: var(--text);
}

.score-item strong {
  color: var(--text-h);
}

.match-list {
  margin-top: 14px;
}

.match-list-head {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.match-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-item {
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.55);
  padding: 12px;
}

:global(.dark) .match-item {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.round-tag {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--text-h);
  margin-bottom: 8px;
  font-weight: 900;
}

.match-line {
  display: flex;
  gap: 10px;
  align-items: center;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 6px;
}

.t-val,
.q-val {
  color: var(--text-h);
}

.arrow {
  opacity: 0.6;
}

.result {
  font-weight: 900;
  margin-bottom: 6px;
}

.result.win {
  color: #16a34a;
}

.result.lose {
  color: #dc2626;
}

.result.draw {
  color: #f59e0b;
}

.reason {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}

.note {
  color: var(--text);
  font-size: 13px;
}

.charts {
  margin-top: 16px;
  padding-top: 8px;
}

.charts-head {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.bar-chart {
  height: 320px;
  width: 100%;
  background: rgba(26, 47, 90, 0.04);
  border: 1px solid rgba(26, 47, 90, 0.08);
  border-radius: 16px;
}

.empty-chart {
  padding: 14px;
  border-radius: 16px;
  background: rgba(26, 47, 90, 0.04);
  border: 1px dashed rgba(26, 47, 90, 0.2);
  color: var(--text);
}

.greedy-detail {
  margin-top: 14px;
  display: grid;
  gap: 14px;
}

.detail-block {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(229, 228, 231, 0.95);
  border-radius: 16px;
  padding: 14px;
}

:global(.dark) .detail-block {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.detail-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.order-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.order-pill {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(245, 166, 35, 0.12);
  border: 1px solid rgba(245, 166, 35, 0.25);
  font-family: var(--mono);
  color: var(--text-h);
  font-weight: 900;
}

.step-list {
  display: grid;
  gap: 10px;
}

.step-item {
  text-align: left;
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.6);
  padding: 12px;
  cursor: pointer;
}

:global(.dark) .step-item {
  background: rgba(22, 23, 29, 0.75);
  border-color: rgba(46, 48, 58, 0.95);
}

.step-item.active {
  border-color: rgba(245, 166, 35, 0.45);
  background: rgba(245, 166, 35, 0.1);
}

.step-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.step-round {
  font-family: var(--mono);
  font-weight: 900;
  color: var(--text-h);
}

.step-res {
  font-family: var(--mono);
  font-weight: 900;
}

.step-res.win {
  color: #16a34a;
}

.step-res.lose {
  color: #dc2626;
}

.step-res.draw {
  color: #f59e0b;
}

.step-body {
  color: var(--text-h);
  font-weight: 800;
  margin-bottom: 4px;
}

.step-reason {
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}
</style>

