<script setup>
import FeedbackTab6 from '../../components/feedback/FeedbackTab6.vue'
import { useCourse } from '../../composables/useCourse'

const { course } = useCourse()
</script>

<template>
  <section class="tab-section">
    <div class="tab-section-inner">
      <h2 class="tab-title">反思 & 反馈</h2>
      <div class="tab-placeholder">
        <FeedbackTab6 :course="course" />
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
</style>
