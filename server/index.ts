import { serve } from "bun";
import type { GraphState } from "../src/types/graph";
import { join } from "path";
import { Schemas, getJsonSchema } from "./ai/schemas";

// Handle CLI Flags
const args = process.argv.slice(2);
if (args.includes("-d") || args.includes("--dump-schema")) {
  const schemas = {
    AspectList: getJsonSchema(Schemas.AspectResponse),
    Association: getJsonSchema(Schemas.ConnectionResponse),
    Eval: getJsonSchema(Schemas.Node)
  };
  console.log(JSON.stringify(schemas, null, 2));
  process.exit(0);
}

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
import { initializeAI, AI_STATE, getAIStatus } from "./ai/index";
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

// Initialize AI if startup flag is set
if (serverConfig.loadOnStartup) {
  initializeAI(serverConfig, () => {
    broadcast(clients, { type: "AI_STATUS", status: "ready", size: serverConfig.selectedSize });
  });
}

// Create handler context
const handlerContext = {
  state,
  config: serverConfig,
  configPath: CONFIG_PATH,
  statePath: STATE_PATH,
  broadcast: (payload: any) => broadcast(clients, payload),
};

// Start the background auto-exploration agent
startAutoExplore({
  state,
  config: serverConfig,
  broadcast: (payload: any) => broadcast(clients, payload),
  triggerSave: () => triggerDebouncedSave(STATE_PATH, state),
});

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
      // Initial sync for the client
      ws.send(JSON.stringify({ type: "FULL_STATE", state }));
      ws.send(JSON.stringify({ type: "AI_CONFIG_UPDATED", config: serverConfig }));
      ws.send(JSON.stringify({ type: "AI_STATUS", status: getAIStatus() }));
      console.log(`[WS] Client linked. Count: ${clients.size}`);
    },
    message: createWSMessageHandler(handlerContext),
    close(ws) {
      clients.delete(ws);
    },
  },
});