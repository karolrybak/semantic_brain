<template>
  <div class="flex gap-2 max-h-[90vh] pointer-events-auto items-start">
    <div v-if="selectedNode" class="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg p-4 shadow-xl text-zinc-100 flex flex-col overflow-hidden">
        <div class="flex justify-between items-start mb-2">
            <div class="p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                 <NodeIcon :type="selectedNode.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(selectedNode)" class="w-6 h-6" />
            </div>
            <div class="flex gap-1">
              <button @click="store.send({ type: 'FORBID_NODE', nodeId: selectedNode.id })" class="p-1.5 rounded transition-colors" :class="selectedNode.status === 'forbidden' ? 'text-red-500 bg-red-950/40' : 'text-zinc-600 hover:text-red-400'" title="Forbid Context">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
              </button>
              <button @click="deleteNode" class="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors" title="Delete Concept">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
              <button @click="$emit('select', null)" class="p-1.5 text-zinc-600 hover:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
        </div>

        <div class="mb-4">
          <h2 class="text-xl font-bold text-white break-words leading-tight">{{ selectedNode.label }}</h2>
          <div v-if="selectedNode.description" class="mt-3 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
            <p class="text-[13px] text-zinc-300 leading-relaxed font-medium">{{ selectedNode.description }}</p>
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[9px] uppercase tracking-widest text-zinc-500 font-mono">{{ selectedNode.status }} {{ selectedNode.type }}</span>
            <span v-if="store.state.thinkingNodeId === selectedNode.id" class="text-[9px] text-indigo-400 animate-pulse font-bold uppercase italic">AI is dreaming...</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
            <div v-if="hasAspects">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Aspect Relevance</h3>
                <div class="space-y-2">
                    <div v-for="(val, name) in selectedNode.aspects" :key="name" class="flex flex-col gap-1">
                        <div class="flex justify-between text-[10px] text-zinc-400">
                            <span>{{ name }}</span>
                            <span>{{ (val * 100).toFixed(0) }}%</span>
                        </div>
                        <div class="h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 shadow-[0_0_5px_#6366f1]" :style="{ width: (val * 100) + '%' }"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="incomingLinks.length > 0">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Related By</h3>
                <div class="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    <div v-for="ref in incomingLinks" :key="ref.id" @click="$emit('select', ref.node)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center justify-between">
                        <div class="flex items-center gap-2 truncate">
                          <NodeIcon :type="ref.node.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(ref.node)" class="w-2.5 h-2.5" />
                          <span class="truncate">{{ ref.node.label }}</span>
                        </div>
                        <span class="text-[9px] text-zinc-600 italic">{{ ref.type }}</span>
                    </div>
                </div>
            </div>

            <div v-if="outgoingLinks.length > 0">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Leads To</h3>
                <div class="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    <div v-for="dep in outgoingLinks" :key="dep.id" @click="$emit('select', dep.node)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center justify-between">
                        <div class="flex items-center gap-2 truncate">
                          <NodeIcon :type="dep.node.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(dep.node)" class="w-2.5 h-2.5" />
                          <span class="truncate">{{ dep.node.label }}</span>
                        </div>
                        <span class="text-[9px] text-zinc-600 italic">{{ dep.type }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 pt-4 border-t border-zinc-800 space-y-2">
           <div class="relative">
             <input v-model="relatedInput" @keyup.enter="addRelated" placeholder="Add connection..." class="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
             <button @click="addRelated" class="absolute right-2 top-1.5 text-zinc-500 hover:text-indigo-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
           </div>
           
           <button v-if="selectedNode.status === 'proposed'" @click="store.send({ type: 'ACCEPT_NODE', nodeId: selectedNode.id })" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-bold">Accept AI Suggestion</button>
           
           <div v-if="selectedNode.status === 'accepted'" class="grid grid-cols-2 gap-2">
              <button @click="store.send({ type: 'EXPLORE_NEW', nodeId: selectedNode.id })" :disabled="store.state.thinkingNodeId !== null" class="bg-zinc-800 hover:bg-indigo-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 disabled:opacity-50">Discover New</button>
              <button @click="store.send({ type: 'EXPLORE_EXISTING', nodeId: selectedNode.id })" :disabled="store.state.thinkingNodeId !== null" class="bg-zinc-800 hover:bg-emerald-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 disabled:opacity-50">Link Existing</button>
           </div>

           <button v-if="selectedNode.status === 'accepted'" @click="store.send({ type: 'UPDATE_NODE_ASPECTS', nodeId: selectedNode.id })" :disabled="store.state.thinkingNodeId !== null" class="w-full mt-2 bg-zinc-800 hover:bg-amber-900/30 text-[10px] py-2 rounded font-bold text-zinc-400 border border-zinc-700 transition-colors">
             Update Aspect Weights
           </button>
        </div>
    </div>
    <div v-else class="w-64 bg-zinc-900/50 backdrop-blur border border-zinc-800/50 p-4 rounded-lg text-center pointer-events-auto">
       <p class="text-zinc-600 text-xs">Select a node to navigate the landscape</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGraphStore } from '../stores/graphStore'
import type { GraphNode } from '../types/graph'
import NodeIcon from './NodeIcon.vue'

const store = useGraphStore()
const props = defineProps<{ selectedNode: GraphNode | null }>()
const emit = defineEmits<{ (e: 'select', n: any): void }>()

const relatedInput = ref('')
function addRelated() { if (relatedInput.value && props.selectedNode) { store.send({ type: 'ADD_NODE', label: relatedInput.value, parentId: props.selectedNode.id }); relatedInput.value = '' } }
function deleteNode() { if (props.selectedNode) { store.send({ type: 'DELETE_NODE', nodeId: props.selectedNode.id }); emit('select', null); } }

function getNodeColor(node: GraphNode) {
    if (node.status === 'forbidden') return '#ef4444'
    if (store.state.thinkingNodeId === node.id) return '#22c55e'
    if (node.type === 'root') return '#f43f5e'
    return node.status === 'accepted' ? '#3b82f6' : '#71717a'
}

const hasAspects = computed(() => props.selectedNode && Object.keys(props.selectedNode.aspects || {}).length > 0);

const outgoingLinks = computed(() => {
    if (!props.selectedNode) return []
    return store.linksArray
        .filter(l => (typeof l.source === 'string' ? l.source : l.source.id) === props.selectedNode!.id)
        .map(l => ({ node: store.state.nodes[typeof l.target === 'string' ? l.target : l.target.id], type: l.relationType }))
        .filter(n => !!n.node)
})

const incomingLinks = computed(() => {
    if (!props.selectedNode) return []
    return store.linksArray
        .filter(l => (typeof l.target === 'string' ? l.target : l.target.id) === props.selectedNode!.id)
        .map(l => ({ node: store.state.nodes[typeof l.source === 'string' ? l.source : l.source.id], type: l.relationType }))
        .filter(n => !!n.node)
})
</script>