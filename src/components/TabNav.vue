<script setup>
const props = defineProps({
  tabs: { type: Array, required: true },
  activeKey: { type: String, required: true },
})

const emit = defineEmits(['select'])

function onSelect(key) {
  emit('select', key)
}
</script>

<template>
  <div class="tab-nav-wrap">
    <div class="tab-nav" role="tablist" aria-label="微课详情模块导航">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab-btn"
        :class="{ active: t.key === activeKey }"
        type="button"
        role="tab"
        :aria-selected="t.key === activeKey"
        @click="onSelect(t.key)"
      >
        {{ t.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.tab-nav-wrap {
  position: sticky;
  top: 68px;
  z-index: 40;
  margin: 0 -6px 8px;
  padding: 8px 6px 10px;
  background: linear-gradient(180deg, var(--bg) 60%, transparent);
  backdrop-filter: blur(8px);
}

.tab-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}

.tab-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--text);
  border-radius: 999px;
  padding: 10px 16px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s;
}

.tab-btn:hover {
  color: var(--text-h);
  background: var(--brand-bg-subtle);
}

.tab-btn.active {
  border-color: rgba(245, 166, 35, 0.42);
  background: linear-gradient(135deg, rgba(245, 166, 35, 0.18), rgba(26, 47, 90, 0.08));
  color: var(--brand);
  box-shadow: 0 2px 12px rgba(245, 166, 35, 0.12);
}

@media (prefers-color-scheme: dark) {
  .tab-btn.active {
    color: var(--gold-hover);
  }
}

@media (max-width: 640px) {
  .tab-nav-wrap {
    top: 64px;
  }
  .tab-nav {
    border-radius: var(--radius-md);
  }
  .tab-btn {
    padding: 8px 12px;
    font-size: 12px;
  }
}
</style>
