<template>
  <div class="bg-zinc-900/95 backdrop-blur border border-zinc-800 rounded-lg p-4 w-72 flex flex-col gap-3 text-xs text-zinc-300 shadow-xl">
    <h3 class="font-bold text-zinc-400 uppercase tracking-wider mb-1">Allowed Relations</h3>
    
    <div class="flex-1 overflow-y-auto custom-scrollbar max-h-80 space-y-1">
      <div v-for="(members, group) in relationTree" :key="group" class="flex flex-col">
        <label class="flex items-center gap-2 py-1 px-1 rounded hover:bg-zinc-800/50 cursor-pointer group">
          <input 
            type="checkbox" 
            :checked="isGroupChecked(group)" 
            @change="toggleGroup(group)"
            class="w-3 h-3 accent-indigo-500"
          />
          <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter group-hover:text-zinc-200">{{ group }}</span>
        </label>
        <div class="ml-5 flex flex-col">
          <label v-for="rel in members" :key="rel" class="flex items-center gap-2 py-0.5 px-1 rounded hover:bg-zinc-800/30 cursor-pointer group">
            <input 
              type="checkbox" 
              :checked="store.state.settings.allowedRelations.includes(rel)" 
              @change="toggleRelation(rel)"
              class="w-2.5 h-2.5 accent-indigo-500"
            />
            <span class="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-medium italic">{{ rel.replace(/_/g, ' ') }}</span>
          </label>
        </div>
      </div>
    </div>
    <p class="text-[9px] text-zinc-600 italic">These settings affect both manual and background AI exploration.</p>
  </div>
</template>

<script setup lang="ts">
import { useGraphStore } from '../stores/graphStore'

const store = useGraphStore()

const relationTree: Record<string, string[]> = {
  hierarchical: ['subclass_of'],
  structural: ['part_of', 'has_part'],
  causal: ['causes', 'enables', 'depends_on'],
  historical: ['preceded_by', 'succeded_by'],
  logical: ['incompatible_with', 'similar_to', 'opposite_of']
};

function isGroupChecked(group: string) {
  return relationTree[group].every(r => store.state.settings.allowedRelations.includes(r));
}

function toggleGroup(group: string) {
  const members = relationTree[group];
  let next = [...store.state.settings.allowedRelations];
  if (isGroupChecked(group)) {
    next = next.filter(r => !members.includes(r));
  } else {
    next = Array.from(new Set([...next, ...members]));
  }
  updateSettings(next);
}

function toggleRelation(rel: string) {
  let next = [...store.state.settings.allowedRelations];
  if (next.includes(rel)) next = next.filter(r => r !== rel);
  else next.push(rel);
  updateSettings(next);
}

function updateSettings(allowedRelations: string[]) {
  window.dispatchEvent(new CustomEvent('update-settings', { detail: { allowedRelations } }));
}
</script>