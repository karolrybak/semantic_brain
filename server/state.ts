import { applyPatch, type Operation } from "fast-json-patch";
import type { GraphState } from "../src/types/graph";

export function createDefaultState(): GraphState {
  return {
    nodes: {},
    links: [],
    focusNodeId: null,
    thinkingNodeId: null,
    settings: {
      creativity: 0.7,
      maxWords: 3,
      minConnections: 3,
      autoExplore: false,
      definedAspects: ["Technical", "Emotional", "Practical"],
      activeAspects: [],
    },
  };
}

export function initializeLoadedState(state: GraphState): GraphState {
  state.thinkingNodeId = null;
  if (!state.settings.definedAspects) {
    state.settings.definedAspects = ["Technical", "Emotional", "Practical"];
  }
  if (!state.settings.activeAspects) {
    state.settings.activeAspects = [];
  }
  return state;
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
): { nodeId: string; ops: Operation[] } {
  const id = `node-${Date.now()}`;
  const isFirst = Object.keys(state.nodes).length === 0;
  const newNode = {
    id,
    label,
    status: "accepted" as const,
    type: isFirst ? ("root" as const) : ("concept" as const),
    val: isFirst ? 5 : 3,
    aspects: {} as Record<string, number>,
  };

  const ops: Operation[] = [{ op: "add", path: `/nodes/${id}`, value: newNode }];
  if (parentId) {
    ops.push({
      op: "add",
      path: "/links/-",
      value: { source: parentId, target: id, type: "user" },
    });
  }
  if (isFirst) {
    ops.push({ op: "replace", path: "/focusNodeId", value: id });
  }

  return { nodeId: id, ops };
}

export function deleteNodeFromState(state: GraphState, nodeId: string): Operation[] {
  const remainingLinks = state.links.filter(
    l => l.source !== nodeId && l.target !== nodeId
  );
  return [
    { op: "remove", path: `/nodes/${nodeId}` },
    { op: "replace", path: "/links", value: remainingLinks },
  ];
}

export function clearStateGraph(state: GraphState): void {
  state.nodes = {};
  state.links = [];
  state.focusNodeId = null;
  state.thinkingNodeId = null;
}

export function addAIGeneratedNodes(
  state: GraphState,
  targetNodeId: string,
  suggestions: any[]
): Operation[] {
  const ops: Operation[] = [];
  suggestions.forEach((s: any) => {
    const id = `ai-node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    ops.push({
      op: "add",
      path: `/nodes/${id}`,
      value: {
        id,
        label: s.label,
        status: "proposed",
        type: "concept",
        val: 2,
        aspects: s.aspects || {},
      },
    });
    ops.push({
      op: "add",
      path: "/links/-",
      value: {
        source: targetNodeId,
        target: id,
        type: "ai",
        relationType: s.relation,
      },
    });
  });
  return ops;
}
