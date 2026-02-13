# AI Exploration Loop Logic

This document describes the continuous exploration logic of the Brain Engine.

## 1. Perpetual Exploration
The AI loop is **always active**. It continuously selects nodes from the graph to analyze and expand. The exploration cycle does not stop unless the server is disconnected.

## 2. Auto-Explore (Visibility & Permission)
The `autoExplore` setting (toggled in the UI) acts as a boundary for the AI's curiosity:
- **Enabled (ON)**: The AI has permission to explore the "uncharted" parts of the graph. It will pick both **Accepted** and **Proposed** nodes as context to generate new ideas.
- **Disabled (OFF)**: The AI restricts its focus only to **Accepted** nodes. It will continue to generate suggestions, but it will only use concepts you have personally validated as the basis for its next thoughts.

## 3. Focus Trigger
While the AI explores automatically, user interaction takes precedence:
- **Manual Focus**: Clicking any node sends a `SET_FOCUS` command. This immediately interrupts the current automatic cycle and forces the AI to start dreaming about the selected node.
- **Acceptance Trigger**: Accepting a proposed node typically triggers a focus shift to that node, encouraging the AI to immediately expand on the newly confirmed concept.

## 4. Semantic Dimensions (Aspects)
- Every generated node is scored against the **Defined Aspects** (e.g., Technical, Emotional).
- The **Active Aspects** selected in the top bar determine the node's visual weight (opacity) in the 3D graph.

## 5. Lifecycle Summary
- **Root**: The starting point.
- **Proposed**: AI-generated possibilities. Only explored if `autoExplore` is true.
- **Accepted**: Confirmed concepts. Always valid for AI exploration.
- **Forbidden**: Blacklisted concepts. The AI will never focus on or expand these nodes.