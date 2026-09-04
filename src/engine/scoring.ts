import type { Hero } from "../data/heroes";
import type {
  Combat,
  CoverageReport,
  HeroScore,
  HeroUsage,
  TeamEvaluation,
  TeamScore,
} from "../types";
import { analyzeCore4Plus1 } from "./historicalCore4";
import {
  getEngineSettings,
  getPointBudgets,
  normalizeModulePoints,
} from "./engineSettings";

const TEAM_SIZE = 5;

// ============================================================
// SOURCE DE RECOMMANDATION
// ============================================================

export type RecommendationSource =
  | "exact-history"
  | "class-history"
  | "similar-history"
  | "core4"
  | "counter-usage"
  | "fallback";

export type RecommendationSourceCallback = (
  source: RecommendationSource
) => void;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function teamKey(ids: string[]): string {
  return uniqueIds(ids).sort().join("|");
}

function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}

function isSameEnemyTeam(
  enemyIds: string[],
  combatEnemyIds: string[]
): boolean {
  return sameTeam(enemyIds, combatEnemyIds);
}

export function calculateWinRate(wins: number, total: number): number {
  return total <= 0 ? 0 : (wins / total) * 100;
}

export function evaluateExactTeamHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[]
): { wins: number; losses: number; battles: number; winRate: number } {
  const normalizedTeam = uniqueIds(teamIds);

  if (normalizedTeam.length !== TEAM_SIZE) {
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) continue;
    if (!sameTeam(normalizedTeam, combat.my_heroes ?? [])) continue;

    combat.won ? wins++ : losses++;
  }

  const battles = wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate: calculateWinRate(wins, battles),
  };
}

export function calculateSpecificHistoryPoints(
  wins: number,
  losses: number,
  maxPoints: number
): number {
  const battles = wins + losses;

  if (battles <= 0 || maxPoints <= 0) return 0;

  const confidenceBattles =
    getEngineSettings().advanced.teamAHistoricalConfidenceBattles;

  const confidence = Math.min(battles / Math.max(1, confidenceBattles), 1);

  return normalizeModulePoints((wins / battles) * confidence, maxPoints);
}

