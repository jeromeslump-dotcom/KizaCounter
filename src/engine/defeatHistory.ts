import type { Combat, Hero } from "../types";
import { getEngineSettings } from "./engineSettings";
import { teamKey, uniqueIds } from "./teamUtils";

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

function confidenceForBattles(
  battles: number,
  confidenceBattles: number
): number {
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
  const targetKey = teamKey(targetTeam);
  const excludedKey = teamKey(excludedTeamIds);

  if (targetTeam.length !== TEAM_SIZE) return [];

  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<string, DefeatHistoryCandidate>();
  const confidenceBattles = Math.max(
    1,
    getEngineSettings().advanced.historicalConfidenceBattles
  );

  for (const combat of combats) {
    const historicalMyTeam = uniqueIds(combat.my_heroes ?? []);

    if (
      historicalMyTeam.length !== TEAM_SIZE ||
      teamKey(historicalMyTeam) !== targetKey
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

    // combat.won describes our historical team (the current target).
    // Therefore, when it loses, the historical opponent wins.
    if (combat.won) candidate.losses++;
    else candidate.wins++;

    candidates.set(key, candidate);
  }

  const ordered = [...candidates.values()]
    .filter(
      (candidate) => candidate.wins > 0 && candidate.wins >= candidate.losses
    )
    .map((candidate) => {
      candidate.lossRate = candidate.wins / candidate.battles;
      candidate.confidence = confidenceForBattles(
        candidate.battles,
        confidenceBattles
      );
      candidate.score = candidate.lossRate * candidate.confidence;
      return {
        candidate,
        key: teamKey(candidate.heroIds),
      };
    })
    .sort(
      (a, b) =>
        b.candidate.score - a.candidate.score ||
        b.candidate.wins - a.candidate.wins ||
        b.candidate.battles - a.candidate.battles ||
        a.key.localeCompare(b.key)
    )
    .map(({ candidate }) => candidate);

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
  const candidateHeroesById = new Map(
    candidateHeroes.map((hero) => [hero.id, hero])
  );

  for (const candidate of candidates) {
    const team = candidate.heroIds
      .map((id) => candidateHeroesById.get(id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) return team;
  }

  return null;
}
