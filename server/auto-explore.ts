import type { GraphState, GraphNode } from "../src/types/graph";
import { AI_STATE, newConnections, describeNode, generateSvg } from "./ai/index";
import { addAIGeneratedNodes, applyStatePatches } from "./state";
import type { Operation } from "fast-json-patch";
import type { ServerConfig } from "./config";
import { create } from "domain";

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
  }, 100);

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
  const needsSvg = (n: GraphNode) => n.status === "accepted" && n.description && !n.svg;
  const needsConnections = (n: GraphNode) => {
    if (n.status !== "accepted" && !state.settings.autoExplore) return false;
    const links = state.links.filter(l => l.source === n.id || l.target === n.id);
    return links.length < state.settings.minConnections;
  };

  const allNodes = Object.values(state.nodes);
  let targetNode = null;

  // PRIORITY 1: Metadata Enrichment (Clean up the graph first)
  targetNode = allNodes.find(needsMetadata);

  // PRIORITY 2: SVG Generation
  targetNode = allNodes.find(needsMetadata);

  // PRIORITY 3: New Connections (Only if all accepted nodes are described AND autoExplore is enabled)
  targetNode = allNodes.find(needsConnections);

  if (!targetNode) return;

  // Check if we should DESCRIBE or EXPLORE
  const mode = needsMetadata(targetNode) ? 'DESCRIBE' : needsSvg(targetNode) ? 'SVG' : 'EXPLORE';

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
      patches.push({ op: "replace", path: `/nodes/${targetNode.id}/color`, value: nodeInfo.color });
      patches.push({ op: "replace", path: `/nodes/${targetNode.id}/shape`, value: nodeInfo.shape });
    }

    applyStatePatches(state, patches);
    broadcast({ type: "PATCH", patches });
    triggerSave();
  } else if ( mode === 'SVG') {
    const nodeInfo = await generateSvg(targetNode.label, state.settings.definedAspects, config);
    
    // Clear thinking state
    const patches: Operation[] = [
      { op: "replace", path: "/thinkingNodeId", value: null }
    ];

    if (nodeInfo) {
      patches.push({ op: "replace", path: `/nodes/${targetNode.id}/svg`, value: nodeInfo.svg });
    }

    applyStatePatches(state, patches);
    broadcast({ type: "PATCH", patches });
    triggerSave();
  } else if (mode === 'EXPLORE') {
    
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
      aspectList: state.settings.definedAspects,
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
