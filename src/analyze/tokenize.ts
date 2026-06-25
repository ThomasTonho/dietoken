export function estimateTokens(input: string): number {
  const normalized = input.trim();
  if (!normalized) {
    return 0;
  }

  const units = normalized.match(/[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu);
  if (!units) {
    return 0;
  }

  return units.length;
}
