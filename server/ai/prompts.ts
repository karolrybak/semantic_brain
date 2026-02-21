import { label } from "three/tsl";
import type { GraphNode } from "../../src/types/graph";

/**
 * Global System Prompt
 */
export const SYSTEM_PROMPT = `
You are a ontologic knowledge graph generator.
Your job is to expand a conceptual graph using specific nodes and relations.
`;

/**
 * Suggest Aspects Prompt
 */
export const ASPECT_SUGGESTION_PROMPT = (label: string) => `
### INSTRUCTION
Suggest 6-8 distinct semantic dimensions (aspects) for a deep multi-perspective analysis of the concept below.
Return as a simple JSON array of strings.

### INPUT
Concept: "${label}"
`;


const NEW_CONNECTIONS = `
### TASK
Generate 3–5 NEW ontologic concepts related to the target concept.

### STRICT RULES (very important)

1) Avoid generic or corporate wording.
   Forbidden examples:
   - "increased efficiency"
   - "broader access"
   - "innovation", "growth", "opportunities"
   - any abstract business/HR phrasing

2) DO NOT! Use existing concepts listed below

3) Prefer 1-3 words for concept.
   Avoid long sentences or paragraphs.
`

/**
 * Brainstorm New Prompt
 */
export const NEW_CONNECTIONS_PROMPT = (label: string, existingStr: string, aspects: string) => `
${NEW_CONNECTIONS}

4) Provide variety of possible relation types

### INPUT
Target Concept: "${label}"
Existing Concepts: [${existingStr}]
`;


export const NEW_RELATIONS_LIMITED_PROMPT = (label: string, existingStr: string, aspects: string, relations: string[]) => `
${NEW_CONNECTIONS}

4) Provide only relations of types: [${relations.join(", ")}]

### INPUT
Target Concept: "${label}"
Existing Concepts: [${existingStr}]
`


/**
 * Brainstorm Existing Prompt
 */
export const FIND_CONNECTIONS_PROMPT = (label: string, existingStr: string) => `
### INSTRUCTION
Find logical links between "${label}" and the candidate concepts below.
Only include direct relationships of high confidence. If there are no links, return an empty list.
DO NOT create new concepts, only use existing ones.

### INPUT
- Candidate Concepts: [${existingStr}]
`;

/**
 * Evaluate Aspects Prompt
 */
export const DESCRIBE_PROMPT = (label: string, aspectStr: string) => `
### INSTRUCTION
Provide short 10-20 words description of the concept -> "${label}".
Pick up to three emoji symbols to represent the concept, use as little as possible.
For each of the aspects specified below - assign relevance score (0.0 to 1.0)

### INPUT
- Aspects: [${aspectStr}]
`;

/**
 * Generate Description and Emoji
 */
export const DESCRIBE_CONTENT_PROMPT = (label: string) => `
### INSTRUCTION
Provide short 10-20 words description of the concept -> "${label}".
Pick up to three emoji symbols to represent the concept, use as little as possible.
`;

/**
 * Evaluate Relevance Scores for Aspects
 */
export const EVALUATE_ASPECTS_PROMPT = (label: string, aspectStr: string) => `
### INSTRUCTION
For the concept -> "${label}" - assign relevance score (0.0 to 1.0) for each of the aspects specified below.

### INPUT
- Aspects: [${aspectStr}]
`;

export const GRAPH_NAME_PROMPT = (concepts: string[], aspects: string[]) => `
### INSTRUCTION
Based on the following concepts and analysis aspects, suggest a single, concise, catchy name for this knowledge graph (5 words max).

### INPUT
- Concepts: [${concepts.slice(0, 10).join(", ")}]
- Aspects: [${aspects.join(", ")}]
`;
