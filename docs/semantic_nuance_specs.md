# Stage 2 Specs: Semantic Relationships & Multi-Dimensional Aspects

## 1. Explicit Semantic Relationships
Instead of simple lines, links will now carry specific semantic weight. 

### Proposed Link Types
- **Causal**: `causes`, `prevents`
- **Functional**: `enables`, `depends_on`, `conflicts_with`
- **Structural**: `part_of`, `example_of`
- **Strategic**: `risk_of`, `opportunity_for` 

### Implementation Strategy
- **AI Prompting**: The system prompt will be updated to request a JSON structure: `[{ "label": "String", "type": "relation_type", "explanation": "Short string" }]`.
- **Open vs Closed Set**: We will start with a 'suggested list' but allow the LLM to provide custom relations if the confidence score is high. Custom relations will be normalized server-side.
- **Visualization**: Links will be color-coded or labeled in the 3D view. For multiple relations between the same two nodes, we will use 'Curvature Bundling' to prevent line overlapping.

## 2. Multi-Dimensional Aspects (Tags with Weights)
Every node is no longer just a point; it's a vector in the space of defined Aspects.

### Mechanics
- **Aspect Definition**: A global list of tags (e.g., *Technical*, *Emotional*, *Economic*) defined per graph. AI can suggest these based on the root concept.
- **Node Scoring**: Each node contains a map: `aspects: { "Technical": 0.9, "Emotional": 0.2 }`.
- **UI Interaction**: A top-bar toggle system where users can activate/deactivate aspects. 
- **Dynamic Transparency/Filtering**: 
    - If 'Technical' is active, nodes with low technical scores become semi-transparent.
    - Nodes with 0 score in all active aspects are hidden.

## 3. Forbidden Concepts (Negative Reinforcement)
- **UI**: A 'Forbidden' toggle in the Graph Explorer sidebar.
- **Logic**: Forbidden labels are injected into the LLM context with a high-priority instruction: "STRICTLY AVOID any semantic drift towards these concepts."

## Potential Challenges

### A. Semantic Overlap
How does AI choose between `causes` and `enables`? 
- *Solution*: We will implement a few-shot prompting strategy in the server to guide the LLM's classification accuracy.

### B. Performance (The 'Aspect Flutter')
Recalculating 3D material properties (opacity) for 500+ nodes every time a toggle is clicked can lead to frame drops.
- *Solution*: Use Three.js vertex colors or a shared shader uniform to handle visibility updates on the GPU.

### C. Ambiguity of 0-1 Weights
Manually assigning weights is tedious for users.
- *Solution*: The LLM will automatically assign weights during the `brainstorm` phase, and the user can 'tune' them in the inspector if needed.