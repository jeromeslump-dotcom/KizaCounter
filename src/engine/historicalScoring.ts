import type { Hero } from "../data/heroes";
import type { Combat, HeroUsage } from "../types";
import { getEngineSettings } from "./engineSettings";
import { getClassKey, teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

export interface HistoricalCandidate {
  heroIds: string[];
  wins: number;
  losses: number;
  similarity: number;
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

export interface DistinctFormationResult {
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
}

/** Counts each unordered five-hero enemy formation once, using its majority result. */
export function summarizeDistinctFormationResults(
  results: Array<{ formationKey: string; won: boolean }>
): DistinctFormationResult {
  const byFormation = new Map<string, { wins: number; losses: number }>();
  for (const result of results) {
    const stats = byFormation.get(result.formationKey) ?? { wins: 0, losses: 0 };
    if (result.won) stats.wins++;
    else stats.losses++;
    byFormation.set(result.formationKey, stats);
  }

  let wins = 0;
  let losses = 0;
  for (const stats of byFormation.values()) {
    if (stats.wins >= stats.losses) wins++;
    else losses++;
  }
  const battles = wins + losses;
  return { wins, losses, battles, winRate: calculateWinRate(wins, battles) };
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
  const results = combats
    .filter((combat) =>
      teamKey(combat.enemy_heroes ?? []) === enemyKey &&
      teamKey(combat.my_heroes ?? []) === teamKeyValue &&
      uniqueIds(combat.enemy_heroes ?? []).length === TEAM_SIZE
    )
    .map((combat) => ({ formationKey: teamKey(combat.enemy_heroes), won: combat.won }));
  return summarizeDistinctFormationResults(results);
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
  const results = combats
    .filter((combat) =>
      uniqueIds(combat.my_heroes ?? []).length === TEAM_SIZE &&
      teamKey(combat.my_heroes ?? []) === teamKeyValue &&
      uniqueIds(combat.enemy_heroes ?? []).length === TEAM_SIZE
    )
    .map((combat) => ({ formationKey: teamKey(combat.enemy_heroes), won: combat.won }));
  return summarizeDistinctFormationResults(results);
}

export function collectHistoricalCandidates(
  combats: Combat[],
  matchesHistoricalEnemy?: (historicalEnemy: string[]) => number | null
): Map<string, HistoricalCandidate> {
  const candidates = new Map<string, HistoricalCandidate>();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    const similarity = matchesHistoricalEnemy
      ? matchesHistoricalEnemy(historicalEnemy)
      : 0;
    if (similarity === null) continue;

    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;

    const key = teamKey(heroIds);
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

  return candidates;
}

export function orderHistoricalCandidates(
  candidates: Iterable<HistoricalCandidate>,
  sortBySimilarity = false
): HistoricalCandidate[] {
  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.historicalConfidenceBattles
  );

  return [...candidates]
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
  const results: Array<{ formationKey: string; won: boolean }> = [];
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
    results.push({ formationKey: historicalEnemyKey, won: combat.won });
  }
  return { ...summarizeDistinctFormationResults(results), classKey: targetClassKey };
}
