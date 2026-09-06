import type { Combat, Hero } from "../types";
import {
  recommendTeam,
  type RecommendationSource as ScoringRecommendationSource,
} from "./scoring";
import { getEngineSettings } from "./engineSettings";
import { findBestHistoricalDefeatTeam } from "./defeatHistory";
import { sameTeam, teamKey, uniqueIds } from "./teamUtils";

export type RecommendationSource =
  | ScoringRecommendationSource
  | "similar-history"
  | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const CORE_SIZE = 4;
const MIN_SIMILARITY = 3;

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
    .filter(
      (candidate) =>
        candidate.wins > 0 && candidate.wins >= candidate.losses
    )
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
      sameTeam(historicalEnemy, enemyIds) &&
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
      return sharedHeroes === MIN_SIMILARITY
        ? sharedHeroes / TEAM_SIZE
        : null;
    },
    true
  );
}

/**
 * CORE4 historique :
 * - l'ennemi historique partage exactement 4/5 héros avec l'ennemi actuel ;
 * - on conserve 4 héros de l'équipe historique gagnante ;
 * - le 5e héros est choisi parmi les remplacements historiques du même Core4.
 */
function findBestEnabledCore4HistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetIds = uniqueIds(enemyIds);
  if (targetIds.length !== TEAM_SIZE) return null;

  const targetSet = new Set(targetIds);
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const coreCandidates = new Map<
    string,
    {
      coreIds: string[];
      wins: number;
      losses: number;
      replacements: Map<string, { wins: number; losses: number }>;
    }
  >();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;

    const sharedHeroes = historicalEnemy.filter((id) =>
      targetSet.has(id)
    ).length;
    if (sharedHeroes !== CORE_SIZE) continue;

    const historicalTeam = uniqueIds(combat.my_heroes ?? []);
    if (
      historicalTeam.length !== TEAM_SIZE ||
      !historicalTeam.every((id) => enabledIds.has(id))
    ) {
      continue;
    }

    const teamKeyValue = teamKey(historicalTeam);
    if (teamKeyValue === excludedTeamKey) continue;

    for (let index = 0; index < historicalTeam.length; index++) {
      const coreIds = historicalTeam.filter(
        (_, currentIndex) => currentIndex !== index
      );
      const replacement = historicalTeam[index];
      const key = teamKey(coreIds);
      const accumulator = coreCandidates.get(key) ?? {
        coreIds,
        wins: 0,
        losses: 0,
        replacements: new Map<string, { wins: number; losses: number }>(),
      };

      if (combat.won) accumulator.wins++;
      else accumulator.losses++;

      const replacementStats = accumulator.replacements.get(replacement) ?? {
        wins: 0,
        losses: 0,
      };
      if (combat.won) replacementStats.wins++;
      else replacementStats.losses++;
      accumulator.replacements.set(replacement, replacementStats);
      coreCandidates.set(key, accumulator);
    }
  }

  const confidenceBattles = Math.max(
    1,
    getEngineSettings().advanced.core4ConfidenceBattles
  );

  const rankedCores = [...coreCandidates.values()]
    .filter((core) => core.wins > 0 && core.wins >= core.losses)
    .map((core) => {
      const battles = core.wins + core.losses;
      const confidence = battles / (battles + confidenceBattles);
      const score = (core.wins / battles) * confidence;
      return { core, score, battles };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.core.wins - a.core.wins ||
        teamKey(a.core.coreIds).localeCompare(teamKey(b.core.coreIds))
    );

  for (const rankedCore of rankedCores) {
    const replacement = [...rankedCore.core.replacements.entries()]
      .filter(([, stats]) => stats.wins > 0 && stats.wins >= stats.losses)
      .map(([heroId, stats]) => {
        const battles = stats.wins + stats.losses;
        const confidence = battles / (battles + confidenceBattles);
        const score = (stats.wins / battles) * confidence;
        return { heroId, score, battles, wins: stats.wins };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.battles - a.battles ||
          b.wins - a.wins ||
          a.heroId.localeCompare(b.heroId)
      )[0];

    if (!replacement) continue;

    const teamIds = [...rankedCore.core.coreIds, replacement.heroId];
    if (teamIds.length !== TEAM_SIZE) continue;
    const key = teamKey(teamIds);
    if (key === excludedTeamKey) continue;

    const team = resolveCandidateTeam(teamIds, candidateHeroes);
    if (team) return team;
  }

  return null;
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

  return orderHistoricalCandidates(candidates)[0]
    ? resolveCandidateTeam(
        orderHistoricalCandidates(candidates)[0].heroIds,
        candidateHeroes
      )
    : null;
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

  // 1. EXACT : 5/5 héros communs.
  const exactHistoryTeam = findBestEnabledExactHistoryTeam(
    enemyIds,
    candidateHeroes,
    combats
  );
  if (exactHistoryTeam)
    return { team: exactHistoryTeam, source: "exact-history" };

  // 1.5. DÉFAITE EXACTE : même ennemi exact, mais retrouvé via les
  // combats où cette équipe ennemie a perdu.
  const defeatHistoryTeam = findBestHistoricalDefeatTeam(
    enemyIds,
    combats,
    candidateHeroes
  );
  if (defeatHistoryTeam)
    return { team: defeatHistoryTeam, source: "defeat-history" };

  // 2. CORE4 : exactement 4/5 héros ennemis communs, on conserve un
  // Core4 historique et on choisit son meilleur 5e héros.
  const core4HistoryTeam = findBestEnabledCore4HistoryTeam(
    enemyIds,
    candidateHeroes,
    combats
  );
  if (core4HistoryTeam)
    return { team: core4HistoryTeam, source: "core4" };

  // 3. SIMILAIRE : exactement 3/5 héros ennemis communs.
  const similarHistoryTeam = findBestEnabledSimilarHistoryTeam(
    enemyIds,
    candidateHeroes,
    combats
  );
  if (similarHistoryTeam)
    return { team: similarHistoryTeam, source: "similar-history" };

  // 4. CLASSE : même composition STR/AGI/INT.
  const historicalClassTeam = findBestEnabledClassHistoryTeam(
    enemyIds,
    heroes,
    candidateHeroes,
    combats
  );
  if (historicalClassTeam)
    return { team: historicalClassTeam, source: "class-history" };

  // 5. SCORING / FALLBACK.
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
