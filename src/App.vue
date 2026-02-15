<template>
  <div class="relative w-full h-screen bg-[#19191d] overflow-hidden">
    <div class="absolute inset-0 z-0">
        <ConceptGraph 
          ref="codeGraphRef"
          :data="graphData" 
          :selected-node-id="selectedNodeId"
          :thinking-node-id="thinkingNodeId"
          @select="onNodeSelect" 
        />
    </div>

    <!-- Left Sidebar: Explorer -->
    <div v-if="isStateLoaded && graphData.nodes.length > 0" class="absolute top-4 left-4 bottom-4 z-20 pointer-events-none flex flex-col gap-2 w-80">
       <div class="pointer-events-auto flex-1 overflow-hidden flex flex-col">
         <GraphExplorer 
            :data="graphData" 
            :selected-node="selectedNode" 
            :thinking-node-id="thinkingNodeId"
            @select="onNodeSelect" 
            @add-node="addNewNode"
            @accept-node="acceptNode"
            @forbid-node="forbidNode"
            @delete-node="deleteNode"
            @explore-new="triggerExploreNew"
            @explore-existing="triggerExploreExisting"
            @update-aspects="triggerUpdateAspects"
         />
       </div>

       <!-- Global Actions -->
       <div class="pointer-events-auto flex items-center gap-2">
         <button @click="promptNewIndependentNode" class="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
         <label class="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-full px-3 py-1.5 cursor-pointer shadow-lg hover:bg-zinc-800 transition-colors">
            <input type="checkbox" :checked="graphData.settings?.autoExplore" @change="(e: any) => toggleAutoExplore(e.target.checked)" class="w-4 h-4 accent-indigo-500" />
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Auto-Explore</span>
         </label>
       </div>
    </div>

    <!-- Right Sidebar: Island Navigator -->
    <div v-if="isStateLoaded && graphData.nodes.length > 0" class="absolute top-16 right-4 bottom-4 z-20 pointer-events-none flex flex-col gap-3 items-center overflow-y-auto overflow-x-visible custom-scrollbar px-3">
        <div 
          v-for="island in graphIslands" 
          :key="island.id" 
          @click="onNodeSelect(island)"
          class="pointer-events-auto w-20 h-24 flex-shrink-0 flex flex-col items-center justify-center rounded-xl border transition-all cursor-pointer bg-zinc-900/40 backdrop-blur-sm shadow-xl hover:scale-105 active:scale-95 group select-none"
          :class="selectedNodeId === island.id 
            ? 'border-indigo-500 bg-indigo-950/20 shadow-indigo-500/10' 
            : 'border-zinc-800/50 hover:border-zinc-600'"
        >
           <NodeIcon type="cluster" :color="selectedNodeId === island.id ? '#6366f1' : '#52525b'" class="w-10 h-10 transition-colors" />
           <span class="mt-2 text-[9px] font-bold uppercase tracking-tighter text-center px-1 max-w-full truncate"
                 :class="selectedNodeId === island.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'">
             {{ island.label }}
           </span>
        </div>
    </div>

    <!-- Top Center Aspect Bar -->
    <div v-if="isStateLoaded && graphData.nodes.length > 0" class="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
       <div class="pointer-events-auto">
         <AspectBar 
            :defined-aspects="graphData.settings?.definedAspects || []"
            :active-aspects="graphData.settings?.activeAspects || []"
         />
       </div>
    </div>

    <!-- Control Buttons -->
    <div v-if="isStateLoaded && graphData.nodes.length > 0" class="absolute top-4 right-4 z-30 flex gap-2">
      <button 
        @click="codeGraphRef?.reheat()"
        class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        title="Re-layout (Manual Reheat)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg>
      </button>

      <div class="relative">
        <button 
          @click="showBrainPanel = !showBrainPanel" 
          class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg transition-colors"
          :class="aiStatus === 'ready' ? 'text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : (aiStatus === 'thinking' ? 'text-indigo-400 animate-pulse' : 'text-zinc-500 hover:text-white')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.78-3.06 2.5 2.5 0 0 1-2.41-4.23 2.5 2.5 0 0 1 .53-4.58A2.5 2.5 0 0 1 9.5 2z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.78-3.06 2.5 2.5 0 0 0 2.41-4.23 2.5 2.5 0 0 0-.53-4.58A2.5 2.5 0 0 0 14.5 2z"></path></svg>
        </button>
        <div v-if="showBrainPanel" class="absolute top-full right-0 mt-2">
          <BrainPanel 
            :status="thinkingNodeId ? 'thinking' : aiStatus" 
            :config="serverAiConfig" 
            @load="ws?.send(JSON.stringify({ type: 'LOAD_AI_MODEL' }))"
            @unload="ws?.send(JSON.stringify({ type: 'UNLOAD_AI_MODEL' }))"
            @updateConfig="(c) => ws?.send(JSON.stringify({ type: 'UPDATE_AI_CONFIG', config: c }))"
          />
        </div>
      </div>

      <div class="relative">
        <button @click="showConfig = !showConfig" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg></button>
        <div v-if="showConfig" class="absolute top-full right-0 mt-2"><ConfigPanel :settings="graphData.settings" /></div>
      </div>
    </div>

    <!-- Onboarding Flow -->
    <div v-if="isConnected && isStateLoaded && graphData.nodes.length === 0" class="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center">
       <InitialOnboarding :ws="ws" @start="handleOnboardingComplete" />
    </div>

    <!-- Loading/Offline Overlay -->
    <div v-if="!isConnected || !isStateLoaded" class="absolute inset-0 z-[110] bg-black/60 backdrop-blur flex items-center justify-center">
      <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-4 border-t-indigo-500 border-zinc-800 rounded-full animate-spin"></div>
        <p class="text-white font-bold tracking-tight">{{ !isConnected ? 'Brain Engine Offline' : 'Synchronizing State...' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ConceptGraph from './components/ConceptGraph.vue'
import GraphExplorer from './components/GraphExplorer.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import AspectBar from './components/AspectBar.vue'
import InitialOnboarding from './components/InitialOnboarding.vue'
import BrainPanel from './components/BrainPanel.vue'
import NodeIcon from './components/NodeIcon.vue'
import type { GraphData, GraphNode } from './types/graph'

const codeGraphRef = ref<InstanceType<typeof ConceptGraph> | null>(null)
const isStateLoaded = ref(false)
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => {
  return graphData.value.nodes.find((n: any) => n.id === selectedNodeId.value) || null
})
const thinkingNodeId = ref<string | null>(null)
const graphData = ref<any>({ nodes: [], links: [], settings: {} })
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const showConfig = ref(false)
const showBrainPanel = ref(false)
const aiStatus = ref<'unloaded' | 'loading' | 'ready' | 'thinking' | 'error'>('unloaded')
const serverAiConfig = ref({ selectedSize: 'medium', loadOnStartup: true })

const graphIslands = computed(() => {
  const nodes = graphData.value.nodes;
  const links = graphData.value.links;
  if (nodes.length === 0) return [];

  const adj = new Map<string, string[]>();
  nodes.forEach((n: any) => adj.set(n.id, []));
  links.forEach((l: any) => {
    const s = typeof l.source === 'string' ? l.source : l.source.id;
    const t = typeof l.target === 'string' ? l.target : l.target.id;
    if (adj.has(s)) adj.get(s)?.push(t);
    if (adj.has(t)) adj.get(t)?.push(s);
  });

  const visited = new Set<string>();
  const islands: any[] = [];

  nodes.forEach((node: any) => {
    if (!visited.has(node.id)) {
      const component: any[] = [];
      const queue = [node.id];
      visited.add(node.id);

      while (queue.length > 0) {
        const currId = queue.shift()!;
        const n = nodes.find((nodeObj: any) => nodeObj.id === currId);
        if (n) component.push(n);

        (adj.get(currId) || []).forEach(nextId => {
          if (!visited.has(nextId)) {
            visited.add(nextId);
            queue.push(nextId);
          }
        });
      }
      component.sort((a, b) => (b.type === 'root' ? 1 : 0) - (a.type === 'root' ? 1 : 0));
      islands.push(component[0]);
    }
  });

  return islands;
});

function connectWS() {
  const host = window.location.hostname || 'localhost';
  ws.value = new WebSocket(`ws://${host}:3001`)
  ws.value.onopen = () => isConnected.value = true
  ws.value.onclose = () => { isConnected.value = false; isStateLoaded.value = false; setTimeout(connectWS, 3000) }
  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'FULL_STATE') {
      graphData.value = { 
        nodes: Object.values(data.state.nodes), 
        links: data.state.links, 
        settings: data.state.settings 
      }
      thinkingNodeId.value = data.state.thinkingNodeId
      isStateLoaded.value = true
    } else if (data.type === 'PATCH') {
      applyPatchToLocalGraph(data.patches)
    } else if (data.type === 'AI_STATUS') {
      aiStatus.value = data.status === 'ready' ? (thinkingNodeId.value ? 'thinking' : 'ready') : data.status;
    } else if (data.type === 'AI_CONFIG_UPDATED') {
      serverAiConfig.value = data.config;
    }
  }
}

