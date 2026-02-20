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
  metadata?: {
    reason?: string;
    timestamp: number;
  };
  isLocked?: boolean;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'ai' | 'user' | 'bridge';
  relationType?: string;
  id?: string;
}

export interface GraphSettings {
  creativity: number;
  maxWords: number;
  minConnections: number;
  autoExplore: boolean;
  definedAspects: string[];
  activeAspects: string[];
}

export interface GraphState {
  nodes: Record<string, GraphNode>;
  links: GraphLink[];
  focusNodeId: string | null;
  thinkingNodeId: string | null;
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