import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { newConnections, describeConcept, describeNode, AI_STATE } from "./ai/index";
import {
  addNodeToState,
  applyStatePatches,
  deleteNodeFromState,
  clearStateGraph,
  addAIGeneratedNodes,
} from "./state";
import { triggerDebouncedSave } from "./persistence";
import type { Operation } from "fast-json-patch";
import { aiListToGraphPatch } from "./ai/response";

export interface WSHandlerContext {
  state: GraphState;
  config: ServerConfig;
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
  const { state, config, statePath, broadcast } = context;
  const data = message;
  console.log("[WS] Message received", data);
  console.log(`AI State: ${AI_STATE.isAiBusy? "BUSY": "IDLE"}`);
  switch (data.type) {
    case "SET_FOCUS":
      applyStatePatches(state, [
        {
          op: "replace",
          path: "/focusNodeId",
          value: data.nodeId,
        },
      ]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/focusNodeId", value: data.nodeId }] });
      triggerDebouncedSave(statePath, state);
      break;

    case "UPDATE_SETTINGS":
      applyStatePatches(state, [
        {
          op: "replace",
          path: "/settings",
          value: data.settings,
        },
      ]);
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
      applyStatePatches(state, [
        {
          op: "replace",
          path: `/nodes/${data.nodeId}/status`,
          value: "accepted",
        },
      ]);
      broadcast({
        type: "PATCH",
        patches: [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "accepted" }],
      });
      triggerDebouncedSave(statePath, state);
      break;

    case "FORBID_NODE":
      applyStatePatches(state, [
        {
          op: "replace",
          path: `/nodes/${data.nodeId}/status`,
          value: "forbidden",
        },
      ]);
      broadcast({
        type: "PATCH",
        patches: [{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "forbidden" }],
      });
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

    case "SUGGEST_ASPECTS": {
      return Promise.resolve();
    }

    case "EXPLORE_NEW":
    case "EXPLORE_EXISTING": {
      if (AI_STATE.isAiBusy) return;
      const targetNode = state.nodes[data.nodeId];
      if (!targetNode) {console.log("no target node"); return} 

      // Set thinking state locally and notify clients
      applyStatePatches(state, [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }]);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

      const existingLabels = Object.values(state.nodes).map(n => n.label);
      const forbiddenLabels = Object.values(state.nodes)
        .filter(n => n.status === "forbidden")
        .map(n => n.label.toLowerCase());

      const suggestions = await newConnections({
        label: targetNode.label,
        focus: "varied relation types",
        forbiddenNodes: forbiddenLabels,
        aspectList: state.settings.definedAspects,
        existingNodes: existingLabels,
        mode: data.type === "EXPLORE_NEW" ? "new" : "existing",
        creativity: state.settings.creativity,
        config
      });

      // Clear thinking state
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
      if (AI_STATE.isAiBusy) return;
      const targetNode = state.nodes[data.nodeId];
      if (!targetNode) return;

      console.log(`[Explore] Updating aspects for: ${targetNode.label}`);
      broadcast({ type: "PATCH", patches: [{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }] });

      const node = await describeNode(
        targetNode.label,
        state.settings.definedAspects,
        config
      );

      if (node) {
        console.log(`[Explore] New description for ${targetNode.label}:`, node);
        
        const patches: Operation[] = [
          { op: "replace", path: "/thinkingNodeId", value: null },
          { op: "replace", path: `/nodes/${targetNode.id}`, value: node }
        ];

        applyStatePatches(state, patches);
        broadcast({ type: "PATCH", patches });
        
        triggerDebouncedSave(statePath, state);
      } else {
        console.warn(`[Explore] AI returned empty aspects for ${targetNode.label}`);
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

      // Special case for SUGGEST_ASPECTS that needs direct ws response
      if (data.type === "SUGGEST_ASPECTS") {
        const suggested = await describeConcept(data.label, context.config);
        ws.send(
          JSON.stringify({
            type: "ASPECT_SUGGESTIONS",
            suggestions: suggested,
          })
        );
      }
    } catch (e) {
      console.error("[WS] Message error", e);
    }
  };
}
