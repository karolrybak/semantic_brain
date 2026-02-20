import type { GraphState, GraphNode } from "../src/types/graph";
import { AI_STATE, newConnections, describeNode } from "./ai/index";
import { addAIGeneratedNodes } from "./state";
import type { ServerConfig } from "./config";

export interface AutoExploreContext {
  state: GraphState;
  config: ServerConfig;
  broadcast: (payload: any) => void;
  triggerSave: () => void;
  sync: () => void;
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
  const { state, config, sync } = context;

  if (AI_STATE.isAiBusy || !AI_STATE.model) return;

  const needsMetadata = (n: GraphNode) => n.status === "accepted" && (!n.emoji || !n.description || !n.aspects || Object.keys(n.aspects).length === 0 || !n.emoji);
  const needsConnections = (n: GraphNode) => {
    if (!state.settings.autoExplore) return false;
    if (n.status !== "accepted") return false;
    const links = state.links.filter(l => l.source === n.id || l.target === n.id);
    return links.length < state.settings.minConnections;
  };

  const allNodes = Object.values(state.nodes);
  let targetNode = null;
  let mode: 'DESCRIBE' | 'EXPLORE' | null = null;

  targetNode = allNodes.find(needsMetadata);
  if (targetNode) mode = 'DESCRIBE';

  if (!targetNode) {
    targetNode = allNodes.find(needsConnections);
    if (targetNode) mode = 'EXPLORE';
  }

  if (!targetNode || !mode) return;

  state.thinkingNodeId = targetNode.id;
  sync();

  try {
    if (mode === 'DESCRIBE') {
      const nodeInfo = await describeNode(targetNode.label, state.settings.definedAspects, config);
      
      if (nodeInfo) {
        const nodeState = state.nodes[targetNode.id];
        if(!nodeState) return;
        nodeState.description = nodeInfo.description;
        nodeState.aspects = nodeInfo.aspects;
        nodeState.emoji = nodeInfo.emoji;
      }
    } else if (mode === 'EXPLORE') {
      const neighborIds = state.links
        .filter(l => l.source === targetNode.id || l.target === targetNode.id)
        .map(l => l.source === targetNode.id ? l.target : l.source);
      
      const contextLabels = Array.from(new Set(neighborIds))
        .map(id => state.nodes[String(id)]?.label)
        .filter((label): label is string => Boolean(label))
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

      if (suggestions && suggestions.connections.length > 0) {
        addAIGeneratedNodes(state, targetNode.id, suggestions);
      }
    }
  } finally {
    state.thinkingNodeId = null;
    sync();
  }
}