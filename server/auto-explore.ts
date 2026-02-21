import type { GraphState, GraphNode } from "../src/types/graph";
import { AI_STATE, newConnections, describeNode, findExistingConnections, newConnectionsLimited, generateGraphName } from "./ai/index";
import { addAIGeneratedNodes } from "./state";
import type { ServerConfig } from "./config";
import type { AITask } from "./ai/types";

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

  const allNodes = Object.values(state.nodes);
  if (allNodes.length === 0) return;

  let task: AITask | null = null;

  // 1. PRIORITY: User Queue
  if (state.userQueue && state.userQueue.length > 0) {
    task = state.userQueue.shift()!;
    sync();
  }

  // 2. AUTO-EXPLORE TASKS
  if (!task) {
    const getLinkCount = (id: string) => state.links.filter(l => l.source === id || l.target === id).length;
    const acceptedNodes = allNodes.filter(n => n.status === "accepted");

    // Priority A: Name Generation (if name is generic and we have content)
    const isGeneric = (name: string) => !name || name === 'New Graph' || name === 'Untitled' || name === 'Untitled Graph';
    if (isGeneric(state.settings.name) && acceptedNodes.length >= 3) {
       task = { type: 'GENERATE_NAME', nodeId: '' };
    }

    // Priority B: Metadata Enrichment (DESCRIBE)
    if (!task) {
      const needsMetadata = acceptedNodes.filter(n => !n.emoji || !n.description || !n.aspects || Object.keys(n.aspects).length === 0);
      if (needsMetadata.length > 0) {
        const target = needsMetadata.sort((a, b) => (a.attempts?.DESCRIBE || 0) - (b.attempts?.DESCRIBE || 0))[0];
        if(target) task = { type: 'DESCRIBE', nodeId: target.id };
      }
    }

    // Priority C: Find Existing Connections (EXPLORE_EXISTING)
    if (!task && allNodes.length > 1 && state.links.length < allNodes.length * 1.5) {
      if (acceptedNodes.length > 0) {
        const target = acceptedNodes.sort((a, b) => {
          const linksA = getLinkCount(a.id);
          const linksB = getLinkCount(b.id);
          if (linksA !== linksB) return linksA - linksB;
          return (a.attempts?.EXPLORE_EXISTING || 0) - (b.attempts?.EXPLORE_EXISTING || 0);
        })[0];
        if(target) task = { type: 'EXPLORE_EXISTING', nodeId: target.id };
      }
    }

    // Priority D: New Connections (EXPLORE_NEW)
    if (!task && state.settings.autoExplore) {
      const targets = acceptedNodes.filter(n => getLinkCount(n.id) < state.settings.minConnections);
      if (targets.length > 0) {
        const target = targets.sort((a, b) => (a.attempts?.EXPLORE_NEW || 0) - (b.attempts?.EXPLORE_NEW || 0))[0];
        if(target) task = { type: 'EXPLORE_NEW', nodeId: target.id };
      }
    }
  }

  if (!task) return;

  const targetNode = task.nodeId ? state.nodes[task.nodeId] : null;
  // For node-specific tasks, if node is missing, abort
  if (task.nodeId && !targetNode) return;

  if (targetNode) {
    state.thinkingNodeId = targetNode.id;
    if (!targetNode.tasks) targetNode.tasks = {};
    targetNode.tasks[task.type] = 'thinking';
  } else if (task.type === 'GENERATE_NAME') {
    if (!state.tasks) state.tasks = {};
    state.tasks['GENERATE_NAME'] = 'thinking';
  }
  sync();

  try {
    let success = false;

    if (task.type === 'DESCRIBE' && targetNode) {
      const nodeInfo = await describeNode(targetNode.label, state.settings.definedAspects, config);
      if (nodeInfo) {
        targetNode.description = nodeInfo.description;
        targetNode.aspects = nodeInfo.aspects;
        targetNode.emoji = nodeInfo.emoji;
        success = true;
      }
    } else if ((task.type === 'EXPLORE_NEW' || task.type === 'EXPLORE_LIMITED') && targetNode) {
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

      const relations = task.type === 'EXPLORE_LIMITED' ? task.params.relations : state.settings.allowedRelations;

      const suggestions = await newConnectionsLimited({
            label: targetNode.label,
            forbiddenNodes: forbiddenLabels,
            existingNodes: contextLabels,
            creativity: state.settings.creativity,
            aspectList: state.settings.definedAspects,
            config,
            relations
          });

      if (suggestions && suggestions.connections.length > 0) {
        addAIGeneratedNodes(state, targetNode.id, suggestions);
        success = true;
      }
    } else if (task.type === 'EXPLORE_EXISTING' && targetNode) {
      const currentNeighbors = state.links
        .filter(l => l.source === targetNode.id || l.target === targetNode.id)
        .map(l => l.source === targetNode.id ? l.target : l.source);
      
      const candidates = Object.values(state.nodes)
        .filter(n => n.id !== targetNode.id && !currentNeighbors.includes(n.id) && n.status !== 'forbidden')
        .map(n => n.label);

      const candidateLabels = (task.params?.candidates || candidates.sort(() => Math.random() - 0.5)).slice(0, 10);

      const suggestions = await findExistingConnections({
        label: targetNode.label,
        existingNodes: candidateLabels,
        config
      });

      if (suggestions && suggestions.connections.length > 0) {
        addAIGeneratedNodes(state, targetNode.id, suggestions);
        success = true;
      }
    } else if (task.type === 'GENERATE_NAME') {
      const conceptLabels = Object.values(state.nodes).filter(n => n.status === 'accepted').map(n => n.label);
      const name = await generateGraphName(conceptLabels, state.settings.definedAspects, config);
      if (name) {
        state.settings.name = name;
        success = true;
      }
    }

    if (!success && targetNode) {
      if (!targetNode.attempts) targetNode.attempts = {};
      targetNode.attempts[task.type] = (targetNode.attempts[task.type] || 0) + 1;
    }

  } finally {
    state.thinkingNodeId = null;
    if (targetNode && targetNode.tasks) {
      delete targetNode.tasks[task.type];
    } else if (task.type === 'GENERATE_NAME' && state.tasks) {
      delete state.tasks['GENERATE_NAME'];
    }
    sync();
  }
}