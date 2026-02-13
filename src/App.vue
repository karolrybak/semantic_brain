<template>
  <div class="relative w-full h-screen bg-[#19191d] overflow-hidden">
    <div class="absolute inset-0 z-0">
        <CodeGraph 
          ref="codeGraphRef"
          :data="graphData" 
          :selected-node-id="selectedNode?.id"
          :thinking-node-id="thinkingNodeId"
          @select="onNodeSelect" 
        />
    </div>

    <!-- Graph Explorer (Left Sidebar) -->
    <div class="absolute top-4 left-4 z-20 pointer-events-none flex flex-col gap-2">
       <div class="pointer-events-auto">
         <GraphExplorer 
            :data="graphData" 
            :selected-node="selectedNode" 
            :thinking-node-id="thinkingNodeId"
            @select="onNodeSelect" 
            @add-node="addNewNode"
            @accept-node="acceptNode"
            @delete-node="deleteNode"
         />
       </div>
       <div class="pointer-events-auto flex items-center gap-2">
         <button 
            @click="promptNewIndependentNode" 
            class="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
            title="Add Independent Concept"
         >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
         </button>
         <label class="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-full px-3 py-1.5 cursor-pointer hover:bg-zinc-800 transition-colors shadow-lg">
            <input 
              type="checkbox" 
              :checked="graphData.settings?.autoExplore" 
              @change="(e: any) => toggleAutoExplore(e.target.checked)" 
              class="w-4 h-4 accent-indigo-500"
            />
            <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Auto-Explore</span>
         </label>
       </div>
    </div>

    <!-- Overlays & Top UI components remain ... -->
    <div class="absolute top-4 right-4 z-30">
      <button @click="showConfig = !showConfig" class="p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </button>
      <div v-if="showConfig" class="absolute top-full right-0 mt-2"><ConfigPanel :settings="graphData.settings" /></div>
    </div>

    <!-- Initial Prompt & Connection Overlays remain same ... -->
    <div v-if="isConnected && graphData.nodes.length === 0" class="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center">
       <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <h2 class="text-xl font-bold text-white mb-2 text-center">Start Exploration</h2>
          <input v-model="initialConceptInput" @keyup.enter="startExploration" placeholder="Initial concept..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white" autofocus />
          <button @click="startExploration" class="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-white font-bold">Begin</button>
       </div>
    </div>
    <div v-if="!isConnected" class="absolute inset-0 z-[110] bg-black/60 backdrop-blur flex items-center justify-center">
      <div class="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-4 border-t-indigo-500 border-zinc-800 rounded-full animate-spin"></div>
        <p class="text-white font-bold">Brain Engine Offline</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CodeGraph from './components/CodeGraph.vue'
import GraphExplorer from './components/GraphExplorer.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import type { GraphData, GraphNode } from './types/graph'

const codeGraphRef = ref<InstanceType<typeof CodeGraph> | null>(null)
const selectedNode = ref<GraphNode | null>(null)
const thinkingNodeId = ref<string | null>(null)
const graphData = ref<any>({ nodes: [], links: [], settings: {} })
const ws = ref<WebSocket | null>(null)
const isConnected = ref(false)
const showConfig = ref(false)
const initialConceptInput = ref('')

function connectWS() {
  const host = window.location.hostname || 'localhost';
  const url = `ws://${host}:3001`;
  console.log(`[WS] Attempting to connect to: ${url}`);

  ws.value = new WebSocket(url)
  
  ws.value.onopen = () => {
    console.log(`[WS] Connected successfully to ${url}`);
    isConnected.value = true
  }

  ws.value.onerror = (err) => {
    console.error(`[WS] Connection error:`, err);
  }

  ws.value.onclose = (event) => {
    isConnected.value = false;
    console.warn(`[WS] Closed. Code: ${event.code}. Reconnecting in 3s...`);
    setTimeout(connectWS, 3000) 
  }
  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === 'FULL_STATE') {
      graphData.value = { nodes: Object.values(data.state.nodes), links: data.state.links, settings: data.state.settings }
      thinkingNodeId.value = data.state.thinkingNodeId
    } else if (data.type === 'PATCH') {
      applyPatchToLocalGraph(data.patches)
    }
  }
}

function applyPatchToLocalGraph(patches: any[]) {
  patches.forEach(patch => {
    if (patch.op === 'add' && patch.path.startsWith('/nodes/')) graphData.value.nodes.push(patch.value);
    else if (patch.op === 'add' && patch.path === '/links/-') graphData.value.links.push(patch.value);
    else if (patch.op === 'remove' && patch.path.startsWith('/nodes/')) {
      const id = patch.path.split('/')[2];
      graphData.value.nodes = graphData.value.nodes.filter((n:any) => n.id !== id);
    }
    else if (patch.op === 'replace' && patch.path === '/links') graphData.value.links = patch.value;
    else if (patch.op === 'replace' && patch.path === '/thinkingNodeId') thinkingNodeId.value = patch.value;
    else if (patch.op === 'replace' && patch.path.endsWith('/status')) {
        const id = patch.path.split('/')[2];
        const node = graphData.value.nodes.find((n:any) => n.id === id);
        if (node) node.status = patch.value;
    }
  });
  graphData.value = { ...graphData.value };
}

function onNodeSelect(node: GraphNode | null) {
  selectedNode.value = node
  if (node && ws.value?.readyState === WebSocket.OPEN) {
     ws.value.send(JSON.stringify({ type: 'SET_FOCUS', nodeId: node.id }))
     codeGraphRef.value?.focusNode(node.id)
  }
}

function addNewNode(p: any) { ws.value?.send(JSON.stringify({ type: 'ADD_NODE', ...p })) }
function acceptNode(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'ACCEPT_NODE', nodeId })) }
function deleteNode(nodeId: string) { ws.value?.send(JSON.stringify({ type: 'DELETE_NODE', nodeId })); selectedNode.value = null }
function toggleAutoExplore(val: boolean) { ws.value?.send(JSON.stringify({ type: 'UPDATE_SETTINGS', settings: { ...graphData.value.settings, autoExplore: val } })) }
function startExploration() { if (initialConceptInput.value) { addNewNode({ label: initialConceptInput.value }); initialConceptInput.value = '' } }

onMounted(() => {
  connectWS()
  window.addEventListener('update-settings', (e: any) => ws.value?.send(JSON.stringify({ type: 'UPDATE_SETTINGS', settings: e.detail })))
  window.addEventListener('clear-graph', () => ws.value?.send(JSON.stringify({ type: 'CLEAR_GRAPH' })))
})
</script>