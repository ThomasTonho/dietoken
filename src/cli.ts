#!/usr/bin/env node
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { scanProject } from "./commands/scan.js";
import { writePlan } from "./commands/plan.js";
import { formatScan } from "./report/console.js";
import { formatGain } from "./report/gain.js";
import { appendHistory, makeRecord, readHistory } from "./history.js";

type ParsedArgs = {
  command: "scan" | "plan" | "gain" | "help" | "version";
  cwd: string;
  json: boolean;
  includeUserFiles: boolean;
};

const version = "0.1.0";

main();

function main(): void {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.command === "help") {
      process.stdout.write(helpText());
      return;
    }

    if (args.command === "version") {
      process.stdout.write(`${version}\n`);
      return;
    }

    const config = loadConfig(args.cwd);
    const summary = scanProject(
      {
        cwd: args.cwd,
        includeUserFiles: args.includeUserFiles
      },
      config
    );

    if (args.command === "gain") {
      const history = readHistory();
      if (args.json) {
        process.stdout.write(`${JSON.stringify({ summary, history }, null, 2)}\n`);
      } else {
        process.stdout.write(formatGain(summary, history));
      }
      return;
    }

    if (args.command === "scan") {
      appendHistory(makeRecord(args.cwd, summary));
      if (args.json) {
        process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
      } else {
        process.stdout.write(formatScan(summary));
      }
      return;
    }

    const outPath = writePlan(args.cwd, summary);
    if (args.json) {
      process.stdout.write(`${JSON.stringify({ path: outPath, summary }, null, 2)}\n`);
    } else {
      process.stdout.write(`Wrote ${outPath}\n`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`dietoken: ${message}\n`);
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const [first, ...rest] = argv;

  if (first === "--help" || first === "-h") {
    return base("help");
  }

  if (first === "--version" || first === "-v") {
    return base("version");
  }

  const command = first && !first.startsWith("-") ? first : "scan";
  const flags = first && first.startsWith("-") ? argv : rest;

  if (command === "help") {
    return base("help");
  }

  if (command === "version") {
    return base("version");
  }

  if (command !== "scan" && command !== "plan" && command !== "gain") {
    throw new Error(`unknown command "${command}"`);
  }

  let cwd = process.cwd();
  let json = false;
  let includeUserFiles = false;

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    if (flag === "--json") {
      json = true;
    } else if (flag === "--include-user") {
      includeUserFiles = true;
    } else if (flag === "--cwd") {
      const value = flags[index + 1];
      if (!value) {
        throw new Error("--cwd requires a path");
      }
      cwd = resolve(value);
      index += 1;
    } else {
      throw new Error(`unknown option "${flag}"`);
    }
  }

  return {
    command,
    cwd,
    json,
    includeUserFiles
  };
}

function base(command: ParsedArgs["command"]): ParsedArgs {
  return {
    command,
    cwd: process.cwd(),
    json: false,
    includeUserFiles: false
  };
}

function helpText(): string {
  return `Dietoken

Kill wasted tokens. Keep better context.

Usage:
  dietoken gain [--json] [--include-user] [--cwd <path>]
  dietoken scan [--json] [--include-user] [--cwd <path>]
  dietoken plan [--json] [--include-user] [--cwd <path>]

Commands:
  gain     Show token waste analytics and savings summary
  scan     Analyze Codex and Claude Code context files in detail
  plan     Write .dietoken/plan.md with optimization suggestions

Options:
  --json          Print JSON
  --include-user  Include user-level ~/.codex and ~/.claude files
  --cwd <path>    Analyze another directory
  -h, --help      Show help
  -v, --version   Show version
`;
}
