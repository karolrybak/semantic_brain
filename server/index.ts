import { serve } from "bun";
import type { GraphState } from "../src/types/graph";
import { join } from "path";
import { observe, generate, unobserve } from "fast-json-patch";
import { Schemas, getJsonSchema } from "./ai/schemas";

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

import { loadConfig } from "./config";
import {
  initializeDataDirectory,
  STATE_PATH,
  loadStateFromDisk,
  triggerDebouncedSave,
  getGraphPath,
  listGraphsFromDisk,
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

const CONFIG_PATH = join(import.meta.dir, "./..", "config.json");
const clients = new Set<any>();

let currentGraphName = "state";
let state: GraphState;
let stateObserver: any;
let serverConfig = await loadConfig(CONFIG_PATH);

initializeDataDirectory();

const loadedState = await loadStateFromDisk(STATE_PATH);
if (loadedState) {
  state = initializeLoadedState(loadedState);
  console.log("[State] Default graph state loaded.");
} else {
  state = createDefaultState("Default");
  console.log("[State] Created default graph state.");
}

const sync = () => {
  const patches = generate(stateObserver);
  if (patches.length > 0) {
    broadcast(clients, { type: "PATCH", patches });
    triggerDebouncedSave(getGraphPath(currentGraphName), state);
  }
};

const sendFullState = (ws: any) => {
  ws.send(JSON.stringify({ type: "FULL_STATE", state, filename: currentGraphName }));
};

const setGraph = (name: string, newState: GraphState) => {
  if (stateObserver) unobserve(state, stateObserver);
  state = newState;
  currentGraphName = name;
  stateObserver = observe<GraphState>(state);
  handlerContext.state = state;
  autoExploreContext.state = state;
};

stateObserver = observe<GraphState>(state);

if (serverConfig.loadOnStartup) {
  initializeAI(serverConfig, () => {
    broadcast(clients, { type: "AI_STATUS", ...getAIStatus() });
  });
}

const handlerContext = {
  state,
  config: serverConfig,
  configPath: CONFIG_PATH,
  statePath: STATE_PATH,
  broadcast: (payload: any) => broadcast(clients, payload),
  sync,
  setGraph,
};

const autoExploreContext = {
  state,
  config: serverConfig,
  broadcast: (payload: any) => broadcast(clients, payload),
  triggerSave: () => triggerDebouncedSave(getGraphPath(currentGraphName), state),
  sync,
};

startAutoExplore(autoExploreContext);

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
      sendFullState(ws);
      ws.send(JSON.stringify({ type: "GRAPH_LIST", graphs: listGraphsFromDisk() }));
      ws.send(JSON.stringify({ type: "AI_CONFIG_UPDATED", config: serverConfig }));
      ws.send(JSON.stringify({ type: "AI_STATUS", ...getAIStatus() }));
      console.log(`[WS] Client linked. Count: ${clients.size}`);
    },
    message: createWSMessageHandler(handlerContext),
    close(ws) {
      clients.delete(ws);
    },
  },
});