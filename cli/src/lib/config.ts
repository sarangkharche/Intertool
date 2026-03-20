import { readFileSync, writeFileSync, mkdirSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".intertool");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  token?: string;
}

const DEFAULT_CONFIG: Config = {
  apiUrl: "http://localhost:3000",
};

export function getConfig(): Config {
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: Partial<Config>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  const current = getConfig();
  const updated = { ...current, ...config };
  writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
}

export function clearToken(): void {
  const current = getConfig();
  delete current.token;
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(current, null, 2));
  chmodSync(CONFIG_FILE, 0o600);
}
