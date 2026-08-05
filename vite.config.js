import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  plugins: [vue()],
  // Pages needs a fixed subpath; Tauri loads from relative dist assets.
  base: isTauri ? './' : '/mabinogi-mobile-tracker/',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
