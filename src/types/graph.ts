export type NodeStatus = 'proposed' | 'accepted' | 'forbidden';

export interface GraphNode {
  id: string;
  label: string;
  status: NodeStatus;
  type: 'concept' | 'root';
  val: number;
  group?: number;
  metadata?: {
    reason?: string;
    aspect?: string;
    timestamp: number;
  };
  // Physics
  x?: number;
  y?: number;
  z?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  isLocked?: boolean;
  // Computed properties (client-side)
  neighbors?: GraphNode[];
  links?: GraphLink[];
  __threeObj?: any;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'ai' | 'user' | 'bridge';
  id?: string;
}

export interface GraphState {
  nodes: Record<string, GraphNode>;
  links: GraphLink[];
  focusNodeId: string | null;
  thinkingNodeId: string | null;
  settings: {
    creativity: number;
    maxWords: number;
    minConnections: number;
    autoExplore: boolean;
    activeAspect: string; // E.g. "Cyberpunk", "Naturalistic", "Melancholy"
  };
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  settings?: GraphState['settings'];
}
