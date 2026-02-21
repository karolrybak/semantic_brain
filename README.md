# 🧠 Semantic Brain

Semantic Brain is an autonomous knowledge graph generator and explorer. It uses LLMs (via `node-llama-cpp`) to dynamically expand conceptual landscapes, evaluating relationships across multiple semantic dimensions and visualizing them in a real-time 3D environment.

## 🛠 Setup & Requirements

### 1. Model Configuration
Configure your model paths in `config.json` in the project root. You must use models compatible with GBNF JSON grammar (e.g., **Qwen-2.5-Instruct** or **Llama-3-Instruct**).

```json
{
  "modelPaths": {
    "small": "path/to/small-model.gguf",
    "medium": "path/to/medium-model.gguf",
    "large": "path/to/large-model.gguf"
  },
  "selectedSize": "medium",
  "loadOnStartup": true
}
```

### 2. Installation
```bash
bun install
```

### 3. Running the Application
You need to run the frontend dev server and the WebSocket logic server in separate terminals:

**Terminal A (Frontend):**
```bash
bun run dev
```

**Terminal B (AI Server):**
```bash
bun run server
```

## 🖥 User Interface Guide

### **The 3D Workspace**
- **Navigation**: Click and drag to rotate, scroll to zoom, right-click to pan.
- **Nodes**: Represent concepts. Sphere size indicates general relevance; color represents health/status.
- **Links**: Visual connections between concepts. AI-generated links (Blue), User-created (White), and Bridge links (Emerald).

### **Graph Explorer (Left Panel)**
Appears when a node is selected:
- **Description**: AI-generated summary of the concept.
- **Aspect Relevance**: Real-time breakdown of how the concept scores against your defined semantic dimensions.
- **Discovery Actions**: 
  - `Discover New`: AI brainstorms new related concepts based on your allowed relations.
  - `Link Existing`: AI looks for logical connections between the selected node and other concepts already in your graph.
- **Refresh**: Use the icon in the header to re-generate descriptions or re-evaluate aspects.

### **Control Center (Top Right)**
- **🔙 Back to List**: Exit the current graph and return to the workspace selector.
- **🔄 Re-layout**: Re-heat the physics simulation to organize the nodes.
- **🧠 Brain Panel**: Monitor model status, check VRAM usage, switch model sizes, or manually Load/Unload the engine.
- **🔗 Relations Management**: Toggle which ontological types (Causal, Structural, Logical, etc.) the AI is allowed to use for discovery.
- **⚙️ Config**: Adjust AI creativity, visual link opacity, label size, and toggle emoji visibility.

### **Semantic Bar (Top Center)**
- Manage the "Aspects" (dimensions) of your analysis. Toggle specific aspects to see the graph physically rearrange itself—nodes will gravitate towards the center based on their relevance to the active aspects.

## ⚠️ Troubleshooting

### JSON Grammar Issues
If you see errors regarding `createGrammarForJsonSchema`, your version of `node-llama-cpp` might need a manual recompile to support the latest features.

1. Follow the [official build instructions](https://node-llama-cpp.withcat.ai/guide/building-from-source#download-new-release).
2. Or use the built-in shortcut:
```bash
bun run recompile
```
This will force a clean rebuild of the native binaries and close the process. Afterward, start the server normally.

--- 
*Note: This project is optimized for **Bun**. Compatibility with standard Node.js is currently untested.*