import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      // `/videos/*` 由 `public/videos` 静态提供，勿再走代理（否则未启后端会 502）
    },
  },
})
