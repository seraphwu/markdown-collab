import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // 👈 關鍵：補上這個，解決 y-webrtc 的底層報錯
  },
})