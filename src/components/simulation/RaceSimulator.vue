<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import courses from '../../data/courses.json'

const route = useRoute()
const courseId = computed(() => String(route.params.id ?? ''))
const course = computed(() => courses.find((c) => c.id === courseId.value) ?? courses[0])
const sim = computed(() => course.value?.simulation ?? {})

const n = ref(sim.value.defaultHorses ?? 3)
const tianji = ref([...(sim.value.classicTianji ?? [90, 85, 70])])
const qi = ref([...(sim.value.classicQi ?? [95, 88, 75])])
const strategy = ref('greedy') // greedy | random | custom
const speedMs = ref(900)

const customOrder = ref([])
const dragIndex = ref(-1)

const battleRounds = ref([])
const currentRound = ref(0)
const battleStarted = ref(false)
const isAuto = ref(false)
let autoTimer = null

const compareMoney = ref({ greedy: null, random: null, custom: null })
const compareLabel = {
  greedy: '贪心算法',
  random: '随机匹配',
  custom: '自定义排列',
}

watch(
  () => sim.value,
  (s) => {
    const max = s.maxHorses ?? 5
    if (n.value > max) n.value = max
  },
  { deep: true },
)

watch(n, (raw) => {
  const max = sim.value.maxHorses ?? 5
  let len = Math.min(Math.max(1, Number(raw) || 1), max)
  if (len !== n.value) {
    n.value = len
    return
  }
  while (tianji.value.length < len) tianji.value.push(70)
  while (qi.value.length < len) qi.value.push(75)
  if (tianji.value.length > len) tianji.value = tianji.value.slice(0, len)
  if (qi.value.length > len) qi.value = qi.value.slice(0, len)
  syncCustomOrder()
  resetBattle()
})

watch([tianji, qi, strategy], () => {
  syncCustomOrder()
  resetBattle()
})

onBeforeUnmount(() => stopAuto())

function sortAsc(arr) {
  return [...arr].sort((a, b) => a - b)
}

function scoreDelta(tVal, qVal) {
  if (tVal > qVal) return 200
  if (tVal < qVal) return -200
  return 0
}

function resultText(delta) {
  if (delta > 0) return '胜'
  if (delta < 0) return '负'
  return '平'
}

function parseNums(s) {
  return String(s)
    .trim()
    .split(/[\s,，]+/)
    .filter(Boolean)
    .map(Number)
    .filter((x) => !Number.isNaN(x))
}

const tianjiInput = ref(tianji.value.join(' '))
const qiInput = ref(qi.value.join(' '))

watch(tianji, (v) => (tianjiInput.value = v.join(' ')), { deep: true })
watch(qi, (v) => (qiInput.value = v.join(' ')), { deep: true })

function applyInputs() {
  const ta = parseNums(tianjiInput.value)
  const qa = parseNums(qiInput.value)
  const max = sim.value.maxHorses ?? 10
  if (ta.length === 0 || ta.length !== qa.length) return
  if (ta.length > max) {
    tianji.value = ta.slice(0, max)
    qi.value = qa.slice(0, max)
    n.value = max
  } else {
    tianji.value = ta
    qi.value = qa
    n.value = ta.length
  }
}

