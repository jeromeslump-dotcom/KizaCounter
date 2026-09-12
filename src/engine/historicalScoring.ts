import type { Hero } from "../data/heroes";
import type { Combat, HeroUsage } from "../types";
import { getEngineSettings } from "./engineSettings";
import { getClassKey, teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

export interface HistoricalEnemyContext {
  enemyKey: string;
  combats: Combat[];
}

export function buildHistoricalEnemyContext(
  enemyIds: string[],
  combats: Combat[]
): HistoricalEnemyContext {
  const enemyKey = teamKey(enemyIds);
  const matchingCombats: Combat[] = [];
  for (const combat of combats) {
    if (teamKey(combat.enemy_heroes ?? []) === enemyKey)
      matchingCombats.push(combat);
  }
  return { enemyKey, combats: matchingCombats };
}

export function historicalConfidence(
  battles: number,
  confidenceBattles: number
): number {
  if (battles <= 0) return 0;
  const safeConfidenceBattles = Math.max(1, confidenceBattles);
  return battles / (battles + safeConfidenceBattles);
}

export function calculateHistoricalReliability(
  wins: number,
  losses: number,
  confidenceBattles: number,
  base: number,
  confidenceWeight: number
): number {
  const battles = wins + losses;
  if (battles <= 0) return 0;
  const confidence = historicalConfidence(battles, confidenceBattles);
  return (wins / battles) * (base + confidenceWeight * confidence);
}

export function calculateWinRate(wins: number, total: number): number {
  return total <= 0 ? 0 : (wins / total) * 100;
}

export function evaluateExactTeamHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[]
) {
  const normalizedTeam = uniqueIds(teamIds);
  if (normalizedTeam.length !== TEAM_SIZE)
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  const enemyKey = teamKey(enemyIds);
  const teamKeyValue = teamKey(normalizedTeam);
  let wins = 0,
    losses = 0;
  for (const combat of combats) {
    if (teamKey(combat.enemy_heroes ?? []) !== enemyKey) continue;
    if (teamKey(combat.my_heroes ?? []) !== teamKeyValue) continue;
    combat.won ? wins++ : losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
}

export function calculateHeroUsage(
  combats: Combat[],
  heroes: Hero[]
): Record<string, HeroUsage> {
  const usage: Record<string, HeroUsage> = {};
  for (const hero of heroes)
    usage[hero.id] = {
      heroId: hero.id,
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
  for (const combat of combats) {
    for (const heroId of uniqueIds(combat.my_heroes ?? [])) {
      usage[heroId] ??= { heroId, total: 0, wins: 0, losses: 0, winRate: 0 };
      usage[heroId].total++;
      combat.won ? usage[heroId].wins++ : usage[heroId].losses++;
    }
  }
  for (const entry of Object.values(usage))
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  return usage;
}

export function evaluateTeamHistory(teamIds: string[], combats: Combat[]) {
  const team = uniqueIds(teamIds);
  if (team.length !== TEAM_SIZE)
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  const teamKeyValue = teamKey(team);
  let wins = 0,
    losses = 0;
  for (const combat of combats) {
    const historicalTeam = combat.my_heroes ?? [];
    if (uniqueIds(historicalTeam).length !== TEAM_SIZE) continue;
    if (teamKey(historicalTeam) !== teamKeyValue) continue;
    combat.won ? wins++ : losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
}

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[],
  context?: HistoricalEnemyContext
): Hero[] | null {
  const settings = getEngineSettings();
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const enemyKey = context?.enemyKey ?? teamKey(enemyIds);
  const historicalCombats = context?.combats ?? combats;
  const candidates = new Map<
    string,
    { heroIds: string[]; wins: number; losses: number; key: string }
  >();
  for (const combat of historicalCombats) {
    if (!context && teamKey(combat.enemy_heroes ?? []) !== enemyKey) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;
    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
      key,
    };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }
  const winningCandidates = [...candidates.values()].filter(
    (candidate) => candidate.wins > 0 && candidate.wins >= candidate.losses
  );
  if (!winningCandidates.length) return null;
  const confidenceBattles = Math.max(
    1,
    settings.advanced.historicalConfidenceBattles
  );
  winningCandidates.sort((a, b) => {
    const aBattles = a.wins + a.losses;
    const bBattles = b.wins + b.losses;
    const aReliability = calculateHistoricalReliability(
      a.wins,
      a.losses,
      confidenceBattles,
      settings.advanced.historicalReliabilityBase,
      settings.advanced.historicalReliabilityConfidenceWeight
    );
    const bReliability = calculateHistoricalReliability(
      b.wins,
      b.losses,
      confidenceBattles,
      settings.advanced.historicalReliabilityBase,
      settings.advanced.historicalReliabilityConfidenceWeight
    );
    return (
      bReliability - aReliability ||
      bBattles - aBattles ||
      b.wins - a.wins ||
      a.key.localeCompare(b.key)
    );
  });
  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroesById.get(id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }
  return null;
}

export function evaluateEnemyClassHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
) {
  const team = uniqueIds(teamIds);
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const targetClassKey = getClassKey(enemyIds, heroesById);
  if (team.length !== TEAM_SIZE || !targetClassKey)
    return {
      wins: 0,
      losses: 0,
      battles: 0,
      winRate: 0,
      classKey: targetClassKey,
    };
  const teamKeyValue = teamKey(team);
  const classKeyCache = new Map<string, string | null>();
  let wins = 0,
    losses = 0;
  for (const combat of combats) {
    if (teamKey(combat.my_heroes ?? []) !== teamKeyValue) continue;
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;
    const historicalEnemyKey = teamKey(historicalEnemy);
    let historicalClassKey = classKeyCache.get(historicalEnemyKey);
    if (historicalClassKey === undefined) {
      historicalClassKey = getClassKey(historicalEnemy, heroesById);
      classKeyCache.set(historicalEnemyKey, historicalClassKey);
    }
    if (historicalClassKey !== targetClassKey) continue;
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
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const targetClassKey = getClassKey(enemyIds, heroesById);
  if (!targetClassKey) return null;
  const classKeyCache = new Map<string, string | null>();
  const candidates = new Map<
    string,
    { heroIds: string[]; wins: number; losses: number; key: string }
  >();
  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;
    const historicalEnemyKey = teamKey(historicalEnemy);
    let historicalClassKey = classKeyCache.get(historicalEnemyKey);
    if (historicalClassKey === undefined) {
      historicalClassKey = getClassKey(historicalEnemy, heroesById);
      classKeyCache.set(historicalEnemyKey, historicalClassKey);
    }
    if (historicalClassKey !== targetClassKey) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;
    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
      key,
    };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }
  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.historicalConfidenceBattles
  );
  const ordered = [...candidates.values()]
    .filter(
      (candidate) => candidate.wins > 0 && candidate.wins >= candidate.losses
    )
    .sort((a, b) => {
      const aBattles = a.wins + a.losses;
      const bBattles = b.wins + b.losses;
      const aReliability = calculateHistoricalReliability(
        a.wins,
        a.losses,
        confidenceBattles,
        settings.advanced.historicalReliabilityBase,
        settings.advanced.historicalReliabilityConfidenceWeight
      );
      const bReliability = calculateHistoricalReliability(
        b.wins,
        b.losses,
        confidenceBattles,
        settings.advanced.historicalReliabilityBase,
        settings.advanced.historicalReliabilityConfidenceWeight
      );
      return (
        bReliability - aReliability ||
        bBattles - aBattles ||
        b.wins - a.wins ||
        a.key.localeCompare(b.key)
      );
    });
  for (const candidate of ordered) {
    const team = candidate.heroIds
      .map((id) => heroesById.get(id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) return team;
  }
  return null;
}
