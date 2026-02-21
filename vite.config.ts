import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  base: mode === 'production' ? '/semantic_brain/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
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
}))
