import type { ScanSummary } from "../types.js";

export function formatGain(summary: ScanSummary): string {
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

  // --- by finding type ---
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

  // --- top files ---
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
  } else {
    lines.push(`  Run "dietoken scan" for per-finding details.`);
    lines.push(`  Run "dietoken plan" for a step-by-step optimization plan.`);
  }
  lines.push("");

  return lines.join("\n");
}

function buildBar(percent: number, width: number): string {
  const filled = Math.round((Math.min(percent, 100) / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s : " ".repeat(len - s.length) + s;
}

function truncatePath(p: string, maxLen: number): string {
  if (p.length <= maxLen) return p;
  return "…" + p.slice(-(maxLen - 1));
}
