import type { Combat, Hero } from "../types";
import {
  recommendTeam,
  type RecommendationSource as ScoringRecommendationSource,
} from "./scoring";
import { getEngineSettings } from "./engineSettings";
import { calculateHistoricalReliability } from "./historicalScoring";
import { findBestHistoricalDefeatTeam } from "./defeatHistory";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
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

interface HistoricalCandidate {
  heroIds: string[];
  wins: number;
  losses: number;
  similarity: number;
}

function orderHistoricalCandidates(
  candidates: Map<string, HistoricalCandidate>,
  sortBySimilarity = false
): HistoricalCandidate[] {
  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  return [...candidates.values()]
    .filter(
      (candidate) =>
        candidate.wins > 0 && candidate.wins >= candidate.losses
    )
    .sort(
      (a, b) =>
        (sortBySimilarity ? b.similarity - a.similarity : 0) ||
        calculateHistoricalReliability(
          b.wins,
          b.losses,
          confidenceBattles,
          settings.advanced.teamAHistoricalReliabilityBase,
          settings.advanced.teamAHistoricalReliabilityConfidenceWeight
        ) -
          calculateHistoricalReliability(
            a.wins,
            a.losses,
            confidenceBattles,
            settings.advanced.teamAHistoricalReliabilityBase,
            settings.advanced.teamAHistoricalReliabilityConfidenceWeight
          ) ||
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
    ) {
      continue;
    }

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

    if (teamKey(historicalTeam) === excludedTeamKey) continue;

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

  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.core4ConfidenceBattles
  );

  const rankedCores = [...coreCandidates.values()]
    .filter((core) => core.wins > 0 && core.wins >= core.losses)
    .map((core) => {
      const battles = core.wins + core.losses;
      return {
        core,
        score: calculateHistoricalReliability(
          core.wins,
          core.losses,
          confidenceBattles,
          0,
          1
        ),
        battles,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.core.wins - a.core.wins ||
        teamKey(a.core.coreIds).localeCompare(teamKey(b.core.coreIds))
    );

  for (const rankedCore of rankedCores) {
    const replacements = [...rankedCore.core.replacements.entries()]
      .filter(([, stats]) => stats.wins > 0 && stats.wins >= stats.losses)
      .map(([heroId, stats]) => {
        const battles = stats.wins + stats.losses;
        return {
          heroId,
          score: calculateHistoricalReliability(
            stats.wins,
            stats.losses,
            confidenceBattles,
            0,
            1
          ),
          battles,
          wins: stats.wins,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.battles - a.battles ||
          b.wins - a.wins ||
          a.heroId.localeCompare(b.heroId)
      );

    for (const replacement of replacements) {
      const teamIds = [...rankedCore.core.coreIds, replacement.heroId];
      if (teamIds.length !== TEAM_SIZE) continue;
      if (teamKey(teamIds) === excludedTeamKey) continue;

      const team = resolveCandidateTeam(teamIds, candidateHeroes);
      if (team) return team;
    }
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

function findScoringAlternative(
  enemyIds: string[],
  candidateHeroes: Hero[],
  combats: Combat[],
  excludedTeamKey: string
): Hero[] | null {
  const scoringTeam = recommendTeam(enemyIds, candidateHeroes, combats);
  if (
    scoringTeam.length === TEAM_SIZE &&
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
  const candidates: Hero[][] = [];

  for (let index = 0; index < TEAM_SIZE; index++) {
    for (const replacement of ranked.slice(TEAM_SIZE)) {
      const candidate = [...base];
      candidate[index] = replacement.hero;
      if (new Set(candidate.map((hero) => hero.id)).size !== TEAM_SIZE) continue;
      if (teamKey(candidate.map((hero) => hero.id)) === excludedTeamKey) continue;
      candidates.push(candidate);
    }
  }

  return candidates[0] ?? null;
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  candidateHeroes: Hero[] = heroes,
  excludedTeamKey?: string
): TeamRecommendation {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));

  // A et B suivent exactement la même hiérarchie.
  // Pour B, seule la combinaison complète de 5 héros de A est interdite.
  const exactHistoryTeam = findBestEnabledExactHistoryTeam(
    enemyIds,
    candidateHeroes,
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
  if (defeatHistoryTeam)
    return { team: defeatHistoryTeam, source: "defeat-history" };

  const core4HistoryTeam = findBestEnabledCore4HistoryTeam(
    enemyIds,
    candidateHeroes,
    combats,
    excludedTeamKey
  );
  if (core4HistoryTeam)
    return { team: core4HistoryTeam, source: "core4" };

  const similarHistoryTeam = findBestEnabledSimilarHistoryTeam(
    enemyIds,
    candidateHeroes,
    combats,
    excludedTeamKey
  );
  if (similarHistoryTeam)
    return { team: similarHistoryTeam, source: "similar-history" };

  const historicalClassTeam = findBestEnabledClassHistoryTeam(
    enemyIds,
    heroes,
    candidateHeroes,
    combats,
    excludedTeamKey
  );
  if (historicalClassTeam)
    return { team: historicalClassTeam, source: "class-history" };

  let source: RecommendationSource = "fallback";
  const team = excludedTeamKey
    ? findScoringAlternative(enemyIds, candidateHeroes, combats, excludedTeamKey)
    : recommendTeam(enemyIds, candidateHeroes, combats, (detectedSource) => {
        source = detectedSource;
      });
  const validTeam = (team ?? []).filter((hero) => enabledIds.has(hero.id));
  return {
    team: validTeam.length === TEAM_SIZE ? validTeam : [],
    source: validTeam.length === TEAM_SIZE ? source : "fallback",
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
