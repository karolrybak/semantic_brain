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
export const NEW_CONNECTIONS_PROMPT = (label: string, existingStr: string, forbiddenStr: string) => `
### INSTRUCTION
Generate 3-5 NEW unique concepts related to "${label}" 
Provide varied relation types and concepts.

### INPUT
- Target Concept: "${label}"
- Existing Graph Labels: [${existingStr}]
- Forbidden Labels: [${forbiddenStr}]
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
export const EVALUATE_ASPECTS_PROMPT = (label: string, aspectStr: string) => `
### INSTRUCTION
Provide short 10-20 words description of the concept.
Assign relevance scores (0.0 to 1.0) for each of specified aspects.

### INPUT
- Concept: "${label}"
- Aspects: [${aspectStr}]
`;

