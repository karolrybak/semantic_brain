import { type } from "arktype";
import { Connect } from "vite";

// const Relations = "'enables' | 'causes' | 'conflicts_with' | 'depends_on' | 'example_of' | 'part_of' | 'risk_of' | 'opportunity_for' | 'similar_to' | 'opposite_of' | 'subclass_of' | 'instance_of' | 'incompatible_with'";

export const Relations = type.module({
    hierarchical: `'subclass_of'`,

    structural: `
        'part_of' |
        'has_part'
    `,

    causal: `
        'causes' |
        'enables' |
        'depends_on'
    `,

    logical: `
        'incompatible_with' |
        'similar_to' |
        'opposite_of'
    `,

    functional: `
        causal
    `,

    all: `
        hierarchical |
        structural |
        causal |
        logical
    `
})

export const Schemas = type.module({
    Node: {
        label: "string",
        scores: "AspectRating[]",
        description: "string",
        emoji: "string",
    },
    Connection: {
        target: "string",
        relation: Relations.all
    },
    ConnectionResponse: {
        connections: "Connection[]",
    },
    AspectResponse: "string[]",
    AspectRating: {
        aspect: "string",
        rating: "number"
    },
    SvgResponse: "string"
});

/**
 * Helper to convert Arktype schemas to JSON Schema for the LLM grammar
 */
export function getJsonSchema(arkType: any) {
    return arkType.toJsonSchema();
}