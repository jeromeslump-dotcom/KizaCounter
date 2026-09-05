import type { Combat, Hero } from "../types";
import {
  recommendTeam,
  type RecommendationSource as ScoringRecommendationSource,
} from "./scoring";
import { getEngineSettings } from "./engineSettings";
import { findBestHistoricalDefeatTeam } from "./defeatHistory";

export type RecommendationSource =
  | ScoringRecommendationSource
  | "similar-history"
  | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const MIN_SIMILARITY = 3;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}
function teamKey(ids: string[]): string {
  return uniqueIds(ids).sort().join("|");
}

function getClassKey(ids: string[], heroes: Hero[]): string | null {
  const classes = ids
    .map((id) => heroes.find((hero) => hero.id === id)?.cls)
    .filter(
      (cls): cls is Hero["cls"] =>
        cls === "STR" || cls === "AGI" || cls === "INT"
    );
  if (classes.length !== TEAM_SIZE) return null;
  return [...classes].sort().join("|");
}

function historicalReliability(wins: number, losses: number): number {
  const settings = getEngineSettings();
  const battles = wins + losses;
  if (battles <= 0) return 0;
  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );
  const confidence = battles / (battles + confidenceBattles);
  return (
    (wins / battles) *
    (settings.advanced.teamAHistoricalReliabilityBase +
      settings.advanced.teamAHistoricalReliabilityConfidenceWeight * confidence)
  );
}

interface HistoricalCandidate {
  heroIds: string[];
  wins: number;
  losses: number;
  similarity: number;
}

function orderHistoricalCandidates(
  candidates: Map<string, HistoricalCandidate>,
  sortBySimilarity = false
) {
  return [...candidates.values()]
    .filter((candidate) => candidate.wins > 0)
    .sort(
      (a, b) =>
        (sortBySimilarity ? b.similarity - a.similarity : 0) ||
        historicalReliability(b.wins, b.losses) -
          historicalReliability(a.wins, a.losses) ||
        b.wins + b.losses - (a.wins + a.losses) ||
        b.wins - a.wins ||
        teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
    );
}

function resolveCandidateTeam(
  heroIds: string[],
  candidateHeroes: Hero[]
): Hero[] | null {
  const team = heroIds
    .map((id) => candidateHeroes.find((hero) => hero.id === id))
    .filter((hero): hero is Hero => Boolean(hero));
  return team.length === TEAM_SIZE ? team : null;
}

function findBestEnabledHistoricalTeam(
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey: string | undefined,
  matchesHistoricalEnemy: (historicalEnemy: string[]) => number | null,
  sortBySimilarity = false
): Hero[] | null {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<string, HistoricalCandidate>();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    const similarity = matchesHistoricalEnemy(historicalEnemy);
    if (similarity === null) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (
      heroIds.length !== TEAM_SIZE ||
      !heroIds.every((id) => enabledIds.has(id))
    )
      continue;
    const key = teamKey(heroIds);
    if (key === excludedTeamKey) continue;
    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
      similarity: 0,
    };
    candidate.similarity = Math.max(candidate.similarity, similarity);
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  for (const candidate of orderHistoricalCandidates(
    candidates,
    sortBySimilarity
  )) {
    const team = resolveCandidateTeam(candidate.heroIds, candidateHeroes);
    if (team) return team;
  }
  return null;
}

function findBestEnabledExactHistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetKey = teamKey(enemyIds);
  return findBestEnabledHistoricalTeam(
    candidateHeroes,
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
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetIds = uniqueIds(enemyIds);
  if (targetIds.length !== TEAM_SIZE) return null;
  const targetSet = new Set(targetIds);
  return findBestEnabledHistoricalTeam(
    candidateHeroes,
    combats,
    excludedTeamKey,
    (historicalEnemy) => {
      if (historicalEnemy.length !== TEAM_SIZE) return null;
      const sharedHeroes = historicalEnemy.filter((id) =>
        targetSet.has(id)
      ).length;
      return sharedHeroes >= MIN_SIMILARITY && sharedHeroes < TEAM_SIZE
        ? sharedHeroes / TEAM_SIZE
        : null;
    },
    true
  );
}

function findBestEnabledClassHistoryTeam(
  enemyIds: string[],
  heroes: Hero[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetClassKey = getClassKey(enemyIds, heroes);
  if (!targetClassKey) return null;
  return findBestEnabledHistoricalTeam(
    candidateHeroes,
    combats,
    excludedTeamKey,
    (historicalEnemy) =>
      historicalEnemy.length === TEAM_SIZE &&
      getClassKey(historicalEnemy, heroes) === targetClassKey
        ? 0
        : null
  );
}

function findBestHistoricalAlternativeTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey: string
): Hero[] | null {
  const targetEnemyKey = teamKey(enemyIds);
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<string, HistoricalCandidate>();

  for (const combat of combats) {
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (
      heroIds.length !== TEAM_SIZE ||
      !heroIds.every((id) => enabledIds.has(id))
    ) {
      continue;
    }

    const key = teamKey(heroIds);
    if (key === excludedTeamKey) continue;

    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (
      historicalEnemy.length !== TEAM_SIZE ||
      teamKey(historicalEnemy) === targetEnemyKey
    ) {
      continue;
    }

    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
      similarity: 0,
    };

    if (combat.won) candidate.wins++;
    else candidate.losses++;
    candidates.set(key, candidate);
  }

  return (
    orderHistoricalCandidates(candidates)[0]
      ? resolveCandidateTeam(
          orderHistoricalCandidates(candidates)[0].heroIds,
          candidateHeroes
        )
      : null
  );
}

export function findHistoricalAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamIds: string[]
): Hero[] | null {
  void heroes;
  return findBestHistoricalAlternativeTeam(
    enemyIds,
    candidateHeroes,
    combats,
    teamKey(excludedTeamIds)
  );
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  candidateHeroes: Hero[] = heroes
): TeamRecommendation {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const exactHistoryTeam = findBestEnabledExactHistoryTeam(
    enemyIds,
    candidateHeroes,
    combats
  );
  if (exactHistoryTeam)
    return { team: exactHistoryTeam, source: "exact-history" };

  // Proven historical wins take priority over score-only Core4 recommendations.
  const similarHistoryTeam = findBestEnabledSimilarHistoryTeam(
    enemyIds,
    candidateHeroes,
    combats
  );
  if (similarHistoryTeam)
    return { team: similarHistoryTeam, source: "similar-history" };

  // Inverse historical engine: current enemy team was previously our team,
  // and we lost. Reuse the exact opponent team that defeated it.
  const defeatHistoryTeam = findBestHistoricalDefeatTeam(
    enemyIds,
    combats,
    candidateHeroes
  );
  if (defeatHistoryTeam)
    return { team: defeatHistoryTeam, source: "defeat-history" };

  const historicalClassTeam = findBestEnabledClassHistoryTeam(
    enemyIds,
    heroes,
    candidateHeroes,
    combats
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
    }
  );
  const detectedSource = source as ScoringRecommendationSource;
  const validTeam = team.filter((hero) => enabledIds.has(hero.id));
  return {
    team: validTeam.length === TEAM_SIZE ? validTeam : [],
    source: validTeam.length === TEAM_SIZE ? detectedSource : "fallback",
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