export function calculateHeroUsage(
  combats: Combat[],
  heroes: Hero[]
): Record<string, HeroUsage> {
  const usage: Record<string, HeroUsage> = {};

  for (const hero of heroes) {
    usage[hero.id] = {
      heroId: hero.id,
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
  }

  for (const combat of combats) {
    for (const heroId of combat.my_heroes ?? []) {
      if (!usage[heroId]) {
        usage[heroId] = {
          heroId,
          total: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        };
      }

      usage[heroId].total++;
      combat.won ? usage[heroId].wins++ : usage[heroId].losses++;
    }
  }

  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return usage;
}

export function coverageReport(
  enemyIds: string[],
  teamIds: string[],
  combats: Combat[]
): CoverageReport {
  const normalizedEnemy = uniqueIds(enemyIds);
  const team = uniqueIds(teamIds);

  if (normalizedEnemy.length !== TEAM_SIZE || team.length === 0) {
    return {
      enemyIds: normalizedEnemy,
      covered: 0,
      total: team.length,
      percentage: 0,
      heroes: [],
    };
  }

  type ReplacementStats = { wins: number; losses: number };
  const byHeroAndCore = new Map<string, Map<string, ReplacementStats>>();

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) continue;

    const myIds = uniqueIds(combat.my_heroes ?? []);
    if (myIds.length !== TEAM_SIZE) continue;

    for (const heroId of team) {
      if (!myIds.includes(heroId)) continue;

      const coreIds = myIds.filter((id) => id !== heroId);
      if (coreIds.length !== TEAM_SIZE - 1) continue;

      const coreKey = teamKey(coreIds);
      const heroGroups =
        byHeroAndCore.get(heroId) ?? new Map<string, ReplacementStats>();
      const stats = heroGroups.get(coreKey) ?? { wins: 0, losses: 0 };

      combat.won ? stats.wins++ : stats.losses++;
      heroGroups.set(coreKey, stats);
      byHeroAndCore.set(heroId, heroGroups);
    }
  }

  const settings = getEngineSettings();

  const heroes = team
    .map((heroId) => {
      let wins = 0;
      let losses = 0;
      const heroGroups = byHeroAndCore.get(heroId);

      if (heroGroups) {
        for (const stats of heroGroups.values()) {
          const battles = stats.wins + stats.losses;
          if (battles < settings.advanced.core4MinBattles) continue;
          wins += stats.wins;
          losses += stats.losses;
        }
      }

      const battles = wins + losses;
      const winRate = calculateWinRate(wins, battles);
      const confidence = Math.min(
        battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
        1
      );

      return {
        heroId,
        wins,
        losses,
        battles,
        winRate,
        confidence,
        score: winRate * confidence,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.wins - a.wins ||
        a.heroId.localeCompare(b.heroId)
    );

  const covered = heroes.filter((hero) => hero.wins > 0).length;

  return {
    enemyIds: normalizedEnemy,
    covered,
    total: team.length,
    percentage: team.length > 0 ? (covered / team.length) * 100 : 0,
    heroes,
  };
}

export function scoreHero(hero: Hero): HeroScore {
  return { heroId: hero.id, score: 0 };
}

export function evaluateTeamHistory(
  teamIds: string[],
  combats: Combat[]
): { wins: number; losses: number; battles: number; winRate: number } {
  const team = uniqueIds(teamIds);

  if (team.length === 0) {
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    const historicalTeam = new Set(combat.my_heroes ?? []);
    if (!team.every((heroId) => historicalTeam.has(heroId))) continue;
    combat.won ? wins++ : losses++;
  }

  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
}

function calculateCore4ModulePoints(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  settings: ReturnType<typeof getEngineSettings>,
  maxPoints: number
): number {
  if (enemyIds.length !== TEAM_SIZE || maxPoints <= 0) return 0;

  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  if (!analyses.length) return 0;

  const teamSet = new Set(teamIds);
  let bestRawScore = 0;

  for (const analysis of analyses) {
    if (!analysis.coreIds.every((id) => teamSet.has(id))) continue;

    const confidence = Math.min(
      analysis.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
      1
    );

    bestRawScore = Math.max(
      bestRawScore,
      (analysis.winRate / 100) * confidence
    );
  }

  return normalizeModulePoints(bestRawScore, maxPoints);
}

export function evaluateTeam(
  team: Hero[],
  combats: Combat[],
  _usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamEvaluation {
  const settings = getEngineSettings();
  const teamIds = team.map((hero) => hero.id);
  const history = evaluateTeamHistory(teamIds, combats);
  const budgets = getPointBudgets(settings, "A");

  const generalWinRatePoints = normalizeModulePoints(
    history.battles > 0 ? history.winRate / 100 : 0,
    budgets.generalWinRate
  );

  const exactHistory =
    enemyIds.length === TEAM_SIZE
      ? evaluateExactTeamHistory(teamIds, enemyIds, combats)
      : { wins: 0, losses: 0, battles: 0, winRate: 0 };

  const specificHistoryPoints = calculateSpecificHistoryPoints(
    exactHistory.wins,
    exactHistory.losses,
    budgets.specificHistory
  );

  const core4Points = calculateCore4ModulePoints(
    teamIds,
    enemyIds,
    combats,
    settings,
    budgets.core4
  );

  const score =
    specificHistoryPoints * settings.teamA.specificHistoryWeight +
    core4Points * settings.teamA.core4Weight +
    generalWinRatePoints * settings.teamA.generalWinRateWeight;

  return {
    score,
    historicalWins: history.wins,
    historicalLosses: history.losses,
    historicalBattles: history.battles,
    historicalWinRate: history.winRate,
  };
}

export function scoreTeam(
  team: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamScore {
  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluateTeam(team, combats, usage, enemyIds).score,
  };
}

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  const settings = getEngineSettings();
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) continue;

    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;

    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const winningCandidates = [...candidates.values()].filter(
    (candidate) => candidate.wins > 0
  );
  if (!winningCandidates.length) return null;

  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  const calculateHistoricalReliability = (wins: number, battles: number): number => {
    if (battles <= 0) return 0;
    const winRate = wins / battles;
    const confidence = battles / (battles + confidenceBattles);
    return (
      winRate *
      (settings.advanced.teamAHistoricalReliabilityBase +
        settings.advanced.teamAHistoricalReliabilityConfidenceWeight * confidence)
    );
  };

  winningCandidates.sort((a, b) => {
    const aBattles = a.wins + a.losses;
    const bBattles = b.wins + b.losses;
    return (
      calculateHistoricalReliability(b.wins, bBattles) -
        calculateHistoricalReliability(a.wins, aBattles) ||
      bBattles - aBattles ||
      b.wins - a.wins ||
      teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
    );
  });

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }

  return null;
}

