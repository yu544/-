<script setup>
import TopNav from './components/TopNav.vue'
import { ref, onMounted } from 'vue'

const showLoading = ref(true)

onMounted(() => {
  // 简单的首屏加载态：用于比赛展示更完整（可按你们团队节奏再精细化）
  window.setTimeout(() => {
    showLoading.value = false
  }, 600)
})
</script>

<template>
  <div class="app-shell">
    <TopNav />
    <main class="app-main">
      <router-view />
    </main>

    <div v-if="showLoading" class="loading-overlay" aria-live="polite">
      <div class="brand-mark-loading" aria-hidden="true">策</div>
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text">加载中…</div>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}
.app-main {
  flex: 1;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(248, 249, 252, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  backdrop-filter: blur(14px);
}

:global(.dark) .loading-overlay {
  background: rgba(13, 17, 23, 0.72);
}

.brand-mark-loading {
  font-weight: 900;
  font-size: 1.75rem;
  color: #f5a623;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md, 14px);
  border: 1px solid rgba(245, 166, 35, 0.35);
  background: rgba(245, 166, 35, 0.12);
  margin-bottom: 4px;
}

.spinner {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 3px solid rgba(26, 47, 90, 0.12);
  border-top-color: #f5a623;
  animation: spin 0.85s linear infinite;
}

.loading-text {
  font-weight: 900;
  color: var(--text-h);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
