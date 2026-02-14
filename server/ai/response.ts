import { Schemas } from "./schemas";
import type { Operation } from "fast-json-patch";
import type { GraphData, GraphLink, GraphNode, GraphState } from "../../src/types/graph";

export function shortRandomHash(length: 6 | 8 = 8): string {
  const bytesLen = Math.ceil((length * 3) / 4);
  const bytes = new Uint8Array(bytesLen);
  crypto.getRandomValues(bytes);

  return Buffer.from(bytes).toString("base64url").slice(0, length);
}
/**
 * Tworzy patch (fast-json-patch) dodający nody i linki do GraphData.
 * Każdy input node zostanie połączony linkiem: source=rootId -> target=newNodeId.
 */
export function aiListToGraphPatch(
  rootId: string,
  state: GraphState,
  input: typeof Schemas.ConnectionResponse.infer,
): Operation[] {


  const ops: Operation[] = [];

  for (const n of input.connections  ?? []) {
    const nodeId = shortRandomHash();

    const graphNode: GraphNode = {
      id: nodeId,
      label: n.target,
      status: 'accepted',
      type: "concept",
      val: 1,
      aspects: {},
    };

    const linkId = shortRandomHash();

    const graphLink: GraphLink = {
      id: linkId,
      source: rootId,
      target: nodeId,
      type: "ai",
      relationType: n.relation
    };

    ops.push({ op: "add", path: `/nodes/${nodeId}`, value: graphNode });
    ops.push({ op: "add", path: `/links/`, value: graphLink });
  }

  return ops;
}