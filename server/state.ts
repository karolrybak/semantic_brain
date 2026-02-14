import { applyPatch, type Operation } from "fast-json-patch";
import type { GraphState } from "../src/types/graph";
import type { Schemas } from "./ai/schemas";

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
      definedAspects: [],
      activeAspects: [],
    },
  };
}

export function initializeLoadedState(state: GraphState): GraphState {
  state.thinkingNodeId = null;
  if (!state.settings.definedAspects) {
    state.settings.definedAspects = [];
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
  const id = Math.random().toString(36).slice(2, 9);
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
): Operation[] {
  const ops: Operation[] = [];
  const existingNodes = Object.values(state.nodes);

  suggestions.connections.forEach((s) => {
    // Normalize label for comparison
    const normalizedLabel = s.target.trim().toLowerCase();
    const existing = existingNodes.find(n => n.label.trim().toLowerCase() === normalizedLabel);

    if (existing) {
      // Check if link already exists
      const linkExists = state.links.some(l => 
        (l.source === targetNodeId && l.target === existing.id) ||
        (l.source === existing.id && l.target === targetNodeId)
      );
      
      if (!linkExists) {
        ops.push({
          op: "add",
          path: "/links/-",
          value: {
            source: targetNodeId,
            target: existing.id,
            type: "bridge",
            relationType: s.relation,
          },
        });
      }
    } else {
      // Add as new proposed node
      const id = shortRandomHash();
      ops.push({
        op: "add",
        path: `/nodes/${id}`,
        value: {
          id,
          label: s.target,
          status: "proposed",
          type: "concept",
          val: 2,
          aspects: {},
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
    }
  });
  return ops;
}
