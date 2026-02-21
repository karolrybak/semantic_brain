import { applyPatch, type Operation } from "fast-json-patch";
import type { GraphState, GraphNode } from "../src/types/graph";
import type { Schemas } from "./ai/schemas";

export function createDefaultState(name: string = "Untitled Graph"): GraphState {
  return {
    nodes: {},
    links: [],
    focusNodeId: null,
    thinkingNodeId: null,
    userQueue: [],
    tasks: {},
    settings: {
      name,
      creativity: 0.7,
      maxWords: 3,
      minConnections: 3,
      autoExplore: false,
      definedAspects: [],
      allowedRelations: ['subclass_of', 'part_of', 'has_part', 'causes', 'enables', 'depends_on', 'preceded_by', 'succeded_by', 'similar_to'],
      showEmoji: true,
    },
  };
}

export function initializeLoadedState(state: any): GraphState {
  // Clean transient AI states on load
  state.thinkingNodeId = null;
  state.userQueue = [];
  state.tasks = {};

  // Ensure settings exist
  if (!state.settings) state.settings = {};
  if (!state.settings.definedAspects) state.settings.definedAspects = [];
  if (!state.settings.allowedRelations) {
    state.settings.allowedRelations = ['subclass_of', 'part_of', 'has_part', 'causes', 'enables', 'depends_on', 'preceded_by', 'succeded_by', 'similar_to'];
  }
  if (state.settings.showEmoji === undefined) {
    state.settings.showEmoji = true;
  }

  // Ensure nodes and their sub-objects exist
  if (!state.nodes) state.nodes = {};
  Object.values(state.nodes).forEach((n: any) => {
    if (!n.attempts) n.attempts = {};
    n.tasks = {}; // Reset node tasks on load
  });

  if (!state.links) state.links = [];

  return state as GraphState;
}

export function applyStatePatches(
  state: GraphState,
  patches: Operation[]
): void {
  applyPatch(state, patches);
}

export function addNodeToState(
  state: GraphState,
  label: string,
  parentId?: string
): string {
  const id = shortRandomHash();
  const isFirst = Object.keys(state.nodes).length === 0;
  
  state.nodes[id] = {
    id,
    label,
    status: "accepted",
    type: isFirst ? "root" : "concept",
    val: isFirst ? 5 : 3,
    aspects: {},
    attempts: {},
    tasks: {},
  };

  if (parentId) {
    state.links.push({
      source: parentId,
      target: id,
      type: "user"
    });
  }
  
  if (isFirst) {
    state.focusNodeId = id;
  }

  return id;
}

export function deleteNodeFromState(state: GraphState, nodeId: string): void {
  delete state.nodes[nodeId];
  state.links = state.links.filter(
    l => l.source !== nodeId && l.target !== nodeId
  );
  if (state.focusNodeId === nodeId) state.focusNodeId = null;
  if (state.thinkingNodeId === nodeId) state.thinkingNodeId = null;
}

export function clearStateGraph(state: GraphState): void {
  state.nodes = {};
  state.links = [];
  state.focusNodeId = null;
  state.thinkingNodeId = null;
  state.userQueue = [];
  state.tasks = {};
}

export function shortRandomHash(length: 6 | 8 = 8): string {
  const bytesLen = Math.ceil((length * 3) / 4);
  const bytes = new Uint8Array(bytesLen);
  crypto.getRandomValues(bytes);

  return Buffer.from(bytes).toString("base64url").slice(0, length);
}

export function addAIGeneratedNodes(
  state: GraphState,
  targetNodeId: string,
  suggestions: typeof Schemas.ConnectionResponse.infer
): void {
  const existingNodes = Object.values(state.nodes);

  suggestions.connections.forEach((s) => {
    const normalizedLabel = s.target.trim().toLowerCase();
    const existing = existingNodes.find(n => n.label.trim().toLowerCase() === normalizedLabel);

    if (existing) {
      const linkExists = state.links.some(l => 
        (l.source === targetNodeId && l.target === existing.id) ||
        (l.source === existing.id && l.target === targetNodeId)
      );
      
      if (!linkExists) {
        state.links.push({
          source: targetNodeId,
          target: existing.id,
          type: "bridge",
          relationType: s.relation,
        });
      }
    } else {
      const id = shortRandomHash();
      state.nodes[id] = {
        id,
        label: s.target,
        status: "accepted",
        type: "concept",
        val: 2,
        aspects: {},
        attempts: {},
        tasks: {},
      };
      state.links.push({
        source: targetNodeId,
        target: id,
        type: "ai",
        relationType: s.relation,
      });
    }
  });
}
