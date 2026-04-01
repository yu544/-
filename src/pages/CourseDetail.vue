<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TabNav from '../components/TabNav.vue'
import courses from '../data/courses.json'
import RaceSimulator from '../components/simulation/RaceSimulator.vue'
import Prism from 'prismjs'
import 'prismjs/components/prism-c'
import ExerciseTab5 from '../components/exercise/ExerciseTab5.vue'
import FeedbackTab6 from '../components/feedback/FeedbackTab6.vue'

const route = useRoute()
const courseId = computed(() => String(route.params.id ?? ''))

const course = computed(() => courses.find((c) => c.id === courseId.value) ?? courses[0])

const tabs = [
  { key: 'tab1', label: '微课视频', sectionId: 'detail-tab1' },
  { key: 'tab2', label: '虚拟仿真实验', sectionId: 'detail-tab2' },
  { key: 'tab3', label: '教学设计', sectionId: 'detail-tab3' },
  { key: 'tab4', label: '课件资料', sectionId: 'detail-tab4' },
  { key: 'tab5', label: '练习测试', sectionId: 'detail-tab5' },
  { key: 'tab6', label: '反思 & 反馈', sectionId: 'detail-tab6' },
]

const activeKey = ref(tabs[0].key)

function scrollToSection(tabKey) {
  const t = tabs.find((x) => x.key === tabKey)
  if (!t) return
  activeKey.value = tabKey
  nextTick(() => {
    const el = document.getElementById(t.sectionId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

const selectedChapterIndex = ref(0)

function timeToSeconds(t) {
  // 支持 "m:ss" 或 "mm:ss"
  const parts = String(t).split(':').map((x) => Number(x))
  if (parts.length !== 2) return 0
  return parts[0] * 60 + parts[1]
}

const videoEl = ref(null)
const isMp4 = computed(() => String(course.value?.videoUrl ?? '').toLowerCase().endsWith('.mp4'))
const selectedChapterSeconds = computed(() => {
  const t = course.value.videoChapters?.[selectedChapterIndex.value]?.t
  return timeToSeconds(t)
})

const videoSrcWithStart = computed(() => {
  if (!course.value?.videoUrl) return ''
  const base = course.value.videoUrl
  const start = course.value.videoChapters?.[selectedChapterIndex.value]?.t
  const sec = timeToSeconds(start)
  if (!sec) return base

  // 尽量通用：为播放器增加 ?t=秒 或 &t=秒（具体视频源可能需要按你们实际链接调整）
  const joiner = base.includes('?') ? '&' : '?'
  return `${base}${joiner}t=${sec}`
})

onMounted(() => {
  // 支持：url hash -> 自动跳转某个 Tab
  const hash = window.location.hash.replace('#', '')
  if (!hash) return
  const map = new Map(tabs.map((t) => [t.sectionId, t.key]))
  const targetKey = map.get(hash)
  if (targetKey) scrollToSection(targetKey)
})

onMounted(() => {
  // 默认选中第一章
  if (course.value?.videoChapters?.length) selectedChapterIndex.value = 0

  // 将 Tab4 的代码块做语法高亮（Tab5 后续也可复用该逻辑）
  nextTick(() => {
    try {
      Prism.highlightAll()
    } catch (e) {
      // ignore - 避免影响页面
    }
  })
})

onMounted(() => {
  // Tab1：如果是 mp4，章节点击时跳转到对应时间点
  nextTick(() => {
    if (!isMp4.value) return
    if (!videoEl.value) return
    videoEl.value.currentTime = selectedChapterSeconds.value
  })
})

watch(selectedChapterIndex, async () => {
  if (!isMp4.value) return
  await nextTick()
  if (!videoEl.value) return
  videoEl.value.currentTime = selectedChapterSeconds.value
})

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 兼容性回退
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  }
}
</script>

<template>
  <div class="page">
    <section class="intro">
      <div class="intro-card">
        <div class="intro-kicker">微课详情 · {{ course.englishTitle }}</div>
        <h1 class="title">{{ course.title }}</h1>
        <p class="summary">{{ course.summary }}</p>
        <div class="meta">
          <span class="pill">{{ course.difficulty }}</span>
          <span class="pill">{{ course.timeMinutes }} min</span>
        </div>
      </div>
    </section>

    <TabNav :tabs="tabs" :activeKey="activeKey" @select="scrollToSection" />

    <section
      v-for="t in tabs"
      :key="t.key"
      :id="t.sectionId"
      class="tab-section"
      :class="{ active: t.key === activeKey }"
      :data-tab="t.key"
    >
      <div class="tab-section-inner">
        <h2 class="tab-title">{{ t.label }}</h2>
        <div class="tab-placeholder">
          <template v-if="t.key === 'tab1'">
            <div class="video-layout">
              <div class="video-panel">
                <div class="video-box">
                  <video
                    v-if="course.videoUrl && isMp4"
                    ref="videoEl"
                    class="video-iframe"
                    :src="course.videoUrl"
                    controls
                    playsinline
                  />

                  <iframe
                    v-else-if="course.videoUrl"
                    class="video-iframe"
                    :src="videoSrcWithStart"
                    title="微课视频"
                    frameborder="0"
                    allowfullscreen
                  />

                  <div v-else class="video-empty">
                    尚未配置视频链接（请在 `src/data/courses.json` 的 `videoUrl` 填入 B 站/腾讯 iframe 链接，或填入 mp4 路径：`/videos/你的文件.mp4`）。
                  </div>
                </div>

                <div class="info-block">
                  <div class="info-row">
                    <strong>适合人群：</strong>
                    <span>{{ course.audience }}</span>
                  </div>
                  <div class="info-row">
                    <strong>难度：</strong>
                    <span>{{ course.difficulty }}</span>
                  </div>
                  <div class="info-row">
                    <strong>时长：</strong>
                    <span>{{ course.timeMinutes }} 分钟</span>
                  </div>
                </div>
              </div>

              <div class="side-panel">
                <div class="chip-row" aria-label="知识点标签">
                  <span v-for="tag in course.knowledgeTags" :key="tag" class="chip">{{ tag }}</span>
                </div>

                <div class="chapters">
                  <div class="block-title">章节目录（时间点）</div>
                  <div class="chapter-list">
                    <button
                      v-for="(ch, idx) in course.videoChapters"
                      :key="ch.t + ch.label"
                      class="chapter-btn"
                      :class="{ active: idx === selectedChapterIndex }"
                      type="button"
                      @click="selectedChapterIndex = idx"
                    >
                      <span class="chapter-t">{{ ch.t }}</span>
                      <span class="chapter-label">{{ ch.label }}</span>
                    </button>
                  </div>
                </div>

                <div class="objectives">
                  <div class="block-title">课程目标（三维目标/四维目标表述可在文档中继续细化）</div>
                  <div class="obj-item">
                    <div class="obj-k">算法概念</div>
                    <div class="obj-v">{{ course.learningObjectives.algorithmConcept }}</div>
                  </div>
                  <div class="obj-item">
                    <div class="obj-k">知识目标</div>
                    <div class="obj-v">{{ course.learningObjectives.knowledge }}</div>
                  </div>
                  <div class="obj-item">
                    <div class="obj-k">能力目标</div>
                    <div class="obj-v">{{ course.learningObjectives.ability }}</div>
                  </div>
                  <div class="obj-item">
                    <div class="obj-k">素养目标</div>
                    <div class="obj-v">{{ course.learningObjectives.literacy }}</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="t.key === 'tab2'">
            <RaceSimulator />
          </template>
          <template v-else-if="t.key === 'tab3'">
            <div class="design-layout">
              <div class="design-left">
                <div class="block">
                  <div class="block-title">学情分析</div>
                  <div class="block-body">{{ course.teachingDesign.studentProfile }}</div>
                </div>

                <div class="block">
                  <div class="block-title">教学重难点</div>
                  <div class="two-col">
                    <div class="mini">
                      <div class="mini-k">重点</div>
                      <div class="mini-v">{{ course.teachingDesign.keyDifficult.key }}</div>
                    </div>
                    <div class="mini">
                      <div class="mini-k">难点</div>
                      <div class="mini-v">{{ course.teachingDesign.keyDifficult.difficult }}</div>
                    </div>
                  </div>
                </div>

                <div class="block">
                  <div class="block-title">教法与学法</div>
                  <div class="list">
                    <span v-for="m in course.teachingDesign.methods" :key="m" class="list-pill">{{ m }}</span>
                  </div>
                </div>
              </div>

              <div class="design-right">
                <div class="block">
                  <div class="block-title">教学目标（四维目标表述）</div>
                  <div class="obj-grid">
                    <div class="obj-card">
                      <div class="obj-k">算法概念</div>
                      <div class="obj-v">{{ course.teachingDesign.objectives.algorithmConcept }}</div>
                    </div>
                    <div class="obj-card">
                      <div class="obj-k">知识目标</div>
                      <div class="obj-v">{{ course.teachingDesign.objectives.knowledge }}</div>
                    </div>
                    <div class="obj-card">
                      <div class="obj-k">能力目标</div>
                      <div class="obj-v">{{ course.teachingDesign.objectives.ability }}</div>
                    </div>
                    <div class="obj-card">
                      <div class="obj-k">素养目标</div>
                      <div class="obj-v">{{ course.teachingDesign.objectives.literacy }}</div>
                    </div>
                  </div>
                </div>

                <div class="block">
                  <div class="block-title">教学流程图要点</div>
                  <div class="flow">
                    <div v-for="(step, idx) in course.teachingDesign.flow" :key="step" class="flow-item">
                      <div class="flow-num">{{ idx + 1 }}</div>
                      <div class="flow-text">{{ step }}</div>
                    </div>
                  </div>
                </div>

                <div class="block">
                  <div class="block-title">AI 工具应用说明</div>
                  <div class="list">
                    <span v-for="tool in course.teachingDesign.aiTools" :key="tool" class="list-pill">{{ tool }}</span>
                  </div>
                  <div class="muted">
                    本页先展示“使用了哪些 AI/现代工具”。你可以在这里进一步补充：每种工具在教学中的具体产出与作用（例如动画、可视化、反思引导等）。
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="t.key === 'tab4'">
            <div class="materials-layout">
              <div class="materials-left">
                <div class="block">
                  <div class="block-title">资源下载</div>
                  <div class="dl">
                    <div class="dl-row">
                      <div class="dl-k">教学文档</div>
                      <a v-if="course.materials.teachingDocDownload" class="dl-a" :href="course.materials.teachingDocDownload" target="_blank">下载</a>
                      <div v-else class="dl-empty">待补充链接</div>
                    </div>
                    <div class="dl-row">
                      <div class="dl-k">教学课件</div>
                      <a v-if="course.materials.slidesDownload" class="dl-a" :href="course.materials.slidesDownload" target="_blank">下载</a>
                      <div v-else class="dl-empty">待补充链接</div>
                    </div>
                  </div>
                </div>

                <div class="block">
                  <div class="block-title">伪代码说明</div>
                  <ol class="pc">
                    <li v-for="(p, idx) in course.materials.pseudocode" :key="idx">{{ p }}</li>
                  </ol>
                </div>

                <div class="block">
                  <div class="block-title">参考资料链接</div>
                  <ul class="refs">
                    <li v-for="refItem in course.materials.referenceLinks" :key="refItem.url">
                      <a class="ref-a" :href="refItem.url" target="_blank" rel="noreferrer">{{ refItem.label }}</a>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="materials-right">
                <div class="block">
                  <div class="block-title">C 语言示例代码</div>

                  <div class="code-wrap">
                    <pre class="code-pre"><code class="language-c">{{ course.materials.codeExample }}</code></pre>
                    <button
                      type="button"
                      class="copy-btn"
                      @click="copyText(course.materials.codeExample)"
                    >
                      复制
                    </button>
                  </div>

                  <div class="code-note">
                    提示：该代码块是站点原型占位，后续你们可以替换成文档中的完整 C 语言实现。
                  </div>
                </div>
              </div>
            </div>
          </template>
          <template v-else-if="t.key === 'tab5'">
            <ExerciseTab5 :course="course" />
          </template>
          <template v-else>
            <FeedbackTab6 :course="course" />
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 20px 0 64px;
}

.intro {
  padding-top: 6px;
  margin-bottom: 8px;
}

.intro-card {
  padding: 24px 28px;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.intro-card::after {
  content: '';
  position: absolute;
  top: -30%;
  right: -15%;
  width: 45%;
  height: 160%;
  background: radial-gradient(closest-side, rgba(245, 166, 35, 0.12), transparent);
  pointer-events: none;
}

.intro-kicker {
  position: relative;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--brand-soft);
  margin-bottom: 10px;
}

.title {
  position: relative;
  margin: 0 0 10px;
  font-size: clamp(1.5rem, 3.4vw, 2.1rem);
  letter-spacing: -0.03em;
  color: var(--text-h);
  font-weight: 900;
  line-height: 1.2;
}

.summary {
  position: relative;
  margin: 0 0 14px;
  color: var(--text);
  line-height: 1.8;
  max-width: 48rem;
}

.meta {
  position: relative;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pill {
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(245, 166, 35, 0.12);
  border: 1px solid rgba(245, 166, 35, 0.32);
  color: var(--text-h);
  font-weight: 700;
}

.tab-section {
  border-top: 1px solid rgba(229, 228, 231, 0.95);
  padding-top: 26px;
  margin-top: 12px;
}

:global(.dark) .tab-section {
  border-top-color: rgba(46, 48, 58, 0.95);
}

.tab-section.active {
  scroll-margin-top: 90px;
}

.tab-section-inner {
  padding-bottom: 8px;
}

.tab-title {
  margin: 0 0 10px;
  color: var(--text-h);
  font-size: 20px;
}

.tab-placeholder {
  background: var(--brand-bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  color: var(--text);
  line-height: 1.8;
  box-shadow: var(--shadow-sm);
}

.video-layout {
  display: grid;
  grid-template-columns: 1.3fr 0.9fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .video-layout {
    grid-template-columns: 1fr;
  }
}

.video-box {
  width: 100%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(229, 228, 231, 0.95);
  border-radius: 14px;
  overflow: hidden;
}

:global(.dark) .video-box {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.video-iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
}

.video-empty {
  padding: 18px;
}

.info-block {
  margin-top: 12px;
}

.info-row {
  margin-top: 8px;
  color: var(--text);
}

.info-row strong {
  color: var(--text-h);
  margin-right: 8px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  font-size: 13px;
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--brand-bg-subtle);
  border: 1px solid var(--border);
  font-weight: 600;
  color: var(--text-h);
}

.chapters .block-title,
.objectives .block-title {
  font-weight: 800;
  color: var(--text-h);
  margin-bottom: 10px;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chapter-btn {
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.5);
  padding: 10px 12px;
  display: flex;
  gap: 10px;
  align-items: center;
}

:global(.dark) .chapter-btn {
  background: rgba(22, 23, 29, 0.7);
  border-color: rgba(46, 48, 58, 0.95);
}

.chapter-btn.active {
  border-color: rgba(245, 166, 35, 0.45);
  background: rgba(245, 166, 35, 0.12);
}

.chapter-t {
  font-family: var(--mono);
  color: var(--text-h);
  font-weight: 800;
  width: 64px;
}

.chapter-label {
  color: var(--text);
}

.obj-item {
  margin-top: 10px;
}

.obj-k {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 4px;
}

.obj-v {
  color: var(--text);
}

.design-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .design-layout {
    grid-template-columns: 1fr;
  }
}

.design-left,
.design-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.block {
  border-radius: 16px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
  padding: 14px;
}

:global(.dark) .block {
  background: rgba(22, 23, 29, 0.6);
  border-color: rgba(46, 48, 58, 0.95);
}

.block-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 10px;
}

