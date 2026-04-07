<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
  course: { type: Object, required: true },
})

const fb = computed(() => props.course.studentFeedback ?? {})
const baseCards = computed(() => fb.value.cards ?? [])
const userComments = ref([])
const commentText = ref('')
const commentTag = ref('建议')
const noteOpen = ref(false)
const issueOpen = ref(false)
const reflectionNoteText = ref('')
const reflectionNotes = ref([])
const issueType = ref('内容错误')
const issueText = ref('')
const issueList = ref([])

const cards = computed(() => {
  const normalizedUser = userComments.value.map((c, idx) => ({
    id: `U${idx + 1}`,
    summary: c.summary,
    tags: c.tags,
    sentiment: c.sentiment,
  }))
  return [...baseCards.value, ...normalizedUser]
})

function collectSummaryTerms(text) {
  const raw = String(text ?? '')
  const parts = raw
    .split(/[，。；、,.!?！？\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const stop = new Set(['我们', '你们', '这个', '那个', '可以', '非常', '一个', '一些', '以及', '如果'])
  return parts.filter((p) => p.length >= 2 && p.length <= 8 && !stop.has(p))
}

function buildFreqMap() {
  const map = new Map()
  for (const c of cards.value) {
    for (const t of c.tags ?? []) {
      const key = String(t ?? '').trim()
      if (!key) continue
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    for (const w of collectSummaryTerms(c.summary)) {
      map.set(w, (map.get(w) ?? 0) + 1)
    }
  }
  return map
}

const fixedHighFreqOrder = ['直观', '清晰', '贪心', '动画', '有趣', '结构化']

const radarRef = ref(null)
let radarChart

function buildWordData() {
  const count = buildFreqMap()
  const arr = fixedHighFreqOrder.map((name) => ({
    name,
    freq: count.get(name) ?? 1,
  }))
  arr.sort((a, b) => b.freq - a.freq)

  // 按频次线性映射字号：最高频最大，依次递减
  const max = arr[0]?.freq ?? 1
  const min = arr[arr.length - 1]?.freq ?? 1
  const span = Math.max(1, max - min)
  return arr.map((x, idx) => {
    // 若频次都一样，按排名逐级递减，避免视觉上“全一样”
    const ranked = arr.length <= 1 ? 1 : 1 - idx / (arr.length - 1)
    const ratio = max === min ? ranked : (x.freq - min) / span
    return {
      name: x.name,
      value: x.freq,
      // 16~54：保证视觉差异明显
      textSize: Math.round(16 + ratio * 38),
    }
  })
}

function hashString(s) {
  let h = 0
  const str = String(s ?? '')
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

const cloudWords = computed(() => {
  const src = buildWordData()
  // 先按词频/字号降序，保证大词优先占位
  const ranked = [...src].sort((a, b) => b.textSize - a.textSize)
  const placed = []

  return ranked.map((w, idx) => {
    const seed = hashString(w.name)
    const rot = (seed % 21) - 10 // -10deg ~ +10deg
    const fontPx = w.textSize
    // 粗略估算词占位框（按字符长度）
    const bw = Math.max(28, w.name.length * fontPx * 0.62)
    const bh = Math.max(18, fontPx * 1.05)

    let best = null
    // 在椭圆内多次尝试，找到与已放置词不冲突的位置
    for (let t = 0; t < 28; t++) {
      const angle = (((seed + t * 47) % 360) * Math.PI) / 180 + idx * 0.37
      const radial = 0.2 + (((seed >> 4) + t * 19) % 75) / 100 // 0.2~0.95
      const rr = Math.min(0.95, radial)
      const x = 50 + Math.cos(angle) * rr * 42
      const y = 50 + Math.sin(angle) * rr * 30

      const overlap = placed.some((p) => {
        const dx = Math.abs(x - p.x)
        const dy = Math.abs(y - p.y)
        const needX = ((bw + p.bw) / 2) / 3.8 // px -> percent 近似换算
        const needY = ((bh + p.bh) / 2) / 2.5
        return dx < needX && dy < needY
      })

      if (!overlap) {
        best = { x, y, bw, bh }
        break
      }
      if (!best) best = { x, y, bw, bh }
    }

    placed.push(best)
    return { ...w, rot, x: best.x, y: best.y }
  })
})

const highFreqWords = computed(() => {
  const count = buildFreqMap()
  const arr = fixedHighFreqOrder.map((word, idx) => ({
    word,
    freq: count.get(word) ?? 1, // 至少为 1，保证视觉可见
    order: idx,
  }))
  arr.sort((a, b) => (b.freq - a.freq) || (a.order - b.order))
  const max = arr[0]?.freq ?? 1
  return arr.map((x) => ({
    ...x,
    scale: Math.max(0.7, Math.min(1.6, 0.7 + (x.freq / max) * 0.9)),
  }))
})

function wordColor(freq) {
  if (freq >= 3) return 'word-hot'
  if (freq >= 2) return 'word-warm'
  return 'word-cool'
}

function highlightTags(summary, tags) {
  const text = String(summary ?? '')
  const list = Array.isArray(tags) ? tags : []
  if (!list.length) return text
  const escaped = list
    .map((t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter(Boolean)
  if (!escaped.length) return text
  const re = new RegExp(`(${escaped.join('|')})`, 'g')
  return text.replace(re, '<mark>$1</mark>')
}

function submitComment() {
  const text = commentText.value.trim()
  if (!text) return
  const tags = text
    .split(/[\s,，。；;、]+/)
    .filter(Boolean)
    .slice(0, 3)
  userComments.value.push({
    summary: text,
    sentiment: commentTag.value,
    tags: tags.length ? tags : ['反馈'],
  })
  commentText.value = ''
}

function submitReflectionNote() {
  const text = reflectionNoteText.value.trim()
  if (!text) return
  reflectionNotes.value.unshift({
    id: `N${Date.now()}`,
    content: text,
    time: new Date().toLocaleString(),
  })
  reflectionNoteText.value = ''
  noteOpen.value = false
}

function submitIssue() {
  const text = issueText.value.trim()
  if (!text) return
  issueList.value.unshift({
    id: `I${Date.now()}`,
    type: issueType.value,
    content: text,
    time: new Date().toLocaleString(),
  })
  issueText.value = ''
  issueType.value = '内容错误'
  issueOpen.value = false
}

function initCharts() {
  if (radarRef.value && fb.value.radarLabels?.length) {
    radarChart?.dispose()
    radarChart = echarts.init(radarRef.value)
    const labels = fb.value.radarLabels
    const scores = fb.value.radarScores ?? []
    radarChart.setOption({
      tooltip: {},
      radar: {
        indicator: labels.map((n) => ({ name: n, max: 5 })),
        radius: '66%',
      },
      series: [
        {
          type: 'radar',
          data: [{ value: scores, name: '综合评价', areaStyle: { opacity: 0.22 } }],
          lineStyle: { color: '#f5a623' },
          itemStyle: { color: '#1a2f5a' },
        },
      ],
    })
  }
}

function onResize() {
  radarChart?.resize()
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', onResize)
})

watch(cards, () => initCharts(), { deep: true })

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  radarChart?.dispose()
})
</script>

<template>
  <div class="fb">
    <p v-if="fb.teacherNote" class="note">{{ fb.teacherNote }}</p>

    <div class="charts">
      <div class="chart-box">
        <div class="chart-title">反馈词云（频次越高越大）</div>
        <div class="cloud-box">
          <div class="cloud-ellipse" aria-hidden="true"></div>
          <span
            v-for="w in cloudWords"
            :key="w.name"
            class="cloud-word"
            :class="wordColor(w.value)"
            :data-freq="`频次 ${w.value}`"
            :style="{
              fontSize: `${w.textSize}px`,
              transform: `translate(-50%, -50%) rotate(${w.rot}deg)`,
              left: `${w.x}%`,
              top: `${w.y}%`,
            }"
            :title="`${w.name} · 频次 ${w.value}`"
          >
            {{ w.name }}
          </span>
        </div>
        <div class="hf-title">高频词（大小/颜色区分）</div>
        <div class="hf-words">
          <span
            v-for="w in highFreqWords"
            :key="w.word"
            class="hf-word"
            :class="wordColor(w.freq)"
            :style="{ fontSize: `${Math.round(12 * w.scale)}px` }"
          >
            {{ w.word }}
          </span>
        </div>
      </div>
      <div class="chart-box">
        <div class="chart-title">维度雷达（原型示例数据）</div>
        <div ref="radarRef" class="chart" />
      </div>
    </div>

    <div class="cards">
      <div v-for="c in cards" :key="c.id" class="card" :data-sent="c.sentiment">
        <div class="card-top">
          <span class="pill">{{ c.sentiment }}</span>
          <span class="id mono">{{ c.id }}</span>
        </div>
        <p class="sum" v-html="highlightTags(c.summary, c.tags)" />
        <div class="tags">
          <span v-for="t in c.tags" :key="t" class="tag">{{ t }}</span>
        </div>
      </div>
    </div>

    <div class="action-grid">
      <div class="comment-box">
        <div class="chart-title">反思笔记</div>
        <div class="action-top">
          <p class="action-desc">可选择是否记录本节课的反思内容。</p>
          <button type="button" class="submit-btn" @click="noteOpen = !noteOpen">
            {{ noteOpen ? '取消记录' : '记录反思笔记' }}
          </button>
        </div>
        <div v-if="noteOpen" class="comment-row single-col">
          <textarea
            v-model="reflectionNoteText"
            class="comment-input"
            rows="3"
            placeholder="例如：今天理解了贪心策略的关键在于比较最强和最弱马的组合。"
          />
          <button type="button" class="submit-btn" @click="submitReflectionNote">保存笔记</button>
        </div>
        <div v-if="reflectionNotes.length" class="entry-list">
          <div v-for="n in reflectionNotes" :key="n.id" class="entry-card">
            <p class="entry-text">{{ n.content }}</p>
            <span class="entry-time">{{ n.time }}</span>
          </div>
        </div>
      </div>

      <div class="comment-box">
        <div class="chart-title">问题反馈</div>
        <div class="action-top">
          <p class="action-desc">发现问题可主动提交，便于老师后续优化内容。</p>
          <button type="button" class="submit-btn" @click="issueOpen = !issueOpen">
            {{ issueOpen ? '取消反馈' : '提交问题反馈' }}
          </button>
        </div>
        <div v-if="issueOpen" class="comment-row single-col">
          <select v-model="issueType" class="sent-select">
            <option value="内容错误">内容错误</option>
            <option value="表述不清">表述不清</option>
            <option value="功能异常">功能异常</option>
            <option value="其他建议">其他建议</option>
          </select>
          <textarea
            v-model="issueText"
            class="comment-input"
            rows="3"
            placeholder="请描述你遇到的问题，例如：第2段动画播放速度过快，步骤看不清。"
          />
          <button type="button" class="submit-btn" @click="submitIssue">提交反馈</button>
        </div>
        <div v-if="issueList.length" class="entry-list">
          <div v-for="i in issueList" :key="i.id" class="entry-card">
            <p class="entry-text"><b>[{{ i.type }}]</b> {{ i.content }}</p>
            <span class="entry-time">{{ i.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="comment-box">
      <div class="chart-title">发表评论（展示为反馈卡片）</div>
      <div class="comment-row">
        <select v-model="commentTag" class="sent-select">
          <option value="正面">正面评价</option>
          <option value="建议">改进建议</option>
        </select>
        <textarea
          v-model="commentText"
          class="comment-input"
          rows="3"
          placeholder="写下你的学习感受或改进建议（提交后会展示在上方卡片中）"
        />
        <button type="button" class="submit-btn" @click="submitComment">提交评论</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fb {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.note {
  margin: 0;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--brand-bg-subtle);
  color: var(--text);
  line-height: 1.75;
  font-size: 14px;
}
.charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 900px) {
  .charts {
    grid-template-columns: 1fr;
  }
}
.chart-box {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.35);
  padding: 10px;
}
:global(.dark) .chart-box {
  background: rgba(22, 23, 29, 0.55);
}
.chart-title {
  font-weight: 900;
  color: var(--text-h);
  font-size: 14px;
  padding: 4px 6px 2px;
}
.hf-title {
  margin: 8px 4px 4px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 700;
}
.hf-words {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 4px 6px;
}
.hf-word {
  font-weight: 800;
  line-height: 1;
}
.word-hot { color: #b91c1c; }
.word-warm { color: #d97706; }
.word-cool { color: #1a2f5a; }
.chart {
  width: 100%;
  height: 280px;
}
.cloud-box {
  min-height: 240px;
  border-radius: 12px;
  border: 1px dashed var(--border);
  padding: 14px;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.25);
}
:global(.dark) .cloud-box {
  background: rgba(22, 23, 29, 0.45);
}
.cloud-ellipse {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 86%;
  height: 68%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(245, 166, 35, 0.12), transparent 72%);
  pointer-events: none;
}
.cloud-word {
  position: absolute;
  font-weight: 800;
  line-height: 1.1;
  user-select: none;
  display: inline-block;
  transform-origin: center;
  transition: transform 0.2s ease;
  white-space: nowrap;
  cursor: default;
}
.cloud-word:hover {
  transform: translate(-50%, -50%) scale(1.08) !important;
  filter: drop-shadow(0 2px 6px rgba(15, 23, 41, 0.25));
  z-index: 3;
}
.cloud-word::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -8px;
  transform: translate(-50%, -100%);
  font-size: 11px;
  font-weight: 900;
  color: #fff;
  background: rgba(26, 47, 90, 0.92);
  border: 1px solid rgba(245, 166, 35, 0.45);
  border-radius: 999px;
  padding: 2px 8px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.cloud-word:hover::after {
  content: attr(data-freq);
  opacity: 1;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}
.card {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.45);
  padding: 12px;
}
:global(.dark) .card {
  background: rgba(22, 23, 29, 0.55);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.pill {
  font-size: 12px;
  font-weight: 900;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(245, 166, 35, 0.15);
  border: 1px solid rgba(245, 166, 35, 0.35);
  color: var(--text-h);
}
.card[data-sent='建议'] .pill {
  background: rgba(26, 47, 90, 0.1);
  border-color: var(--border-strong);
}
.id {
  font-size: 12px;
  color: var(--text-muted);
}
.sum {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
}
:global(.sum mark) {
  background: rgba(245, 166, 35, 0.25);
  color: inherit;
  border-radius: 4px;
  padding: 0 2px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--text-h);
  font-weight: 700;
}
.mono {
  font-family: var(--mono);
}
.comment-box {
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.45);
  padding: 10px;
}
:global(.dark) .comment-box {
  background: rgba(22, 23, 29, 0.55);
}
.action-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.action-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 6px;
}
.action-desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}
.comment-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 6px;
}
.single-col {
  grid-template-columns: 1fr;
}
.entry-list {
  display: grid;
  gap: 8px;
  padding: 6px;
}
.entry-card {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  padding: 8px 10px;
}
.entry-text {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}
.entry-time {
  color: var(--text-muted);
  font-size: 12px;
}
.sent-select,
.comment-input {
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  padding: 8px 10px;
  font-family: inherit;
}
.comment-input { resize: vertical; min-height: 70px; }
.submit-btn {
  border-radius: 10px;
  border: 1px solid rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.15);
  color: var(--text-h);
  font-weight: 800;
  padding: 8px 12px;
  cursor: pointer;
}
@media (max-width: 900px) {
  .action-grid { grid-template-columns: 1fr; }
  .comment-row { grid-template-columns: 1fr; }
}
</style>
