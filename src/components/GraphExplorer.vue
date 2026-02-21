<template>
  <div class="flex gap-2 max-h-[90vh] pointer-events-auto items-start">
    <div v-if="selectedNode" class="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg p-4 shadow-xl text-zinc-100 flex flex-col overflow-hidden">
        <div class="flex justify-end items-center mb-2">
            <div class="flex gap-1">
              <button 
                @click="store.send({ type: 'UPDATE_NODE_ASPECTS', nodeId: selectedNode.id })" 
                class="p-1.5 text-zinc-600 hover:text-indigo-400 hover:bg-indigo-950/30 rounded transition-colors"
                :class="{ 'animate-spin text-indigo-400': isPending('DESCRIBE') }"
                title="Refresh Aspects"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              </button>
              <button @click="deleteNode" class="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors" title="Delete Concept">
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
                <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
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

            <div v-if="incomingLinks.length > 0 || outgoingLinks.length > 0">
                <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 border-b border-zinc-800 pb-1">Links</h3>
                <div class="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                    <div v-for="ref in incomingLinks" :key="'in-'+ref.node.id" @click="$emit('select', ref.node)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center justify-between">
                        <span class="truncate">{{ ref.node.label }}</span>
                        <span class="text-[9px] text-zinc-600 italic">{{ ref.type }} (in)</span>
                    </div>
                    <div v-for="dep in outgoingLinks" :key="'out-'+dep.node.id" @click="$emit('select', dep.node)" class="cursor-pointer text-xs p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 truncate border border-transparent hover:border-zinc-700 flex items-center justify-between">
                        <span class="truncate">{{ dep.node.label }}</span>
                        <span class="text-[9px] text-zinc-600 italic">{{ dep.type }} (out)</span>
                    </div>
                </div>
            </div>

            <div v-if="selectedNode.status === 'accepted'" class="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-2">
              <button 
                @click="store.send({ type: 'EXPLORE_NEW', nodeId: selectedNode.id })" 
                class="bg-zinc-800 hover:bg-indigo-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <svg v-if="isPending('EXPLORE_NEW')" class="animate-spin h-3 w-3 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Discover New
              </button>
              <button 
                @click="store.send({ type: 'EXPLORE_EXISTING', nodeId: selectedNode.id })" 
                class="bg-zinc-800 hover:bg-emerald-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <svg v-if="isPending('EXPLORE_EXISTING')" class="animate-spin h-3 w-3 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Link Existing
              </button>
            </div>

            <div v-if="selectedNode.status === 'proposed'" class="pt-4">
               <button @click="store.send({ type: 'ACCEPT_NODE', nodeId: selectedNode.id })" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded font-bold">Accept AI Suggestion</button>
            </div>
        </div>
    </div>
    <div v-else class="w-64 bg-zinc-900/50 backdrop-blur border border-zinc-800/50 p-4 rounded-lg text-center pointer-events-auto">
       <p class="text-zinc-600 text-xs">Select a node to navigate the landscape</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGraphStore } from '../stores/graphStore'
import type { GraphNode } from '../types/graph'

const store = useGraphStore()
const props = defineProps<{ selectedNode: GraphNode | null }>()
const emit = defineEmits<{ (e: 'select', n: any): void }>()

function deleteNode() { if (props.selectedNode) { store.send({ type: 'DELETE_NODE', nodeId: props.selectedNode.id }); emit('select', null); } }

const hasAspects = computed(() => props.selectedNode && Object.keys(props.selectedNode.aspects || {}).length > 0);

const isPending = (type: string) => {
  if (!props.selectedNode) return false;
  return !!props.selectedNode.tasks?.[type];
}

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