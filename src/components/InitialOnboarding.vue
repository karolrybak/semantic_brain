<template>
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
    <h2 class="text-2xl font-bold text-white mb-2 text-center">Initialize Workspace</h2>
    <p class="text-zinc-500 text-sm mb-8 text-center">Define your starting concepts and the semantic dimensions to explore.</p>

    <div class="grid grid-cols-2 gap-8 mb-8">
      <!-- Concepts Column -->
      <div class="flex flex-col gap-4">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Starting Concepts</h3>
        <div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          <div 
            v-for="(c, idx) in concepts" 
            :key="idx" 
            class="group flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white animate-in fade-in slide-in-from-left-2"
          >
            <span class="truncate">{{ c }}</span>
            <button @click="removeConcept(idx)" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="relative">
          <input 
            v-model="newConcept"
            @keyup.enter="addConcept"
            placeholder="Add concept..."
            class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all"
          />
          <button @click="addConcept" class="absolute right-2 top-1.5 text-zinc-500 hover:text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      <!-- Aspects Column -->
      <div class="flex flex-col gap-4">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Semantic Aspects</h3>
        <div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          <div 
            v-for="(a, idx) in aspects" 
            :key="idx" 
            class="group flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white animate-in fade-in slide-in-from-right-2"
          >
            <span class="truncate italic">{{ a }}</span>
            <button @click="removeAspect(idx)" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div class="relative">
          <input 
            v-model="newAspect"
            @keyup.enter="addAspect"
            placeholder="Add aspect..."
            class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
          />
          <button @click="addAspect" class="absolute right-2 top-1.5 text-zinc-500 hover:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </div>

    <button 
      @click="start" 
      :disabled="concepts.length === 0 || aspects.length === 0"
      class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all transform active:scale-[0.98] uppercase tracking-widest text-xs"
    >
      Begin Exploration
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ (e: 'start', payload: { labels: string[], aspects: string[] }): void }>();

const concepts = ref<string[]>(['Artificial Intelligence']);
const aspects = ref<string[]>(['Technical Complexity', 'Social Impact', 'Ethics', 'Economic Value']);

const newConcept = ref('');
const newAspect = ref('');

function addConcept() {
  if (newConcept.value.trim()) {
    concepts.value.push(newConcept.value.trim());
    newConcept.value = '';
  }
}

function removeConcept(idx: number) {
  concepts.value.splice(idx, 1);
}

function addAspect() {
  if (newAspect.value.trim()) {
    aspects.value.push(newAspect.value.trim());
    newAspect.value = '';
  }
}

function removeAspect(idx: number) {
  aspects.value.splice(idx, 1);
}

function start() {
  emit('start', { labels: [...concepts.value], aspects: [...aspects.value] });
}
</script>

<style scoped>
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}
</style>