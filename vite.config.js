import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 設定檔：啟用 React 與 Tailwind v4
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
