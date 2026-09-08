import type { Combat, Hero } from "../types";
import {
  recommendTeam,
  type RecommendationSource as ScoringRecommendationSource,
} from "./scoring";
import { getEngineSettings } from "./engineSettings";
import { calculateHistoricalReliability } from "./historicalScoring";
import { findBestHistoricalDefeatTeam } from "./defeatHistory";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { teamKey, uniqueIds } from "./teamUtils";

export type RecommendationSource =
  ScoringRecommendationSource | "similar-history" | "defeat-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const CORE_SIZE = 4;
const MIN_SIMILARITY = 3;

function getClassKey(
  ids: string[],
  heroesById: Map<string, Hero>
): string | null {
  let agi = 0;
  let int = 0;
  let str = 0;

  for (const id of ids) {
    const cls = heroesById.get(id)?.cls;
    if (cls === "AGI") agi++;
    else if (cls === "INT") int++;
    else if (cls === "STR") str++;
    else return null;
  }

  if (agi + int + str !== TEAM_SIZE) return null;
  return [
    ...Array(agi).fill("AGI"),
    ...Array(int).fill("INT"),
    ...Array(str).fill("STR"),
  ].join("|");
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
    settings.advanced.historicalConfidenceBattles
  );

  return [...candidates.values()]
    .filter(
      (candidate) => candidate.wins > 0 && candidate.wins >= candidate.losses
    )
    .map((candidate) => ({
      candidate,
      reliability: calculateHistoricalReliability(
        candidate.wins,
        candidate.losses,
        confidenceBattles,
        settings.advanced.historicalReliabilityBase,
        settings.advanced.historicalReliabilityConfidenceWeight
      ),
      key: teamKey(candidate.heroIds),
    }))
    .sort(
      (a, b) =>
        (sortBySimilarity
          ? b.candidate.similarity - a.candidate.similarity
          : 0) ||
        b.reliability - a.reliability ||
        b.candidate.wins +
          b.candidate.losses -
          (a.candidate.wins + a.candidate.losses) ||
        b.candidate.wins - a.candidate.wins ||
        a.key.localeCompare(b.key)
    )
    .map(({ candidate }) => candidate);
}

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
  if (
    team.length !== TEAM_SIZE ||
    uniqueIds(enemyIds).length !== TEAM_SIZE
  ) {
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
    const team = resolveCandidateTeam(candidate.heroIds, candidateHeroesById);
    if (team && isUsableRecommendationTeam(team, combats, enemyIds)) return team;
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

function findBestEnabledCore4HistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
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
  const coreVariantsByTeamKey = new Map<
    string,
    Array<{ coreIds: string[]; replacement: string; key: string }>
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

    const historicalTeamKey = teamKey(historicalTeam);
    if (historicalTeamKey === excludedTeamKey) continue;

    let variants = coreVariantsByTeamKey.get(historicalTeamKey);
    if (!variants) {
      variants = [];
      for (let index = 0; index < historicalTeam.length; index++) {
        const coreIds = historicalTeam.filter(
          (_, currentIndex) => currentIndex !== index
        );
        variants.push({
          coreIds,
          replacement: historicalTeam[index],
          key: teamKey(coreIds),
        });
      }
      coreVariantsByTeamKey.set(historicalTeamKey, variants);
    }

    for (const variant of variants) {
      const accumulator = coreCandidates.get(variant.key) ?? {
        coreIds: variant.coreIds,
        wins: 0,
        losses: 0,
        replacements: new Map<string, { wins: number; losses: number }>(),
      };

      if (combat.won) accumulator.wins++;
      else accumulator.losses++;

      const replacementStats = accumulator.replacements.get(
        variant.replacement
      ) ?? {
        wins: 0,
        losses: 0,
      };
      if (combat.won) replacementStats.wins++;
      else replacementStats.losses++;
      accumulator.replacements.set(variant.replacement, replacementStats);
      coreCandidates.set(variant.key, accumulator);
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
        key: teamKey(core.coreIds),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.core.wins - a.core.wins ||
        a.key.localeCompare(b.key)
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

      const team = resolveCandidateTeam(teamIds, candidateHeroesById);
      if (team && isUsableRecommendationTeam(team, combats, enemyIds)) return team;
    }
  }

  return null;
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