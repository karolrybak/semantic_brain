import { executeAITask } from "./core";
import { Schemas } from "./schemas";
import { 
  ASPECT_SUGGESTION_PROMPT as DESCRIBE_PROMPT, 
  NEW_CONNECTIONS_PROMPT as newConnectionsPrompt, 
  FIND_CONNECTIONS_PROMPT, 
  EVALUATE_ASPECTS_PROMPT 
} from "./prompts";
import type { ServerConfig } from "../config";

export interface NewConnectionsParams {
  label: string;
  forbiddenNodes: string[];
  aspectList: string[];
  existingNodes: string[];
  creativity: number;
  config: ServerConfig;
}

export async function describeConcept(label: string, config: ServerConfig): Promise<string[]> {
  const result = await executeAITask<string[]>({
    prompt: DESCRIBE_PROMPT(label),
    schema: Schemas.AspectResponse,
    config,
    taskName: "SUGGEST_ASPECTS",
    maxTokens: 200
  });
  return result || [];
}

export async function newConnections(params: NewConnectionsParams): Promise<typeof Schemas.ConnectionResponse.infer> {
  const { label, forbiddenNodes, existingNodes, creativity, config, aspectList } = params;
  const forbiddenStr = forbiddenNodes.join(", ");
  const existingStr = existingNodes.join(", ");
  

  const prompt = newConnectionsPrompt(label, existingStr, aspectList.join(", "));

  const result = await executeAITask<typeof Schemas.ConnectionResponse.infer>({
    prompt,
    schema: Schemas.ConnectionResponse,
    config,
    taskName: `NEW_CONNECTIONS`,
    temperature: creativity,
    maxTokens: 1000
  });

  return result || { connections: [] };
}

export interface FindConnectionsParams {
  label: string;
  existingNodes: string[];
  config: ServerConfig;
}

export async function findExistingConnections(params: FindConnectionsParams): Promise<typeof Schemas.ConnectionResponse.infer> {
  const { label, existingNodes, config } = params;
  const existingStr = existingNodes.join(", ");

  const prompt = FIND_CONNECTIONS_PROMPT(label, existingStr);

  const result = await executeAITask<typeof Schemas.ConnectionResponse.infer>({
    prompt,
    schema: Schemas.ConnectionResponse,
    config,
    taskName: `FIND_EXISTING_CONNECTIONS`,
    temperature: 0.3,
    maxTokens: 1000
  });

  return result || { connections: [] };
}




export async function describeNode(
  label: string, 
  aspectList: string[], 
  config: ServerConfig
): Promise<{ description: string; aspects: Record<string, number> } | null> {
  
  const result = await executeAITask<typeof Schemas.Node.infer>({
    prompt: EVALUATE_ASPECTS_PROMPT(label, aspectList.join(", ")),
    schema: Schemas.Node,
    config,
    taskName: "EVALUATE_ASPECTS",
    temperature: 0.1,
    maxTokens: 500
  });

  if (!result) return null;

  const aspects: Record<string, number> = {};
  if (Array.isArray(result.scores)) {
    result.scores.forEach((s: any) => {
      aspects[s.aspect] = s.rating;
    });
  }

  return {
    description: result.description,
    aspects
  };
}