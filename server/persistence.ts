import { join } from "path";
import { mkdirSync, existsSync } from "fs";

export const DATA_DIR = join(process.cwd(), "data");
export const STATE_PATH = join(DATA_DIR, "state.json");

export function initializeDataDirectory(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR);
  }
}

export async function loadStateFromDisk(statePath: string): Promise<any> {
  try {
    const file = Bun.file(statePath);
    if (await file.exists()) {
      return await file.json();
    }
  } catch (e) {
    console.error("[Persistence] Failed to load state.json");
  }
  return null;
}

export async function saveStateToDisk(statePath: string, state: any): Promise<void> {
  await Bun.write(statePath, JSON.stringify(state, null, 2));
}

let saveTimeout: NodeJS.Timeout | null = null;

export function triggerDebouncedSave(
  statePath: string,
  state: any,
  delayMs: number = 1000
): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveStateToDisk(statePath, state).catch(e => 
      console.error("[Persistence] Save error", e)
    );
  }, delayMs);
}

export function cancelPendingSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
}
