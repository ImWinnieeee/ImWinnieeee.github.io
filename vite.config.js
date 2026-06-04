import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 設定檔：啟用 React 與 Tailwind v4
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // Don't watch the scraper folder. The logged-in Chrome profile under
      // scraper/.chrome-profile (and .userdata) writes Cookies/Cache files
      // constantly, which otherwise makes Vite full-reload every few seconds.
      ignored: ['**/scraper/**'],
    },
  },
})
