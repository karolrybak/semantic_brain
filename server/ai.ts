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
      contextSequence: AI_STATE.context!.getSequence()
    });

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
    const prompt = `You are a semantic dimensionality analyzer. For the concept "${label}", suggest 6-8 high-level semantic dimensions (aspects) to explore it from different perspectives (e.g. historical, emotional, physical, technical). \n\nRules:\n1. Return ONLY a JSON array of strings: ["Aspect1", "Aspect2"].\n2. No preamble, no explanation, no prose.`;

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
  existingNodes: string[],
  mode: 'new' | 'existing',
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
    const existingStr = existingNodes.join(", ");

    let prompt = "";
    if (mode === 'new') {
      prompt = `You are a semantic association engine. Generate 3-5 NEW unique concepts related to "${label}". \n\nConstraints:\n- Avoid these existing labels: [${existingStr}].\n- Do not use forbidden concepts: [${forbiddenStr}].\n- For each concept, calculate relevance (0 to 1) for these aspects: [${aspectListStr}].\n\nFormat: Return ONLY a JSON array of objects: [{ "label": "word", "relation": "causes|enables|depends_on|part_of", "aspects": { "AspectName": 0.8 } }]. No prose.`;
    } else {
      prompt = `You are a semantic connectivity engine. Analyze the relationship between "${label}" and the following existing concepts: [${existingStr}]. \n\nTask: Identify valid semantic links. For each connection, determine the relation type and relevance (0 to 1) for: [${aspectListStr}].\n\nFormat: Return ONLY a JSON array of objects: [{ "label": "existing_label", "relation": "type", "aspects": { "AspectName": 0.5 } }]. No prose.`;
    }

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

export async function evaluateAspects(
  label: string,
  aspectList: string[],
  config: ServerConfig
): Promise<Record<string, number>> {
  const { session, isAiBusy } = AI_STATE;
  if (!session || isAiBusy) return {};

  AI_STATE.isAiBusy = true;
  const startTime = performance.now();

  try {
    const aspectStr = aspectList.join(", ");
    const prompt = `You are a semantic scoring agent. Target: "${label}". Dimensions to score: [${aspectStr}].\n\nRequirements:\n1. Evaluate how much "${label}" relates to each dimension on a scale of 0.0 to 1.0.\n2. Return ONLY a JSON object where keys are the dimension names and values are floats.\n3. Format: { "DimensionName": 0.85 }\n4. No preamble, no markers, ONLY the JSON object.`

    if (config.logPrompts) {
      console.log(`[AI] >>> ASPECT EVAL PROMPT: "${prompt}"`);
    }

    const response = await session.prompt(prompt, {
      maxTokens: 200,
      temperature: 0.1,
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    if (config.logPrompts) {
      console.log(`[AI] <<< ASPECT EVAL RESPONSE (${duration}s): "${response}"`);
    }

    const jsonMatch = response.match(/\{.*\}/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    console.error("[AI] Eval Error", e);
    return {};
  } finally {
    AI_STATE.isAiBusy = false;
  }
}