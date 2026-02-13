<template>
  <div v-if="node" class="w-80 bg-zinc-900/90 backdrop-blur-md rounded-lg border border-zinc-800 p-4 shadow-xl text-zinc-100 flex flex-col max-h-[80vh]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold truncate">{{ node.name }}</h2>
      <span 
        class="text-[10px] uppercase font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700"
      >
        {{ node.type }}
      </span>
    </div>
    
    <!-- Stats -->
    <div class="space-y-3 mb-4">
      <div>
        <label class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">Identifier</label>
        <code class="block bg-black/50 p-2 rounded text-xs font-mono text-zinc-400 break-all border border-zinc-800/50">
          {{ node.id }}
        </code>
      </div>
      
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-zinc-800/30 p-2 rounded border border-zinc-800/50">
          <span class="text-[10px] text-zinc-500 block">Health</span>
          <span class="text-sm font-bold" :class="node.errorCount ? 'text-red-400' : 'text-green-400'">
             {{ node.errorCount ? `${node.errorCount} Issues` : 'Healthy' }}
          </span>
        </div>
        <div class="bg-zinc-800/30 p-2 rounded border border-zinc-800/50">
          <span class="text-[10px] text-zinc-500 block">LOC (Est.)</span>
          <span class="text-sm font-mono">{{ Math.round(node.val * 5) }}</span>
        </div>
        <div class="bg-zinc-800/30 p-2 rounded border border-zinc-800/50">
          <span class="text-[10px] text-zinc-500 block">Group</span>
          <span class="text-sm font-mono">{{ node.group }}</span>
        </div>
      </div>
    </div>

    <!-- Dependencies List -->
    <div class="flex-1 overflow-hidden flex flex-col">
        <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2 sticky top-0 bg-zinc-900/90 py-1">
            Links To ({{ dependencies.length }})
        </h3>
        <div class="overflow-y-auto space-y-1 flex-1 pr-1">
            <div v-if="dependencies.length === 0" class="text-zinc-600 text-xs italic p-2">
                No outgoing links
            </div>
            <div 
                v-for="dep in dependencies" 
                :key="dep.id" 
                class="bg-zinc-800/40 p-2 rounded border border-zinc-800/30 text-xs text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                @click="$emit('select-dependency', dep.id)"
            >
                <div class="font-mono truncate">{{ dep.name }}</div>
                <div class="text-[10px] text-zinc-500 truncate">{{ dep.id }}</div>
            </div>
        </div>
    </div>

  </div>
  
  <div v-else class="w-80 bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-800/50 p-4 text-center text-zinc-500 text-sm">
    Click a node to inspect details
  </div>
</template>

<script setup lang="ts">
import type { GraphNode } from '../types/graph'

interface Dependency {
    id: string
    name: string
}

defineProps<{ 
    node: GraphNode | null,
    dependencies: Dependency[]
}>()

defineEmits<{ (e: 'select-dependency', id: string): void }>()
</script>
