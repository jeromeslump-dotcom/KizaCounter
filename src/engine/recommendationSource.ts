import type { Combat, Hero } from "../types";
import {
  collectHistoricalCandidates,
  orderHistoricalCandidates,
} from "./historicalScoring";

import { findBestHistoricalDefeatTeam } from "./defeatHistory";
import {
  findBestEnabledCore4HistoryTeam,
  type Core4HistoryStats,
} from "./recommendationCore4";
import { isUsableRecommendationTeam } from "./recommendationGuards";
import {
  getClassKey,
  resolveTeamFromIds,
  SIMILAR_HISTORY_SHARED_HEROES,
  teamKey,
  uniqueIds,
} from "./teamUtils";
import { RECOMMENDATION_SOURCE_LABELS } from "./recommendationLabels";

export type RecommendationSource =
  | "exact-history"
  | "class-history"
  | "core4"
  | "fallback"
  | "similar-history"
  | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
  core4History?: Core4HistoryStats;
}

const TEAM_SIZE = 5;
const MIN_SIMILARITY = SIMILAR_HISTORY_SHARED_HEROES;

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

function findBestEnabledGlobalWinTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));

  const candidates = [...collectHistoricalCandidates(combats).values()]
    .filter((candidate) => {
      if (candidate.wins <= 0) return false;
      if (!candidate.heroIds.every((id) => enabledIds.has(id))) return false;
      if (teamKey(candidate.heroIds) === excludedTeamKey) return false;
      return true;
    })
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.losses - a.losses ||
        teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
    );

  for (const candidate of candidates) {
    const team = resolveTeamFromIds(candidate.heroIds, candidateHeroesById);

    if (team && isUsableRecommendationTeam(team, combats, enemyIds)) {
      return team;
    }
  }

  return null;
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  candidateHeroes: Hero[] = heroes,
  excludedTeamKey?: string
): TeamRecommendation {
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const candidateHeroesById = new Map(
    candidateHeroes.map((hero) => [hero.id, hero])
  );

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

  let core4History: Core4HistoryStats | undefined;

  const core4HistoryTeam = findBestEnabledCore4HistoryTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey,
    (stats) => {
      core4History = stats;
    }
  );

  if (core4HistoryTeam)
    return {
      team: core4HistoryTeam,
      source: "core4",
      core4History,
    };

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

  const globalWinTeam = findBestEnabledGlobalWinTeam(
    enemyIds,
    candidateHeroes,
    candidateHeroesById,
    combats,
    excludedTeamKey
  );

  return {
    team: globalWinTeam ?? [],
    source: "fallback",
  };
}

export function findHistoricalAlternativeRecommendation(
  enemyIds: string[],
  heroes: Hero[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamIds: string[]
): TeamRecommendation | null {
  const excludedKey = teamKey(excludedTeamIds);

  const recommendation = recommendTeamWithSource(
    enemyIds,
    heroes,
    combats,
    candidateHeroes,
    excludedKey
  );

  return recommendation.team.length === TEAM_SIZE ? recommendation : null;
}

export function recommendationSourceLabel(
  source: RecommendationSource
): string {
  switch (source) {
    case "exact-history":
      return RECOMMENDATION_SOURCE_LABELS.exact;
    case "class-history":
      return RECOMMENDATION_SOURCE_LABELS.class;
    case "similar-history":
      return RECOMMENDATION_SOURCE_LABELS.similar;
    case "defeat-history":
      return RECOMMENDATION_SOURCE_LABELS.defeat;
    case "core4":
      return RECOMMENDATION_SOURCE_LABELS.core4;
    case "fallback":
      return RECOMMENDATION_SOURCE_LABELS.fallback;
  }
}
