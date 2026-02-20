import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";

export interface AITask {
  type: 'DESCRIBE' | 'EXPLORE_NEW' | 'EXPLORE_EXISTING' | 'EXPLORE_LIMITED';
  nodeId: string;
  params?: any;
}

export interface AIState {
  llama: any;
  model: LlamaModel | null;
  context: LlamaContext | null;
  session: LlamaChatSession | null;
  isAiBusy: boolean;
  userQueue: AITask[];
}