<template>
  <div class="mt-4 border-t border-zinc-800 pt-4">
    <div 
      @click="isCollapsed = !isCollapsed" 
      class="flex justify-between items-center mb-2 cursor-pointer hover:bg-zinc-800/60 p-1.5 -mx-1.5 rounded-lg transition-all group"
    >
      <h3 class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold group-hover:text-zinc-300 transition-colors">Explore Connections</h3>
      <div class="text-zinc-600 group-hover:text-indigo-400 transition-colors">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="3" 
          :class="isCollapsed ? '-rotate-90' : ''" 
          class="transition-transform"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>

    <div v-show="!isCollapsed" class="mb-4 px-1">
       <p class="text-[9px] text-zinc-500 leading-tight italic">
         Exploration is constrained by allowed relations in settings.
       </p>
    </div>

    <div class="grid grid-cols-2 gap-2 mt-4">
      <button 
        @click="discoverNew" 
        class="bg-zinc-800 hover:bg-indigo-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 transition-all"
      >
        Discover New
      </button>
      <button 
        @click="linkExisting" 
        class="bg-zinc-800 hover:bg-emerald-900/40 text-[10px] py-2 rounded font-bold text-zinc-300 border border-zinc-700 transition-all"
      >
        Link Existing
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGraphStore } from '../stores/graphStore';

const props = defineProps<{
  nodeId: string
}>();

const store = useGraphStore();
const isCollapsed = ref(true);

function discoverNew() {
  store.send({ type: 'EXPLORE_NEW', nodeId: props.nodeId });
}

function linkExisting() {
  store.send({ type: 'EXPLORE_EXISTING', nodeId: props.nodeId });
}
</script>