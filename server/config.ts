export interface ServerConfig {
  modelPaths: {
    small: string;
    medium: string;
    large: string;
  };
  selectedSize: 'small' | 'medium' | 'large';
  loadOnStartup: boolean;
  logPrompts: boolean;
}

export const DEFAULT_CONFIG: ServerConfig = {
  modelPaths: {
    small: "",
    medium: "",
    large: "",
  },
  selectedSize: 'medium',
  loadOnStartup: true,
  logPrompts: false,
};

export async function loadConfig(configPath: string): Promise<ServerConfig> {
  try {
    console.log("Loading config from", configPath);
    const confFile = Bun.file(configPath);
    if (await confFile.exists()) {
      const config = await confFile.json();
      console.log("[Config] Server config loaded.");
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (e) {
    console.error("[Config] Failed to load config.json");
  }
  return DEFAULT_CONFIG;
}
