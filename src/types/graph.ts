import type { NodeObject } from "3d-force-graph";

export type NodeStatus = 'proposed' | 'accepted' | 'forbidden';

export interface GraphNode extends NodeObject {
  id: string;
  label: string;
  status: NodeStatus;
  type: 'concept' | 'root';
  val: number;
  aspects: Record<string, number>;
  description?: string;
  emoji?: string;
  group?: number;
  attempts: Record<string, number>;
  metadata?: {
    reason?: string;
    timestamp: number;
  };
  isLocked?: boolean;
  tasks?: Record<string, 'queued' | 'thinking'>;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'ai' | 'user' | 'bridge';
  relationType?: string;
  id?: string;
}

export interface GraphSettings {
  name: string;
  creativity: number;
  maxWords: number;
  minConnections: number;
  autoExplore: boolean;
  definedAspects: string[];
  activeAspects: string[];
  allowedRelations: string[];
  showEmoji: boolean;
}

export interface AITask {
  type: 'DESCRIBE' | 'EXPLORE_NEW' | 'EXPLORE_EXISTING' | 'EXPLORE_LIMITED' | 'GENERATE_NAME';
  nodeId: string;
  params?: any;
}

export interface GraphState {
  nodes: Record<string, GraphNode>;
  links: GraphLink[];
  focusNodeId: string | null;
  thinkingNodeId: string | null;
  userQueue: AITask[];
  tasks?: Record<string, 'queued' | 'thinking'>;
  settings: GraphSettings;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  settings?: GraphSettings;
}

export type AiStatus = 'unloaded' | 'loading' | 'ready' | 'thinking' | 'error';

export interface ServerPatch {
  op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
  path: string;
  value?: any;
}