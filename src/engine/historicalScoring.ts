import type { Hero } from "../data/heroes";
import type { Combat, CoverageReport, HeroUsage } from "../types";
import { getEngineSettings, getPointBudgets, normalizeModulePoints } from "./engineSettings";
import { sameTeam, teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

export function historicalConfidence(battles: number, confidenceBattles: number): number {
  if (battles <= 0) return 0;
  const safeConfidenceBattles = Math.max(1, confidenceBattles);
  return battles / (battles + safeConfidenceBattles);
}

export function calculateWinRate(wins: number, total: number): number {
  return total <= 0 ? 0 : (wins / total) * 100;
}

export function evaluateExactTeamHistory(teamIds: string[], enemyIds: string[], combats: Combat[]) {
  const normalizedTeam = uniqueIds(teamIds);
  if (normalizedTeam.length !== TEAM_SIZE) return { wins: 0, losses: 0, battles: 0, winRate: 0 };

  let wins = 0;
  let losses = 0;
  for (const combat of combats) {
    if (!sameTeam(enemyIds, combat.enemy_heroes ?? [])) continue;
    if (!sameTeam(normalizedTeam, combat.my_heroes ?? [])) continue;
    combat.won ? wins++ : losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
}

export function calculateSpecificHistoryPoints(wins: number, losses: number, maxPoints: number): number {
  const battles = wins + losses;
  if (battles <= 0 || maxPoints <= 0) return 0;
  const confidenceBattles = Math.max(1, getEngineSettings().advanced.teamAHistoricalConfidenceBattles);
  const confidence = historicalConfidence(battles, confidenceBattles);
  return normalizeModulePoints((wins / battles) * confidence, maxPoints);
}

export function calculateHeroUsage(combats: Combat[], heroes: Hero[]): Record<string, HeroUsage> {
  const usage: Record<string, HeroUsage> = {};
  for (const hero of heroes) {
    usage[hero.id] = { heroId: hero.id, total: 0, wins: 0, losses: 0, winRate: 0 };
  }
  for (const combat of combats) {
    for (const heroId of combat.my_heroes ?? []) {
      usage[heroId] ??= { heroId, total: 0, wins: 0, losses: 0, winRate: 0 };
      usage[heroId].total++;
      combat.won ? usage[heroId].wins++ : usage[heroId].losses++;
    }
  }
  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }
  return usage;
}

export function coverageReport(enemyIds: string[], teamIds: string[], combats: Combat[]): CoverageReport {
  const normalizedEnemy = uniqueIds(enemyIds);
  const team = uniqueIds(teamIds);
  if (normalizedEnemy.length !== TEAM_SIZE || team.length === 0) {
    return { enemyIds: normalizedEnemy, covered: 0, total: team.length, percentage: 0, heroes: [] };
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
      const heroGroups = byHeroAndCore.get(heroId) ?? new Map<string, ReplacementStats>();
      const stats = heroGroups.get(coreKey) ?? { wins: 0, losses: 0 };
      combat.won ? stats.wins++ : stats.losses++;
      heroGroups.set(coreKey, stats);
      byHeroAndCore.set(heroId, heroGroups);
    }
  }

  const settings = getEngineSettings();
  const heroes = team.map((heroId) => {
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
    const confidence = historicalConfidence(battles, settings.advanced.core4ConfidenceBattles);
    return { heroId, wins, losses, battles, winRate, confidence, score: winRate * confidence };
  }).sort((a, b) => b.score - a.score || b.battles - a.battles || b.wins - a.wins || a.heroId.localeCompare(b.heroId));

  const covered = heroes.filter((hero) => hero.wins > 0).length;
  return {
    enemyIds: normalizedEnemy,
    covered,
    total: team.length,
    percentage: team.length > 0 ? (covered / team.length) * 100 : 0,
    heroes,
  };
}

