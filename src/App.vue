<template>
  <div class="relative w-full h-screen bg-[#19191d] overflow-hidden">
    <div class="absolute inset-0 z-0">
        <ConceptGraph 
          ref="codeGraphRef"
          :nodes="store.nodesArray" 
          :links="store.linksArray"
          :settings="store.state.settings"
          :active-aspects="store.activeAspects"
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

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2">
       <div class="pointer-events-auto flex items-center gap-2 bg-zinc-900/60 backdrop-blur px-3 py-1 rounded-full border border-zinc-800 shadow-lg">
          <span class="text-[10px] font-bold text-white uppercase tracking-wider">{{ store.state.settings.name }}</span>
          <button @click="editGraphName" class="text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
       </div>
       <div class="pointer-events-auto">
         <AspectBar 
            :defined-aspects="store.state.settings.definedAspects"
         />
       </div>
    </div>

    <div v-if="store.isStateLoaded && store.nodesArray.length > 0" class="absolute top-4 right-4 z-30 flex gap-2">
      <button @click="backToRoot" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Back to List">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>
      <button @click="codeGraphRef?.reheat()" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Re-layout"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg></button>

      <div class="relative">
        <button @click.stop="showBrainPanel = !showBrainPanel" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg transition-colors" :class="store.aiStatus === 'ready' ? 'text-emerald-500' : (store.aiStatus === 'thinking' ? 'text-indigo-400 animate-pulse' : 'text-zinc-500')" title="AI Engine Management">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
        </button>
        <div v-if="showBrainPanel" @click.stop class="absolute top-full right-0 mt-2">
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
        <button @click.stop="showRelations = !showRelations; showConfig = false; showBrainPanel = false" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white" title="Relations Management">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>
        <div v-if="showRelations" @click.stop class="absolute top-full right-0 mt-2">
          <RelationsPanel />
        </div>
      </div>

      <div class="relative">
        <button @click.stop="showConfig = !showConfig; showRelations = false; showBrainPanel = false" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
        <div v-if="showConfig" @click.stop class="absolute top-full right-0 mt-2"><ConfigPanel /></div>
      </div>
    </div>

    <div v-if="store.isConnected && store.isStateLoaded && (!store.currentFilename || store.nodesArray.length === 0)" class="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center">
       <InitialOnboarding :graph-list="store.graphList" :is-demo="store.isDemoMode" @start="handleOnboardingComplete" @load="loadExistingGraph" />
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
import RelationsPanel from './components/RelationsPanel.vue'
import type { GraphNode } from './types/graph'

const store = useGraphStore()
const codeGraphRef = ref<InstanceType<typeof ConceptGraph> | null>(null)
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => selectedNodeId.value ? store.state.nodes[selectedNodeId.value] : null)

const showConfig = ref(false)
const showRelations = ref(false)
const showBrainPanel = ref(false)

function backToRoot() {
  store.currentFilename = null;
  window.location.hash = '';
  store.send({ type: 'LIST_GRAPHS' });
}

function loadExistingGraph(name: string) {
  store.send({ type: 'LOAD_GRAPH', name });
}

// Use the store's computed island calculation
const graphIslands = computed(() => store.graphIslands);

function handleOnboardingComplete(payload: { labels: string[], aspects: string[], name?: string }) {
  const filename = payload.name || 'New Graph';
  store.send({ type: 'NEW_GRAPH', name: filename });
  
  setTimeout(() => {
    store.activeAspects = payload.aspects.slice(0, 3);
    store.send({ 
      type: 'UPDATE_SETTINGS', 
      settings: { ...store.state.settings, name: filename, definedAspects: payload.aspects } 
    });
    // Add all starting concepts
    payload.labels.forEach(label => {
      store.send({ type: 'ADD_NODE', label });
    });
  }, 200);
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

function editGraphName() {
  const name = prompt('Rename Graph:', store.state.settings.name);
  if (name && name !== store.state.settings.name) {
    store.send({ type: 'UPDATE_SETTINGS', settings: { ...store.state.settings, name } });
  }
}

function promptNewIndependentNode() { 
  const label = prompt('New independent concept:'); 
  if (label) store.send({ type: 'ADD_NODE', label }); 
}

onMounted(() => {
  store.connect()
  window.addEventListener('click', () => {
    showConfig.value = false
    showRelations.value = false
    showBrainPanel.value = false
  })

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