<template>
  <div class="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-lg">
    <!-- Step 1: Concept -->
    <div v-if="step === 1">
      <h2 class="text-xl font-bold text-white mb-2 text-center">Start Exploration</h2>
      <p class="text-zinc-500 text-sm mb-6 text-center">What concept do you want to explore with AI today?</p>
      <input 
        v-model="concept"
        @keyup.enter="fetchAspects"
        placeholder="e.g. Cyberpunk, Ancient Rome, Coffee..."
        class="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
        autofocus
      />
      <button 
        @click="fetchAspects" 
        :disabled="!concept || loading"
        class="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
      >
        <span v-if="loading" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {{ loading ? 'Analyzing...' : 'Continue' }}
      </button>
    </div>

    <!-- Step 2: Aspects -->
    <div v-else-if="step === 2">
      <h2 class="text-xl font-bold text-white mb-1 text-center">Define Perspectives</h2>
      <p class="text-zinc-500 text-xs mb-6 text-center">Select which semantic dimensions the AI should consider.</p>
      
      <div class="flex flex-wrap gap-2 mb-6 justify-center">
        <div 
          v-for="a in suggestions" 
          :key="a"
          @click="toggleAspect(a)"
          class="px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all border"
          :class="selectedAspects.includes(a) 
            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
            : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'"
        >
          {{ a }}
        </div>
        
        <div class="w-full flex mt-2">
          <input 
            v-model="customAspect"
            @keyup.enter="addCustomAspect"
            placeholder="Add custom aspect..."
            class="flex-1 bg-zinc-950 border border-zinc-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-white focus:outline-none"
          />
          <button @click="addCustomAspect" class="bg-zinc-800 border border-zinc-800 border-l-0 rounded-r-lg px-3 text-zinc-400 hover:text-white">
            +
          </button>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="step = 1" class="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-2.5 rounded-lg font-bold">Back</button>
        <button @click="start" class="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-900/20">Begin Exploration</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ ws: WebSocket | null }>();
const emit = defineEmits<{ (e: 'start', payload: { label: string, aspects: string[] }): void }>();

const step = ref(1);
const concept = ref('');
const loading = ref(false);
const suggestions = ref<string[]>([]);
const selectedAspects = ref<string[]>(['Technical', 'Emotional']);
const customAspect = ref('');

function fetchAspects() {
  if (!concept.value || !props.ws) return;
  loading.value = true;
  props.ws.send(JSON.stringify({ type: 'SUGGEST_ASPECTS', label: concept.value }));
  
  const handler = (e: MessageEvent) => {
    const data = JSON.parse(e.data);
    if (data.type === 'ASPECT_SUGGESTIONS') {
      suggestions.value = data.suggestions;
      selectedAspects.value = data.suggestions.slice(0, 4);
      loading.value = false;
      step.value = 2;
      props.ws?.removeEventListener('message', handler);
    }
  };
  props.ws.addEventListener('message', handler);
}

function toggleAspect(a: string) {
  if (selectedAspects.value.includes(a)) selectedAspects.value = selectedAspects.value.filter(i => i !== a);
  else selectedAspects.value.push(a);
}

function addCustomAspect() {
  if (!customAspect.value) return;
  if (!suggestions.value.includes(customAspect.value)) suggestions.value.push(customAspect.value);
  if (!selectedAspects.value.includes(customAspect.value)) selectedAspects.value.push(customAspect.value);
  customAspect.value = '';
}

function start() {
  emit('start', { label: concept.value, aspects: selectedAspects.value });
}
</script>