function applyPatchToLocalGraph(patches: any[]) {
  patches.forEach(patch => {
    const parts = patch.path.split('/');
    if (patch.op === 'add') {
      if (parts[1] === 'nodes') graphData.value.nodes.push(patch.value);
      else if (patch.path === '/links/-') graphData.value.links.push(patch.value);
    } else if (patch.op === 'remove') {
      if (parts[1] === 'nodes') {
        const id = parts[2];
        graphData.value.nodes = graphData.value.nodes.filter((n: any) => n.id !== id);
      }
    } else if (patch.op === 'replace') {
      if (parts[1] === 'nodes') {
        const id = parts[2];
        const prop = parts[3];
        const node = graphData.value.nodes.find((n: any) => n.id === id);
        if (node && prop) node[prop] = patch.value;
      } else if (patch.path === '/thinkingNodeId') {
        thinkingNodeId.value = patch.value;
        if (aiStatus.value === 'ready' && patch.value) aiStatus.value = 'thinking';
        else if (aiStatus.value === 'thinking' && !patch.value) aiStatus.value = 'ready';
      } else if (patch.path === '/settings') {
        graphData.value.settings = patch.value;
      } else if (patch.path === '/links') {
        graphData.value.links = patch.value;
      }
    }
  });
  graphData.value = { ...graphData.value };
}

