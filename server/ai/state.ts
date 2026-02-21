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
  modelMetadata: { size: "medium" }
};

export async function unloadAI(): Promise<void> {
  console.log("[AI] Unloading model...");
  AI_STATE.session = null;
  AI_STATE.context = null;
  AI_STATE.model = null;
  AI_STATE.isAiBusy = false;
}

export async function initializeAI(
  config: ServerConfig,
  onReady?: (error?: string) => void
): Promise<void> {
  const path = config.modelPaths[config.selectedSize];
  
  if (AI_STATE.model) {
    await unloadAI();
  }

  if (!path || !existsSync(path)) {
    const err = `Model file not found: ${path}`;
    console.error(`[AI] ${err}`);
    onReady?.(err);
    return;
  }

  try {
    console.log(`\n--- [AI INITIALIZATION] size: ${config.selectedSize} ---`);
    if (!AI_STATE.llama) {
      const options = {}
      
      AI_STATE.llama = await getLlama(options);
    }
    
    AI_STATE.model = await AI_STATE.llama.loadModel({ modelPath: path });
    if (!AI_STATE.model) throw new Error("Failed to load model");
    
    AI_STATE.context = await AI_STATE.model.createContext();
    AI_STATE.session = new LlamaChatSession({
      contextSequence: AI_STATE.context!.getSequence(),
      systemPrompt: SYSTEM_PROMPT
    });

    AI_STATE.modelMetadata = {
      size: config.selectedSize,
      vram: (AI_STATE.model as any).vramUsage || 0
    };

    console.log("[AI] READY: Semantic Engine online.");
    onReady?.();
  } catch (e: any) {
    console.error("[AI] Load error", e);
    onReady?.(e.message || "Unknown error");
  }
}

export function getAIStatus(): any {
    if (AI_STATE.model && AI_STATE.session) return { status: 'ready', ...AI_STATE.modelMetadata };
    return { status: 'unloaded' };
}