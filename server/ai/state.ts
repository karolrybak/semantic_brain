import { existsSync } from "fs";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import type { AIState } from "./types";
import type { ServerConfig } from "../config";
import { SYSTEM_PROMPT } from "./prompts";

export const AI_STATE: AIState = {
  llama: null,
  model: null,
  context: null,
  session: null,
  isAiBusy: false,
};

export async function initializeAI(
  config: ServerConfig,
  onReady?: () => void
): Promise<void> {
  const path = config.modelPath;
  if (!path || !existsSync(path)) return;

  try {
    console.log("\n--- [AI INITIALIZATION] ---");
    AI_STATE.llama = await getLlama({  
      //  build: "forceRebuild"
    });
    AI_STATE.model = await AI_STATE.llama.loadModel({ modelPath: path });
    if (!AI_STATE.model) throw new Error("Failed to load model");
    AI_STATE.context = await AI_STATE.model.createContext();
    AI_STATE.session = new LlamaChatSession({
      contextSequence: AI_STATE.context!.getSequence(),
      systemPrompt: SYSTEM_PROMPT
    });

    console.log("[AI] READY: Semantic Engine online.");
    onReady?.();
  } catch (e) {
    console.error("[AI] Load error", e);
  }
}