import type { GraphState, GraphNode } from "../src/types/graph";
import { AI_STATE, newConnections, describeNode } from "./ai/index";
import { addAIGeneratedNodes, applyStatePatches } from "./state";
import type { Operation } from "fast-json-patch";
import type { ServerConfig } from "./config";

export interface AutoExploreContext {
  state: GraphState;
  config: ServerConfig;
  broadcast: (payload: any) => void;
  triggerSave: () => void;
}

let autoExploreInterval: NodeJS.Timeout | null = null;

export function startAutoExplore(context: AutoExploreContext): NodeJS.Timeout {
  if (autoExploreInterval) clearInterval(autoExploreInterval);

  autoExploreInterval = setInterval(async () => {
    await runAutoExploreIteration(context);
  }, 5000);

  return autoExploreInterval;
}

export function stopAutoExplore(): void {
  if (autoExploreInterval) {
    clearInterval(autoExploreInterval);
    autoExploreInterval = null;
  }
}

async function runAutoExploreIteration(context: AutoExploreContext): Promise<void> {
  const { state, config, broadcast, triggerSave } = context;

  // Exit if AI is busy or model not loaded
  if (AI_STATE.isAiBusy || !AI_STATE.model) return;

  const needsMetadata = (n: GraphNode) => n.status === "accepted" && (!n.description || !n.aspects || Object.keys(n.aspects).length === 0);
  const needsConnections = (n: GraphNode) => {
    if (n.status !== "accepted" && !state.settings.autoExplore) return false;
    const links = state.links.filter(l => l.source === n.id || l.target === n.id);
    return links.length < state.settings.minConnections;
  };

  const allNodes = Object.values(state.nodes);
  let targetNode = null;

  // PRIORITY 1: Metadata Enrichment (Clean up the graph first)
  // Check focus first, then others
  if (state.focusNodeId && state.nodes[state.focusNodeId] && needsMetadata(state.nodes[state.focusNodeId])) {
    targetNode = state.nodes[state.focusNodeId];
  } else {
    targetNode = allNodes.find(needsMetadata);
  }

  // PRIORITY 2: New Connections (Only if all accepted nodes are described AND autoExplore is enabled)
  if (!targetNode && state.settings.autoExplore) {
    if (state.focusNodeId && state.nodes[state.focusNodeId] && needsConnections(state.nodes[state.focusNodeId])) {
      targetNode = state.nodes[state.focusNodeId];
    } else {
      targetNode = allNodes.find(needsConnections);
    }
  }

  if (!targetNode) return;

  // Check if we should DESCRIBE or EXPLORE
  const mode = needsMetadata(targetNode) ? 'DESCRIBE' : 'EXPLORE';

  // Set thinking state
  applyStatePatches(state, [
    { op: "replace", path: "/thinkingNodeId", value: targetNode.id },
  ]);
  broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

  if (mode === 'DESCRIBE') {
    const nodeInfo = await describeNode(targetNode.label, state.settings.definedAspects, config);
    
    // Clear thinking state
    const patches: Operation[] = [
      { op: "replace", path: "/thinkingNodeId", value: null }
    ];

    if (nodeInfo) {
      patches.push({ op: "replace", path: `/nodes/${targetNode.id}/description`, value: nodeInfo.description });
      patches.push({ op: "replace", path: `/nodes/${targetNode.id}/aspects`, value: nodeInfo.aspects });
    }

    applyStatePatches(state, patches);
    broadcast({ type: "PATCH", patches });
    triggerSave();
  } else {
    // Generate connections
    const neighborIds = state.links
      .filter(l => l.source === targetNode.id || l.target === targetNode.id)
      .map(l => l.source === targetNode.id ? l.target : l.source);
    
    const contextLabels = Array.from(new Set(neighborIds))
      .map(id => state.nodes[id]?.label)
      .filter(Boolean)
      .slice(0, 10);

    const forbiddenLabels = Object.values(state.nodes)
      .filter(n => n.status === "forbidden")
      .map(n => n.label.toLowerCase());

    const suggestions = await newConnections({
      label: targetNode.label,
      forbiddenNodes: forbiddenLabels,
      existingNodes: contextLabels,
      creativity: state.settings.creativity,
      config
    });

    // Clear thinking and apply changes
    const patches: Operation[] = [
      { op: "replace", path: "/thinkingNodeId", value: null },
    ];

    applyStatePatches(state, patches);
    broadcast({ type: "PATCH", patches });

    if (suggestions && suggestions.connections.length > 0) {
      const ops = addAIGeneratedNodes(state, targetNode.id, suggestions);
      applyStatePatches(state, ops);
      broadcast({ type: "PATCH", patches: ops });
      triggerSave();
    }
  }
}
