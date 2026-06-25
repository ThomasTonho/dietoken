export function estimateTokens(input: string): number {
  const normalized = input.trim();
  if (!normalized) {
    return 0;
  }

  const units = normalized.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g);
  if (!units) {
    return 0;
  }

  return units.length;
}
