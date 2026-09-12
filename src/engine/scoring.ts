import type { Hero } from "../data/heroes";
import { analyzeCore4Plus1 } from "./historicalCore4";
import { getEngineSettings } from "./engineSettings";
import {
  buildHistoricalEnemyContext,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
} from "./historicalScoring";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { teamKey } from "./teamUtils";

const TEAM_SIZE = 5;

export type RecommendationSource =
  "exact-history" | "class-history" | "core4" | "counter-usage" | "fallback";
export type RecommendationSourceCallback = (
  source: RecommendationSource
) => void;

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  onSource?: RecommendationSourceCallback,
  excludedTeamKey?: string
): Hero[] {
  if (!enemyIds.length) {
    onSource?.("fallback");
    return [];
  }
  const settings = getEngineSettings();
  const historicalContext = buildHistoricalEnemyContext(enemyIds, combats);
  const historicalTeam = findBestHistoricalTeam(
    enemyIds,
    combats,
    heroes,
    historicalContext,
    excludedTeamKey
  );
  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    onSource?.("exact-history");
    return historicalTeam;
  }
  const availableHeroes = heroes;
  if (availableHeroes.length <= TEAM_SIZE) {
    onSource?.("fallback");
    return excludedTeamKey &&
      teamKey(availableHeroes.map((hero) => hero.id)) === excludedTeamKey
      ? []
      : availableHeroes;
  }
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const counterUsage = calculateCounterUsage(
    enemyIds,
    combats,
    historicalContext
  );
  const ranked = availableHeroes
    .map((hero) => ({
      hero,
      score: counterHeroScore(hero, counterUsage, settings),
    }))
    .sort(
      (a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  if (core4Analyses.length > 0) {
    let bestCompleteTeam: Hero[] | null = null;
    let bestCoreScore = -Infinity;
    let bestReplacementScore = -Infinity;
    let bestCompleteTeamKey = "";
    for (const analysis of core4Analyses) {
      const core4Heroes = analysis.coreIds
        .map((id) => heroesById.get(id))
        .filter((hero): hero is Hero => Boolean(hero));
      if (core4Heroes.length !== TEAM_SIZE - 1) continue;
      const coreConfidence = historicalConfidence(
        analysis.battles,
        settings.advanced.core4ConfidenceBattles
      );
      const coreScore = analysis.winRate * coreConfidence;
      const core4Ids = new Set(core4Heroes.map((hero) => hero.id));
      const replacementsByHeroId = new Map(
        analysis.replacements.map((entry) => [entry.heroId, entry])
      );
      for (const candidate of ranked) {
        if (core4Ids.has(candidate.hero.id)) continue;
        const replacement = replacementsByHeroId.get(candidate.hero.id);
        if (!replacement) continue;
        const replacementScore = replacement.score;
        const completeTeam = [...core4Heroes, candidate.hero];
        const completeTeamKey = teamKey(completeTeam.map((hero) => hero.id));
        if (completeTeamKey === excludedTeamKey) continue;
        if (
          coreScore > bestCoreScore ||
          (coreScore === bestCoreScore &&
            (replacementScore > bestReplacementScore ||
              (replacementScore === bestReplacementScore &&
                completeTeamKey.localeCompare(bestCompleteTeamKey) < 0)))
        ) {
          bestCompleteTeam = completeTeam;
          bestCoreScore = coreScore;
          bestReplacementScore = replacementScore;
          bestCompleteTeamKey = completeTeamKey;
        }
      }
    }
    if (bestCompleteTeam && bestCompleteTeam.length === TEAM_SIZE) {
      onSource?.("core4");
      return bestCompleteTeam;
    }
  }

  const historicalClassTeam = findBestHistoricalClassTeam(
    enemyIds,
    combats,
    heroes,
    excludedTeamKey
  );
  if (historicalClassTeam && historicalClassTeam.length === TEAM_SIZE) {
    onSource?.("class-history");
    return historicalClassTeam;
  }

  const recommended: Hero[] = [];
  const usedIds = new Set<string>();
  let rankedIndex = 0;
  while (recommended.length < TEAM_SIZE && rankedIndex < ranked.length) {
    const selected = ranked[rankedIndex++]?.hero;
    if (!selected || usedIds.has(selected.id)) continue;
    recommended.push(selected);
    usedIds.add(selected.id);
  }

  if (
    excludedTeamKey &&
    recommended.length === TEAM_SIZE &&
    teamKey(recommended.map((hero) => hero.id)) === excludedTeamKey
  ) {
    for (const replacement of ranked.slice(TEAM_SIZE)) {
      const replacementIndex = recommended.length - 1;
      const candidate = [...recommended];
      candidate[replacementIndex] = replacement.hero;
      const candidateIds = candidate.map((hero) => hero.id);
      if (new Set(candidateIds).size !== TEAM_SIZE) continue;
      if (teamKey(candidateIds) === excludedTeamKey) continue;
      recommended.splice(0, recommended.length, ...candidate);
      break;
    }
  }

  if (recommended.length < TEAM_SIZE) {
    for (const hero of availableHeroes) {
      if (recommended.length >= TEAM_SIZE) break;
      if (usedIds.has(hero.id)) continue;
      if (excludedTeamKey && recommended.length === TEAM_SIZE - 1) {
        const candidate = [...recommended, hero];
        if (teamKey(candidate.map((entry) => entry.id)) === excludedTeamKey) {
          continue;
        }
      }
      recommended.push(hero);
      usedIds.add(hero.id);
    }
  }
  onSource?.("counter-usage");
  return recommended;
}
