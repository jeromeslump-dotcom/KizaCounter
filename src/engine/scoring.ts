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
  getEnemyClassKey,
  historicalConfidence,
  calculateWinRate,
  calculateHeroUsage,
  coverageReport,
} from "./historicalScoring";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { teamKey, uniqueIds } from "./teamUtils";

export {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
  calculateWinRate,
  calculateHeroUsage,
  coverageReport,
};

const TEAM_SIZE = 5;
type HistoryStats = { wins: number; losses: number };

function addHistoryStats(index: Map<string, HistoryStats>, key: string, won: boolean): void {
  const stats = index.get(key) ?? { wins: 0, losses: 0 };
  won ? stats.wins++ : stats.losses++;
  index.set(key, stats);
}

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

export function recommendAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  primaryTeam: Hero[] = []
): Hero[] {
  if (!enemyIds.length) return [];
  const primaryTeamKey =
    primaryTeam.length === TEAM_SIZE
      ? teamKey(primaryTeam.map((hero) => hero.id))
      : "";
  if (heroes.length < TEAM_SIZE) return heroes;

  const settings = getEngineSettings();
  const historicalContext = buildHistoricalEnemyContext(enemyIds, combats);
  const counterUsage = calculateCounterUsage(enemyIds, combats, historicalContext);
  const ranked = heroes
    .map((hero) => ({ hero, score: counterHeroScore(hero, counterUsage, settings) }))
    .sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name));

  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const targetEnemyKey = teamKey(enemyIds);
  const targetEnemyClassKey = getEnemyClassKey(enemyIds, heroesById);
  const generalHistory = new Map<string, HistoryStats>();
  const exactHistory = new Map<string, HistoryStats>();
  const classHistory = new Map<string, HistoryStats>();
  const historicalTeams = new Map<string, Hero[]>();
  const classKeyCache = new Map<string, string | null>();

  for (const combat of combats) {
    const enemyIdsForCombat = uniqueIds(combat.enemy_heroes ?? []);
    const myIds = uniqueIds(combat.my_heroes ?? []);
    if (myIds.length !== TEAM_SIZE) continue;
    const myKey = teamKey(myIds);
    addHistoryStats(generalHistory, myKey, combat.won);
    if (enemyIdsForCombat.length !== TEAM_SIZE) continue;
    const enemyKey = teamKey(enemyIdsForCombat);
    if (enemyKey === targetEnemyKey) {
      addHistoryStats(exactHistory, `${targetEnemyKey}::${myKey}`, combat.won);
      if (combat.won && myKey !== primaryTeamKey) {
        const team = myIds
          .map((id) => heroesById.get(id))
          .filter((hero): hero is Hero => Boolean(hero));
        if (team.length === TEAM_SIZE) historicalTeams.set(myKey, team);
      }
    }
    if (targetEnemyClassKey) {
      let classKey = classKeyCache.get(enemyKey);
      if (classKey === undefined) {
        classKey = getEnemyClassKey(enemyIdsForCombat, heroesById);
        classKeyCache.set(enemyKey, classKey);
      }
      if (classKey === targetEnemyClassKey)
        addHistoryStats(classHistory, `${classKey}::${myKey}`, combat.won);
    }
  }

  const isPrimaryTeam = (team: Hero[]): boolean =>
    primaryTeamKey !== "" && teamKey(team.map((hero) => hero.id)) === primaryTeamKey;
  const addCandidate = (candidates: Map<string, Hero[]>, team: Hero[]): void => {
    if (team.length !== TEAM_SIZE) return;
    const ids = uniqueIds(team.map((hero) => hero.id));
    if (ids.length !== TEAM_SIZE) return;
    const normalizedTeam = ids
      .map((id) => heroesById.get(id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (normalizedTeam.length !== TEAM_SIZE || isPrimaryTeam(normalizedTeam)) return;
    candidates.set(teamKey(ids), normalizedTeam);
  };

  const candidates = new Map<string, Hero[]>();
  const baseAlternative = ranked.slice(0, TEAM_SIZE).map((entry) => entry.hero);
  addCandidate(candidates, baseAlternative);
  const pool = ranked.map((candidate) => candidate.hero);
  for (let index = 0; index < TEAM_SIZE; index++) {
    const baseTeam = baseAlternative.length === TEAM_SIZE ? baseAlternative : [];
    if (baseTeam.length !== TEAM_SIZE) break;
    for (const replacement of pool) {
      if (baseTeam.some((hero, heroIndex) => heroIndex !== index && hero.id === replacement.id)) continue;
      const candidate = [...baseTeam];
      candidate[index] = replacement;
      addCandidate(candidates, candidate);
    }
  }
  for (const team of historicalTeams.values()) addCandidate(candidates, team);
  if (!candidates.size) return [];

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  const core4Scores = new Map<string, number>();
  for (const core of core4Analyses) {
    const coreKey = teamKey(core.coreIds);
    const confidence = historicalConfidence(core.battles, settings.advanced.core4ConfidenceBattles);
    const rawScore = (core.winRate / 100) * confidence;
    const previous = core4Scores.get(coreKey) ?? 0;
    if (rawScore > previous) core4Scores.set(coreKey, rawScore);
  }

  const getCore4Score = (team: Hero[]): number => {
    const teamIds = team.map((hero) => hero.id);
    let bestRawScore = 0;
    for (let excludedIndex = 0; excludedIndex < TEAM_SIZE; excludedIndex++) {
      const coreIds = teamIds.filter((_, index) => index !== excludedIndex);
      const rawScore = core4Scores.get(teamKey(coreIds)) ?? 0;
      if (rawScore > bestRawScore) bestRawScore = rawScore;
    }
    return bestRawScore;
  };

  const evaluateAlternative = (team: Hero[]) => {
    const teamIds = team.map((hero) => hero.id);
    const myKey = teamKey(teamIds);
    const history = generalHistory.get(myKey) ?? { wins: 0, losses: 0 };
    const historyBattles = history.wins + history.losses;
    const historyWinRate = calculateWinRate(history.wins, historyBattles);
    const generalScore =
      historyBattles > 0
        ? (historyWinRate / 100) * historicalConfidence(historyBattles, settings.advanced.historicalConfidenceBattles)
        : 0;

    const exact = exactHistory.get(`${targetEnemyKey}::${myKey}`) ?? { wins: 0, losses: 0 };
    const exactBattles = exact.wins + exact.losses;
    const exactScore =
      exactBattles > 0
        ? (exact.wins / exactBattles) * historicalConfidence(exactBattles, settings.advanced.historicalConfidenceBattles)
        : 0;

    const core4Score = getCore4Score(team);
    const classStats = targetEnemyClassKey
      ? (classHistory.get(`${targetEnemyClassKey}::${myKey}`) ?? { wins: 0, losses: 0 })
      : { wins: 0, losses: 0 };
    const classBattles = classStats.wins + classStats.losses;
    const classScore =
      classBattles > 0
        ? (classStats.wins / classBattles) * historicalConfidence(
            classBattles,
            Math.max(1, settings.advanced.historicalConfidenceBattles * 2)
          )
        : 0;
    const losingHistory = historyBattles > 0 && history.wins === 0;
    return { team, exactScore, core4Score, classScore, generalScore, losingHistory, history: { wins: history.wins, losses: history.losses, battles: historyBattles, winRate: historyWinRate } };
  };

  const evaluations = Array.from(candidates.values()).map(evaluateAlternative);
  evaluations.sort((a, b) => {
    if (a.losingHistory !== b.losingHistory) return a.losingHistory ? 1 : -1;
    if (a.exactScore !== b.exactScore) return b.exactScore - a.exactScore;
    if (a.core4Score !== b.core4Score) return b.core4Score - a.core4Score;
    if (a.classScore !== b.classScore) return b.classScore - a.classScore;
    if (a.generalScore !== b.generalScore) return b.generalScore - a.generalScore;
    if (a.history.winRate !== b.history.winRate) return b.history.winRate - a.history.winRate;
    if (a.history.wins !== b.history.wins) return b.history.wins - a.history.wins;
    if (a.history.battles !== b.history.battles) return b.history.battles - a.history.battles;
    return teamKey(a.team.map((hero) => hero.id)).localeCompare(teamKey(b.team.map((hero) => hero.id)));
  });
  return evaluations[0]?.team ?? [];
}
