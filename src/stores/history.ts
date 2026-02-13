import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHistoryStore = defineStore('history', () => {
  const recentPaths = ref<string[]>([])
  const lastPath = ref<string>('')

  function addPath(path: string) {
    if (!path) return
    // Remove if exists to move to top
    recentPaths.value = recentPaths.value.filter(p => p !== path)
    // Add to beginning
    recentPaths.value.unshift(path)
    // Keep max 10
    if (recentPaths.value.length > 10) {
      recentPaths.value.pop()
    }
    lastPath.value = path
  }

  return { recentPaths, lastPath, addPath }
}, {
  persist: true
})
