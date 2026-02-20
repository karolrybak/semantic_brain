<template>
<div class="flex gap-2 max-h-[90vh] pointer-events-auto items-start">
    <div v-if="selectedNode" class="w-80 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg p-4 shadow-xl text-zinc-100 flex flex-col overflow-hidden">
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

</script>