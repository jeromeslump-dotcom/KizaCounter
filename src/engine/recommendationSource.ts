import type { Combat, Hero } from "../types";
import { recommendTeam, type RecommendationSource } from "./scoring";

export type { RecommendationSource } from "./scoring";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): TeamRecommendation {
  let source: RecommendationSource = "fallback";

  const team = recommendTeam(enemyIds, heroes, combats, (detectedSource) => {
    source = detectedSource;
  });

  return {
    team,
    source,
  };
}

export function recommendationSourceLabel(
  source: RecommendationSource
): string {
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
