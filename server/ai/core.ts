import { Module, Type, type } from "arktype";
import { AI_STATE } from "./state";
import { Schemas, getJsonSchema } from "./schemas";
import type { ServerConfig } from "../config";

export interface AIRunOptions {
  prompt: string;
  schema: type.Any;
  config: ServerConfig;
  taskName: string;
  maxTokens?: number;
  temperature?: number;
}

export async function executeAITask<T>(
  options: AIRunOptions
): Promise<T | null> {
  const { session, isAiBusy, llama } = AI_STATE;
  const { prompt, schema, config, taskName, maxTokens = 400, temperature = 0.5 } = options;

  if (!session || isAiBusy || !llama) return null;

  AI_STATE.isAiBusy = true;
  const startTime = performance.now();
  if (config.logPrompts) {
      console.info(`[AI] <<< ${taskName} PROMPT (${prompt}s):\n`);
  }
  try {
    const grammar = await llama.createGrammarForJsonSchema(schema.toJsonSchema());

    const response = await session.prompt(prompt, {
      maxTokens,
      temperature,
      grammar
    });

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    if (config.logPrompts) {
      console.log(`[AI] <<< ${taskName} RESPONSE (${duration}s):\n${response}`);
    }

    // Parse response string back to object
    const data = typeof response === "string" ? JSON.parse(response) : response;
    const result = schema(data);

    if (result.problems) {
      console.error(`[AI] ${taskName} validation failed:`, result.problems.summary);
      return null;
    }

    return result.data || result;
  } catch (e) {
    console.error(`[AI] ${taskName} execution failed:`, e);
    return null;
  } finally {
    AI_STATE.isAiBusy = false;
  }
}