<template>
  <div class="flex items-center gap-2 p-1 bg-zinc-900/40 backdrop-blur rounded-full border border-zinc-800 shadow-lg">
    <div class="flex gap-1 px-2">
      <div 
        v-for="aspect in definedAspects" 
        :key="aspect"
        @click="toggleAspect(aspect)"
        class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border"
        :class="isActive(aspect) 
          ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.4)]' 
          : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'"
      >
        {{ aspect }}
      </div>
    </div>
    
    <div class="h-4 w-px bg-zinc-800 mx-1"></div>

    <div class="flex items-center pr-2 pl-1">
      <input 
        v-model="newAspect"
        @keyup.enter="addAspect"
        placeholder="Add aspect..."
        class="bg-transparent border-none text-[10px] text-zinc-400 placeholder-zinc-700 focus:outline-none w-20 px-1"
      />
      <button @click="addAspect" class="text-zinc-600 hover:text-indigo-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  definedAspects: string[],
  activeAspects: string[]
}>();

const newAspect = ref('');

function isActive(a: string) {
  return props.activeAspects.includes(a);
}

function toggleAspect(a: string) {
  let next = [...props.activeAspects];
  if (isActive(a)) next = next.filter(i => i !== a);
  else next.push(a);
  
  window.dispatchEvent(new CustomEvent('update-settings', { 
    detail: { activeAspects: next } 
  }));
}

function addAspect() {
  if (!newAspect.value) return;
  const next = [...props.definedAspects];
  if (!next.includes(newAspect.value)) {
    next.push(newAspect.value);
    window.dispatchEvent(new CustomEvent('update-settings', { 
      detail: { definedAspects: next } 
    }));
  }
  newAspect.value = '';
}
</script>