<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="inline-block shrink-0">
    <!-- File: Sphere -> Circle -->
    <circle v-if="type === 'file'" cx="12" cy="12" r="8" :fill="fillColor" stroke="currentColor" stroke-width="2" stroke-opacity="0.2" />
    
    <!-- Class: Box -> Square -->
    <rect v-else-if="type === 'class'" x="5" y="5" width="14" height="14" rx="2" :fill="fillColor" stroke="currentColor" stroke-width="2" stroke-opacity="0.2" />
    
    <!-- Function: Cone -> Triangle -->
    <path v-else-if="type === 'function'" d="M12 3L21 20H3L12 3Z" :fill="fillColor" stroke="currentColor" stroke-width="2" stroke-opacity="0.2" />
    
    <!-- Cluster (Default) -->
    <g v-else>
       <circle cx="8" cy="8" r="4" :fill="fillColor" opacity="0.9" />
       <circle cx="16" cy="16" r="4" :fill="fillColor" opacity="0.7" />
       <circle cx="16" cy="8" r="4" :fill="fillColor" opacity="0.8" />
       <circle cx="8" cy="16" r="4" :fill="fillColor" opacity="0.6" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: string
  color?: string
}>()

const fillColor = computed(() => props.color || 'currentColor')
</script>
