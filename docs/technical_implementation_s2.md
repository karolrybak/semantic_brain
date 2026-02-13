# Technical Implementation Plan: Stage 2

## 1. Data Layer Changes (`types/graph.ts` & `state.json`)
- **Link Extensions**: Add `relationType: string` and `explanation?: string` to `GraphLink`.
- **Node Extensions**: Add `aspects: Record<string, number>` (where keys are aspect IDs and values are 0.0 to 1.0) and `status: 'forbidden'`.
- **Global Settings**: Add `definedAspects: string[]` to the state to track which dimensions are available for the current graph.

## 2. Server-Side Logic (`server/index.ts`)
- **Structured Prompting**: 
    - Update `brainstorm()` to use a `LlamaJsonGrammar` or a very strict template to ensure the LLM returns: 
      `{ label: string, relation: string, weights: Record<string, number> }`.
    - Inject `state.settings.definedAspects` into the prompt so the AI knows which dimensions to score.
- **Cross-Linking Worker**:
    - A new interval loop that periodically checks pairs of nodes (e.g., those with shared aspects) and asks the LLM to find a bridge.
- **Negative Context Handling**:
    - Pre-filter all AI suggestions against the list of nodes marked as `forbidden`.

## 3. GUI Additions (Vue components)
### A. Aspect Dashboard (New Component: `AspectBar.vue`)
- Horizontal bar at the top of the screen.
- List of tags with checkboxes to toggle visibility/transparency.
- "Add Aspect" input to expand the graph's dimensions.

### B. Semantic Link Visualization (`CodeGraph.vue`)
- Use `linkCanvasObject` or `linkThreeObject` in `3d-force-graph` to render text sprites on links.
- Implement a 'curved' link mode by default to handle multiple relations between the same nodes.

### C. Enhanced Inspector (`GraphExplorer.vue`)
- **Aspect Sliders**: Display a radar chart or a list of sliders for the selected node's aspect weights.
- **Forbidden Toggle**: A prominent switch to mark a concept as a dead-end for the AI.
- **Relationship History**: List of incoming/outgoing links grouped by `relationType`.

## 4. Detailed Task List

| ID | Task | Component | Priority |
|:---|:---|:---|:---|
| S2.1 | Update shared TypeScript interfaces and initial state | Data | High |
| S2.2 | Refactor LLM prompt to include Relation Types and Aspect Weights | Server | High |
| S2.3 | Implement Aspect Toggle Bar (UI Only) | Client | Med |
| S2.4 | Implement Shader/Material logic for Aspect filtering (Opacity) | Client | Med |
| S2.5 | Add 'Forbidden' status logic to Server and Client | Logic | Med |
| S2.6 | Add text labels to 3D Links | Client | Low |
| S2.7 | Implement Cross-Link discovery logic | Server | Low |

## 5. Technical Risks
- **Prompt Complexity**: Requesting labels, relations, AND weights in one shot might degrade LLM performance on smaller models (e.g., Phi-3 or Llama-3-8B). We might need a two-step generation.
- **State Size**: Aspect maps on every node will significantly increase the `state.json` file size. JSON compression or binary storage might be required later.