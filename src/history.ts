import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";

export type HistoryRecord = {
  ts: string;
  cwd: string;
  projectName: string;
  filesAnalyzed: number;
  alwaysOnTokens: number;
  estimatedWasteTokens: number;
  findingCount: number;
};

const historyDir = join(homedir(), ".dietoken");
const historyFile = join(historyDir, "history.jsonl");

export function appendHistory(record: HistoryRecord, limit = 500): void {
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
  appendFileSync(historyFile, JSON.stringify(record) + "\n", "utf8");
  trimHistory(limit);
}

function trimHistory(limit: number): void {
  if (limit <= 0) {
    return;
  }

  const lines = readFileSync(historyFile, "utf8").split("\n").filter(Boolean);
  if (lines.length <= limit) {
    return;
  }

  writeFileSync(historyFile, lines.slice(-limit).join("\n") + "\n", "utf8");
}

export function readHistory(): HistoryRecord[] {
  if (!existsSync(historyFile)) return [];
  return readFileSync(historyFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as HistoryRecord;
      } catch {
        return null;
      }
    })
    .filter(isUsable);
}

function isUsable(record: HistoryRecord | null): record is HistoryRecord {
  if (record === null || typeof record !== "object") {
    return false;
  }

  return (
    typeof record.projectName === "string" &&
    isCount(record.filesAnalyzed) &&
    isCount(record.alwaysOnTokens) &&
    isCount(record.estimatedWasteTokens) &&
    isCount(record.findingCount)
  );
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function makeRecord(cwd: string, summary: {
  files: { length: number };
  alwaysOnTokens: number;
  estimatedWasteTokens: number;
  findings: { length: number };
}): HistoryRecord {
  return {
    ts: new Date().toISOString(),
    cwd,
    projectName: basename(cwd),
    filesAnalyzed: summary.files.length,
    alwaysOnTokens: summary.alwaysOnTokens,
    estimatedWasteTokens: summary.estimatedWasteTokens,
    findingCount: summary.findings.length,
  };
}
