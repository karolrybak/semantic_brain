import { type } from "arktype";
import { Connect } from "vite";

const Relations = "'enables' | 'causes' | 'conflicts_with' | 'depends_on' | 'example_of' | 'part_of' | 'risk_of' | 'opportunity_for' | 'similar_to' | 'opposite_of'";

/**
 * Unified Graph Schema Module
 */
export const Schemas = type.module({
    Node: {
        label: "string",
        scores: "AspectRating[]",
        description: "string"
    },
    Connection: {
        target: "string",
        relation: Relations,
    },
    ConnectionResponse: {
        connections: "Connection[]",
    },
    AspectResponse: "string[]",
    AspectRating: {
        aspect: "string",
        rating: "number"
    }
});

/**
 * Helper to convert Arktype schemas to JSON Schema for the LLM grammar
 */
export function getJsonSchema(arkType: any) {
    return arkType.toJsonSchema();
}