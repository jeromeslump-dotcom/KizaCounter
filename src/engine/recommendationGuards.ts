import type { Combat, Hero } from "../types";
import { getEngineSettings } from "./engineSettings";
import { evaluateTeamHistory } from "./historicalScoring";
import { teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

function isHistoricalStatsEligible(battles: number, wins: number): boolean {
  const { historicalTeamMinBattles, historicalTeamMinWinRate } =
    getEngineSettings().advanced;
  const winRate = battles > 0 ? (wins / battles) * 100 : 0;

  // Below the minimum sample size, the history is inconclusive:
  // keep the historical team regardless of its observed win rate.
  // Once the sample reaches the threshold, enforce the configured win rate.
  return (
    battles > 0 &&
    (battles < historicalTeamMinBattles ||
      winRate >= historicalTeamMinWinRate)
  );
}

export function isHistoricalTeamEligible(
  teamIds: string[],
  combats: Combat[]
): boolean {
  if (uniqueIds(teamIds).length !== TEAM_SIZE) return false;

  const history = evaluateTeamHistory(teamIds, combats);
  return isHistoricalStatsEligible(history.battles, history.wins);
}

export function isHistoricalCounterEligible(
  battles: number,
  wins: number
): boolean {
  return isHistoricalStatsEligible(battles, wins);
}

/**
 * Reject a team with no wins only when its source-appropriate history has
 * reached the configured minimum sample size. Formation-based sources count
 * distinct enemy formations, just like their eligibility check.
 */
export function isHistoricallyWinlessTeam(
  team: Hero[],
  combats: Combat[]
): boolean {
  if (team.length !== TEAM_SIZE) return false;

  const history = evaluateTeamHistory(
    team.map((hero) => hero.id),
    combats
  );
  return (
    history.battles > 0 &&
    !isHistoricalStatsEligible(history.battles, history.wins)
  );
}

/**
 * A team that has already faced this exact enemy team and never beaten it
 * must not be recommended against that enemy once enough battles exist.
 */
export function isHistoricallyWinlessAgainstEnemy(
  team: Hero[],
  enemyIds: string[],
  combats: Combat[]
): boolean {
  if (team.length !== TEAM_SIZE || uniqueIds(enemyIds).length !== TEAM_SIZE) {
    return false;
  }

  const teamKeyValue = teamKey(team.map((hero) => hero.id));
  const enemyKeyValue = teamKey(uniqueIds(enemyIds));
  let battles = 0;
  let wins = 0;

  for (const combat of combats) {
    if (teamKey(uniqueIds(combat.my_heroes ?? [])) !== teamKeyValue) continue;
    if (teamKey(uniqueIds(combat.enemy_heroes ?? [])) !== enemyKeyValue) {
      continue;
    }
    battles++;
    if (combat.won) wins++;
  }

  return battles > 0 && !isHistoricalStatsEligible(battles, wins);
}

export function isUsableRecommendationTeam(
  team: Hero[],
  combats: Combat[],
  enemyIds: string[]
): boolean {
  return (
    team.length === TEAM_SIZE &&
    !isHistoricallyWinlessTeam(team, combats) &&
    !isHistoricallyWinlessAgainstEnemy(team, enemyIds, combats)
  );
}
