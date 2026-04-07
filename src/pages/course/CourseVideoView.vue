<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useCourse } from '../../composables/useCourse'

const { course, courseId, durationLabelZh } = useCourse()

const selectedChapterIndex = ref(0)

function timeToSeconds(t) {
  const parts = String(t)
    .trim()
    .split(':')
    .map((x) => Number(x))
  if (parts.some((n) => Number.isNaN(n))) return 0
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

function formatTimeLabel(sec) {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  return `${m}:${String(r).padStart(2, '0')}`
}

const videoEl = ref(null)
const videoDuration = ref(0)
const playbackPosition = ref(0)
const isMp4 = computed(() => String(course.value?.videoUrl ?? '').toLowerCase().endsWith('.mp4'))

const chapterStarts = computed(() =>
  (course.value.videoChapters ?? []).map((ch) => timeToSeconds(ch.t)),
)

const chaptersPastDuration = computed(() => {
  const d = videoDuration.value
  if (!d) return false
  return chapterStarts.value.some((s) => s > d + 0.5)
})

const selectedChapterSeconds = computed(() => chapterStarts.value[selectedChapterIndex.value] ?? 0)

/** 章节结束时间：下一章起点，或视频总时长（与左侧进度一致） */
function chapterEndSec(idx) {
  const starts = chapterStarts.value
  const d = videoDuration.value
  if (!starts.length) return 0
  if (idx < starts.length - 1) return starts[idx + 1]
  return Number.isFinite(d) && d > 0 ? d : starts[idx]
}

function chapterStartOverDuration(idx) {
  const d = videoDuration.value
  if (!d) return false
  return (chapterStarts.value[idx] ?? 0) > d + 0.25
}

const videoSrcWithStart = computed(() => {
  if (!course.value?.videoUrl) return ''
  const base = course.value.videoUrl
  const start = course.value.videoChapters?.[selectedChapterIndex.value]?.t
  const sec = timeToSeconds(start)
  if (!sec) return base
  const joiner = base.includes('?') ? '&' : '?'
  return `${base}${joiner}t=${sec}`
})

onMounted(() => {
  if (course.value?.videoChapters?.length) selectedChapterIndex.value = 0
})

function syncChapterIndexFromPlaybackTime(t) {
  const starts = chapterStarts.value
  if (!starts.length) return
  let idx = 0
  for (let i = starts.length - 1; i >= 0; i--) {
    if (t + 0.02 >= starts[i]) {
      idx = i
      break
    }
  }
  if (idx !== selectedChapterIndex.value) selectedChapterIndex.value = idx
}

function seekMp4ToSeconds(sec, opts = {}) {
  const playAfter = opts.play === true
  const v = videoEl.value
  if (!v || !isMp4.value) return
  const apply = () => {
    const d = v.duration
    const upper = Number.isFinite(d) && d > 0 ? d : sec
    v.currentTime = Math.min(Math.max(0, sec), upper)
    playbackPosition.value = v.currentTime
    if (playAfter) void v.play().catch(() => {})
  }
  if (v.readyState >= HTMLMediaElement.HAVE_METADATA) apply()
  else v.addEventListener('loadedmetadata', apply, { once: true })
}

function seekToChapter(idx) {
  selectedChapterIndex.value = idx
  const raw = chapterStarts.value[idx] ?? 0
  const v = videoEl.value
  const d = v && Number.isFinite(v.duration) && v.duration > 0 ? v.duration : videoDuration.value
  const sec = Number.isFinite(d) && d > 0 ? Math.min(raw, d) : raw
  seekMp4ToSeconds(sec, { play: true })
}

function onVideoLoadedMetadata() {
  const v = videoEl.value
  if (!v) return
  videoDuration.value = Number.isFinite(v.duration) ? v.duration : 0
  playbackPosition.value = v.currentTime
  seekMp4ToSeconds(selectedChapterSeconds.value)
}

function onVideoTimeUpdate() {
  const v = videoEl.value
  if (!v || !isMp4.value) return
  playbackPosition.value = v.currentTime
  syncChapterIndexFromPlaybackTime(v.currentTime)
}

function onTimelineSeek(ev) {
  if (!isMp4.value || !videoDuration.value) return
  const bar = ev.currentTarget
  const rect = bar.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width))
  const sec = ratio * videoDuration.value
  seekMp4ToSeconds(sec, { play: false })
  syncChapterIndexFromPlaybackTime(sec)
}

watch(courseId, () => {
  videoDuration.value = 0
  playbackPosition.value = 0
  selectedChapterIndex.value = 0
})
</script>

