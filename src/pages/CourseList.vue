<script setup>
import { computed, ref } from 'vue'
import CourseCard from '../components/CourseCard.vue'
import courses from '../data/courses.json'

const searchQuery = ref('')
const difficulty = ref('all')
const topic = ref('all')

const difficultyOptions = computed(() => {
  const s = new Set(courses.map((c) => c.difficulty))
  return ['all', ...Array.from(s)]
})

const topicOptions = computed(() => {
  const s = new Set()
  for (const c of courses) {
    for (const t of c.knowledgeTags ?? []) s.add(t)
  }
  return ['all', ...Array.from(s).sort()]
})

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return courses.filter((c) => {
    const passDifficulty = difficulty.value === 'all' ? true : c.difficulty === difficulty.value
    const passTopic =
      topic.value === 'all' ? true : (c.knowledgeTags ?? []).includes(topic.value)
    const passQuery =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      c.knowledgeTags.some((t) => t.toLowerCase().includes(q))
    return passDifficulty && passTopic && passQuery
  })
})

const placeholders = computed(() => {
  const n = filtered.value.length
  const want = 2
  return n >= want ? 0 : want - n
})
</script>

<template>
  <div class="page">
    <header class="page-hero">
      <div class="page-hero-inner">
        <h1 class="page-title">微课列表</h1>
        <p class="page-lead">
          按知识点与难度浏览课程；当前为大赛演示主线《田忌赛马与贪心策略》，架构支持后续扩展多门微课。
        </p>
      </div>
    </header>

    <section class="panel">
      <div class="filters" role="search" aria-label="课程筛选">
        <label class="sr-only" for="course-search">搜索课程</label>
        <input
          id="course-search"
          v-model="searchQuery"
          class="input"
          type="search"
          placeholder="搜索：贪心、双指针、C 语言…"
        />

        <label class="sr-only" for="diff-select">难度</label>
        <select id="diff-select" v-model="difficulty" class="select" aria-label="难度筛选">
          <option v-for="opt in difficultyOptions" :key="opt" :value="opt">
            {{ opt === 'all' ? '全部难度' : opt }}
          </option>
        </select>

        <label class="sr-only" for="topic-select">知识点</label>
        <select id="topic-select" v-model="topic" class="select" aria-label="知识点">
          <option v-for="opt in topicOptions" :key="opt" :value="opt">
            {{ opt === 'all' ? '全部知识点' : opt }}
          </option>
        </select>
      </div>

      <div v-if="filtered.length === 0" class="empty">
        <div class="empty-title">未找到匹配课程</div>
        <p class="empty-desc">试试清空筛选或更换关键词。</p>
      </div>

      <div v-else class="grid">
        <CourseCard v-for="c in filtered" :key="c.id" :course="c" />
        <article v-for="i in placeholders" :key="'ph-' + i" class="placeholder-card">
          <div class="placeholder-inner">
            <span class="placeholder-icon">◇</span>
            <div class="placeholder-title">更多微课即将上线</div>
            <p class="placeholder-desc">
              列表采用数据驱动结构，后续可在此补充《动态规划入门》等新课程卡片。
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.page {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 20px 0 64px;
}

.page-hero {
  margin-bottom: 22px;
}

.page-hero-inner {
  padding: 26px 28px;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
}

.page-hero-inner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: min(60%, 420px);
  height: 100%;
  background: radial-gradient(closest-side, rgba(245, 166, 35, 0.14), transparent);
  pointer-events: none;
}

.page-title {
  margin: 0 0 10px;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 900;
  color: var(--text-h);
  position: relative;
}

.page-lead {
  margin: 0;
  max-width: 44rem;
  color: var(--text);
  line-height: 1.75;
  position: relative;
}

.panel {
  padding: 4px 0 0;
}

.filters {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 22px;
}

.input {
  flex: 1 1 260px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 0 18px;
  background: var(--bg-elevated);
  color: var(--text-h);
  font-family: inherit;
  font-size: 15px;
  box-shadow: var(--shadow-sm);
}
.input::placeholder {
  color: var(--text-muted);
}
.input:focus {
  outline: none;
  border-color: rgba(245, 166, 35, 0.5);
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.15);
}

.select {
  height: 46px;
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 0 16px;
  background: var(--bg-elevated);
  color: var(--text-h);
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 48px 24px;
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-strong);
  background: var(--brand-bg-subtle);
}

.empty-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 8px;
}
.empty-desc {
  margin: 0;
  color: var(--text);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 900px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

.placeholder-card {
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-strong);
  background: var(--brand-bg-subtle);
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.placeholder-inner {
  text-align: center;
  max-width: 22rem;
}

.placeholder-icon {
  display: block;
  font-size: 1.5rem;
  color: var(--gold);
  margin-bottom: 10px;
  opacity: 0.85;
}

.placeholder-title {
  font-weight: 900;
  color: var(--text-h);
  margin-bottom: 8px;
}

.placeholder-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
}
</style>
