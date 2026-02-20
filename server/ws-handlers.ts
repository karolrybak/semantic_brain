import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { newConnections, findExistingConnections, describeNode, AI_STATE, initializeAI, unloadAI } from "./ai/index";
import {
  addNodeToState,
  deleteNodeFromState,
  clearStateGraph,
  addAIGeneratedNodes,
} from "./state";

export interface WSHandlerContext {
  state: GraphState;
  config: ServerConfig;
  configPath: string;
  statePath: string;
  broadcast: (payload: any) => void;
  sync: () => void;
}

export function broadcast(clients: Set<any>, payload: any): void {
  const msg = JSON.stringify(payload);
  clients.forEach(c => {
    try {
      c.send(msg);
    } catch (e) {
      // Client may be disconnected
    }
  });
}

export async function handleWSMessage(
  message: any,
  context: WSHandlerContext
): Promise<void> {
  const { state, config, configPath, statePath, broadcast, sync } = context;
  const data = message;
  
  switch (data.type) {
    case "SET_FOCUS":
      state.focusNodeId = data.nodeId;
      sync();
      break;

    case "UPDATE_SETTINGS":
      Object.assign(state.settings, data.settings);
      sync();
      break;

    case "ADD_NODE": {
      addNodeToState(state, data.label, data.parentId);
      sync();
      break;
    }

    case "ACCEPT_NODE": {
      const tNode = state.nodes[data.nodeId]
      if (tNode) {
        tNode.status = "accepted";
        sync();
      }
      break;
    }

    case "FORBID_NODE": {
      const tNode = state.nodes[data.nodeId];
      if (tNode) {
        tNode.status = "forbidden";
        sync();
      }
      break;
    }

    case "DELETE_NODE": {
      deleteNodeFromState(state, data.nodeId);
      sync();
      break;
    }

    case "CLEAR_GRAPH":
      clearStateGraph(state);
      broadcast({ type: "FULL_STATE", state });
      sync();
      break;

    case "LOAD_AI_MODEL":
      if (AI_STATE.isAiBusy) return;
      broadcast({ type: "AI_STATUS", status: "loading" });
      await initializeAI(config, (err) => {
        if (err) broadcast({ type: "AI_STATUS", status: "error", error: err });
        else broadcast({ type: "AI_STATUS", status: "ready", size: config.selectedSize });
      });
      break;

    case "UNLOAD_AI_MODEL":
      if (AI_STATE.isAiBusy) return;
      await unloadAI();
      broadcast({ type: "AI_STATUS", status: "unloaded" });
      break;

    case "UPDATE_AI_CONFIG": {
      Object.assign(config, data.config);
      try {
        await Bun.write(configPath, JSON.stringify(config, null, 2));
        console.log("[Config] Server config updated.");
      } catch (e) {
        console.error("[Config] Failed to write config.json", e);
      }
      broadcast({ type: "AI_CONFIG_UPDATED", config });
      break;
    }

    case "EXPLORE_NEW":
    case "EXPLORE_EXISTING": {
      if (AI_STATE.isAiBusy || !AI_STATE.session) return;
      const targetNode = state.nodes[data.nodeId];
      if (!targetNode) return;

      state.thinkingNodeId = targetNode.id;
      sync();

      const neighborIds = state.links
        .filter(l => l.source === targetNode.id || l.target === targetNode.id)
        .map(l => l.source === targetNode.id ? l.target : l.source);

      const forbiddenLabels = Object.values(state.nodes)
        .filter(n => n.status === "forbidden")
        .map(n => n.label.toLowerCase());

      let suggestions;
      const contextLabels = Array.from(new Set(neighborIds))
        .map(id => state.nodes[id as string]?.label)
        .filter((label): label is string => Boolean(label))
        .slice(0, 10);

      if (data.type === "EXPLORE_NEW") {
        suggestions = await newConnections({
          label: targetNode.label,
          forbiddenNodes: forbiddenLabels,
          existingNodes: contextLabels,
          creativity: state.settings.creativity,
          aspectList: state.settings.definedAspects,
          config
        });
      } else {
        const candidates = Object.values(state.nodes)
          .filter(n => n.id !== targetNode.id && !neighborIds.includes(n.id) && n.status !== 'forbidden')
          .map(n => n.label)
          .slice(0, 15);

        suggestions = await findExistingConnections({
          label: targetNode.label,
          existingNodes: candidates,
          config
        });
      }

      state.thinkingNodeId = null;
      sync();

      if (suggestions && suggestions.connections.length > 0) {
        addAIGeneratedNodes(state, targetNode.id, suggestions);
        sync();
      }
      break;
    }

    case "UPDATE_NODE_ASPECTS": {
      if (AI_STATE.isAiBusy || !AI_STATE.session) return;
      const targetNode = state.nodes[data.nodeId];
      if (!targetNode) return;

      state.thinkingNodeId = targetNode.id;
      sync();

      const nodeInfo = await describeNode(targetNode.label, state.settings.definedAspects, config);

      if (nodeInfo) {
        const tNode = state.nodes[targetNode.id];
        if(!tNode) return;
        tNode.description = nodeInfo.description;
        tNode.aspects = nodeInfo.aspects;
        tNode.emoji = nodeInfo.emoji;
        state.thinkingNodeId = null;
        sync();
      } else {
        state.thinkingNodeId = null;
        sync();
      }
      break;
    }    
  }
}

export function createWSMessageHandler(context: WSHandlerContext) {
  return async (ws: any, message: any) => {
    try {
      const data = JSON.parse(message.toString());
      await handleWSMessage(data, context);

    } catch (e) {
      console.error("[WS] Message error", e);
    }
  };
}