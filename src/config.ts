import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DietokenConfig } from "./types.js";

export const defaultConfig: DietokenConfig = {
  largeFileWarningTokens: 1500,
  largeFileErrorTokens: 4000,
  includeUserFiles: false,
  ignore: ["node_modules/**", "dist/**", "coverage/**", ".next/**", ".git/**"]
};

export function loadConfig(cwd: string): DietokenConfig {
  const path = join(cwd, ".dietokenrc.json");
  if (!existsSync(path)) {
    return { ...defaultConfig };
  }

  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<DietokenConfig>;

  return {
    ...defaultConfig,
    ...parsed,
    ignore: parsed.ignore ?? defaultConfig.ignore
  };
}
