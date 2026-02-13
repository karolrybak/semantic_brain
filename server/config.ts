export interface ServerConfig {
  modelPath: string;
  logPrompts: boolean;
}

export const DEFAULT_CONFIG: ServerConfig = {
  modelPath: "",
  logPrompts: false,
};

export async function loadConfig(configPath: string): Promise<ServerConfig> {
  try {
    const confFile = Bun.file(configPath);
    if (await confFile.exists()) {
      const config = await confFile.json();
      console.log("[Config] Server config loaded.");
      return config as ServerConfig;
    }
  } catch (e) {
    console.error("[Config] Failed to load config.json");
  }
  return DEFAULT_CONFIG;
}
