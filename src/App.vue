<template>
  <div class="relative w-full h-screen bg-[#19191d] overflow-hidden">
    <div class="absolute inset-0 z-0">
        <ConceptGraph 
          ref="codeGraphRef"
          :nodes="store.nodesArray" 
          :links="store.linksArray"
          :settings="store.state.settings"
          :selected-node-id="selectedNodeId"
          :thinking-node-id="store.state.thinkingNodeId"
          @select="onNodeSelect" 
        />
    </div>

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-4 left-4 bottom-4 z-20 pointer-events-none flex flex-col gap-2 w-80">
       <div class="pointer-events-auto flex-1 overflow-hidden flex flex-col">
         <GraphExplorer 
            :selected-node="selectedNode" 
            @select="onNodeSelect" 
         />
       </div>

       <div class="pointer-events-auto flex items-center gap-2">
         <button @click="promptNewIndependentNode" class="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
         <label class="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-full px-3 py-1.5 cursor-pointer shadow-lg hover:bg-zinc-800 transition-colors">
            <input type="checkbox" :checked="store.state.settings.autoExplore" @change="(e: any) => toggleAutoExplore(e.target.checked)" class="w-4 h-4 accent-indigo-500" />
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Auto-Explore</span>
         </label>
       </div>
    </div>

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-16 right-4 bottom-4 z-20 pointer-events-none flex flex-col gap-3 items-center overflow-y-auto overflow-x-visible custom-scrollbar px-3">
        <div 
          v-for="island in store.graphIslands" 
          :key="island.id" 
          @click="onNodeSelect(island)"
          class="pointer-events-auto w-20 h-24 flex-shrink-0 flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer bg-zinc-900/40 backdrop-blur-sm shadow-xl hover:scale-105 active:scale-95 group select-none"
          :class="selectedNodeId === island.id ? 'border-indigo-500 bg-indigo-950/20 shadow-indigo-500/10' : 'border-zinc-800/50 hover:border-zinc-600'"
        >
           <NodeIcon type="cluster" :color="selectedNodeId === island.id ? '#6366f1' : '#52525b'" class="w-10 h-10 transition-colors" />
           <span class="mt-2 text-[9px] font-bold uppercase tracking-tighter text-center px-1 max-w-full truncate" :class="selectedNodeId === island.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'">
             {{ island.label }}
           </span>
        </div>
    </div>

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
       <div class="pointer-events-auto">
         <AspectBar 
            :defined-aspects="store.state.settings.definedAspects"
            :active-aspects="store.state.settings.activeAspects"
         />
       </div>
    </div>

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-4 right-4 z-30 flex gap-2">
      <button @click="codeGraphRef?.reheat()" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Re-layout"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg></button>

      <div class="relative">
        <button @click="showBrainPanel = !showBrainPanel" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg transition-colors" :class="store.aiStatus === 'ready' ? 'text-emerald-500' : (store.aiStatus === 'thinking' ? 'text-indigo-400 animate-pulse' : 'text-zinc-500')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.78-3.06 2.5 2.5 0 0 1-2.41-4.23 2.5 2.5 0 0 1 .53-4.58A2.5 2.5 0 0 1 9.5 2z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.78-3.06 2.5 2.5 0 0 0 2.41-4.23 2.5 2.5 0 0 0-.53-4.58A2.5 2.5 0 0 0 14.5 2z"></path></svg>
        </button>
        <div v-if="showBrainPanel" class="absolute top-full right-0 mt-2">
          <BrainPanel 
            :status="store.aiStatus" 
            :config="store.serverAiConfig" 
            @load="store.send({ type: 'LOAD_AI_MODEL' })"
            @unload="store.send({ type: 'UNLOAD_AI_MODEL' })"
            @updateConfig="(c) => store.send({ type: 'UPDATE_AI_CONFIG', config: c })"
          />
        </div>
      </div>

      <div class="relative">
        <button @click="showConfig = !showConfig" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
        <div v-if="showConfig" class="absolute top-full right-0 mt-2"><ConfigPanel /></div>
      </div>
    </div>

    <div v-if="store.isConnected && store.isStateLoaded && store.nodesArray.length === 0" class="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center">
       <InitialOnboarding @start="handleOnboardingComplete" />
    </div>

    <div v-if="!store.isConnected || !store.isStateLoaded" class="absolute inset-0 z-[110] bg-black/60 backdrop-blur flex items-center justify-center">
      <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-4 border-t-indigo-500 border-zinc-800 rounded-full animate-spin"></div>
        <p class="text-white font-bold tracking-tight">{{ !store.isConnected ? 'Brain Engine Offline' : 'Synchronizing State...' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useGraphStore } from './stores/graphStore'
import ConceptGraph from './components/ConceptGraph.vue'
import GraphExplorer from './components/GraphExplorer.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import AspectBar from './components/AspectBar.vue'
import InitialOnboarding from './components/InitialOnboarding.vue'
import BrainPanel from './components/BrainPanel.vue'
import NodeIcon from './components/NodeIcon.vue'
import type { GraphNode } from './types/graph'

const store = useGraphStore()
const codeGraphRef = ref<InstanceType<typeof ConceptGraph> | null>(null)
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => selectedNodeId.value ? store.state.nodes[selectedNodeId.value] : null)

const showConfig = ref(false)
const showBrainPanel = ref(false)

// Use the store's computed island calculation
const graphIslands = computed(() => store.graphIslands);

function handleOnboardingComplete(payload: { label: string, aspects: string[] }) {
  store.send({ 
    type: 'UPDATE_SETTINGS', 
    settings: { ...store.state.settings, definedAspects: payload.aspects, activeAspects: payload.aspects.slice(0, 3) } 
  });
  store.send({ type: 'ADD_NODE', label: payload.label });
}

function onNodeSelect(node: GraphNode | null) {
  selectedNodeId.value = node?.id || null
  if (node) {
     store.send({ type: 'SET_FOCUS', nodeId: node.id })
     codeGraphRef.value?.focusNode(node.id)
  }
}

function toggleAutoExplore(val: boolean) { 
  store.send({ type: 'UPDATE_SETTINGS', settings: { ...store.state.settings, autoExplore: val } });
}

function promptNewIndependentNode() { 
  const label = prompt('New independent concept:'); 
  if (label) store.send({ type: 'ADD_NODE', label }); 
}

onMounted(() => {
  store.connect()
  window.addEventListener('update-settings', (e: any) => {
    store.send({ type: 'UPDATE_SETTINGS', settings: { ...store.state.settings, ...e.detail } });
  })
  window.addEventListener('clear-graph', () => store.send({ type: 'CLEAR_GRAPH' }))
})
</script>

<style>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f3f; }
</style>