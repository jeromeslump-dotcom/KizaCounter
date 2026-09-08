import type { Hero } from "../data/heroes";
import type { TeamEvaluation, TeamScore } from "../types";
import { analyzeCore4Plus1 } from "./historicalCore4";
import { getEngineSettings } from "./engineSettings";
import {
  buildHistoricalEnemyContext,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
  calculateHeroUsage,
  coverageReport,
} from "./historicalScoring";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { teamKey } from "./teamUtils";

export {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
  calculateHeroUsage,
  coverageReport,
};

const TEAM_SIZE = 5;

export type RecommendationSource =
  | "exact-history"
  | "class-history"
  | "core4"
  | "counter-usage"
  | "fallback";
export type RecommendationSourceCallback = (source: RecommendationSource) => void;

function core4ScoreForTeam(
  teamIds: string[],
  enemyIds: string[],
  combats: Parameters<typeof analyzeCore4Plus1>[1],
  settings: ReturnType<typeof getEngineSettings>
): number {
  if (enemyIds.length !== TEAM_SIZE) return 0;
  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  const teamSet = new Set(teamIds);
  let bestScore = 0;
  for (const analysis of analyses) {
    if (!analysis.coreIds.every((id) => teamSet.has(id))) continue;
    const confidence = historicalConfidence(
      analysis.battles,
      settings.advanced.core4ConfidenceBattles
    );
    bestScore = Math.max(bestScore, (analysis.winRate / 100) * confidence);
  }
  return bestScore;
}

export function evaluateTeam(
  team: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  enemyIds: string[]
): TeamEvaluation {
  const settings = getEngineSettings();
  const teamIds = team.map((hero) => hero.id);
  const history = evaluateTeamHistory(teamIds, combats);
  const exactHistory =
    enemyIds.length === TEAM_SIZE
      ? evaluateExactTeamHistory(teamIds, enemyIds, combats)
      : { wins: 0, losses: 0, battles: 0, winRate: 0 };
  const exactScore =
    exactHistory.battles > 0
      ? (exactHistory.winRate / 100) *
        historicalConfidence(exactHistory.battles, settings.advanced.historicalConfidenceBattles)
      : 0;
  const coreScore = core4ScoreForTeam(teamIds, enemyIds, combats, settings);
  const generalScore =
    history.battles > 0
      ? (history.winRate / 100) *
        historicalConfidence(history.battles, settings.advanced.historicalConfidenceBattles)
      : 0;
  return {
    score: Math.max(exactScore, coreScore, generalScore),
    historicalWins: history.wins,
    historicalLosses: history.losses,
    historicalBattles: history.battles,
    historicalWinRate: history.winRate,
  };
}

export function scoreTeam(
  team: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  enemyIds: string[]
): TeamScore {
  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluateTeam(team, combats, enemyIds).score,
  };
}

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  onSource?: RecommendationSourceCallback
): Hero[] {
  if (!enemyIds.length) {
    onSource?.("fallback");
    return [];
  }
  const settings = getEngineSettings();
  const historicalContext = buildHistoricalEnemyContext(enemyIds, combats);
  const historicalTeam = findBestHistoricalTeam(enemyIds, combats, heroes, historicalContext);
  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    onSource?.("exact-history");
    return historicalTeam;
  }
  const availableHeroes = heroes;
  if (availableHeroes.length <= TEAM_SIZE) {
    onSource?.("fallback");
    return availableHeroes;
  }
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const counterUsage = calculateCounterUsage(enemyIds, combats, historicalContext);
  const ranked = availableHeroes
    .map((hero) => ({ hero, score: counterHeroScore(hero, counterUsage, settings) }))
    .sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name));

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

  const historicalClassTeam = findBestHistoricalClassTeam(enemyIds, combats, heroes);
  if (historicalClassTeam && historicalClassTeam.length === TEAM_SIZE) {
    onSource?.("class-history");
    return historicalClassTeam;
  }

  const recommended: Hero[] = [];
  const usedIds = new Set<string>();
  while (recommended.length < TEAM_SIZE && ranked.length) {
    const selected = ranked.shift()?.hero;
    if (!selected || usedIds.has(selected.id)) continue;
    recommended.push(selected);
    usedIds.add(selected.id);
  }
  if (recommended.length < TEAM_SIZE) {
    for (const hero of availableHeroes) {
      if (recommended.length >= TEAM_SIZE) break;
      if (usedIds.has(hero.id)) continue;
      recommended.push(hero);
      usedIds.add(hero.id);
    }
  }
  onSource?.("counter-usage");
  return recommended;
}
