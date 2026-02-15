import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { newConnections, findExistingConnections, describeConcept, describeNode, AI_STATE, initializeAI, unloadAI } from "./ai/index";
import {
  addNodeToState,
  applyStatePatches,
  deleteNodeFromState,
  clearStateGraph,
  addAIGeneratedNodes,
} from "./state";
import { triggerDebouncedSave } from "./persistence";
import type { Operation } from "fast-json-patch";

export interface WSHandlerContext {
  state: GraphState;
  config: ServerConfig;
  configPath: string;
  statePath: string;
  broadcast: (payload: any) => void;
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
  const { state, config, configPath, statePath, broadcast } = context;
  const data = message;
  
  switch (data.type) {
    case "SET_FOCUS":
      applyStatePatches(state, [{ op: "replace", path: "/focusNodeId", value: data.nodeId }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/focusNodeId", value: data.nodeId }] });
      triggerDebouncedSave(statePath, state);
      break;

    case "UPDATE_SETTINGS":
      applyStatePatches(state, [{ op: "replace", path: "/settings", value: data.settings }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/settings", value: data.settings }] });
      triggerDebouncedSave(statePath, state);
      break;

    case "ADD_NODE": {
      const { nodeId, ops } = addNodeToState(state, data.label, data.parentId);
      applyStatePatches(state, ops);
      broadcast({ type: "PATCH", patches: ops });
      triggerDebouncedSave(statePath, state);
      break;
    }

    case "ACCEPT_NODE":
      applyStatePatches(state, [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "accepted" }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "accepted" }] });
      triggerDebouncedSave(statePath, state);
      break;

    case "FORBID_NODE":
      applyStatePatches(state, [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "forbidden" }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "forbidden" }] });
      triggerDebouncedSave(statePath, state);
      break;

    case "DELETE_NODE": {
      const ops = deleteNodeFromState(state, data.nodeId);
      applyStatePatches(state, ops);
      broadcast({ type: "PATCH", patches: ops });
      triggerDebouncedSave(statePath, state);
      break;
    }

    case "CLEAR_GRAPH":
      clearStateGraph(state);
      broadcast({ type: "FULL_STATE", state });
      triggerDebouncedSave(statePath, state);
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

      applyStatePatches(state, [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

      const neighborIds = state.links
        .filter(l => l.source === targetNode.id || l.target === targetNode.id)
        .map(l => l.source === targetNode.id ? l.target : l.source);

      const forbiddenLabels = Object.values(state.nodes)
        .filter(n => n.status === "forbidden")
        .map(n => n.label.toLowerCase());

      let suggestions;
      const contextLabels = Array.from(new Set(neighborIds))
        .map(id => state.nodes[id]?.label)
        .filter(Boolean)
        .slice(0, 10);

      if (data.type === "EXPLORE_NEW") {
        suggestions = await newConnections({
          label: targetNode.label,
          forbiddenNodes: forbiddenLabels,
          existingNodes: contextLabels,
          creativity: state.settings.creativity,
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

      applyStatePatches(state, [{ op: "replace", path: "/thinkingNodeId", value: null }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: null }] });

      if (suggestions && suggestions.connections.length > 0) {
        const ops = addAIGeneratedNodes(state, targetNode.id, suggestions);
        applyStatePatches(state, ops);
        broadcast({ type: "PATCH", patches: ops });
        triggerDebouncedSave(statePath, state);
      }
      break;
    }

    case "UPDATE_NODE_ASPECTS": {
      if (AI_STATE.isAiBusy || !AI_STATE.session) return;
      const targetNode = state.nodes[data.nodeId];
      if (!targetNode) return;

      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

      const nodeInfo = await describeNode(targetNode.label, state.settings.definedAspects, config);

      if (nodeInfo) {
        const patches: Operation[] = [
          { op: "replace", path: "/thinkingNodeId", value: null },
          { op: "replace", path: `/nodes/${targetNode.id}/description`, value: nodeInfo.description },
          { op: "replace", path: `/nodes/${targetNode.id}/aspects`, value: nodeInfo.aspects }
        ];
        applyStatePatches(state, patches);
        broadcast({ type: "PATCH", patches });
        triggerDebouncedSave(statePath, state);
      } else {
        broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: null }] });
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

      if (data.type === "SUGGEST_ASPECTS") {
        const suggested = await describeConcept(data.label, context.config);
        ws.send(JSON.stringify({ type: "ASPECT_SUGGESTIONS", suggestions: suggested }));
      }
    } catch (e) {
      console.error("[WS] Message error", e);
    }
  };
}