function loadClassic() {
  const c = sim.value.classicN ?? 3
  n.value = c
  tianji.value = [...(sim.value.classicTianji ?? [])].slice(0, c)
  qi.value = [...(sim.value.classicQi ?? [])].slice(0, c)
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function randomPowers() {
  // n=1/2 在「每档齐王>田忌且总战力田忌<齐王」下，难以出现经典贪心净胜；演示以 3 匹及以上为宜
  if (n.value < 3) n.value = 3
  const len = n.value
  if (len <= 0) return

  const maxTry = 450
  for (let attempt = 0; attempt < maxTry; attempt++) {
    // 分档生成：齐王降序、田忌同档更弱；全局 max∈齐王、min∈田忌、sum(田忌)<sum(齐王)
    const q = new Array(len)
    q[0] = randInt(92, 108)
    for (let i = 1; i < len; i++) {
      const down = randInt(4, 12)
      q[i] = Math.max(40, q[i - 1] - down)
    }

    const t = q.map((qv, i) => {
      const gap = randInt(5, 16) + Math.floor(i / 2)
      return Math.max(20, qv - gap)
    })

    for (let i = 1; i < len; i++) {
      if (t[i] >= t[i - 1]) t[i] = Math.max(20, t[i - 1] - randInt(1, 4))
      if (t[i] >= q[i]) t[i] = Math.max(20, q[i] - randInt(3, 8))
    }
    if (t[0] >= q[0]) t[0] = Math.max(20, q[0] - randInt(6, 12))

    t[len - 1] = Math.min(t[len - 1], q[len - 1] - randInt(3, 7))

    for (let i = 0; i < len; i++) {
      if (t[i] >= q[i]) t[i] = Math.max(20, q[i] - randInt(1, 3))
    }

    const sumT = t.reduce((a, b) => a + b, 0)
    const sumQ = q.reduce((a, b) => a + b, 0)
    if (sumT >= sumQ) continue

    const globalMin = Math.min(...t, ...q)
    const globalMax = Math.max(...t, ...q)
    if (!(t.includes(globalMin) && q.includes(globalMax))) continue

    const { money, hasWeakVsStrong } = evalGreedyMeta(t, q)
    // 整场净银币为正（田忌最终胜利）；且贪心路径中需出现「最弱对最强」弃子局（该场多为战力上的负场）
    if (money <= 0) continue
    if (len >= 2 && !hasWeakVsStrong) continue

    qi.value = q
    tianji.value = t
    return
  }

  loadClassic()
}

function evalGreedyMeta(tArr, qArr) {
  const rounds = enrichRounds(greedyPlan(tArr, qArr))
  const money = rounds.length ? rounds[rounds.length - 1].moneyAfter : 0
  const hasWeakVsStrong = rounds.some((r) => /最弱对最强/.test(String(r.pick ?? '')))
  return { money, hasWeakVsStrong, rounds }
}

function syncCustomOrder() {
  customOrder.value = tianji.value.map((v, idx) => ({ id: `${idx}-${v}`, power: v }))
}

function moveCustom(idx, step) {
  const j = idx + step
  if (j < 0 || j >= customOrder.value.length) return
  ;[customOrder.value[idx], customOrder.value[j]] = [customOrder.value[j], customOrder.value[idx]]
}

function onDragStart(i) {
  dragIndex.value = i
}

function onDrop(i) {
  const from = dragIndex.value
  dragIndex.value = -1
  if (from < 0 || from === i) return
  const arr = [...customOrder.value]
  const [item] = arr.splice(from, 1)
  arr.splice(i, 0, item)
  customOrder.value = arr
}

function greedyPlan(tArr, qArr) {
  const t = sortAsc(tArr.map(Number))
  const q = sortAsc(qArr.map(Number))
  let i = 0
  let j = t.length - 1
  let k = 0
  let l = q.length - 1
  const rounds = []
  for (let round = 0; round < t.length; round++) {
    const tStrong = t[j]
    const tWeak = t[i]
    const qStrong = q[l]
    const qWeak = q[k]
    if (tStrong > qStrong) {
      rounds.push({
        round: round + 1,
        t: tStrong,
        q: qStrong,
        pick: '最强对最强，确保拿下这一分',
      })
      j--
      l--
    } else if (tWeak > qWeak) {
      rounds.push({
        round: round + 1,
        t: tWeak,
        q: qWeak,
        pick: '最弱对最弱，用最小代价取胜',
      })
      i++
      k++
    } else {
      rounds.push({
        round: round + 1,
        t: tWeak,
        q: qStrong,
        pick: '无必胜局：最弱对最强，保留强马争后续胜场',
      })
      i++
      l--
    }
  }
  return rounds
}

function randomPlan(tArr, qArr) {
  const t = [...tArr]
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[t[i], t[j]] = [t[j], t[i]]
  }
  // 按需求：仅打乱田忌顺序，齐王顺序保持输入不变，便于对比策略差异
  const q = [...qArr]
  return t.map((tv, i) => ({ round: i + 1, t: tv, q: q[i], pick: '随机匹配' }))
}

