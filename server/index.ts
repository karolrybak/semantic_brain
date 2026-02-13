import { serve } from "bun";
import { applyPatch, type Operation } from "fast-json-patch";
import type { GraphState } from "../src/types/graph";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { LlamaModel, LlamaContext, LlamaChatSession, getLlama } from "node-llama-cpp";

console.log("\n--- [STARTING BRAIN SERVER] ---");

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) {
  console.log(`[Storage] Creating data directory at: ${DATA_DIR}`);
  mkdirSync(DATA_DIR);
}
const STATE_PATH = join(DATA_DIR, "state.json");
const CONFIG_PATH = join(import.meta.dir, "config.json");

let state: GraphState;
let serverConfig = { modelPath: "" };
const clients = new Set<any>();

// AI State
let llama: any = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;
let isAiBusy = false;

// Load Config
try {
  const confFile = Bun.file(CONFIG_PATH);
  if (await confFile.exists()) {
    serverConfig = await confFile.json();
    console.log("[Config] Server config loaded.");
  } else {
    console.log("[Config] No config.json found at", CONFIG_PATH);
  }
} catch (e) { console.error("[Config] Failed to load config.json", e); }

// Load State
try {
  const file = Bun.file(STATE_PATH);
  if (await file.exists()) {
    state = await file.json();
    state.thinkingNodeId = null;
    console.log(`[Storage] State loaded: ${Object.keys(state.nodes).length} nodes found.`);
  } else { throw new Error(); }
} catch (e) {
  console.log("[Storage] Initializing fresh state.");
  state = {
    nodes: {},
    links: [],
    focusNodeId: null,
    thinkingNodeId: null,
    settings: { creativity: 0.7, maxWords: 3, minConnections: 3, autoExplore: false, activeAspect: "" }
  };
}

async function initAI() {
  const path = serverConfig.modelPath;
  if (!path || !existsSync(path)) {
    console.log(`[AI] WARNING: Model path "${path}" is invalid. AI will not suggest concepts.`);
    return;
  }
  
  try {
    console.log("\n--- [AI INITIALIZATION] ---");
    console.log(`[AI] Loading Llama engine...`);
    llama = await getLlama();
    console.log(`[AI] Loading Model from: ${path}`);
    model = await llama.loadModel({ modelPath: path });
    console.log(`[AI] Creating Context...`);
    context = await model.createContext();
    session = new LlamaChatSession({ 
        contextSequence: context.getSequence(),
        systemPrompt: "You are a semantic association engine. Return ONLY a valid JSON array of strings. No prose."
    });
    console.log(`[AI] READY: Model is online.`);
    console.log("----------------------------\n");
    broadcast({ type: "AI_STATUS", status: "ready" });
  } catch (e) {
    console.error("[AI] Load failed:", e);
    broadcast({ type: "AI_STATUS", status: "error" });
  }
}

async function brainstorm(label: string) {
  if (!session || isAiBusy) return [];
  isAiBusy = true;
  const startTime = performance.now();
  
  try {
    const aspectPrompt = state.settings.activeAspect ? `Consider the following context aspect: "${state.settings.activeAspect}". ` : "";
    const forbiddenLabels = Object.values(state.nodes).filter(n => n.status === 'forbidden').map(n => n.label.toLowerCase());
    const prompt = `${aspectPrompt}Generate 3-5 creative and diverse associations for: "${label}". Return as JSON array of strings. Do not use these forbidden words: ${forbiddenLabels.join(', ')}.` ;
    
    console.log(`[AI] >>> DREAMING for: "${label}"`);
    const response = await session.prompt(prompt, { maxTokens: 120, temperature: state.settings.creativity });
    
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    const jsonMatch = response.match(/\[.*\]/s);
    
    let suggestions = [];
    if (jsonMatch) {
        try {
          suggestions = JSON.parse(jsonMatch[0]);
          console.log(`[AI] <<< SUCCESS (${duration}s): ${suggestions.join(', ')}`);
          return suggestions;
        } catch (e) {
          console.error("[AI] JSON Parse Error:", e);
        }
    }
    console.log(`[AI] <<< FAILED (${duration}s): No valid JSON array in response. Raw: "${response.substring(0, 50)}..."`);
    return [];
  } catch (e) {
    console.error("[AI] Prompt failed:", e);
    return [];
  } finally {
    isAiBusy = false;
  }
}

