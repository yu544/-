<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const active = computed(() => route.name ?? '')
const menuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  }
)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
</script>

<template>
  <header class="top-nav">
    <div class="top-nav-inner">
      <router-link class="brand" to="/">
        <span class="brand-mark">策</span>
        <span class="brand-text-wrap">
          <span class="brand-text">策算学堂</span>
          <span class="brand-sub">StratAlgo Academy</span>
        </span>
      </router-link>

      <nav class="nav-links" aria-label="主导航">
        <router-link :class="{ active: active === 'home' }" to="/">首页</router-link>
        <router-link :class="{ active: active === 'courses' }" to="/courses">微课列表</router-link>
        <router-link :class="{ active: active === 'about' }" to="/about">关于我们</router-link>
      </nav>

      <div class="nav-right">
        <router-link class="cta-button" to="/courses">开始学习</router-link>
        <button
          type="button"
          class="menu-toggle"
          :aria-expanded="menuOpen"
          aria-controls="mobile-nav"
          aria-label="打开菜单"
          @click="toggleMenu"
        >
          <span class="burger" :class="{ open: menuOpen }" />
        </button>
      </div>
    </div>

    <div id="mobile-nav" class="mobile-drawer" :class="{ open: menuOpen }">
      <router-link :class="{ active: active === 'home' }" to="/">首页</router-link>
      <router-link :class="{ active: active === 'courses' }" to="/courses">微课列表</router-link>
      <router-link :class="{ active: active === 'about' }" to="/about">关于我们</router-link>
      <router-link class="mobile-cta" to="/courses">开始学习</router-link>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px) saturate(1.2);
  box-shadow: var(--shadow-sm);
}

.top-nav-inner {
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  min-width: 0;
}

.brand-mark {
  flex-shrink: 0;
  font-weight: 900;
  font-size: 1.15rem;
  color: var(--gold);
  background: linear-gradient(145deg, rgba(245, 166, 35, 0.2), rgba(26, 47, 90, 0.08));
  border: 1px solid rgba(245, 166, 35, 0.35);
  border-radius: 12px;
  padding: 8px 11px;
  line-height: 1;
}

.brand-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.15;
  min-width: 0;
}

.brand-text {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-h);
  letter-spacing: 0.02em;
}

.brand-sub {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
}

.nav-links a {
  color: var(--text);
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 999px;
  transition:
    background 0.2s,
    color 0.2s;
}

.nav-links a:hover {
  color: var(--text-h);
  background: var(--brand-bg-subtle);
}

.nav-links a.active {
  color: var(--brand);
  background: rgba(245, 166, 35, 0.16);
  border: 1px solid rgba(245, 166, 35, 0.35);
  padding: 7px 13px;
}

@media (prefers-color-scheme: dark) {
  .nav-links a.active {
    color: var(--gold-hover);
  }
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cta-button {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 100%);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(26, 47, 90, 0.25);
  transition:
    transform 0.15s,
    box-shadow 0.2s;
}
.cta-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(26, 47, 90, 0.32);
}

.menu-toggle {
  display: none;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  cursor: pointer;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.burger {
  width: 18px;
  height: 2px;
  background: var(--text-h);
  border-radius: 1px;
  position: relative;
  transition: background 0.2s;
}
.burger::before,
.burger::after {
  content: '';
  position: absolute;
  left: 0;
  width: 18px;
  height: 2px;
  background: var(--text-h);
  border-radius: 1px;
  transition: transform 0.2s;
}
.burger::before {
  top: -6px;
}
.burger::after {
  top: 6px;
}
.burger.open {
  background: transparent;
}
.burger.open::before {
  transform: translateY(6px) rotate(45deg);
}
.burger.open::after {
  transform: translateY(-6px) rotate(-45deg);
}

.mobile-drawer {
  display: none;
  flex-direction: column;
  gap: 4px;
  padding: 8px 20px 16px;
  border-top: 1px solid var(--border);
  background: var(--bg-elevated);
  backdrop-filter: blur(12px);
}

.mobile-drawer a {
  text-decoration: none;
  color: var(--text-h);
  font-weight: 600;
  padding: 12px 14px;
  border-radius: 12px;
}

.mobile-drawer a.active {
  background: rgba(245, 166, 35, 0.14);
  border: 1px solid rgba(245, 166, 35, 0.3);
}

.mobile-drawer.open {
  display: flex;
}

.mobile-cta {
  margin-top: 6px;
  text-align: center;
  background: linear-gradient(135deg, var(--brand), var(--brand-soft)) !important;
  color: #fff !important;
}

@media (max-width: 820px) {
  .nav-links {
    display: none;
  }
  .nav-right .cta-button {
    display: none;
  }
  .menu-toggle {
    display: inline-flex;
  }
  .mobile-drawer.open {
    display: flex;
  }
}

@media (min-width: 821px) {
  .mobile-drawer {
    display: none !important;
  }
}
</style>