.block-body {
  color: var(--text);
  line-height: 1.8;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 560px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.mini-k {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 6px;
}

.mini-v {
  color: var(--text);
  line-height: 1.7;
  font-weight: 700;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.list-pill {
  border-radius: 999px;
  padding: 6px 11px;
  border: 1px solid rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.1);
  color: var(--text-h);
  font-weight: 800;
  font-size: 13px;
}

.muted {
  margin-top: 10px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.obj-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.obj-card {
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(26, 47, 90, 0.04);
  padding: 12px;
}

:global(.dark) .obj-card {
  border-color: rgba(46, 48, 58, 0.95);
  background: rgba(26, 47, 90, 0.08);
}

.obj-k {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 6px;
}

.obj-v {
  color: var(--text);
  line-height: 1.75;
}

.flow {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.flow-item {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.35);
}

:global(.dark) .flow-item {
  border-color: rgba(46, 48, 58, 0.95);
  background: rgba(22, 23, 29, 0.6);
}

.flow-num {
  font-family: var(--mono);
  font-weight: 900;
  color: var(--text-h);
}

.flow-text {
  color: var(--text);
  font-weight: 700;
  line-height: 1.7;
}

.materials-layout {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 14px;
}

@media (max-width: 900px) {
  .materials-layout {
    grid-template-columns: 1fr;
  }
}

.materials-left,
.materials-right {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dl {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dl-k {
  font-weight: 900;
  color: var(--text-h);
}

.dl-a {
  text-decoration: none;
  font-weight: 800;
  color: var(--text-h);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(26, 47, 90, 0.2);
  background: rgba(26, 47, 90, 0.05);
}

.dl-empty {
  color: var(--text);
  opacity: 0.75;
}

.refs {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-a {
  color: var(--text-h);
  text-decoration: none;
  font-weight: 800;
}

.code-wrap {
  position: relative;
}

.code-pre {
  margin: 0;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(26, 47, 90, 0.12);
  background: rgba(26, 47, 90, 0.04);
  overflow: auto;
}

.copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-weight: 900;
  padding: 0 12px;
}

:global(.dark) .copy-btn {
  background: rgba(22, 23, 29, 0.85);
  border-color: rgba(46, 48, 58, 0.95);
}

.code-note {
  margin-top: 10px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.7;
}

.pc {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>

