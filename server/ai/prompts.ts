import { label } from "three/tsl";
import type { GraphNode } from "../../src/types/graph";

/**
 * Global System Prompt
 */
export const SYSTEM_PROMPT = `
You are a knowledge graph generator.
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

/**
 * Brainstorm New Prompt
 */
export const NEW_CONNECTIONS_PROMPT = (label: string, existingStr: string, aspects: string) => `
### TASK
Generate 3–5 NEW graph nodes related to the target concept.

### STRICT RULES (very important)

1) Avoid generic or corporate wording.
   Forbidden examples:
   - "increased efficiency"
   - "broader access"
   - "improved collaboration"
   - "better productivity"
   - "innovation", "growth", "opportunities"
   - any abstract business/HR phrasing

2) Every concept must be TANGIBLE and OBSERVABLE.
   A good concept is something you could:
   - see
   - measure
   - record
   - physically experience
   - or point to as a real-world phenomenon

3) Prefer:
   - specific behaviors
   - concrete situations
   - tools, rituals, environments
   - real constraints
   - side effects
   - niche or unexpected angles

5) Avoid overlap with existing graph labels.

6) Prefer short 1-3 words for concepts.
   Avoid long sentences or paragraphs.

### INPUT
Target Concept: "${label}"
Existing Graph Labels: [${existingStr}]
Focus Aspects: [${aspects}]
`;

/**
 * Brainstorm Existing Prompt
 */
export const FIND_CONNECTIONS_PROMPT = (label: string, existingStr: string) => `
### INSTRUCTION
Find logical links between "${label}" and the candidate concepts below.

### INPUT
- Target Concept: "${label}"
- Candidate Concepts: [${existingStr}]
`;

/**
 * Evaluate Aspects Prompt
 */
export const DESCRIBE_PROMPT = (label: string, aspectStr: string) => `
### INSTRUCTION
Provide short 10-20 words description of the concept.
Assign relevance scores (0.0 to 1.0) for each of specified aspects.
If the concept is commonly associated with a color or shape, include it.

### INPUT
- Concept: "${label}"
- Aspects: [${aspectStr}]
`;

export const CREATE_SVG_PROMPT = (concept: GraphNode) => `

### INSTRUCTION
Create a simple symbolic SVG icon for the concept below.
Size of the svg should be 32x32.
Use simple shapes and colors. If you're unable to do this, return an empty string.

### INPUT
Concept: ${concept.label}
Color: ${concept.color}
Shape: ${concept.shape}

`;
