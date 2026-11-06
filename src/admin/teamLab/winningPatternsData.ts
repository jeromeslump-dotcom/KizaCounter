import winningPatterns from "../../../data/winning-patterns.json";
import type { MetricKey, ZoneRow } from "./teamLabData";

export const zoneSummary = winningPatterns.zoneSummary as Record<MetricKey, ZoneRow[]>;

export const heroPlayedCount = new Map<string, number>();
for (const formation of winningPatterns.formations.all) {
  for (const heroId of formation.heroes) {
    heroPlayedCount.set(heroId, (heroPlayedCount.get(heroId) ?? 0) + formation.observations);
  }
}