export function evaluateTeamHistory(teamIds: string[], combats: Combat[]) {
  const team = uniqueIds(teamIds);
  if (team.length !== TEAM_SIZE) return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  let wins = 0;
  let losses = 0;
  for (const combat of combats) {
    const historicalTeam = uniqueIds(combat.my_heroes ?? []);
    if (historicalTeam.length !== TEAM_SIZE) continue;
    if (teamKey(team) !== teamKey(historicalTeam)) continue;
    combat.won ? wins++ : losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
}

export function findBestHistoricalTeam(enemyIds: string[], combats: Combat[], heroes: Hero[]): Hero[] | null {
  const settings = getEngineSettings();
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();
  for (const combat of combats) {
    if (!sameTeam(enemyIds, combat.enemy_heroes ?? [])) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;
    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const winningCandidates = [...candidates.values()].filter((candidate) => candidate.wins > 0);
  if (!winningCandidates.length) return null;

  const confidenceBattles = Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles);
  const calculateHistoricalReliability = (wins: number, battles: number): number => {
    if (battles <= 0) return 0;
    const winRate = wins / battles;
    const confidence = historicalConfidence(battles, confidenceBattles);
    return winRate * (settings.advanced.teamAHistoricalReliabilityBase + settings.advanced.teamAHistoricalReliabilityConfidenceWeight * confidence);
  };

  winningCandidates.sort((a, b) => {
    const aBattles = a.wins + a.losses;
    const bBattles = b.wins + b.losses;
    const aReliability = calculateHistoricalReliability(a.wins, aBattles);
    const bReliability = calculateHistoricalReliability(b.wins, bBattles);
    return bReliability - aReliability || bBattles - aBattles || b.wins - a.wins || teamKey(a.heroIds).localeCompare(teamKey(b.heroIds));
  });

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds.map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }
  return null;
}

function getEnemyClassKey(enemyIds: string[], heroes: Hero[]): string | null {
  const classes = enemyIds.map((id) => heroes.find((hero) => hero.id === id)?.cls).filter((cls): cls is Hero["cls"] => cls === "STR" || cls === "AGI" || cls === "INT");
  if (classes.length !== TEAM_SIZE) return null;
  return [...classes].sort().join("|");
}

export function evaluateEnemyClassHistory(teamIds: string[], enemyIds: string[], combats: Combat[], heroes: Hero[]) {
  const team = uniqueIds(teamIds);
  const targetClassKey = getEnemyClassKey(enemyIds, heroes);
  if (team.length !== TEAM_SIZE || !targetClassKey) return { wins: 0, losses: 0, battles: 0, winRate: 0, classKey: targetClassKey };
  let wins = 0;
  let losses = 0;
  for (const combat of combats) {
    if (!sameTeam(team, combat.my_heroes ?? [])) continue;
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;
    if (getEnemyClassKey(historicalEnemy, heroes) !== targetClassKey) continue;
    combat.won ? wins++ : losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles), classKey: targetClassKey };
}

export function findBestHistoricalClassTeam(enemyIds: string[], combats: Combat[], heroes: Hero[]): Hero[] | null {
  const targetClassKey = getEnemyClassKey(enemyIds, heroes);
  if (!targetClassKey) return null;
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();
  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;
    if (getEnemyClassKey(historicalEnemy, heroes) !== targetClassKey) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;
    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const settings = getEngineSettings();
  const confidenceBattles = Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles);
  const ordered = [...candidates.values()].filter((candidate) => candidate.wins > 0).sort((a, b) => {
    const aBattles = a.wins + a.losses;
    const bBattles = b.wins + b.losses;
    const aConfidence = historicalConfidence(aBattles, confidenceBattles);
    const bConfidence = historicalConfidence(bBattles, confidenceBattles);
    const aReliability = aBattles > 0 ? (a.wins / aBattles) * (settings.advanced.teamAHistoricalReliabilityBase + settings.advanced.teamAHistoricalReliabilityConfidenceWeight * aConfidence) : 0;
    const bReliability = bBattles > 0 ? (b.wins / bBattles) * (settings.advanced.teamAHistoricalReliabilityBase + settings.advanced.teamAHistoricalReliabilityConfidenceWeight * bConfidence) : 0;
    return bReliability - aReliability || bBattles - aBattles || b.wins - a.wins || teamKey(a.heroIds).localeCompare(teamKey(b.heroIds));
  });

  for (const candidate of ordered) {
    const team = candidate.heroIds.map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }
  return null;
}

export function evaluateSpecificHistoryModule(teamIds: string[], enemyIds: string[], combats: Combat[], team: "A" | "B") {
  const history = evaluateExactTeamHistory(teamIds, enemyIds, combats);
  const settings = getEngineSettings();
  const budgets = getPointBudgets(settings, team);
  const points = calculateSpecificHistoryPoints(history.wins, history.losses, budgets.specificHistory);
  return { wins: history.wins, losses: history.losses, battles: history.battles, winRate: history.winRate, points, maxPoints: budgets.specificHistory };
}
