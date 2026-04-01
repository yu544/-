<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'

const props = defineProps({
  course: { type: Object, required: true },
})

const cards = computed(() => props.course.studentFeedback?.cards ?? [])
const radarLabels = computed(() => props.course.studentFeedback?.radarLabels ?? [])
const radarScores = computed(() => props.course.studentFeedback?.radarScores ?? [])
const teacherNote = computed(() => props.course.studentFeedback?.teacherNote ?? '')

const wordChartEl = ref(null)
const radarChartEl = ref(null)

let wordChart = null
let radarChart = null

const keywords = [
  '贪心',
  '动画',
  '步骤回放',
  '代码',
  '清晰',
  '互动',
  '可调参数',
  'AI',
  '方向',
  '变体',
  '反例',
  '证明',
  '反馈',
  '结构化',
  '定位',
]

function buildWordData() {
  const freq = new Map()
  for (const c of cards.value) {
    const s = String(c.summary ?? '')
    for (const k of keywords) {
      if (s.includes(k.replace(/\s+/g, ''))) {
        freq.set(k, (freq.get(k) ?? 0) + 1)
      }
    }
    // 兜底：简单按“常见短语”抓取
    for (const k of ['步骤回放', '动画', '代码', '清晰', '互动', 'AI', '反馈']) {
      if (s.includes(k)) freq.set(k, (freq.get(k) ?? 0) + 1)
    }
  }

  return Array.from(freq.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
}

function renderWordCloud() {
  if (!wordChartEl.value) return
  const data = buildWordData()
  if (!data.length) return

  if (!wordChart) wordChart = echarts.init(wordChartEl.value)

  wordChart.setOption({
    tooltip: { show: true },
    series: [
      {
        type: 'wordCloud',
        gridSize: 8,
        sizeRange: [12, 44],
        rotationRange: [-90, 0],
        shape: 'circle',
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: () => (Math.random() > 0.45 ? '#1a2f5a' : '#f5a623'),
        },
        data,
      },
    ],
  })
}

function renderRadar() {
  if (!radarChartEl.value) return
  const labels = radarLabels.value
  const scores = radarScores.value
  if (!labels.length || !scores.length) return

  if (!radarChart) radarChart = echarts.init(radarChartEl.value)

  radarChart.setOption({
    tooltip: {},
    radar: {
      indicator: labels.map((l) => ({ name: l, max: 5 })),
    },
    series: [
      {
        type: 'radar',
        lineStyle: { color: '#f5a623' },
        areaStyle: { color: 'rgba(245, 166, 35, 0.22)' },
        itemStyle: { color: '#1a2f5a' },
        data: [
          {
            value: scores,
            name: '学生评分',
          },
        ],
      },
    ],
  })
}

onMounted(() => {
  renderWordCloud()
  renderRadar()
})

onBeforeUnmount(() => {
  if (wordChart) wordChart.dispose()
  if (radarChart) radarChart.dispose()
  wordChart = null
  radarChart = null
})
</script>

<template>
  <div class="feedback">
    <section class="cards">
      <div class="section-title">学生反馈（{{ cards.length }} 条）</div>
      <div class="card-grid">
        <article v-for="c in cards" :key="c.id" class="f-card">
          <div class="f-top">
            <div class="f-id">学生 {{ c.id }}</div>
            <div class="f-tag" :class="c.sentiment === '正面' ? 'pos' : 'warn'">{{ c.sentiment ?? '' }}</div>
          </div>
          <div class="f-summary">{{ c.summary }}</div>
          <div class="f-tags">
            <span v-for="t in c.tags ?? []" :key="t" class="f-pill">{{ t }}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="viz">
      <div class="viz-row">
        <div class="viz-panel">
          <div class="panel-title">词云图</div>
          <div ref="wordChartEl" class="chart"></div>
          <div class="panel-note">词云基于反馈摘要的关键词频次（原型占位，后续可替换为更精细 NLP 抽取）。</div>
        </div>

        <div class="viz-panel">
          <div class="panel-title">雷达图（五维评分）</div>
          <div ref="radarChartEl" class="chart"></div>
          <div class="panel-note">雷达图维度：{{ radarLabels.join(' / ') || '（待配置）' }}。</div>
        </div>
      </div>
    </section>

    <section class="teacher">
      <div class="section-title">教学反思 & 教师点评</div>
      <div class="teacher-note">{{ teacherNote }}</div>
      <div class="teacher-placeholder">
        教师点评区（预留）：你可以在这里填写评委/指导老师的文字点评内容（头像+姓名+职称+点评）。
      </div>
    </section>
  </div>
</template>

<style scoped>
.feedback {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.cards {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}

:global(.dark) .cards {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}

.f-card {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.55);
  padding: 12px;
}

:global(.dark) .f-card {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.f-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.f-id {
  font-family: var(--mono);
  font-weight: 900;
  color: var(--text-h);
}

.f-tag {
  font-weight: 900;
  font-size: 13px;
}

.f-tag.pos {
  color: #16a34a;
}

.f-tag.warn {
  color: #f59e0b;
}

.f-summary {
  color: var(--text);
  line-height: 1.7;
  font-weight: 700;
  margin-bottom: 10px;
}

.f-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.f-pill {
  font-size: 13px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(245, 166, 35, 0.28);
  background: rgba(245, 166, 35, 0.08);
  color: var(--text-h);
  font-weight: 900;
}

.viz {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(26, 47, 90, 0.04);
  padding: 14px;
}

:global(.dark) .viz {
  background: rgba(26, 47, 90, 0.08);
  border-color: rgba(46, 48, 58, 0.95);
}

.viz-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .viz-row {
    grid-template-columns: 1fr;
  }
}

.viz-panel {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 12px;
}

:global(.dark) .viz-panel {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.panel-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.chart {
  height: 320px;
}

.panel-note {
  margin-top: 10px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}

.teacher {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}

:global(.dark) .teacher {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.teacher-note {
  color: var(--text);
  line-height: 1.8;
  font-weight: 700;
  margin-bottom: 12px;
}

.teacher-placeholder {
  border-radius: 16px;
  border: 1px dashed rgba(26, 47, 90, 0.25);
  padding: 12px;
  color: var(--text);
  line-height: 1.8;
}
</style>