function customPlan(tArr, qArr) {
  const t = customOrder.value.map((x) => x.power)
  // 自定义策略同样只调整田忌出场顺序，齐王保持输入顺序
  const q = [...qArr]
  return t.map((tv, i) => ({ round: i + 1, t: tv, q: q[i], pick: '用户自定义出场顺序' }))
}

function enrichRounds(rounds) {
  let money = 0
  let win = 0
  let lose = 0
  let draw = 0
  return rounds.map((r) => {
    const delta = scoreDelta(r.t, r.q)
    if (delta > 0) win++
    else if (delta < 0) lose++
    else draw++
    money += delta
    return {
      ...r,
      delta,
      result: resultText(delta),
      moneyAfter: money,
      winAfter: win,
      loseAfter: lose,
      drawAfter: draw,
    }
  })
}

function buildRoundsByStrategy(key) {
  const ta = [...tianji.value]
  const qa = [...qi.value]
  if (!ta.length || ta.length !== qa.length) return []
  if (key === 'greedy') return enrichRounds(greedyPlan(ta, qa))
  if (key === 'random') return enrichRounds(randomPlan(ta, qa))
  return enrichRounds(customPlan(ta, qa))
}

const stepsForGreedy = computed(() => buildRoundsByStrategy('greedy'))

const currentRoundData = computed(() => {
  if (!battleRounds.value.length) return null
  return battleRounds.value[currentRound.value - 1] ?? null
})

const progressPercent = computed(() => {
  if (!battleRounds.value.length) return 0
  return Math.round((currentRound.value / battleRounds.value.length) * 100)
})

const currentMoney = computed(() => currentRoundData.value?.moneyAfter ?? 0)
const currentWin = computed(() => currentRoundData.value?.winAfter ?? 0)
const currentLose = computed(() => currentRoundData.value?.loseAfter ?? 0)
const currentDraw = computed(() => currentRoundData.value?.drawAfter ?? 0)

/** 本局对阵结果短片（public/videos） */
const OUTCOME_CLIP = {
  draw: '/videos/Draw.mp4',
  qiWin: '/videos/QiWins.mp4',
  tianjiWin: '/videos/TianjiWins.mp4',
}

const roundOutcomeClipSrc = computed(() => {
  const d = currentRoundData.value?.delta
  if (d === undefined || currentRoundData.value == null) return ''
  if (d > 0) return OUTCOME_CLIP.tianjiWin
  if (d < 0) return OUTCOME_CLIP.qiWin
  return OUTCOME_CLIP.draw
})

const roundOutcomeClipKey = computed(() => {
  if (!battleStarted.value || !currentRoundData.value) return 'idle'
  return `r${currentRound.value}-d${currentRoundData.value.delta}`
})

const finishedCurrent = computed(() => battleRounds.value.length > 0 && currentRound.value === battleRounds.value.length)

const compareRows = computed(() => {
  const entries = Object.keys(compareMoney.value)
    .filter((k) => compareMoney.value[k] != null)
    .map((k) => ({ key: k, label: compareLabel[k], money: compareMoney.value[k] }))
  if (!entries.length) return []
  const min = Math.min(...entries.map((x) => x.money))
  const max = Math.max(...entries.map((x) => x.money))
  const span = Math.max(1, max - min)
  return entries.map((e) => ({
    ...e,
    bar: Math.round(((e.money - min) / span) * 100),
  }))
})

function startBattle() {
  stopAuto()
  battleRounds.value = buildRoundsByStrategy(strategy.value)
  battleStarted.value = true
  currentRound.value = battleRounds.value.length ? 1 : 0
  updateCompareScoreIfFinished()
}

