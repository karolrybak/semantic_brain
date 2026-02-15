<template>
  <div class="bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg p-4 w-64 flex flex-col gap-4 text-xs shadow-xl">
    <div class="flex justify-between items-center">
      <h3 class="font-bold text-zinc-400 uppercase tracking-wider">Brain Management</h3>
      <div :class="statusColor" class="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"></div>
    </div>

    <div class="space-y-3">
      <div class="flex flex-col gap-1.5">
        <label class="text-zinc-500 font-bold uppercase text-[9px]">Model Size</label>
        <div class="grid grid-cols-3 gap-1">
          <button 
            v-for="size in ['small', 'medium', 'large']" 
            :key="size"
            @click="updateConfig({ selectedSize: size })"
            class="py-1.5 rounded border text-[10px] font-bold uppercase transition-all"
            :class="config.selectedSize === size ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
          >
            {{ size }}
          </button>
        </div>
      </div>

      <div class="pt-2 border-t border-zinc-800 flex flex-col gap-2">
        <button 
          v-if="status === 'unloaded' || status === 'error'" 
          @click="$emit('load')" 
          class="w-full py-2 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-500 border border-emerald-900/50 rounded font-bold uppercase transition-all"
        >
          Load Engine
        </button>
        <button 
          v-else 
          @click="$emit('unload')" 
          :disabled="status === 'thinking'"
          class="w-full py-2 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/50 rounded font-bold uppercase transition-all disabled:opacity-50"
        >
          Unload Engine
        </button>
      </div>

      <label class="flex items-center gap-2 cursor-pointer group pt-1">
        <input 
          type="checkbox" 
          :checked="config.loadOnStartup" 
          @change="(e: any) => updateConfig({ loadOnStartup: e.target.checked })" 
          class="w-3.5 h-3.5 accent-indigo-500" 
        />
        <span class="text-zinc-400 group-hover:text-zinc-200 transition-colors">Load on startup</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'unloaded' | 'loading' | 'ready' | 'thinking' | 'error',
  config: any
}>();

const emit = defineEmits(['load', 'unload', 'updateConfig']);

const statusColor = computed(() => {
  if (props.status === 'ready') return 'text-emerald-500 bg-emerald-500';
  if (props.status === 'thinking') return 'text-indigo-500 bg-indigo-500 animate-pulse';
  if (props.status === 'loading') return 'text-amber-500 bg-amber-500 animate-pulse';
  if (props.status === 'unloaded') return 'text-zinc-600 bg-zinc-600';
  return 'text-red-500 bg-red-500';
});

function updateConfig(patch: any) {
  emit('updateConfig', { ...props.config, ...patch });
}
</script>