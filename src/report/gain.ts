import type { HistoryRecord } from "../history.js";
import type { ScanSummary } from "../types.js";

export function formatGain(summary: ScanSummary, history: HistoryRecord[]): string {
  if (history.length > 0) {
    return formatHistoricalGain(history, summary);
  }
  return formatCurrentGain(summary);
}

// ─── historical view (2+ scans recorded) ────────────────────────────────────

function formatHistoricalGain(history: HistoryRecord[], current: ScanSummary): string {
  const width = 68;
  const lines: string[] = [];

  // group by project (cwd)
  const byProject = new Map<string, HistoryRecord[]>();
  for (const r of history) {
    const existing = byProject.get(r.cwd) ?? [];
    existing.push(r);
    byProject.set(r.cwd, existing);
  }

  const totalScans = history.length;
  const totalProjects = byProject.size;
  const totalWasteIdentified = history.reduce((s, r) => s + r.estimatedWasteTokens, 0);

  lines.push("Dietoken — Savings Report");
  lines.push("═".repeat(width));
  lines.push("");
  lines.push(`  Total scans        ${totalScans}`);
  lines.push(`  Projects tracked   ${totalProjects}`);
  if (totalWasteIdentified > 0) {
    lines.push(`  Waste identified   ${fmt(totalWasteIdentified)} tokens (cumulative across all scans)`);
  }
  lines.push("");

  // per-project table
  type ProjectRow = {
    name: string;
    scans: number;
    firstTokens: number;
    lastTokens: number;
    saved: number;
  };

  const rows: ProjectRow[] = [];
  for (const [, records] of byProject) {
    const sorted = [...records].sort((a, b) => a.ts.localeCompare(b.ts));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    rows.push({
      name: first.projectName,
      scans: records.length,
      firstTokens: first.alwaysOnTokens,
      lastTokens: last.alwaysOnTokens,
      saved: first.alwaysOnTokens - last.alwaysOnTokens,
    });
  }

  rows.sort((a, b) => b.saved - a.saved);

  lines.push("By Project");
  lines.push("─".repeat(width));
  lines.push(
    padRight("  #  Project", 28) +
      padLeft("Scans", 7) +
      padLeft("First scan", 13) +
      padLeft("Now", 12) +
      padLeft("Saved", 14)
  );
  lines.push("─".repeat(width));

  rows.forEach((row, i) => {
    const savedStr =
      row.saved > 0
        ? `−${fmt(row.saved)} tok  ▼${pct(row.saved, row.firstTokens)}%`
        : row.saved < 0
          ? `+${fmt(Math.abs(row.saved))} tok  ▲${pct(Math.abs(row.saved), row.firstTokens)}%`
          : "—";

    lines.push(
      padRight(`  ${i + 1}.  ${truncate(row.name, 20)}`, 28) +
        padLeft(String(row.scans), 7) +
        padLeft(`${fmt(row.firstTokens)} tok`, 13) +
        padLeft(`${fmt(row.lastTokens)} tok`, 12) +
        "  " +
        savedStr
    );
  });

  lines.push("─".repeat(width));
  lines.push("");

  // current project snapshot
  if (current.alwaysOnTokens > 0) {
    const wastePercent = ((current.estimatedWasteTokens / current.alwaysOnTokens) * 100).toFixed(1);
    const wasteBar = buildBar(current.estimatedWasteTokens / current.alwaysOnTokens * 100, 20);
    lines.push("Current directory");
    lines.push("─".repeat(width));
    lines.push(`  Always-on tokens  ${fmt(current.alwaysOnTokens)}`);
    lines.push(`  Wasted tokens     ${fmt(current.estimatedWasteTokens)} (${wastePercent}%)`);
    lines.push(`  Waste meter       ${wasteBar}  ${wastePercent}%`);
    lines.push("─".repeat(width));
    lines.push("");
  }

  lines.push(`  Run "dietoken scan" to update your project's record.`);
  lines.push("");

  return lines.join("\n");
}

