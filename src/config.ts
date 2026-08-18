import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DietokenConfig } from "./types.js";

export const defaultConfig: DietokenConfig = {
  largeFileWarningTokens: 1500,
  largeFileErrorTokens: 4000,
  includeUserFiles: false,
  historyLimit: 500,
  tokensPerUnit: 1.3,
  ignore: ["node_modules/**", "dist/**", "coverage/**", ".next/**", ".git/**"]
};

export function loadConfig(cwd: string): DietokenConfig {
  const path = join(cwd, ".dietokenrc.json");
  if (!existsSync(path)) {
    return { ...defaultConfig };
  }

  const raw = readFileSync(path, "utf8");
  let parsed: Partial<DietokenConfig>;

  try {
    parsed = JSON.parse(raw) as Partial<DietokenConfig>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${path} is not valid JSON: ${message}`);
  }

  const config: DietokenConfig = {
    ...defaultConfig,
    ...parsed,
    ignore: parsed.ignore ?? defaultConfig.ignore
  };

  validate(config, path);

  return config;
}

function validate(config: DietokenConfig, path: string): void {
  requirePositive(config.largeFileWarningTokens, "largeFileWarningTokens", path);
  requirePositive(config.largeFileErrorTokens, "largeFileErrorTokens", path);
  requirePositive(config.tokensPerUnit, "tokensPerUnit", path);

  if (!Number.isFinite(config.historyLimit) || config.historyLimit < 0) {
    throw new Error(`${path}: historyLimit must be zero or a positive number`);
  }

  if (typeof config.includeUserFiles !== "boolean") {
    throw new Error(`${path}: includeUserFiles must be true or false`);
  }

  if (!Array.isArray(config.ignore) || config.ignore.some((pattern) => typeof pattern !== "string")) {
    throw new Error(`${path}: ignore must be a list of glob strings`);
  }

  if (config.largeFileErrorTokens < config.largeFileWarningTokens) {
    throw new Error(`${path}: largeFileErrorTokens must not be smaller than largeFileWarningTokens`);
  }
}

function requirePositive(value: number, field: string, path: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${path}: ${field} must be a positive number`);
  }
}