function getEnemyClassKey(enemyIds: string[], heroes: Hero[]): string | null {
  const classes = enemyIds
    .map((id) => heroes.find((hero) => hero.id === id)?.cls)
    .filter(
      (cls): cls is Hero["cls"] =>
        cls === "STR" || cls === "AGI" || cls === "INT"
    );

  if (classes.length !== TEAM_SIZE) return null;
  return [...classes].sort().join("|");
}

export function evaluateEnemyClassHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): {
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  classKey: string | null;
} {
  const team = uniqueIds(teamIds);
  const targetClassKey = getEnemyClassKey(enemyIds, heroes);

  if (team.length !== TEAM_SIZE || !targetClassKey) {
    return { wins: 0, losses: 0, battles: 0, winRate: 0, classKey: targetClassKey };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (getEnemyClassKey(combat.enemy_heroes ?? [], heroes) !== targetClassKey) continue;
    if (!sameTeam(team, combat.my_heroes ?? [])) continue;
    combat.won ? wins++ : losses++;
  }

  const battles = wins + losses;
  return {
    wins,
    losses,
    battles,
    winRate: calculateWinRate(wins, battles),
    classKey: targetClassKey,
  };
}

export function findBestHistoricalClassTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  const targetClassKey = getEnemyClassKey(enemyIds, heroes);
  if (!targetClassKey) return null;

  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();

  for (const combat of combats) {
    if (getEnemyClassKey(combat.enemy_heroes ?? [], heroes) !== targetClassKey) continue;

    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;

    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const winningCandidates = [...candidates.values()].filter(
    (candidate) => candidate.wins > 0
  );
  if (!winningCandidates.length) return null;

  winningCandidates.sort(
    (a, b) =>
      calculateWinRate(b.wins, b.wins + b.losses) -
        calculateWinRate(a.wins, a.wins + a.losses) ||
      b.wins + b.losses - (a.wins + a.losses) ||
      b.wins - a.wins ||
      teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
  );

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }

  return null;
}

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  onSource?: RecommendationSourceCallback
): Hero[] {
  const settings = getEngineSettings();

  const exact = findBestHistoricalTeam(enemyIds, combats, heroes);
  if (exact) {
    onSource?.("exact-history");
    return exact;
  }

  const classHistory = findBestHistoricalClassTeam(enemyIds, combats, heroes);
  if (classHistory) {
    onSource?.("class-history");
    return classHistory;
  }

  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  const bestCore4 = analyses
    .filter((analysis) => analysis.battles >= settings.advanced.core4MinBattles)
    .filter((analysis) => analysis.replacementBattles >= settings.advanced.core4MinReplacementBattles)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.replacementBattles - a.replacementBattles
    )[0];

  if (bestCore4) {
    const team = bestCore4.coreIds
      .concat(bestCore4.replacementId)
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) {
      onSource?.("core4");
      return team;
    }
  }

  const usage = calculateHeroUsage(combats, heroes);
  const available = heroes
    .filter((hero) => !enemyIds.includes(hero.id))
    .sort(
      (a, b) =>
        (usage[b.id]?.winRate ?? 0) - (usage[a.id]?.winRate ?? 0) ||
        (usage[b.id]?.total ?? 0) - (usage[a.id]?.total ?? 0)
    );

  const fallback = available.slice(0, TEAM_SIZE);
  if (fallback.length === TEAM_SIZE) onSource?.("counter-usage");
  else onSource?.("fallback");

  return fallback;
}
