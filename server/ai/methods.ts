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
  focus: string;
  forbiddenNodes: string[];
  aspectList: string[];
  existingNodes: string[];
  mode: 'new' | 'existing';
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
  const { label, focus, forbiddenNodes, aspectList, existingNodes, creativity, config } = params;
  const forbiddenStr = forbiddenNodes.join(", ");
  const existingStr = existingNodes.join(", ");

  const prompt = newConnectionsPrompt(label, focus, existingStr, forbiddenStr)

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




export async function describeNode(
  label: string, 
  aspectList: string[], 
  config: ServerConfig
): Promise<typeof Schemas.Node.infer | null> {
  
  const result = await executeAITask<typeof Schemas.Node.infer>({
    prompt: EVALUATE_ASPECTS_PROMPT(label, aspectList.join(", ")),
    schema: Schemas.Node,
    config,
    taskName: "EVALUATE_ASPECTS",
    temperature: 0.1,
    maxTokens: 500
  });
  return result;
}