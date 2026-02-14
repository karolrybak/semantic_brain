import type { GraphState } from "../src/types/graph";
import { AI_STATE, newConnections } from "./ai/index";
import { addAIGeneratedNodes, applyStatePatches } from "./state";
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

  if (AI_STATE.isAiBusy || !AI_STATE.model) return;

  let targetNode = null;

  // Check focused node
  if (state.focusNodeId) {
    const node = state.nodes[state.focusNodeId];
    if (node && (node.status === "accepted" || state.settings.autoExplore)) {
      const links = state.links.filter(
        l => l.source === node.id || l.target === node.id
      );
      if (links.length < state.settings.minConnections) {
        targetNode = node;
      }
    }
  }

  // If no focused node target, find any node needing connections
  if (!targetNode) {
    targetNode = Object.values(state.nodes).find(n => {
      const links = state.links.filter(
        l => (l.source === n.id || l.target === n.id) && (n.status === "accepted" || state.settings.autoExplore)
      );
      return links.length < state.settings.minConnections;
    });
  }
  
  if (!targetNode){
    console.log(`Nothing to do.`);
    return;
  } 

  // Set thinking state
  applyStatePatches(state, [
    { op: "replace", path: "/thinkingNodeId", value: targetNode.id },
  ]);
  broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

  // Generate suggestions
  const existingLabels = Object.values(state.nodes).map(n => n.label);
  const forbiddenLabels = Object.values(state.nodes)
    .filter(n => n.status === "forbidden")
    .map(n => n.label.toLowerCase());

  const suggestions = await newConnections({
    label: targetNode.label,
    forbiddenNodes: forbiddenLabels,
    aspectList: state.settings.definedAspects,
    existingNodes: existingLabels,
    mode: 'new',
    creativity: state.settings.creativity,
    config
  });

  // Clear thinking state
  applyStatePatches(state, [
    { op: "replace", path: "/thinkingNodeId", value: null },
  ]);
  broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: null }] });

  // Add generated nodes
  if (suggestions && suggestions.length > 0) {
    const ops = addAIGeneratedNodes(state, targetNode.id, suggestions);
    applyStatePatches(state, ops);
    broadcast({ type: "PATCH", patches: ops });
    triggerSave();
  }
}
