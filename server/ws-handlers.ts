import type { GraphState } from "../src/types/graph";
import type { ServerConfig } from "./config";
import { suggestAspects } from "./ai";
import {
  addNodeToState,
  applyStatePatches,
  deleteNodeFromState,
  clearStateGraph,
} from "./state";
import { triggerDebouncedSave } from "./persistence";
import type { Operation } from "fast-json-patch";

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
      const suggested = await suggestAspects(data.label, config);
      return Promise.resolve();
      // Note: Response is sent via separate channel - caller should handle this
      // This allows for either WebSocket response or event-based response
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
        const suggested = await suggestAspects(data.label, context.config);
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
