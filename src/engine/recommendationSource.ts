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
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { findBestEnabledCore4HistoryTeam } from "./recommendationCore4";
import { getClassKey, teamKey, uniqueIds } from "./teamUtils";

export type RecommendationSource =
  ScoringRecommendationSource | "similar-history" | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const MIN_SIMILARITY = 3;

function resolveCandidateTeam(
  heroIds: string[],
  candidateHeroesById: Map<string, Hero>
): Hero[] | null {
  const team = heroIds
    .map((id) => candidateHeroesById.get(id))
    .filter((hero): hero is Hero => Boolean(hero));
  return team.length === TEAM_SIZE ? team : null;
}

/**
 * A team that has already been played but has never won must never be
 * proposed again, regardless of which recommendation source selected it.
 * An unseen team is still allowed: 0 battles is not a 0% historical record.
 */
function isHistoricallyWinlessTeam(team: Hero[], combats: Combat[]): boolean {
  if (team.length !== TEAM_SIZE) return false;

  const key = teamKey(team.map((hero) => hero.id));
  let battles = 0;
  let wins = 0;

  for (const combat of combats) {
    if (teamKey(uniqueIds(combat.my_heroes ?? [])) !== key) continue;
    battles++;
    if (combat.won) wins++;
  }

  return battles > 0 && wins === 0;
}

/**
 * A team that has already faced this exact enemy team and never beaten it
 * must not be recommended against that enemy, even if it has wins elsewhere.
 */
function isHistoricallyWinlessAgainstEnemy(
  team: Hero[],
  enemyIds: string[],
  combats: Combat[]
): boolean {
  if (team.length !== TEAM_SIZE || uniqueIds(enemyIds).length !== TEAM_SIZE) {
    return false;
  }

  const teamKeyValue = teamKey(team.map((hero) => hero.id));
  const enemyKeyValue = teamKey(uniqueIds(enemyIds));
  let battles = 0;
  let wins = 0;

  for (const combat of combats) {
    if (teamKey(uniqueIds(combat.my_heroes ?? [])) !== teamKeyValue) continue;
    if (teamKey(uniqueIds(combat.enemy_heroes ?? [])) !== enemyKeyValue) {
      continue;
    }
    battles++;
    if (combat.won) wins++;
  }

  return battles > 0 && wins === 0;
}

function isUsableRecommendationTeam(
  team: Hero[],
  combats: Combat[],
  enemyIds: string[]
): boolean {
  return (
    team.length === TEAM_SIZE &&
    !isHistoricallyWinlessTeam(team, combats) &&
    !isHistoricallyWinlessAgainstEnemy(team, enemyIds, combats)
  );
}

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

  const enabledCandidates = [...historicalCandidates.values()].filter(
    (candidate) =>
      candidate.heroIds.every((id) => enabledIds.has(id)) &&
      teamKey(candidate.heroIds) !== excludedTeamKey
  );

  for (const candidate of orderHistoricalCandidates(
    enabledCandidates,
    sortBySimilarity
  )) {
    const team = resolveCandidateTeam(candidate.heroIds, candidateHeroesById);
    if (team && isUsableRecommendationTeam(team, combats, enemyIds))
      return team;
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

function findScoringAlternative(
  enemyIds: string[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey: string
): Hero[] | null {
  const scoringTeam = recommendTeam(enemyIds, candidateHeroes, combats);
  if (
    isUsableRecommendationTeam(scoringTeam, combats, enemyIds) &&
    teamKey(scoringTeam.map((hero) => hero.id)) !== excludedTeamKey
  ) {
    return scoringTeam;
  }

  const counterUsage = calculateCounterUsage(enemyIds, combats);
  const ranked = candidateHeroes
    .map((hero) => ({ hero, score: counterHeroScore(hero, counterUsage) }))
    .sort(
      (a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  if (ranked.length < TEAM_SIZE) return null;

  const base = ranked.slice(0, TEAM_SIZE).map((entry) => entry.hero);
  const replacements = ranked.slice(TEAM_SIZE);

  for (let index = 0; index < TEAM_SIZE; index++) {
    for (const replacement of replacements) {
      const candidate = [...base];
      candidate[index] = replacement.hero;
      const candidateIds = candidate.map((hero) => hero.id);
      if (new Set(candidateIds).size !== TEAM_SIZE) continue;
      if (teamKey(candidateIds) === excludedTeamKey) continue;
      if (!isUsableRecommendationTeam(candidate, combats, enemyIds)) continue;
      return candidate;
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
  const team = excludedTeamKey
    ? findScoringAlternative(
        enemyIds,
        candidateHeroes,
        combats,
        excludedTeamKey
      )
    : recommendTeam(enemyIds, candidateHeroes, combats, (detectedSource) => {
        source = detectedSource;
      });
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
