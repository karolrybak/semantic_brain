import { existsSync } from "fs";
import {
  LlamaModel,
  LlamaContext,
  LlamaChatSession,
  getLlama,
} from "node-llama-cpp";
import type { ServerConfig } from "./config";

export interface AIState {
  llama: any;
  model: LlamaModel | null;
  context: LlamaContext | null;
  session: LlamaChatSession | null;
  isAiBusy: boolean;
}

export const AI_STATE: AIState = {
  llama: null,
  model: null,
  context: null,
  session: null,
  isAiBusy: false,
};

const SYSTEM_PROMPT =
  "You are a semantic association engine. Your task is to provide structured associations. You MUST return ONLY a JSON array of objects. Format: [{ \"label\": \"word\", \"relation\": \"causes|enables|depends_on|part_of\", \"aspects\": { \"AspectName\": 0.8 } }]. No prose.";

export async function initializeAI(
  config: ServerConfig,
  onReady?: () => void
): Promise<void> {
  const path = config.modelPath;
  if (!path || !existsSync(path)) return;

  try {
    console.log("\n--- [AI INITIALIZATION] ---");
    AI_STATE.llama = await getLlama();
    AI_STATE.model = await AI_STATE.llama.loadModel({ modelPath: path });
    if (!AI_STATE.model) throw new Error("Failed to load model");
    AI_STATE.context = await AI_STATE.model.createContext();
    AI_STATE.session = new LlamaChatSession({
      contextSequence: AI_STATE.context!.getSequence(),
      systemPrompt: SYSTEM_PROMPT,
    });

    if (config.logPrompts) {
      console.log(`[AI] System Prompt Set: "${SYSTEM_PROMPT}"`);
    }
    console.log("[AI] READY: Semantic Engine online.");
    onReady?.();
  } catch (e) {
    console.error("[AI] Load error", e);
  }
}

export async function suggestAspects(
  label: string,
  config: ServerConfig
): Promise<string[]> {
  const { session, isAiBusy } = AI_STATE;
  if (!session || isAiBusy) return [];

  AI_STATE.isAiBusy = true;
  const startTime = performance.now();

  try {
    const prompt = `For the concept "${label}", suggest 6-8 high-level semantic dimensions (aspects) to explore it from different perspectives (e.g. historical, emotional, physical). Return ONLY a JSON array of strings.`;

    if (config.logPrompts) {
      console.log(`[AI] >>> ASPECT PROMPT: "${prompt}"`);
    }

    const response = await session.prompt(prompt, {
      maxTokens: 150,
      temperature: 0.5,
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    if (config.logPrompts) {
      console.log(`[AI] <<< ASPECT RESPONSE (${duration}s): "${response}"`);
    }

    const jsonMatch = response.match(/\[.*\]/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch (e) {
    return [];
  } finally {
    AI_STATE.isAiBusy = false;
  }
}

export async function brainstorm(
  label: string,
  forbiddenNodes: string[],
  aspectList: string[],
  creativity: number,
  config: ServerConfig
): Promise<any[]> {
  const { session, isAiBusy } = AI_STATE;
  if (!session || isAiBusy) return [];

  AI_STATE.isAiBusy = true;
  const startTime = performance.now();

  try {
    const aspectListStr = aspectList.join(", ");
    const forbiddenStr = forbiddenNodes.join(", ");
    const prompt = `Generate 3-5 associations for "${label}". For each, provide a relationship type and weight (0-1) for these aspects: ${aspectListStr}. Return ONLY JSON. Avoid forbidden: ${forbiddenStr}`;

    if (config.logPrompts) {
      console.log(`[AI] >>> BRAINSTORM PROMPT: "${prompt}"`);
    }

    const response = await session.prompt(prompt, {
      maxTokens: 400,
      temperature: creativity,
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    if (config.logPrompts) {
      console.log(`[AI] <<< BRAINSTORM RESPONSE (${duration}s): "${response}"`);
    }

    const jsonMatch = response.match(/\[.*\]/s);
    if (jsonMatch) {
      try {
        const results = JSON.parse(jsonMatch[0]);
        return results;
      } catch (e) {
        console.error("[AI] JSON Error", e);
      }
    }
    return [];
  } catch (e) {
    return [];
  } finally {
    AI_STATE.isAiBusy = false;
  }
}
