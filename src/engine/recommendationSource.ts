import type { Combat, Hero } from "../types";
import {
  collectHistoricalCandidates,
  orderHistoricalCandidates,
} from "./historicalScoring";
import {
  recommendTeam,
  type RecommendationSource as ScoringRecommendationSource,
} from "./scoring";
import { findBestHistoricalDefeatTeam } from "./defeatHistory";
import { findBestEnabledCore4HistoryTeam } from "./recommendationCore4";
import {
  isUsableRecommendationTeam,
} from "./recommendationGuards";
import {
  getClassKey,
  resolveTeamFromIds,
  teamKey,
  uniqueIds,
} from "./teamUtils";

export type RecommendationSource =
  ScoringRecommendationSource | "similar-history" | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const MIN_SIMILARITY = 3;

function findBestEnabledHistoricalTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey: string | undefined,
  matchesHistoricalEnemy: (historicalEnemy: string[]) => number | null,
  sortBySimilarity = false
): Hero[] | null {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const historicalCandidates = collectHistoricalCandidates(
    combats,
    matchesHistoricalEnemy
  );

  const recommendationCandidates = [...historicalCandidates.values()].filter(
    (candidate) => {
      if (!candidate.heroIds.every((id) => enabledIds.has(id))) return false;
      if (teamKey(candidate.heroIds) === excludedTeamKey) return false;
      return true;
    }
  );

  for (const candidate of orderHistoricalCandidates(
    recommendationCandidates,
    sortBySimilarity
  )) {
    const team = resolveTeamFromIds(candidate.heroIds, candidateHeroesById);
    if (team && isUsableRecommendationTeam(team, combats, enemyIds)) {
      return team;
    }
  }

  return null;
}

function findBestEnabledExactHistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetKey = teamKey(enemyIds);
  return findBestEnabledHistoricalTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey,
    (historicalEnemy) =>
      historicalEnemy.length === TEAM_SIZE &&
      teamKey(historicalEnemy) === targetKey
        ? 0
        : null
  );
}

function findBestEnabledSimilarHistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetIds = uniqueIds(enemyIds);
  if (targetIds.length !== TEAM_SIZE) return null;
  const targetSet = new Set(targetIds);

  return findBestEnabledHistoricalTeam(
    targetIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey,
    (historicalEnemy) => {
      if (historicalEnemy.length !== TEAM_SIZE) return null;
      const sharedHeroes = historicalEnemy.filter((id) =>
        targetSet.has(id)
      ).length;
      return sharedHeroes === MIN_SIMILARITY ? sharedHeroes / TEAM_SIZE : null;
    },
    true
  );
}

function findBestEnabledClassHistoryTeam(
  enemyIds: string[],
  heroesById: Map<string, Hero>,
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetClassKey = getClassKey(enemyIds, heroesById);
  if (!targetClassKey) return null;
  return findBestEnabledHistoricalTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey,
    (historicalEnemy) =>
      historicalEnemy.length === TEAM_SIZE &&
      getClassKey(historicalEnemy, heroesById) === targetClassKey
        ? 0
        : null
  );
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  candidateHeroes: Hero[] = heroes,
  excludedTeamKey?: string
): TeamRecommendation {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const candidateHeroesById = new Map(
    candidateHeroes.map((hero) => [hero.id, hero])
  );

  // A et B suivent exactement la même hiérarchie.
  // Pour B, seule la combinaison complète de 5 héros de A est interdite.
  const exactHistoryTeam = findBestEnabledExactHistoryTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey
  );
  if (exactHistoryTeam)
    return { team: exactHistoryTeam, source: "exact-history" };

  const defeatHistoryTeam = findBestHistoricalDefeatTeam(
    enemyIds,
    combats,
    candidateHeroes,
    excludedTeamKey ? excludedTeamKey.split("|") : []
  );
  if (
    defeatHistoryTeam &&
    isUsableRecommendationTeam(defeatHistoryTeam, combats, enemyIds)
  )
    return { team: defeatHistoryTeam, source: "defeat-history" };

  const core4HistoryTeam = findBestEnabledCore4HistoryTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey
  );
  if (core4HistoryTeam) return { team: core4HistoryTeam, source: "core4" };

  const similarHistoryTeam = findBestEnabledSimilarHistoryTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey
  );
  if (similarHistoryTeam)
    return { team: similarHistoryTeam, source: "similar-history" };

  const historicalClassTeam = findBestEnabledClassHistoryTeam(
    enemyIds,
    heroesById,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey
  );
  if (historicalClassTeam)
    return { team: historicalClassTeam, source: "class-history" };

  let source: RecommendationSource = "fallback";
  const team = recommendTeam(
    enemyIds,
    candidateHeroes,
    combats,
    (detectedSource) => {
      source = detectedSource;
    },
    excludedTeamKey
  );
  const validTeam = (team ?? []).filter((hero) => enabledIds.has(hero.id));
  const usableTeam =
    validTeam.length === TEAM_SIZE &&
    isUsableRecommendationTeam(validTeam, combats, enemyIds)
      ? validTeam
      : [];
  return {
    team: usableTeam,
    source: usableTeam.length === TEAM_SIZE ? source : "fallback",
  };
}

export function findHistoricalAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamIds: string[]
): Hero[] | null {
  const excludedKey = teamKey(excludedTeamIds);
  const recommendation = recommendTeamWithSource(
    enemyIds,
    heroes,
    combats,
    candidateHeroes,
    excludedKey
  );
  return recommendation.team.length === TEAM_SIZE ? recommendation.team : null;
}

export function recommendationSourceLabel(
  source: RecommendationSource
): string {
  switch (source) {
    case "exact-history":
      return "Historique exact";
    case "class-history":
      return "Historique classes";
    case "similar-history":
      return "Historique similaire";
    case "defeat-history":
      return "Historique des défaites";
    case "core4":
      return "Core4 historique";
    case "counter-usage":
      return "Counter usage / score";
    case "fallback":
      return "Fallback";
  }
}