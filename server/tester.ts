import { join } from "path";
import { loadConfig } from "./config";
import { loadStateFromDisk, STATE_PATH } from "./persistence";
import { initializeAI, describeConcept, newConnections, describeNode } from "./ai/index";
import type { GraphState } from "../src/types/graph";

console.log("\n--- [BRAIN ENGINE AI TESTER] ---");

const CONFIG_PATH = join(import.meta.dir, "config.json");
const config = await loadConfig(CONFIG_PATH);
let state: GraphState | null = await loadStateFromDisk(STATE_PATH);

if (!state || !state.nodes || Object.keys(state.nodes).length === 0) {
  console.error("Error: No state found or no nodes available in state.json. Please start the app and add a node first.");
  process.exit(1);
}

await initializeAI(config, () => {
  console.log("[AI] Model loaded and ready.\n");
  startInteractiveShell();
});

async function startInteractiveShell() {
  let running = true;

  while (running) {
    // Reload state in case it changed externally
    state = await loadStateFromDisk(STATE_PATH);
    const nodes = Object.values(state!.nodes);
    
    console.log("\n=== Available Nodes ===");
    nodes.forEach((n, i) => console.log(`  [${i}] ${n.label}`));
    console.log("  [q] Quit");

    const nodeInput = prompt("\nSelect node index or 'q' to quit:") || "";
    
    if (nodeInput.toLowerCase() === 'q') {
      running = false;
      break;
    }

    const targetNode = nodes[parseInt(nodeInput)];
    if (!targetNode) {
      console.log("Invalid node selection.");
      continue;
    }

    let nodeLoop = true;
    while (nodeLoop) {
      console.log(`\n--- Active Node: [${targetNode.label}] ---`);
      console.log("  [1] Suggest Aspects");
      console.log("  [2] Brainstorm Related Concepts");
      console.log("  [3] Brainstorm Challenges");
      console.log("  [4] Evaluate Current Aspects");
      console.log("  [b] Back to Node Selection");
      console.log("  [q] Quit");

      const taskIdx = prompt("\nSelect task (1-4, b, q):") || "";

      if (taskIdx.toLowerCase() === 'q') {
        process.exit(0);
      }
      
      if (taskIdx.toLowerCase() === 'b') {
        nodeLoop = false;
        continue;
      }

      console.log(`\n--- Executing Task for: ${targetNode.label} ---\n`);

      try {
        switch (taskIdx) {
          case "1":
            const aspects = await describeConcept(targetNode.label, config);
            console.log("RESULT:", JSON.stringify(aspects, null, 2));
            break;
          case "2":
            const newNodes = await newConnections({
              label: targetNode.label,
              forbiddenNodes: [],
              aspectList: state!.settings.definedAspects,
              existingNodes: Object.values(state!.nodes).map(n => n.label),
              creativity: state!.settings.creativity,
              config
            });
            console.log("RESULT:", JSON.stringify(newNodes, null, 2));
            break;
          case "3":
            const links = await newConnections({
              label: targetNode.label,
              forbiddenNodes: [],
              aspectList: state!.settings.definedAspects,
              existingNodes: Object.values(state!.nodes).map(n => n.label),
              creativity: state!.settings.creativity,
              config
            });
            console.log("RESULT:", JSON.stringify(links, null, 2));
            break;
          case "4":
            const scores = await describeNode(targetNode.label, state!.settings.definedAspects, config);
            console.log("RESULT:", JSON.stringify(scores, null, 2));
            break;
          default:
            console.log("Unknown task.");
        }
      } catch (e) {
        console.error("Task failed:", e);
      }
    }
  }

  console.log("\n--- Test Session Closed ---");
  process.exit(0);
}
