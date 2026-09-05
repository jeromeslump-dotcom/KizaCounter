import type { Combat, Hero } from "../types";
import { getEngineSettings } from "./engineSettings";
import { sameTeam, teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

export interface DefeatHistoryCandidate {
  heroIds: string[];
  losses: number;
  wins: number;
  battles: number;
  lossRate: number;
  confidence: number;
  score: number;
}

function confidenceForBattles(battles: number): number {
  const confidenceBattles = Math.max(
    1,
    getEngineSettings().advanced.teamAHistoricalConfidenceBattles
  );

  return battles / (battles + confidenceBattles);
}

/**
 * Inverse historical engine:
 * the current enemy team becomes our historical team.
 * We search every historical battle played with that exact 5-hero team,
 * then identify which complete opponent teams defeated it.
 */
export function findHistoricalDefeatCounters(
  enemyIds: string[],
  combats: Combat[],
  candidateHeroes: Hero[],
  excludedTeamIds: string[] = []
): DefeatHistoryCandidate[] {
  const targetTeam = uniqueIds(enemyIds);
  const excludedKey = teamKey(excludedTeamIds);

  if (targetTeam.length !== TEAM_SIZE) return [];

  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<string, DefeatHistoryCandidate>();

  for (const combat of combats) {
    const historicalMyTeam = uniqueIds(combat.my_heroes ?? []);

    if (
      historicalMyTeam.length !== TEAM_SIZE ||
      !sameTeam(historicalMyTeam, targetTeam)
    ) {
      continue;
    }

    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);

    if (
      historicalEnemy.length !== TEAM_SIZE ||
      !historicalEnemy.every((id) => enabledIds.has(id))
    ) {
      continue;
    }

    const key = teamKey(historicalEnemy);
    if (key === excludedKey) continue;

    const candidate = candidates.get(key) ?? {
      heroIds: historicalEnemy,
      losses: 0,
      wins: 0,
      battles: 0,
      lossRate: 0,
      confidence: 0,
      score: 0,
    };

    candidate.battles++;
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const ordered = [...candidates.values()]
    .filter((candidate) => candidate.losses > 0)
    .map((candidate) => {
      candidate.lossRate = candidate.losses / candidate.battles;
      candidate.confidence = confidenceForBattles(candidate.battles);
      candidate.score = candidate.lossRate * candidate.confidence;
      return candidate;
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.losses - a.losses ||
        b.battles - a.battles ||
        teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
    );

  return ordered;
}

export function findBestHistoricalDefeatTeam(
  enemyIds: string[],
  combats: Combat[],
  candidateHeroes: Hero[],
  excludedTeamIds: string[] = []
): Hero[] | null {
  const candidates = findHistoricalDefeatCounters(
    enemyIds,
    combats,
    candidateHeroes,
    excludedTeamIds
  );

  for (const candidate of candidates) {
    const team = candidate.heroIds
      .map((id) => candidateHeroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) return team;
  }

  return null;
}