function broadcast(payload: any) {
  const msg = JSON.stringify(payload);
  clients.forEach(c => { try { c.send(msg); } catch(e) {} });
}

async function saveToDisk() {
  await Bun.write(STATE_PATH, JSON.stringify(state, null, 2));
}

let saveTimeout: any = null;
function triggerSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveToDisk, 1000);
}

function patchState(ops: Operation[]) {
  applyPatch(state, ops);
  broadcast({ type: "PATCH", patches: ops });
  triggerSave();
}

setInterval(async () => {
  if (isAiBusy || !model) return;
  
  let targetNode = null;
  if (state.focusNodeId) {
    const node = state.nodes[state.focusNodeId];
    if (node && (node.status === 'accepted' || state.settings.autoExplore)) {
        const links = state.links.filter(l => l.source === node.id || l.target === node.id);
        if (links.length < state.settings.minConnections) targetNode = node;
    }
  }

  if (!targetNode && state.settings.autoExplore) {
    targetNode = Object.values(state.nodes).find(n => {
        const links = state.links.filter(l => l.source === n.id || l.target === n.id);
        return links.length < state.settings.minConnections;
    });
  }

  if (targetNode) {
    patchState([{ op: "replace", path: "/thinkingNodeId", value: targetNode.id }]);
    const suggestions = await brainstorm(targetNode.label);
    patchState([{ op: "replace", path: "/thinkingNodeId", value: null }]);

    if (suggestions.length > 0) {
        const ops: Operation[] = [];
        // AI generated nodes now always start as 'proposed'
        const status = "proposed";
        suggestions.forEach((label: string) => {
            const id = `ai-node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            ops.push({ op: "add", path: `/nodes/${id}`, value: { id, label, status, type: "concept", val: 2 } });
            ops.push({ op: "add", path: "/links/-", value: { source: targetNode!.id, target: id, type: 'ai' } });
        });
        patchState(ops);
    }
  }
}, 4000);

serve({
  port: 3001,
  hostname: "0.0.0.0",
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response("Brain Server Online");
  },
  websocket: {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify({ type: "FULL_STATE", state }));
      console.log(`[WS] Client connected. Active: ${clients.size}`);
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        switch (data.type) {
          case "SET_FOCUS": patchState([{ op: "replace", path: "/focusNodeId", value: data.nodeId }]); break;
          case "UPDATE_SETTINGS": patchState([{ op: "replace", path: "/settings", value: data.settings }]); break;
          case "ADD_NODE":
              const id = `node-${Date.now()}`;
              const isFirst = Object.keys(state.nodes).length === 0;
              const newNode = { id, label: data.label, status: "accepted", type: isFirst ? "root" : "concept", val: isFirst ? 5 : 3 };
              const ops: Operation[] = [{ op: "add", path: `/nodes/${id}`, value: newNode }];
              if (data.parentId) ops.push({ op: "add", path: "/links/-", value: { source: data.parentId, target: id, type: 'user' } });
              if (isFirst) ops.push({ op: "replace", path: "/focusNodeId", value: id });
              patchState(ops);
              break;
          case "ACCEPT_NODE": patchState([{ op: "replace", path: `/nodes/${data.nodeId}/status`, value: "accepted" }]); break;
          case "DELETE_NODE":
              const remainingLinks = state.links.filter(l => l.source !== data.nodeId && l.target !== data.nodeId);
              patchState([{ op: "remove", path: `/nodes/${data.nodeId}` }, { op: "replace", path: "/links", value: remainingLinks }]);
              break;
          case "CLEAR_GRAPH":
              state.nodes = {}; state.links = []; state.focusNodeId = null; state.thinkingNodeId = null;
              broadcast({ type: "FULL_STATE", state });
              triggerSave();
              break;
        }
      } catch (e) { console.error("[WS] Message error:", e); }
    },
    close(ws) { clients.delete(ws); }
  }
});

initAI();
console.log("[Server] Brain Server running on ws://localhost:3001");