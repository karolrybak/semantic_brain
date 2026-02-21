import { executeAITask } from "./core";
import { Schemas } from "./schemas";
import {
  NEW_CONNECTIONS_PROMPT,
  FIND_CONNECTIONS_PROMPT,
  NEW_RELATIONS_LIMITED_PROMPT,
  GRAPH_NAME_PROMPT,
  DESCRIBE_CONTENT_PROMPT,
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

export async function generateGraphName(concepts: string[], aspects: string[], config: ServerConfig): Promise<string | null> {
  const prompt = GRAPH_NAME_PROMPT(concepts, aspects);
  const result = await executeAITask<typeof Schemas.GraphNameResponse.infer>({
    prompt,
    schema: Schemas.GraphNameResponse,
    config,
    taskName: "GENERATE_GRAPH_NAME",
    temperature: 0.7,
    maxTokens: 50
  });
  return result?.name || null;
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

  // Task 1: Generate Description and Emoji
  const content = await executeAITask<any>({
    prompt: DESCRIBE_CONTENT_PROMPT(label),
    schema: Schemas.Node.pick("description", "emoji"),
    config,
    taskName: "DESCRIBE_CONTENT",
    temperature: 0.1,
    maxTokens: 300
  });

  if (!content) return null;

  // Task 2: Evaluate Relevance Scores for Aspects
  const scores = await executeAITask<any>({
    prompt: EVALUATE_ASPECTS_PROMPT(label, aspectList.join(", ")),
    schema: Schemas.Node.pick("scores"),
    config,
    taskName: "EVALUATE_ASPECTS",
    temperature: 0.1,
    maxTokens: 500
  });

  if (!scores) return null;

  const aspects: Record<string, number> = {};
  if (Array.isArray(scores.scores)) {
    scores.scores.forEach((s: any) => {
      aspects[s.aspect] = s.rating;
    });
  }

  return {
    description: content.description,
    aspects,
    emoji: extractEmojis(content.emoji)
  };
}

function extractEmojis(input: string): string {
  const emojiRegex = /\p{Extended_Pictographic}/gu;
  const matches = input.match(emojiRegex);
  return matches ? matches.slice(0, 3).join("") : "◾";
}