function handleOnboardingComplete(payload: { label: string, aspects: string[] }) {
  if (ws.value?.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ 
      type: 'UPDATE_SETTINGS', 
      settings: { ...graphData.value.settings, definedAspects: payload.aspects, activeAspects: payload.aspects.slice(0, 3) } 
    }))
    ws.value.send(JSON.stringify({ type: 'ADD_NODE', label: payload.label }))
  }
}

function onNodeSelect(node: GraphNode | null) {
  selectedNodeId.value = node?.id || null
  if (node && ws.value?.readyState === WebSocket.OPEN) {
     ws.value.send(JSON.stringify({ type: 'SET_FOCUS', nodeId: node.id }))
     codeGraphRef.value?.focusNode(node.id)
  }
}

function addNewNode(p: any) { ws.value?.send(JSON.stringify({ type: 'ADD_NODE', ...p })) }
function acceptNode(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'ACCEPT_NODE', nodeId })) }
function forbidNode(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'FORBID_NODE', nodeId })) }
function deleteNode(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'DELETE_NODE', nodeId })); selectedNodeId.value = null }
function toggleAutoExplore(val: boolean) { ws.value?.send(JSON.stringify({ type: 'UPDATE_SETTINGS', settings: { ...graphData.value.settings, autoExplore: val } })) }

function triggerExploreNew(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'EXPLORE_NEW', nodeId })) }
function triggerExploreExisting(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'EXPLORE_EXISTING', nodeId })) }
function triggerUpdateAspects(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'UPDATE_NODE_ASPECTS', nodeId })) }
function promptNewIndependentNode() { const label = prompt('New independent concept:'); if (label) addNewNode({ label }) }

onMounted(() => {
  connectWS()
  window.addEventListener('update-settings', (e: any) => {
    const updatedSettings = { ...graphData.value.settings, ...e.detail };
    ws.value?.send(JSON.stringify({ type: 'UPDATE_SETTINGS', settings: updatedSettings }));
  })
  window.addEventListener('clear-graph', () => ws.value?.send(JSON.stringify({ type: 'CLEAR_GRAPH' })))
})
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #3f3f3f;
}
</style>