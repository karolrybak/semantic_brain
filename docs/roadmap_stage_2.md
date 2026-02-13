# Roadmap: Stage 2 - Semantic Nuance

## 1. Cross-Linking Engine
*   **Goal**: AI should find connections between existing nodes, not just create new ones.
*   **Method**: When `auto-explore` is on, the server picks two nodes with similar labels (or via vector search later) and asks the LLM: "Is there a direct semantic link between [X] and [Y]? If so, describe it in one word."

## 2. Forbidden Knowledge (Negative Guidance)
*   **Goal**: Allow users to steer the AI away from specific directions without deleting the nodes.
*   **Status**: Added `forbidden` to `NodeStatus`. Forbidden nodes will be passed to the AI as a 'Negative Context' list.

## 3. Environmental Aspects (Contextual Layers)
*   **Goal**: The same concept should yield different results based on a 'Global Aspect'.
*   **Idea**: User defines a 'Scenario' (e.g., "Post-apocalyptic", "Techno-optimism", "Summer Romance").
*   **Implementation**: This string is injected into the System Prompt as a primary filter for all associations.

## 4. UI/UX Enhancements
*   **Toasts**: Real-time notifications for 'AI found a new bridge' or 'Concept accepted'.
*   **Inspector Improvements**: Display why a node was suggested (metadata storage).

## 5. Optimized Prompting
*   **Local Context**: Instead of sending all 100+ node labels to the LLM (which is slow and restrictive), we will send the labels of the focus node's direct neighbors (up to 2 levels deep) to ensure local uniqueness while allowing global patterns to repeat if they make sense.