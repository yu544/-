<script setup>
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const props = defineProps({
  forceOpenSignal: { type: Number, default: 0 },
})

const open = ref(false)
const input = ref('')
const loading = ref(false)
const errorMsg = ref('')
const listRef = ref(null)

const messages = ref([
  {
    role: 'assistant',
    content:
      '你好！我是策算学堂首页 AI 向导，可以介绍站内功能、学习路径或贪心算法入门——输入问题即可。',
  },
])
const route = useRoute()

function isHomeRoute() {
  return route.name === 'home' || route.path === '/'
}

watch(
  messages,
  async () => {
    await nextTick()
    const el = listRef.value
    if (el) el.scrollTop = el.scrollHeight
  },
  { deep: true }
)

// 每次切到首页时，优先弹出 AI 面板
watch(
  () => route.fullPath,
  () => {
    open.value = isHomeRoute()
  },
  { immediate: true },
)

watch(
  () => props.forceOpenSignal,
  () => {
    open.value = true
  },
)

function toggle() {
  open.value = !open.value
}

async function send() {
  const text = input.value.trim()
  if (!text || loading.value) return

  errorMsg.value = ''
  messages.value.push({ role: 'user', content: text })
  input.value = ''
  loading.value = true

  try {
    const payload = {
      messages: messages.value.map((m) => ({ role: m.role, content: m.content })),
    }
    const resp = await axios.post('/api/ai/home', payload)
    const reply = resp.data?.reply ?? '（无返回内容）'
    messages.value.push({ role: 'assistant', content: reply })
  } catch (e) {
    const msg =
      e?.response?.data?.message ??
      e?.message ??
      '请求失败。请确认已在本目录运行 node server/index.js（首页 AI 走 /api 代理）。'
    errorMsg.value = msg
    messages.value.push({
      role: 'assistant',
      content: `抱歉，这次没连上后端或模型：${msg}`,
    })
  } finally {
    loading.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
</script>

<template>
  <div class="home-ai" role="complementary" aria-label="AI 学习向导">
    <button type="button" class="home-ai-trigger" :aria-expanded="open" @click="toggle">AI</button>

    <div v-if="open" class="home-ai-panel">
      <div class="home-ai-head">
        <div class="home-ai-title">
          <span class="home-ai-dot" aria-hidden="true" />
          AI 学习向导
        </div>
        <button type="button" class="home-ai-close" aria-label="收起面板" @click="toggle">收起</button>
      </div>

      <div ref="listRef" class="home-ai-messages" role="log" aria-live="polite">
        <div
          v-for="(m, idx) in messages"
          :key="idx"
          class="home-ai-msg"
          :class="m.role === 'user' ? 'is-user' : 'is-ai'"
        >
          <div class="home-ai-msg-label">{{ m.role === 'user' ? '你' : 'AI' }}</div>
          <div class="home-ai-msg-body">{{ m.content }}</div>
        </div>
        <div v-if="loading" class="home-ai-msg is-ai home-ai-thinking">正在回复…</div>
      </div>

      <div v-if="errorMsg" class="home-ai-err">{{ errorMsg }}</div>

      <div class="home-ai-input-row">
        <textarea
          v-model="input"
          class="home-ai-input"
          rows="2"
          placeholder="问一问站内功能、贪心算法…"
          :disabled="loading"
          @keydown="onKeydown"
        />
        <button type="button" class="home-ai-send" :disabled="loading || !input.trim()" @click="send">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-ai {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.home-ai-trigger {
  height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(26, 47, 90, 0.32);
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand-soft) 100%);
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.home-ai-panel {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: min(380px, calc(100vw - 28px));
  max-height: min(560px, calc(100vh - 140px));
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(16px) saturate(1.15);
  overflow: hidden;
  z-index: 80;
}

:global(.dark) .home-ai-panel {
  background: rgba(22, 23, 29, 0.94);
}

.home-ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--brand-bg-subtle);
}

:global(.dark) .home-ai-head {
  border-bottom-color: rgba(46, 48, 58, 0.95);
  background: rgba(26, 47, 90, 0.12);
}

.home-ai-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  color: var(--text-h);
  font-size: 14px;
}

.home-ai-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #f5a623;
  box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.25);
}

.home-ai-close {
  border: 1px solid rgba(26, 47, 90, 0.14);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-h);
  font-size: 12px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.home-ai-close:hover {
  background: rgba(245, 166, 35, 0.15);
  border-color: rgba(245, 166, 35, 0.35);
}

.home-ai-messages {
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-ai-msg {
  border-radius: 12px;
  padding: 10px 11px;
  font-size: 13px;
  line-height: 1.65;
}

.home-ai-msg-label {
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
  opacity: 0.72;
}

.is-user {
  align-self: flex-end;
  max-width: 92%;
  background: rgba(26, 47, 90, 0.08);
  border: 1px solid rgba(26, 47, 90, 0.12);
}

.is-ai {
  align-self: stretch;
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.22);
}

.home-ai-msg-body {
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
}

.home-ai-thinking {
  opacity: 0.85;
  font-style: italic;
}

.home-ai-err {
  font-size: 12px;
  color: #b42318;
  padding: 0 14px 4px;
}

.home-ai-input-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba(229, 228, 231, 0.9);
  align-items: end;
}

:global(.dark) .home-ai-input-row {
  border-top-color: rgba(46, 48, 58, 0.95);
}

.home-ai-input {
  resize: none;
  border-radius: 12px;
  border: 1px solid rgba(229, 228, 231, 1);
  padding: 10px 11px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.95);
  color: var(--text);
}

:global(.dark) .home-ai-input {
  background: rgba(13, 17, 23, 0.88);
  border-color: rgba(46, 48, 58, 0.95);
}

.home-ai-send {
  height: 40px;
  padding: 0 14px;
  border-radius: 12px;
  border: none;
  background: #1a2f5a;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.home-ai-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
