<template>
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl">
    <div v-if="step === 'mode'" class="flex flex-col gap-6 items-center py-4 animate-in fade-in zoom-in-95">
      <h2 class="text-2xl font-bold text-white text-center">Knowledge Engine</h2>
      <p class="text-zinc-500 text-sm text-center -mt-4">Select a workspace to begin exploration.</p>
      
      <div class="grid grid-cols-2 gap-4 w-full mt-2">
        <button @click="step = 'config'" class="flex flex-col items-center gap-4 p-8 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-indigo-500/50 transition-all group">
          <div class="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </div>
          <span class="font-bold text-zinc-300">Create New Graph</span>
        </button>

        <button @click="step = 'list'" class="flex flex-col items-center gap-4 p-8 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-emerald-500/50 transition-all group">
          <div class="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <span class="font-bold text-zinc-300">Open Existing</span>
        </button>
      </div>
    </div>

    <div v-if="step === 'list'" class="animate-in slide-in-from-right-4 fade-in">
      <div class="flex items-center justify-between mb-6">
        <button @click="step = 'mode'" class="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back
        </button>
        <h2 class="text-xl font-bold text-white">Existing Graphs</h2>
        <div class="w-12"></div>
      </div>

      <div class="flex flex-col gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-2 mb-4">
        <div v-if="graphList.length === 0" class="py-12 text-center text-zinc-600 italic">No saved graphs found.</div>
        <button 
          v-for="g in graphList" 
          :key="g"
          @click="$emit('load', g.filename)"
          class="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900 rounded-lg px-4 py-3 text-sm text-zinc-300 transition-all group text-left"
        >
          <div class="flex items-center gap-3 overflow-hidden">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0 text-zinc-600 group-hover:text-emerald-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
             <span class="font-medium truncate">{{ g.name }} <span class="text-zinc-600 text-[10px] font-mono">[{{ g.filename }}.json]</span></span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" class="text-zinc-800 group-hover:text-emerald-500 transition-colors"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>

    <div v-if="step === 'config'" class="animate-in slide-in-from-right-4 fade-in">
      <div class="flex items-center justify-between mb-2">
        <button @click="step = 'mode'" class="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-tight">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          Back
        </button>
        <h2 class="text-xl font-bold text-white">Initialize Workspace</h2>
        <div class="w-12"></div>
      </div>
      <p class="text-zinc-500 text-sm mb-8 text-center">Define your starting concepts and the semantic dimensions to explore.</p>

      <div class="mb-6 flex flex-col gap-2">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Graph Filename</h3>
        <input 
          v-model="graphName"
          placeholder="E.g. philosophy-v1"
          class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
        />
      </div>

      <div class="grid grid-cols-2 gap-8 mb-8">
        <div class="flex flex-col gap-4">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Starting Concepts</h3>
          <div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <div v-for="(c, idx) in concepts" :key="idx" class="group flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
              <span class="truncate">{{ c }}</span>
              <button @click="removeConcept(idx)" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div class="relative">
            <input v-model="newConcept" @keyup.enter="addConcept" placeholder="Add concept..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500" />
            <button @click="addConcept" class="absolute right-2 top-1.5 text-zinc-500 hover:text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <h3 class="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Semantic Aspects</h3>
          <div class="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
            <div v-for="(a, idx) in aspects" :key="idx" class="group flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white">
              <span class="truncate italic">{{ a }}</span>
              <button @click="removeAspect(idx)" class="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <div class="relative">
            <input v-model="newAspect" @keyup.enter="addAspect" placeholder="Add aspect..." class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500" />
            <button @click="addAspect" class="absolute right-2 top-1.5 text-zinc-500 hover:text-emerald-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </div>

      <button @click="start" :disabled="concepts.length === 0 || aspects.length === 0 || !graphName" class="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 transition-all transform active:scale-[0.98] uppercase tracking-widest text-xs">
        Begin Exploration
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ graphList: { filename: string; name: string }[] }>();
const emit = defineEmits<{
  (e: 'start', payload: { labels: string[], aspects: string[], name: string }): void
  (e: 'load', name: string): void
}>();

const step = ref<'mode' | 'list' | 'config'>('mode');
const graphName = ref('');
const concepts = ref<string[]>([]);
const aspects = ref<string[]>([]);

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
  emit('start', { labels: [...concepts.value], aspects: [...aspects.value], name: graphName.value });
}
</script>