# Project: Semantic Context Explorer (MVP Stage)

## Current Progress

### 1. Core Architecture
- **Hybrid Client-Server State**: The graph state is managed by a Bun server (source of truth) and synchronized with a Vue 3/Three.js frontend via WebSockets.
- **Real-time Sync**: Utilizing `fast-json-patch` for incremental updates, ensuring smooth 3D transitions without scene reloads.
- **AI Engine**: Integrated `node-llama-cpp` for local inference. The server runs a background loop that monitors node connectivity and automatically brainstorms new concepts.

### 2. Interaction Design
- **Semantic Loop**: Focus-based exploration. AI dreams about the node the user is currently inspecting.
- **Auto-Explore**: An autonomous mode where the AI promotes suggestions and branches out without requiring manual 'Accept' clicks.
- **Visual Feedback**: Distinct color coding (Red/Root, Blue/Accepted, Gray/Proposed, Green/Thinking) and geometric transformations (Octahedron for active processing).
- **Spatial Labels**: Fixed persistent labels floating above nodes for high legibility.

## Potential Challenges / Known Issues

- **Semantic Loops**: Without advanced context history, the AI might suggest concepts that eventually circle back to the same labels (e.g., Apple -> Fruit -> Apple).
- **Inference Latency**: Depending on the local hardware and model size (GGUF), generating suggestions can take several seconds, causing a 'thinking' delay in the graph's growth.
- **Force-Directed Jitter**: Rapidly adding nodes can cause the 3D physics engine (D3-force) to become unstable if the repulsion forces (charge) aren't balanced.
- **Context Overload**: As the graph grows to hundreds of nodes, sending the full state on reconnect might become slow; incremental snapshots may be needed.

## Future Expansion Paths

- **Semantic Bridging**: A tool to find the 'shortest semantic path' between two disparate concepts (e.g., finding the links between 'Ice Cream' and 'Quantum Physics').
- **Tryb 'Aura'**: Using vector embeddings (e.g., via `nomic-embed-text`) to position nodes based on mathematical similarity rather than just link-based physics.
- **History Playback**: Storing the sequence of discovery to allow the user to 'rewind' and see how the mind map evolved.
- **Advanced Prompting**: Contextual 'filters' (e.g., exploring a topic through a 'dark/gothic' lens vs. a 'scientific/bright' lens).

--- 
*Status: MVP Complete. Ready for experimental use and brainstorming.*