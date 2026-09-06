import type { Hero } from "../data/heroes";
import type { Combat, CoverageReport, HeroUsage } from "../types";
import {
  getEngineSettings,
  getPointBudgets,
  normalizeModulePoints,
} from "./engineSettings";
import { teamKey, uniqueIds } from "./teamUtils";

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

export function calculateSpecificHistoryPoints(
  wins: number,
  losses: number,
  maxPoints: number
): number {
  const battles = wins + losses;
  if (battles <= 0 || maxPoints <= 0) return 0;
  const confidenceBattles = Math.max(
    1,
    getEngineSettings().advanced.historicalConfidenceBattles
  );
  const confidence = historicalConfidence(battles, confidenceBattles);
  return normalizeModulePoints((wins / battles) * confidence, maxPoints);
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

export function coverageReport(
  enemyIds: string[],
  teamIds: string[],
  combats: Combat[]
): CoverageReport {
  const normalizedEnemy = uniqueIds(enemyIds);
  const team = uniqueIds(teamIds);
  if (normalizedEnemy.length !== TEAM_SIZE || team.length === 0)
    return {
      enemyIds: normalizedEnemy,
      covered: 0,
      total: team.length,
      percentage: 0,
      heroes: [],
    };
  const enemyKey = teamKey(normalizedEnemy);
  type ReplacementStats = { wins: number; losses: number };
  const byHeroAndCore = new Map<string, Map<string, ReplacementStats>>();
  for (const combat of combats) {
    if (teamKey(combat.enemy_heroes ?? []) !== enemyKey) continue;
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
      let wins = 0,
        losses = 0;
      const heroGroups = byHeroAndCore.get(heroId);
      if (heroGroups)
        for (const stats of heroGroups.values()) {
          const battles = stats.wins + stats.losses;
          if (battles < settings.advanced.core4MinBattles) continue;
          wins += stats.wins;
          losses += stats.losses;
        }
      const battles = wins + losses;
      const winRate = calculateWinRate(wins, battles);
      const confidence = historicalConfidence(
        battles,
        settings.advanced.core4ConfidenceBattles
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
    const aBattles = a.wins + a.losses,
      bBattles = b.wins + b.losses;
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

function getEnemyClassKey(
  enemyIds: string[],
  heroesById: Map<string, Hero>
): string | null {
  let agi = 0,
    int = 0,
    str = 0;
  for (const id of enemyIds) {
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

export function evaluateEnemyClassHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
) {
  const team = uniqueIds(teamIds);
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const targetClassKey = getEnemyClassKey(enemyIds, heroesById);
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
      historicalClassKey = getEnemyClassKey(historicalEnemy, heroesById);
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
  const targetClassKey = getEnemyClassKey(enemyIds, heroesById);
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
      historicalClassKey = getEnemyClassKey(historicalEnemy, heroesById);
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
      const aBattles = a.wins + a.losses,
        bBattles = b.wins + b.losses;
      const aReliability = calculateHistoricalReliability(
          a.wins,
          a.losses,
          confidenceBattles,
          settings.advanced.historicalReliabilityBase,
          settings.advanced.historicalReliabilityConfidenceWeight
        ),
        bReliability = calculateHistoricalReliability(
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

export function evaluateSpecificHistoryModule(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  team: "A" | "B"
) {
  const history = evaluateExactTeamHistory(teamIds, enemyIds, combats);
  const settings = getEngineSettings();
  const budgets = getPointBudgets(settings, team);
  const points = calculateSpecificHistoryPoints(
    history.wins,
    history.losses,
    budgets.specificHistory
  );
  return {
    wins: history.wins,
    losses: history.losses,
    battles: history.battles,
    winRate: history.winRate,
    points,
    maxPoints: budgets.specificHistory,
  };
}
