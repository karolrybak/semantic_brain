<template>
  <div class="bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg p-4 w-72 flex flex-col gap-3 text-xs text-zinc-300 shadow-xl">
    <h3 class="font-bold text-zinc-400 uppercase tracking-wider mb-1">Brain Engine Config</h3>
    
    <div class="space-y-1">
      <label class="flex justify-between">AI Creativity <span>{{ store.state.settings.creativity }}</span></label>
      <input type="range" min="0" max="1" step="0.1" :value="store.state.settings.creativity" @input="(e: any) => updateServerSettings({ creativity: parseFloat(e.target.value) })" class="w-full accent-indigo-500" />
    </div>

    <div class="space-y-1">
      <label class="flex justify-between">Min AI Connections <span>{{ store.state.settings.minConnections }}</span></label>
      <input type="range" min="1" max="10" step="1" :value="store.state.settings.minConnections" @input="(e: any) => updateServerSettings({ minConnections: parseInt(e.target.value) })" class="w-full accent-indigo-500" />
    </div>

    <div class="pt-2">
      <label class="flex items-center gap-2 cursor-pointer group">
        <input 
          type="checkbox" 
          :checked="store.state.settings.showEmoji" 
          @change="(e: any) => updateServerSettings({ showEmoji: e.target.checked })" 
          class="w-3.5 h-3.5 accent-indigo-500" 
        />
        <span class="text-zinc-400 group-hover:text-zinc-200 transition-colors">Show Emoji</span>
      </label>
    </div>

    <h3 class="font-bold text-zinc-400 uppercase tracking-wider mt-2 pt-3 border-t border-zinc-800">Visuals</h3>
    <div class="space-y-1">
      <label class="flex justify-between text-zinc-500">Link Opacity <span>{{ config.linkOpacity }}</span></label>
      <input type="range" min="0" max="1" step="0.05" v-model.number="config.linkOpacity" class="w-full accent-blue-500" />
    </div>
    <div class="space-y-1">
      <label class="flex justify-between text-zinc-500">Label Size <span>{{ config.labelSize }}</span></label>
      <input type="range" min="0.1" max="3" step="0.1" v-model.number="config.labelSize" class="w-full accent-blue-500" />
    </div>

    <div class="pt-2 border-t border-zinc-700/50 flex flex-col gap-2">
       <button @click="clearGraph" class="w-full py-2 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 rounded text-[10px] font-bold uppercase transition-all">Clear All Concepts</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGraphConfigStore } from '../stores/graphConfig'
import { useGraphStore } from '../stores/graphStore'

const config = useGraphConfigStore()
const store = useGraphStore()

function updateServerSettings(patch: any) {
  window.dispatchEvent(new CustomEvent('update-settings', { detail: patch }))
}

function clearGraph() {
  if (confirm('Are you sure you want to delete all concepts?')) {
    window.dispatchEvent(new CustomEvent('clear-graph'))
  }
}
</script>