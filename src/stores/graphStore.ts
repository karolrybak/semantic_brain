import { defineStore } from 'pinia';
import { ref, computed, markRaw } from 'vue';
import * as jsonpatch from 'fast-json-patch';
import type { GraphState, GraphNode, GraphLink, AiStatus, GraphSettings } from '../types/graph';

export const useGraphStore = defineStore('graph', () => {
  const state = ref<GraphState>({
    nodes: {},
    links: [],
    focusNodeId: null,
    thinkingNodeId: null,
    settings: {
      creativity: 0.7,
      maxWords: 50,
      minConnections: 2,
      autoExplore: false,
      definedAspects: [],
      activeAspects: []
    }
  });

  const isConnected = ref(false);
  const isStateLoaded = ref(false);
  const aiStatus = ref<AiStatus>('unloaded');
  const serverAiConfig = ref({ selectedSize: 'medium', loadOnStartup: true });
  const ws = ref<WebSocket | null>(null);

  // Computed arrays
  const nodesArray = computed(() => Object.values(state.value.nodes));
  const linksArray = computed(() => state.value.links);

  // Island calculation - Moved here and optimized to only trigger on link/node count changes
  const graphIslands = computed(() => {
    const nodes = nodesArray.value;
    const links = linksArray.value;
    if (nodes.length === 0) return [];

    const adj = new Map<string, string[]>();
    nodes.forEach(n => adj.set(n.id, []));
    links.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
      const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
      if (adj.has(s) && adj.has(t)) {
        adj.get(s)?.push(t);
        adj.get(t)?.push(s);
      }
    });

    const visited = new Set<string>();
    const islands: GraphNode[] = [];

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component: GraphNode[] = [];
        const queue = [node.id];
        visited.add(node.id);
        while (queue.length > 0) {
          const currId = queue.shift()!;
          const n = state.value.nodes[currId];
          if (n) component.push(n);
          (adj.get(currId) || []).forEach(nextId => {
            if (!visited.has(nextId)) {
              visited.add(nextId); queue.push(nextId);
            }
          });
        }
        component.sort((a, b) => (b.type === 'root' ? 1 : 0) - (a.type === 'root' ? 1 : 0));
        islands.push(component[0]);
      }
    });
    return islands;
  });

  function connect() {
    if (ws.value) return;
    const host = window.location.hostname || 'localhost';
    ws.value = new WebSocket(`ws://${host}:3001`);

    ws.value.onopen = () => { isConnected.value = true; };
    ws.value.onclose = () => {
      isConnected.value = false;
      isStateLoaded.value = false;
      ws.value = null;
      setTimeout(connect, 3000);
    };

    ws.value.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'FULL_STATE') {
        state.value = data.state;
        isStateLoaded.value = true;
      } else if (data.type === 'PATCH') {
        // Apply patches to the reactive state
        jsonpatch.applyPatch(state.value, data.patches);
      } else if (data.type === 'AI_STATUS') {
        aiStatus.value = data.status === 'ready' ? (state.value.thinkingNodeId ? 'thinking' : 'ready') : data.status;
      } else if (data.type === 'AI_CONFIG_UPDATED') {
        serverAiConfig.value = data.config;
      } else if (data.type === 'ASPECT_SUGGESTIONS') {
        window.dispatchEvent(new CustomEvent('aspect-suggestions', { detail: data.suggestions }));
      }
    };
  }

  function send(payload: any) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(payload));
    }
  }

  return {
    state,
    isConnected,
    isStateLoaded,
    aiStatus,
    serverAiConfig,
    nodesArray,
    linksArray,
    graphIslands,
    connect,
    send
  };
});