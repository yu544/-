<script setup>
import RaceSimulator from '../../components/simulation/RaceSimulator.vue'
</script>

<template>
  <section class="tab-section">
    <div class="tab-section-inner">
      <h2 class="tab-title">虚拟仿真实验</h2>
      <div class="tab-placeholder">
        <RaceSimulator />
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
