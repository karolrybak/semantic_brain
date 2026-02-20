import { executeAITask } from "./core";
import { Schemas } from "./schemas";
import {
  DESCRIBE_PROMPT,
  NEW_CONNECTIONS_PROMPT,
  FIND_CONNECTIONS_PROMPT,
  NEW_RELATIONS_LIMITED_PROMPT
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

export async function newConnections(params: NewConnectionsParams): Promise<typeof Schemas.ConnectionResponse.infer> {
  const { label, existingNodes, creativity, config, aspectList } = params;
  const existingStr = existingNodes.join(", ");

  const prompt = NEW_CONNECTIONS_PROMPT(label, existingStr, aspectList.join(", "));

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

export async function newConnectionsLimited(params: NewConnectionsParams & { relations: string[] }): Promise<typeof Schemas.ConnectionResponse.infer> {
  const { label, existingNodes, creativity, config, aspectList, relations } = params;
  const existingStr = existingNodes.join(", ");

  const prompt = NEW_RELATIONS_LIMITED_PROMPT(label, existingStr, aspectList.join(", "), relations);

  const result = await executeAITask<typeof Schemas.ConnectionResponse.infer>({
    prompt,
    schema: Schemas.ConnectionResponse,
    config,
    taskName: `NEW_CONNECTIONS_LIMITED`,
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
  if(!result) return { connections: [] };
  
  result.connections = result.connections.filter((c) => existingNodes.includes(c.target));
  
  return result;
}

export async function describeNode(
  label: string,
  aspectList: string[],
  config: ServerConfig
): Promise<{ description: string; aspects: Record<string, number>, emoji: string } | null> {

  const result = await executeAITask<typeof Schemas.Node.infer>({
    prompt: DESCRIBE_PROMPT(label, aspectList.join(", ")),
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
    aspects,
    emoji: extractEmojis(result.emoji)
  };
}

function extractEmojis(input: string): string {
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const matches = input.match(emojiRegex);
  return matches ? matches.slice(0, 3).join("") : "◾";
}