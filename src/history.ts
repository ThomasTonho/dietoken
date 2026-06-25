import { existsSync, mkdirSync, appendFileSync, readFileSync } from "node:fs";
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

export function appendHistory(record: HistoryRecord): void {
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }
  appendFileSync(historyFile, JSON.stringify(record) + "\n", "utf8");
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
    .filter((r): r is HistoryRecord => r !== null);
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
