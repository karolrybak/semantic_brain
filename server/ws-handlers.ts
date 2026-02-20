import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { AI_STATE, initializeAI, unloadAI } from "./ai/index";
import {
  addNodeToState,
  deleteNodeFromState,
  clearStateGraph,
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
  const { state, config, configPath, broadcast, sync } = context;
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

    case "ADD_NODE":
      addNodeToState(state, data.label, data.parentId);
      sync();
      break;

    case "ACCEPT_NODE": {
      const tNode = state.nodes[data.nodeId];
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

    case "DELETE_NODE":
      deleteNodeFromState(state, data.nodeId);
      sync();
      break;

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

    case "UPDATE_AI_CONFIG":
      Object.assign(config, data.config);
      try {
        await Bun.write(configPath, JSON.stringify(config, null, 2));
        console.log("[Config] Server config updated.");
      } catch (e) {
        console.error("[Config] Failed to write config.json", e);
      }
      broadcast({ type: "AI_CONFIG_UPDATED", config });
      break;

    case "EXPLORE_NEW":
      AI_STATE.userQueue.push({ type: 'EXPLORE_NEW', nodeId: data.nodeId });
      break;

    case "EXPLORE_LIMITED":
      AI_STATE.userQueue.push({ type: 'EXPLORE_LIMITED', nodeId: data.nodeId, params: { relations: data.relations } });
      break;

    case "EXPLORE_EXISTING":
      AI_STATE.userQueue.push({ type: 'EXPLORE_EXISTING', nodeId: data.nodeId });
      break;

    case "UPDATE_NODE_ASPECTS":
      AI_STATE.userQueue.push({ type: 'DESCRIBE', nodeId: data.nodeId });
      break;
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