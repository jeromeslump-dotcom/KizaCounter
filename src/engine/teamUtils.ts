export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function teamKey(ids: string[]): string {
  return [...new Set(ids)].sort().join("|");
}

export function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}
