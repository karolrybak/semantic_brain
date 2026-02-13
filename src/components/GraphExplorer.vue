<template>
  <div class="flex gap-2 max-h-[90vh] pointer-events-auto items-start">
    <div v-if="selectedNode" class="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg p-4 shadow-xl text-zinc-100 flex flex-col overflow-hidden">
        <!-- Top Row: Icon & Actions -->
        <div class="flex justify-between items-start mb-2">
            <div class="p-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                 <NodeIcon :type="selectedNode.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(selectedNode)" class="w-6 h-6" />
            </div>
            <div class="flex gap-1">
              <button @click="$emit('delete-node', selectedNode.id)" class="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors" title="Delete Concept">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
              <button @click="$emit('select', null)" class="p-1.5 text-zinc-600 hover:text-zinc-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
        </div>

        <!-- Full Width Title Row -->
        <div class="mb-4">
          <h2 class="text-xl font-bold text-white break-words leading-tight">{{ selectedNode.label }}</h2>
          <div class="flex items-center gap-2 mt-1">
            <span class="text-[9px] uppercase tracking-widest text-zinc-500 font-mono">{{ selectedNode.status }} {{ selectedNode.type }}</span>
            <span v-if="thinkingNodeId === selectedNode.id" class="text-[9px] text-indigo-400 animate-pulse font-bold uppercase italic">AI is dreaming...</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
            <!-- Related By -->
            <div v-if="incomingLinks.length > 0">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Related By</h3>
                <div class="flex flex-col gap-1">
                    <div v-for="ref in incomingLinks" :key="ref.id" @click="$emit('select', ref)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center gap-2">
                        <NodeIcon :type="ref.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(ref)" class="w-2.5 h-2.5" />
                        <span class="truncate">{{ ref.label }}</span>
                    </div>
                </div>
            </div>

            <!-- Leads To -->
            <div v-if="outgoingLinks.length > 0">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Leads To</h3>
                <div class="flex flex-col gap-1">
                    <div v-for="dep in outgoingLinks" :key="dep.id" @click="$emit('select', dep)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center gap-2">
                        <NodeIcon :type="dep.status === 'proposed' ? 'function' : 'file'" :color="getNodeColor(dep)" class="w-2.5 h-2.5" />
                        <span class="truncate">{{ dep.label }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Add Related -->
        <div class="mt-4 pt-4 border-t border-zinc-800 space-y-2">
           <div class="relative">
             <input 
                v-model="relatedInput" 
                @keyup.enter="addRelated" 
                placeholder="Add connection..."
                class="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
             />
             <button @click="addRelated" class="absolute right-2 top-1.5 text-zinc-500 hover:text-indigo-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             </button>
           </div>
           
           <button v-if="selectedNode.status === 'proposed'" @click="$emit('accept-node', selectedNode.id)" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-bold transition-colors shadow-lg">
              Accept AI Suggestion
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
import type { GraphData, GraphNode } from '../types/graph'
import NodeIcon from './NodeIcon.vue'

const props = defineProps<{ data: GraphData, selectedNode: GraphNode | null, thinkingNodeId: string | null }>()
const emit = defineEmits<{ (e: 'select', n: any): void, (e: 'add-node', p: any): void, (e: 'accept-node', id: string): void, (e: 'delete-node', id: string): void }>()

const relatedInput = ref('')
function addRelated() { if (relatedInput.value && props.selectedNode) { emit('add-node', { label: relatedInput.value, parentId: props.selectedNode.id }); relatedInput.value = '' } }
function getNodeColor(node: GraphNode) {
    if (props.thinkingNodeId === node.id) return '#22c55e' // Green: Processing
    if (node.type === 'root') return '#f43f5e' // Red: Root
    if (node.status === 'accepted') return '#3b82f6' // Blue: Accepted
    return '#71717a' // Gray: Proposed
}

const outgoingLinks = computed(() => {
    if (!props.selectedNode) return []
    return props.data.links
        .filter(l => l.source === props.selectedNode!.id)
        .map(l => props.data.nodes.find(n => n.id === l.target))
        .filter((n): n is GraphNode => !!n)
})

const incomingLinks = computed(() => {
    if (!props.selectedNode) return []
    return props.data.links
        .filter(l => l.target === props.selectedNode!.id)
        .map(l => props.data.nodes.find(n => n.id === l.source))
        .filter((n): n is GraphNode => !!n)
})
</script>
<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
</style>