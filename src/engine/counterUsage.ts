import type { Hero } from "../data/heroes";
import type { Combat } from "../types";
import { getEngineSettings } from "./engineSettings";
import { historicalConfidence } from "./historicalScoring";
import { sameTeam } from "./teamUtils";

export interface CounterUsageStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export function calculateCounterUsage(
  enemyIds: string[],
  combats: Combat[]
): Record<string, CounterUsageStats> {
  const result: Record<string, CounterUsageStats> = {};

  for (const combat of combats) {
    if (!sameTeam(enemyIds, combat.enemy_heroes ?? [])) continue;

    for (const heroId of combat.my_heroes ?? []) {
      result[heroId] ??= {
        wins: 0,
        losses: 0,
        total: 0,
        winRate: 0,
      };

      result[heroId].total++;
      combat.won ? result[heroId].wins++ : result[heroId].losses++;
    }
  }

  for (const entry of Object.values(result)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return result;
}

export function counterHeroScore(
  hero: Hero,
  counterUsage: Record<string, CounterUsageStats>
): number {
  const settings = getEngineSettings();
  const counter = counterUsage[hero.id];

  if (!counter || counter.total <= 0) return 0;

  const confidence = historicalConfidence(
    counter.total,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  return (
    counter.winRate *
    confidence *
    settings.advanced.teamACounterWinRateMultiplier *
    settings.teamA.specificHistoryWeight
  );
}
