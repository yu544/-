<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatCourseDurationEn } from '../composables/useCourse'

const props = defineProps({
  course: { type: Object, required: true },
  featured: { type: Boolean, default: false },
})

const router = useRouter()

const durationPill = computed(() => formatCourseDurationEn(props.course))

const initials = computed(() => {
  const t = String(props.course.title ?? '')
  const m = t.match(/[\u4e00-\u9fff]/g)
  return m && m.length >= 2 ? m.slice(0, 2).join('') : '微课'
})
</script>

<template>
  <article class="course-card" :class="{ featured }">
    <div class="course-card__visual">
      <div class="course-card__badge">{{ initials }}</div>
      <div class="course-card__visual-meta">
        <span class="pill">{{ course.difficulty }}</span>
        <span class="pill">{{ durationPill }}</span>
      </div>
    </div>

    <div class="course-card__body">
      <div class="course-card__title">{{ course.title }}</div>
      <p class="course-card__summary">{{ course.summary }}</p>

      <div class="course-card__tags" aria-label="知识点标签">
        <span v-for="t in course.knowledgeTags.slice(0, 6)" :key="t" class="tag">{{ t }}</span>
      </div>

      <div class="course-card__actions">
        <button type="button" class="primary-btn" @click="router.push(`/course/${course.id}/video`)">
          立即学习
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.course-card {
  display: grid;
  grid-template-columns: minmax(0, 200px) 1fr;
  gap: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition:
    transform 0.22s,
    box-shadow 0.22s;
}

.course-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.course-card.featured {
  grid-template-columns: minmax(0, 240px) 1fr;
}

@media (max-width: 640px) {
  .course-card,
  .course-card.featured {
    grid-template-columns: 1fr;
  }
}

.course-card__visual {
  position: relative;
  min-height: 140px;
  background: linear-gradient(145deg, var(--brand-deep) 0%, var(--brand) 42%, var(--brand-soft) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  gap: 14px;
}

.course-card__visual::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 70% 20%, rgba(245, 166, 35, 0.25), transparent 55%);
  pointer-events: none;
}

.course-card__badge {
  position: relative;
  z-index: 1;
  font-weight: 900;
  font-size: 1.75rem;
  color: var(--gold);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.25);
  letter-spacing: 0.08em;
}

.course-card__visual-meta {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.pill {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  backdrop-filter: blur(6px);
}

.course-card__body {
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.course-card__title {
  font-weight: 800;
  font-size: 1.08rem;
  color: var(--text-h);
  line-height: 1.35;
}

.course-card__summary {
  margin: 0;
  color: var(--text);
  line-height: 1.65;
  font-size: 0.95rem;
}

.course-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--brand-bg-subtle);
  border: 1px solid var(--border);
  color: var(--text-h);
}

.course-card__actions {
  margin-top: 6px;
  display: flex;
  justify-content: flex-end;
}

.primary-btn {
  border: 0;
  height: 42px;
  padding: 0 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand), var(--brand-soft));
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(26, 47, 90, 0.22);
  transition:
    transform 0.15s,
    box-shadow 0.2s;
}
.primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 22px rgba(26, 47, 90, 0.3);
}
</style>