function replayBattle() {
  startBattle()
}

function nextRound() {
  if (!battleRounds.value.length) return
  if (currentRound.value < battleRounds.value.length) currentRound.value++
  updateCompareScoreIfFinished()
}

function prevRound() {
  if (!battleRounds.value.length) return
  if (currentRound.value > 1) currentRound.value--
}

function toggleAuto() {
  if (isAuto.value) {
    stopAuto()
    return
  }
  if (!battleRounds.value.length) startBattle()
  isAuto.value = true
  autoTimer = window.setInterval(() => {
    if (currentRound.value >= battleRounds.value.length) {
      stopAuto()
      return
    }
    nextRound()
  }, speedMs.value)
}

function stopAuto() {
  isAuto.value = false
  if (autoTimer) {
    window.clearInterval(autoTimer)
    autoTimer = null
  }
}

function updateCompareScoreIfFinished() {
  if (!finishedCurrent.value) return
  compareMoney.value = {
    ...compareMoney.value,
    [strategy.value]: currentMoney.value,
  }
}

function resetBattle() {
  stopAuto()
  battleStarted.value = false
  battleRounds.value = []
  currentRound.value = 0
}
</script>

<template>
  <div class="sim">
    <p class="lead">
      胜一场 <strong>+200</strong> 银币，负一场 <strong>-200</strong>，平局 <strong>0</strong>。贪心策略下常会出现「田忌最弱马对齐王最强马」的弃子局（该场按战力多为负），但总战力仍可有「田忌 &lt; 齐王」，且整场净银币为正——即田忌最终在赛制上取胜。「随机生成」会自动满足上述教学设定（n≥3）。
    </p>

    <div class="controls">
      <label class="field">
        <span class="lbl">马匹数量 n（1–{{ sim.maxHorses ?? 5 }}）</span>
        <input v-model.number="n" type="range" :min="1" :max="sim.maxHorses ?? 5" />
        <span class="mono">{{ n }}</span>
      </label>

      <div class="btn-row">
        <button type="button" class="btn" @click="loadClassic">使用经典数据</button>
        <button type="button" class="btn secondary" @click="randomPowers">随机生成</button>
      </div>
    </div>

    <div class="grid-inputs">
      <label class="field block">
        <span class="lbl">田忌战力（空格或逗号分隔）</span>
        <textarea v-model="tianjiInput" class="nums" rows="2" @blur="applyInputs" />
      </label>
      <label class="field block">
        <span class="lbl">齐王战力</span>
        <textarea v-model="qiInput" class="nums" rows="2" @blur="applyInputs" />
      </label>
    </div>

    <div class="strategy-block">
      <div class="lbl">策略选择区</div>
      <div class="strategy-row">
        <label class="radio"><input v-model="strategy" type="radio" value="greedy" /> 贪心算法（最优）</label>
        <label class="radio"><input v-model="strategy" type="radio" value="random" /> 随机匹配</label>
        <label class="radio"><input v-model="strategy" type="radio" value="custom" /> 自定义排列</label>
      </div>
      <div v-if="strategy === 'custom'" class="custom-order">
        <div class="muted">拖拽或上下移动调整田忌出场顺序</div>
        <div class="order-list">
          <div
            v-for="(item, idx) in customOrder"
            :key="item.id"
            class="order-item"
            draggable="true"
            @dragstart="onDragStart(idx)"
            @dragover.prevent
            @drop="onDrop(idx)"
          >
            <span class="mono">#{{ idx + 1 }} · {{ item.power }}</span>
            <span>
              <button type="button" class="mini-btn" @click="moveCustom(idx, -1)">↑</button>
              <button type="button" class="mini-btn" @click="moveCustom(idx, 1)">↓</button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="battle-controls">
      <button type="button" class="btn" @click="startBattle">开始对战</button>
      <button type="button" class="btn ghost" :disabled="!battleStarted" @click="prevRound">上一场</button>
      <button type="button" class="btn ghost" :disabled="!battleStarted" @click="nextRound">下一场</button>
      <button type="button" class="btn ghost" :disabled="!battleStarted" @click="toggleAuto">
        {{ isAuto ? '停止自动播放' : '自动播放' }}
      </button>
      <button type="button" class="btn ghost" :disabled="!battleStarted" @click="replayBattle">重播</button>
      <label class="speed">
        速度
        <select v-model.number="speedMs">
          <option :value="1200">慢</option>
          <option :value="900">中</option>
          <option :value="600">快</option>
        </select>
      </label>
    </div>

    <div class="progress-block">
      <div class="mono">第 {{ currentRound || 0 }} 场 / 共 {{ battleRounds.length || 0 }} 场</div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <div class="score-board">
        <span>胜 {{ currentWin }}</span>
        <span>负 {{ currentLose }}</span>
        <span>平 {{ currentDraw }}</span>
        <span class="mono">银币 {{ currentMoney >= 0 ? '+' : '' }}{{ currentMoney }}</span>
      </div>
    </div>

    <div class="battle-stage">
      <template v-if="currentRoundData">
        <div class="horse-card tianji">
          <div class="horse-title">田忌</div>
          <div class="horse-power mono">{{ currentRoundData.t }}</div>
        </div>
        <div class="vs">VS</div>
        <div class="horse-card qi">
          <div class="horse-title">齐王</div>
          <div class="horse-power mono">{{ currentRoundData.q }}</div>
        </div>
        <div class="battle-result" :class="{ win: currentRoundData.delta > 0, lose: currentRoundData.delta < 0 }">
          {{ currentRoundData.result }} · {{ currentRoundData.delta > 0 ? '+' : '' }}{{ currentRoundData.delta }}
        </div>
      </template>
      <div v-else class="muted">点击“开始对战”进入逐场动画演示区</div>
    </div>

    <div v-if="battleStarted && currentRoundData && roundOutcomeClipSrc" class="round-outcome-clip">
      <div class="lbl">
        本局结果动画
        <span class="clip-hint muted">{{
          currentRoundData.delta > 0 ? '（田忌胜）' : currentRoundData.delta < 0 ? '（齐王胜）' : '（平局）'
        }}</span>
      </div>
      <video
        :key="roundOutcomeClipKey"
        class="round-clip-video"
        :src="roundOutcomeClipSrc"
        playsinline
        muted
        autoplay
        controls
        preload="auto"
      />
    </div>

    <div class="summary-grid">
      <div class="block">
        <div class="lbl">本次策略结果</div>
        <div class="muted">当前策略：{{ compareLabel[strategy] }}</div>
        <div class="mono">胜 {{ currentWin }} / 负 {{ currentLose }} / 平 {{ currentDraw }}</div>
        <div class="mono">总银币：{{ currentMoney >= 0 ? '+' : '' }}{{ currentMoney }}</div>
        <div v-if="strategy === 'greedy'" class="muted">
          最优出场顺序：{{ battleRounds.map((x) => x.t).join(' → ') || '-' }}
        </div>
      </div>

      <div class="block">
        <div class="lbl">多策略对比图（至少跑两种策略）</div>
        <div v-if="compareRows.length >= 2" class="bars">
          <div v-for="row in compareRows" :key="row.key" class="bar-row">
            <span class="bar-name">{{ row.label }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${Math.max(8, row.bar)}%` }"></div>
            </div>
            <span class="mono bar-val">{{ row.money }}</span>
          </div>
        </div>
        <div v-else class="muted">请先跑完至少两种策略。</div>
      </div>
    </div>

    <div class="block">
      <div class="lbl">算法步骤回放（贪心）</div>
      <div class="steps">
        <div v-for="s in stepsForGreedy" :key="s.round" class="step-line">
          <span class="mono r">第 {{ s.round }} 轮</span>
          <span>{{ s.pick }}</span>
          <span class="mono">（{{ s.t }} vs {{ s.q }}，{{ s.result }} {{ s.delta > 0 ? '+' : '' }}{{ s.delta }}）</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sim { display: flex; flex-direction: column; gap: 14px; }
.lead { margin: 0; color: var(--text); line-height: 1.75; }
.lead strong { color: var(--text-h); }
.controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field.block { flex: 1; min-width: 200px; }
.lbl { font-weight: 800; font-size: 13px; color: var(--text-h); }
.grid-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 720px) { .grid-inputs { grid-template-columns: 1fr; } }
.nums { font-family: var(--mono); padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text-h); resize: vertical; }
.btn-row, .strategy-row, .battle-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.btn { border-radius: 12px; border: 1px solid var(--accent-border); background: var(--accent-bg); color: var(--text-h); font-weight: 900; padding: 8px 14px; cursor: pointer; }
.btn.secondary { background: rgba(26, 47, 90, 0.06); border-color: var(--border-strong); }
.btn.ghost { background: transparent; font-weight: 800; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.strategy-block, .progress-block, .block { padding: 12px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255,255,255,0.35); }
:global(.dark) .strategy-block, :global(.dark) .progress-block, :global(.dark) .block { background: rgba(22,23,29,0.55); }
.radio { font-size: 14px; color: var(--text); display: inline-flex; gap: 6px; align-items: center; }
.custom-order { margin-top: 8px; }
.order-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.order-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-elevated); }
.mini-btn { width: 28px; height: 28px; margin-left: 4px; border-radius: 8px; border: 1px solid var(--border); background: transparent; cursor: pointer; }
.speed { font-size: 13px; display: inline-flex; gap: 6px; align-items: center; }
.speed select { border-radius: 8px; border: 1px solid var(--border); padding: 4px 6px; }
.progress-bar { width: 100%; height: 10px; border-radius: 999px; background: rgba(26,47,90,0.1); margin-top: 8px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #f5a623, #1a2f5a); }
.score-board { margin-top: 8px; display: flex; gap: 12px; flex-wrap: wrap; font-size: 14px; color: var(--text); }
.battle-stage { min-height: 110px; border-radius: 14px; border: 1px dashed var(--border); padding: 12px; display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center; }
.horse-card { border-radius: 12px; border: 1px solid var(--border); padding: 10px; text-align: center; }
.horse-title { font-weight: 800; color: var(--text-h); }
.horse-power { margin-top: 4px; font-size: 22px; font-weight: 900; }
.vs { font-weight: 900; color: var(--text-muted); text-align: center; }
.battle-result { grid-column: 1 / -1; text-align: center; font-weight: 900; color: var(--text-h); }
.battle-result.win { color: #15803d; }
.battle-result.lose { color: #b91c1c; }
.round-outcome-clip {
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.35);
}
:global(.dark) .round-outcome-clip {
  background: rgba(22, 23, 29, 0.55);
}
.round-outcome-clip .lbl {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.clip-hint {
  font-weight: 600;
  font-size: 12px;
}
.round-clip-video {
  display: block;
  width: 100%;
  max-height: min(52vw, 320px);
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #000;
  object-fit: contain;
}
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 820px) { .summary-grid { grid-template-columns: 1fr; } }
.bars { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.bar-row { display: grid; grid-template-columns: 92px 1fr auto; gap: 8px; align-items: center; }
.bar-name { font-size: 12px; color: var(--text-h); }
.bar-track { height: 10px; border-radius: 999px; background: rgba(26,47,90,0.1); overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, rgba(245,166,35,.75), rgba(26,47,90,.75)); }
.bar-val { font-size: 12px; }
.steps { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.step-line { padding: 10px 12px; border-radius: 14px; border: 1px solid var(--border); background: rgba(255, 255, 255, 0.35); font-size: 14px; }
:global(.dark) .step-line { background: rgba(22, 23, 29, 0.55); }
.mono { font-family: var(--mono); }
.muted { color: var(--text-muted); font-size: 14px; }
.r { font-weight: 900; margin-right: 8px; }
</style>
