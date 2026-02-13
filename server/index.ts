import { serve } from "bun";
import type { GraphState } from "../src/types/graph";
import { join } from "path";

// Module imports
import { loadConfig } from "./config";
import {
  initializeDataDirectory,
  DATA_DIR,
  STATE_PATH,
  loadStateFromDisk,
  triggerDebouncedSave,
} from "./persistence";
import {
  createDefaultState,
  initializeLoadedState,
} from "./state";
import { initializeAI, AI_STATE } from "./ai";
import { startAutoExplore } from "./auto-explore";
import {
  broadcast,
  createWSMessageHandler,
} from "./ws-handlers";

console.log("\n--- [STARTING BRAIN SERVER S2] ---");

const CONFIG_PATH = join(import.meta.dir, "config.json");
const clients = new Set<any>();

let state: GraphState;
let serverConfig = await loadConfig(CONFIG_PATH);

// Initialize state
initializeDataDirectory();

const loadedState = await loadStateFromDisk(STATE_PATH);
if (loadedState) {
  state = initializeLoadedState(loadedState);
  console.log("[State] Graph state loaded from disk.");
} else {
  state = createDefaultState();
  console.log("[State] Created new graph state.");
}

// Initialize AI
await initializeAI(serverConfig, () => {
  broadcast(clients, { type: "AI_STATUS", status: "ready" });
});

// Create handler context
const handlerContext = {
  state,
  config: serverConfig,
  statePath: STATE_PATH,
  broadcast: (payload: any) => broadcast(clients, payload),
};

// Auto-explore background loop disabled by default (can be triggered manually)
// startAutoExplore({
//   state,
//   config: serverConfig,
//   broadcast: (payload: any) => broadcast(clients, payload),
//   triggerSave: () => triggerDebouncedSave(STATE_PATH, state),
// });

// Start HTTP/WebSocket server
serve({
  port: 3001,
  hostname: "0.0.0.0",
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Brain Server S2 Online");
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ type: "FULL_STATE", state }));
      console.log(`[WS] Client linked. Count: ${clients.size}`);
    },
    message: createWSMessageHandler(handlerContext),
    close(ws) {
      clients.delete(ws);
    },
  },
});