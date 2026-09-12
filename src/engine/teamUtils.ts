import type { Hero } from "../data/heroes";

const TEAM_SIZE = 5;

export function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export function teamKey(ids: string[]): string {
  return [...new Set(ids)].sort().join("|");
}

export function getClassKey(
  ids: string[],
  heroesById: Map<string, Hero>
): string | null {
  let agi = 0,
    int = 0,
    str = 0;
  for (const id of ids) {
    const cls = heroesById.get(id)?.cls;
    if (cls === "AGI") agi++;
    else if (cls === "INT") int++;
    else if (cls === "STR") str++;
    else return null;
  }
  if (agi + int + str !== TEAM_SIZE) return null;
  return [
    ...Array(agi).fill("AGI"),
    ...Array(int).fill("INT"),
    ...Array(str).fill("STR"),
  ].join("|");
}
