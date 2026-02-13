<template>
  <div class="bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg p-4 w-72 flex flex-col gap-3 text-xs text-zinc-300 shadow-xl">
    <h3 class="font-bold text-zinc-400 uppercase tracking-wider mb-1">Brain Engine Config</h3>
    
    <div class="space-y-1">
      <label class="flex justify-between">AI Creativity <span>{{ stateSettings.creativity }}</span></label>
      <input type="range" min="0" max="1" step="0.1" v-model.number="stateSettings.creativity" @change="updateServerSettings" class="w-full accent-indigo-500" />
    </div>

    <div class="space-y-1">
      <label class="flex justify-between">Min AI Connections <span>{{ stateSettings.minConnections }}</span></label>
      <input type="range" min="1" max="10" step="1" v-model.number="stateSettings.minConnections" @change="updateServerSettings" class="w-full accent-indigo-500" />
    </div>

    <h3 class="font-bold text-zinc-400 uppercase tracking-wider mt-2 pt-3 border-t border-zinc-800">Visuals</h3>
    <div class="space-y-1">
      <label class="flex justify-between text-zinc-500">Node Scale <span>{{ config.nodeRelSize }}</span></label>
      <input type="range" min="1" max="15" step="0.5" v-model.number="config.nodeRelSize" class="w-full accent-blue-500" />
    </div>
    <div class="space-y-1">
      <label class="flex justify-between text-zinc-500">Physics <span>{{ config.chargeStrength }}</span></label>
      <input type="range" min="-500" max="-10" step="10" v-model.number="config.chargeStrength" class="w-full accent-blue-500" />
    </div>

    <div class="pt-2 border-t border-zinc-700/50 flex flex-col gap-2">
       <button @click="clearGraph" class="w-full py-2 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 rounded text-[10px] font-bold uppercase transition-all">Clear All Concepts</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { useGraphConfigStore } from '../stores/graphConfig'
const props = defineProps<{ settings?: any }>()
const config = useGraphConfigStore()
const stateSettings = reactive({ creativity: 0.7, minConnections: 3, ...props.settings })
watch(() => props.settings, (newVal) => { if (newVal) Object.assign(stateSettings, newVal) }, { deep: true })
function updateServerSettings() { window.dispatchEvent(new CustomEvent('update-settings', { detail: { ...stateSettings } })) }
function clearGraph() { if (confirm('Are you sure?')) window.dispatchEvent(new CustomEvent('clear-graph')) }
</script>