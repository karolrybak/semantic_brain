import { type } from "arktype";

export const Relations = type.module({
    hierarchical: "'subclass_of'",

    structural: `
        'part_of' |
        'has_part'
    `,

    causal: `
        'causes' |
        'enables' |
        'depends_on'
    `,

    historical: `
        'preceded_by' |
        'succeded_by'
    `,

    logical: `
        'incompatible_with' |
        'similar_to' |
        'opposite_of'
    `,

    all: `
        hierarchical |
        structural |
        causal |
        historical |
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
    GraphNameResponse: {
        name: "string"
    }
});

/**
 * Helper to convert Arktype schemas to JSON Schema for the LLM grammar
 */
export function getJsonSchema(arkType: any) {
    return arkType.toJsonSchema();
}