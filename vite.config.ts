import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import scannerPlugin from './vite-plugin-scanner'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    scannerPlugin()
  ],
  server: {
    hmr: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['three']
  },
  optimizeDeps: {
    exclude: ['three']
  }
})
