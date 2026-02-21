import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";

export interface AIState {
  llama: any;
  model: LlamaModel | null;
  context: LlamaContext | null;
  session: LlamaChatSession | null;
  isAiBusy: boolean;
  modelMetadata: {
    size: string;
    vram?: number;
  };
}