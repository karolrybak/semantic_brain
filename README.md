# Experimental AI Mind Map (Context Explorer)

An experimental project for exploring semantic context and connections using local AI (Ollama/llama_cpp) and a dynamic 3D force-directed graph.

## Stack
- **Frontend:** Vue 3, Three.js, D3-force-3d, Pinia
- **Backend:** Bun, WebSockets, `fast-json-patch`
- **AI:** Ollama / llama_cpp (via FFI - *Work in Progress*)

## Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Run the Backend
```bash
bun run server/index.ts
```
The server runs on `ws://localhost:3001` and manages the global state in `server/state.json`.

### 3. Run the Frontend
```bash
bun run dev
```

## Testing

### Simulate AI Node Addition
You can test the real-time patching by sending a JSON message via any WebSocket client (or dev console) to the server:

```javascript
// From Browser Console while App is running:
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'ADD_NODE',
    parentId: 'root-1',
    node: {
      label: 'Nowy Koncept',
      status: 'proposed',
      type: 'concept',
      val: 2
    }
  }));
};
```

## Architecture
- **Server-Side State:** The source of truth is a single JSON object on the server.
- **Sync Mechanism:** Changes are broadcasted via JSON patches (RFC 6902).
- **Visualization:** `proposed` nodes appear as translucent indigo spheres, while `accepted` nodes are solid green/rose.
- **Focus:** The AI loop follows the `focusNodeId` to expand the graph in the user's direction of interest.