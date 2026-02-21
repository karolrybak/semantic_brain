import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { AI_STATE, initializeAI, unloadAI } from "./ai/index";
import {
  addNodeToState,
  deleteNodeFromState,
  clearStateGraph,
  createDefaultState,
  initializeLoadedState,
} from "./state";
import {
  listGraphsFromDisk,
  loadStateFromDisk,
  getGraphPath,
  triggerDebouncedSave
} from "./persistence";

export interface WSHandlerContext {
  state: GraphState;
  config: ServerConfig;
  configPath: string;
  statePath: string;
  broadcast: (payload: any) => void;
  sync: () => void;
  setGraph: (name: string, newState: GraphState) => void;
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
  const { state, config, configPath, broadcast, sync, setGraph } = context;
  const data = message;
  
  switch (data.type) {
    case "LIST_GRAPHS":
      broadcast({ type: "GRAPH_LIST", graphs: listGraphsFromDisk() });
      break;

    case "NEW_GRAPH": {
      const name = data.name || "Untitled";
      const newState = createDefaultState("Untitled Graph");
      setGraph(name, newState);
      broadcast({ type: "FULL_STATE", state: newState, filename: name });
      broadcast({ type: "GRAPH_LIST", graphs: listGraphsFromDisk() });
      break;
    }

    case "LOAD_GRAPH": {
      const loaded = await loadStateFromDisk(getGraphPath(data.name));
      if (loaded) {
        const newState = initializeLoadedState(loaded);
        setGraph(data.name, newState);
        broadcast({ type: "FULL_STATE", state: newState, filename: data.name });
      }
      break;
    }

    case "GENERATE_GRAPH_NAME":
      state.userQueue.push({ type: 'GENERATE_NAME', nodeId: '' });
      if (!state.tasks) state.tasks = {};
      state.tasks['GENERATE_NAME'] = 'queued';
      sync();
      break;

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
        else broadcast({ type: "AI_STATUS", ...AI_STATE.modelMetadata, status: "ready" });
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
      } catch (e) {
        console.error("[Config] Failed to write config.json", e);
      }
      broadcast({ type: "AI_CONFIG_UPDATED", config });
      break;

    case "EXPLORE_NEW": {
      state.userQueue.push({ type: 'EXPLORE_NEW', nodeId: data.nodeId, params: { relations: state.settings.allowedRelations } });
      const node = state.nodes[data.nodeId];
      if (node) {
        if (!node.tasks) node.tasks = {};
        node.tasks['EXPLORE_NEW'] = 'queued';
      }
      sync();
      break;
    }

    case "EXPLORE_LIMITED": {
      state.userQueue.push({ type: 'EXPLORE_LIMITED', nodeId: data.nodeId, params: { relations: data.relations } });
      const node = state.nodes[data.nodeId];
      if (node) {
        if (!node.tasks) node.tasks = {};
        node.tasks['EXPLORE_LIMITED'] = 'queued';
      }
      sync();
      break;
    }

    case "EXPLORE_EXISTING": {
      state.userQueue.push({ type: 'EXPLORE_EXISTING', nodeId: data.nodeId });
      const node = state.nodes[data.nodeId];
      if (node) {
        if (!node.tasks) node.tasks = {};
        node.tasks['EXPLORE_EXISTING'] = 'queued';
      }
      sync();
      break;
    }

    case "UPDATE_NODE_ASPECTS": {
      state.userQueue.push({ type: 'DESCRIBE', nodeId: data.nodeId });
      const node = state.nodes[data.nodeId];
      if (node) {
        if (!node.tasks) node.tasks = {};
        node.tasks['DESCRIBE'] = 'queued';
      }
      sync();
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