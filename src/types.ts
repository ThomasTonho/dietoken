export type AgentKind = "codex" | "claude";

export type ContextScope = "project" | "user";

export type ContextKind = "instructions" | "skill" | "rule" | "hook" | "config";

export type Severity = "info" | "warning" | "error";

export type ContextFile = {
  agent: AgentKind;
  path: string;
  relativePath: string;
  scope: ContextScope;
  kind: ContextKind;
  alwaysOn: boolean;
  content: string;
  tokenEstimate: number;
};

export type Finding = {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  estimatedWasteTokens?: number;
};

export type ScanSummary = {
  files: ContextFile[];
  findings: Finding[];
  totalTokens: number;
  alwaysOnTokens: number;
  estimatedWasteTokens: number;
};

export type DietokenConfig = {
  largeFileWarningTokens: number;
  largeFileErrorTokens: number;
  includeUserFiles: boolean;
  ignore: string[];
};

export type ScanOptions = {
  cwd: string;
  includeUserFiles: boolean;
};
