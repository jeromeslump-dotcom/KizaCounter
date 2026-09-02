import type { Combat, Hero } from "../types";
import {
  analyzeCore4Plus1,
  findBestCore4,
} from "./historicalCore4";
import {
  evaluateEnemyClassHistory,
  findBestHistoricalTeam,
  recommendTeam,
} from "./scoring";
import { getEngineSettings } from "./engineSettings";

export type RecommendationSource =
  | "exact-history"
  | "class-history"
  | "core4"
  | "counter-usage"
  | "fallback";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

function sameTeam(first: Hero[], second: Hero[]): boolean {
  const a = first.map((hero) => hero.id).sort().join("|");
  const b = second.map((hero) => hero.id).sort().join("|");
  return a === b;
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): TeamRecommendation {
  const team = recommendTeam(enemyIds, heroes, combats);

  if (team.length !== 5) {
    return { team, source: "fallback" };
  }

  const exact = findBestHistoricalTeam(enemyIds, combats, heroes);

  if (exact && exact.length === 5 && sameTeam(team, exact)) {
    return { team, source: "exact-history" };
  }

  const classHistory = evaluateEnemyClassHistory(
    team.map((hero) => hero.id),
    enemyIds,
    combats,
    heroes
  );

  if (classHistory.battles > 0 && classHistory.wins > 0) {
    return { team, source: "class-history" };
  }

  const settings = getEngineSettings();
  const bestCore4 = findBestCore4(enemyIds, combats, settings);

  if (
    bestCore4 &&
    bestCore4.coreIds.every((id) => team.some((hero) => hero.id === id))
  ) {
    return { team, source: "core4" };
  }

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  if (
    core4Analyses.some(
      (core) =>
        core.coreIds.length === 4 &&
        core.coreIds.every((id) => team.some((hero) => hero.id === id)) &&
        core.battles > 0
    )
  ) {
    return { team, source: "core4" };
  }

  return { team, source: "counter-usage" };
}

export function recommendationSourceLabel(source: RecommendationSource): string {
  switch (source) {
    case "exact-history":
      return "Historique exact";
    case "class-history":
      return "Historique classes";
    case "core4":
      return "Core4 historique";
    case "counter-usage":
      return "Counter usage / score";
    case "fallback":
      return "Fallback";
  }
}