// ─── first-run / no history ──────────────────────────────────────────────────

function formatCurrentGain(summary: ScanSummary): string {
  const { files, findings, alwaysOnTokens, estimatedWasteTokens } = summary;

  const wastePercent = alwaysOnTokens > 0 ? (estimatedWasteTokens / alwaysOnTokens) * 100 : 0;
  const bar = buildBar(wastePercent, 24);

  const lines: string[] = [];
  const width = 60;

  lines.push("Dietoken — Token Waste Report");
  lines.push("═".repeat(width));
  lines.push("");
  lines.push(`  Files analyzed    ${files.length}`);
  lines.push(`  Always-on tokens  ${fmt(alwaysOnTokens)}`);
  lines.push(`  Wasted tokens     ${fmt(estimatedWasteTokens)} (${wastePercent.toFixed(1)}%)`);
  lines.push(`  Waste meter       ${bar}  ${wastePercent.toFixed(1)}%`);
  lines.push("");

  type Row = { code: string; count: number; wasted: number };
  const byCode = new Map<string, Row>();
  for (const f of findings) {
    const waste = f.estimatedWasteTokens ?? 0;
    const existing = byCode.get(f.code);
    if (existing) {
      existing.count += 1;
      existing.wasted += waste;
    } else {
      byCode.set(f.code, { code: f.code, count: 1, wasted: waste });
    }
  }

  const rows = [...byCode.values()].sort((a, b) => b.wasted - a.wasted);

  if (rows.length > 0) {
    lines.push("By Finding");
    lines.push("─".repeat(width));
    lines.push(
      padRight("  #  Finding", 38) +
        padLeft("Count", 7) +
        padLeft("Wasted", 9) +
        padLeft("Share", 8)
    );
    lines.push("─".repeat(width));

    rows.forEach((row, i) => {
      const share = estimatedWasteTokens > 0 ? (row.wasted / estimatedWasteTokens) * 100 : 0;
      lines.push(
        padRight(`  ${i + 1}.  ${row.code}`, 38) +
          padLeft(String(row.count), 7) +
          padLeft(fmt(row.wasted), 9) +
          padLeft(`${share.toFixed(1)}%`, 8)
      );
    });

    lines.push("─".repeat(width));
    lines.push("");
  }

  const alwaysOnFiles = [...files]
    .filter((f) => f.alwaysOn)
    .sort((a, b) => b.tokenEstimate - a.tokenEstimate)
    .slice(0, 5);

  if (alwaysOnFiles.length > 0) {
    lines.push("Top always-on files");
    lines.push("─".repeat(width));
    alwaysOnFiles.forEach((file, i) => {
      const fileBar = buildBar((file.tokenEstimate / alwaysOnTokens) * 100, 12);
      lines.push(
        padRight(`  ${i + 1}.  ${truncatePath(file.relativePath, 30)}`, 38) +
          padLeft(`${fmt(file.tokenEstimate)} tokens`, 16) +
          `  ${fileBar}`
      );
    });
    lines.push("─".repeat(width));
  }

  lines.push("");
  if (estimatedWasteTokens === 0) {
    lines.push("  No token waste detected. Context looks clean.");
    lines.push("  Run \"dietoken scan\" to record this baseline and start tracking savings.");
  } else {
    lines.push(`  Run "dietoken scan" for per-finding details.`);
    lines.push(`  Run "dietoken plan" for a step-by-step optimization plan.`);
  }
  lines.push("");

  return lines.join("\n");
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildBar(percent: number, width: number): string {
  const filled = Math.round((Math.min(percent, 100) / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(part: number, total: number): string {
  return total > 0 ? ((part / total) * 100).toFixed(0) : "0";
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : " ".repeat(len - s.length) + s;
}

function truncate(s: string, maxLen: number): string {
  return s.length <= maxLen ? s : s.slice(0, maxLen - 1) + "…";
}

function truncatePath(p: string, maxLen: number): string {
  if (p.length <= maxLen) return p;
  return "…" + p.slice(-(maxLen - 1));
}