<template>
  <section class="tab-section">
    <div class="tab-section-inner">
      <h2 class="tab-title">微课视频</h2>
      <div class="tab-placeholder">
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
                preload="metadata"
                @loadedmetadata="onVideoLoadedMetadata"
                @timeupdate="onVideoTimeUpdate"
              />

              <iframe
                v-else-if="course.videoUrl"
                :key="`${course.videoUrl}-${selectedChapterSeconds}`"
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

            <div v-if="isMp4 && course.videoChapters?.length" class="timeline-wrap">
              <div class="timeline-head">
                <span v-if="videoDuration > 0">
                  总时长（实测）<strong class="mono">{{ formatTimeLabel(videoDuration) }}</strong>
                  · 当前 <strong class="mono">{{ formatTimeLabel(playbackPosition) }}</strong>
                </span>
                <span v-else class="timeline-loading">正在读取视频时长…</span>
                <span v-if="chaptersPastDuration" class="timeline-warn">
                  部分章节时间晚于视频结尾，请在 `courses.json` 中按成片校对 `videoChapters.t`
                </span>
              </div>
              <div
                v-if="videoDuration > 0"
                class="timeline-bar"
                role="slider"
                :aria-valuenow="Math.round(playbackPosition)"
                :aria-valuemax="Math.round(videoDuration)"
                aria-valuemin="0"
                tabindex="0"
                @click="onTimelineSeek"
              >
                <div
                  class="timeline-played"
                  :style="{ width: `${(playbackPosition / videoDuration) * 100}%` }"
                />
                <button
                  v-for="(ch, idx) in course.videoChapters"
                  :key="'mk-' + idx"
                  type="button"
                  class="timeline-marker"
                  :class="{ active: idx === selectedChapterIndex }"
                  :style="{
                    left: `${Math.min(100, (chapterStarts[idx] / videoDuration) * 100)}%`,
                  }"
                  :title="`${ch.label} · ${ch.t}（${formatTimeLabel(chapterStarts[idx])}）`"
                  @click.stop="seekToChapter(idx)"
                />
              </div>
            </div>

            <p v-else-if="course.videoUrl && !isMp4" class="iframe-chapter-hint">
              当前为外链嵌入：点击左侧章节点将刷新播放器并尝试从对应时间播放（是否生效取决于平台）。使用站内 mp4
              可获得与时长、进度条完全对齐的章节轴。
            </p>

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
                <span>{{ durationLabelZh }}</span>
              </div>
            </div>
          </div>

          <div class="side-panel">
            <div class="chip-row" aria-label="知识点标签">
              <span v-for="tag in course.knowledgeTags" :key="tag" class="chip">{{ tag }}</span>
            </div>

            <div class="chapters">
              <div class="block-title">章节目录（时间与左侧视频轴一致，点击跳转）</div>
              <div class="chapter-list">
                <button
                  v-for="(ch, idx) in course.videoChapters"
                  :key="ch.t + ch.label"
                  class="chapter-btn"
                  :class="{
                    active: idx === selectedChapterIndex,
                    'chapter-warn': chapterStartOverDuration(idx),
                  }"
                  type="button"
                  @click="seekToChapter(idx)"
                >
                  <span class="chapter-t">
                    <span class="chapter-times">
                      <span class="time-part">{{ formatTimeLabel(chapterStarts[idx]) }}</span>
                      <template v-if="videoDuration > 0">
                        <span class="time-dash">–</span>
                        <span class="time-part">{{ formatTimeLabel(Math.min(chapterEndSec(idx), videoDuration)) }}</span>
                      </template>
                    </span>
                    <span v-if="videoDuration <= 0" class="time-hint">加载视频后显示区间</span>
                  </span>
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
      </div>
    </div>
  </section>
</template>

<style scoped>
.tab-section {
  padding-top: 8px;
  margin-top: 4px;
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

.video-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timeline-wrap {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(229, 228, 231, 0.95);
  background: rgba(255, 255, 255, 0.45);
}

:global(.dark) .timeline-wrap {
  border-color: rgba(46, 48, 58, 0.95);
  background: rgba(22, 23, 29, 0.5);
}

.timeline-head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  font-size: 13px;
  color: var(--text);
  margin-bottom: 10px;
}

.timeline-head .mono {
  font-family: var(--mono);
  color: var(--text-h);
}

.timeline-loading {
  color: var(--text-muted);
}

.timeline-warn {
  font-size: 12px;
  color: #b45309;
  font-weight: 700;
}

:global(.dark) .timeline-warn {
  color: #fbbf24;
}

.timeline-bar {
  position: relative;
  height: 14px;
  border-radius: 999px;
  background: rgba(26, 47, 90, 0.1);
  cursor: pointer;
  outline: none;
}

.timeline-bar:focus-visible {
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.35);
}

.timeline-played {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(245, 166, 35, 0.35), rgba(26, 47, 90, 0.2));
  pointer-events: none;
  max-width: 100%;
}

.timeline-marker {
  position: absolute;
  top: 50%;
  width: 13px;
  height: 13px;
  margin: 0;
  padding: 0;
  border: 2px solid var(--text-h);
  border-radius: 50%;
  background: var(--bg-elevated);
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 2;
  box-shadow: 0 1px 4px rgba(15, 23, 41, 0.12);
}

.timeline-marker.active {
  border-color: var(--gold);
  background: rgba(245, 166, 35, 0.35);
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.25);
}

.iframe-chapter-hint {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text);
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px dashed var(--border);
  background: rgba(26, 47, 90, 0.04);
}

.info-block {
  margin-top: 0;
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
  align-items: flex-start;
}

.chapter-btn.chapter-warn {
  border-color: rgba(180, 83, 9, 0.42);
  background: rgba(254, 243, 199, 0.35);
}

:global(.dark) .chapter-btn.chapter-warn {
  border-color: rgba(251, 191, 36, 0.35);
  background: rgba(120, 53, 15, 0.2);
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
  flex: 0 0 auto;
  min-width: 7.25rem;
  max-width: 11rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chapter-times {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  line-height: 1.25;
}

.time-part {
  font-variant-numeric: tabular-nums;
}

.time-dash {
  opacity: 0.65;
  font-weight: 700;
}

.time-hint {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.chapter-label {
  color: var(--text);
  flex: 1;
  min-width: 0;
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
</style>
