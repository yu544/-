<script setup>
import CourseModuleNav from '../../components/CourseModuleNav.vue'
import { useCourse } from '../../composables/useCourse'

const { course, durationLabelZh } = useCourse()
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
          <span class="pill">{{ durationLabelZh }}</span>
        </div>
      </div>
    </section>

    <CourseModuleNav />

    <router-view />
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
</style>
