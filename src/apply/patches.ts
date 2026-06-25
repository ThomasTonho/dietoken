import { join } from "node:path";
import type { ContextFile, Finding } from "../types.js";

export type RemovePatch = {
  kind: "remove";
  startLine: number;
  endLine: number;
  label: string;
  tokensSaved: number;
};

export type ExtractSkillPatch = {
  kind: "extract-skill";
  startLine: number;
  endLine: number;
  skillAbsPath: string;
  skillRelPath: string;
  skillContent: string;
  label: string;
  tokensSaved: number;
};

export type Patch = RemovePatch | ExtractSkillPatch;

const FIXABLE_CODES = new Set(["vague-rule", "duplicate-guidance", "workflow-in-always-on"]);

export function canFix(finding: Finding): boolean {
  return FIXABLE_CODES.has(finding.code) && finding.line !== undefined;
}

export function buildPatches(file: ContextFile, findings: Finding[], cwd: string): Patch[] {
  const lines = file.content.split(/\r?\n/);
  const patches: Patch[] = [];
  const covered = new Set<number>();

  for (const finding of sortByLine(findings)) {
    if (finding.line === undefined) continue;
    const idx = finding.line - 1;
    if (covered.has(idx)) continue;

    if (finding.code === "vague-rule" || finding.code === "duplicate-guidance") {
      const verb = finding.code === "vague-rule" ? "remove vague rule" : "remove duplicate";
      patches.push({
        kind: "remove",
        startLine: finding.line,
        endLine: finding.line,
        label: `${verb}: "${snippet(lines[idx])}"`,
        tokensSaved: finding.estimatedWasteTokens ?? 0
      });
      covered.add(idx);
    } else if (finding.code === "workflow-in-always-on") {
      const section = findMarkdownSection(lines, idx);

      if (section === undefined) {
        patches.push({
          kind: "remove",
          startLine: finding.line,
          endLine: finding.line,
          label: `remove workflow line: "${snippet(lines[idx])}"`,
          tokensSaved: finding.estimatedWasteTokens ?? 0
        });
        covered.add(idx);
        continue;
      }

      let overlap = false;
      for (let i = section.start; i <= section.end; i++) {
        if (covered.has(i)) {
          overlap = true;
          break;
        }
      }
      if (overlap) continue;

      const skillContent = lines.slice(section.start, section.end + 1).join("\n");
      const header = lines[section.start]?.replace(/^#+\s*/, "").trim() ?? "workflow";
      const slug = slugify(header);
      const skillRelPath = `.claude/skills/${slug}/SKILL.md`;
      const skillAbsPath = join(cwd, skillRelPath);

      patches.push({
        kind: "extract-skill",
        startLine: section.start + 1,
        endLine: section.end + 1,
        skillAbsPath,
        skillRelPath,
        skillContent,
        label: `extract "${header}" → ${skillRelPath}`,
        tokensSaved: finding.estimatedWasteTokens ?? 0
      });

      for (let i = section.start; i <= section.end; i++) covered.add(i);
    }
  }

  return patches;
}

export function applyPatches(
  content: string,
  patches: Patch[]
): { newContent: string; skills: { path: string; content: string }[] } {
  const lines = content.split(/\r?\n/);
  const skills: { path: string; content: string }[] = [];

  for (const patch of [...patches].sort((a, b) => b.startLine - a.startLine)) {
    const start = patch.startLine - 1;
    const count = patch.endLine - patch.startLine + 1;

    if (patch.kind === "remove") {
      lines.splice(start, count);
    } else {
      skills.push({ path: patch.skillAbsPath, content: patch.skillContent });
      lines.splice(
        start,
        count,
        `<!-- Moved to ${patch.skillRelPath} — invoke with /skill when needed -->`
      );
    }
  }

  const cleaned: string[] = [];
  let blanks = 0;
  for (const line of lines) {
    if (line.trim() === "") {
      blanks++;
      if (blanks <= 1) cleaned.push(line);
    } else {
      blanks = 0;
      cleaned.push(line);
    }
  }

  return { newContent: cleaned.join("\n"), skills };
}

function findMarkdownSection(
  lines: string[],
  lineIdx: number
): { start: number; end: number } | undefined {
  let headerIdx: number | undefined;
  let headerLevel = 0;

  for (let i = lineIdx; i >= 0; i--) {
    const match = lines[i]?.match(/^(#{1,6})\s/);
    if (match) {
      headerIdx = i;
      headerLevel = match[1].length;
      break;
    }
  }

  if (headerIdx === undefined) return undefined;

  let end = lines.length - 1;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const match = lines[i]?.match(/^(#{1,6})\s/);
    if (match && match[1].length <= headerLevel) {
      end = i - 1;
      while (end > headerIdx && !lines[end]?.trim()) end--;
      break;
    }
  }

  return { start: headerIdx, end };
}

function sortByLine(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
}

function snippet(line: string | undefined): string {
  return (line ?? "").trim().slice(0, 50);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}
