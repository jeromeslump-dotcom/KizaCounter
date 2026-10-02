import type { Combat, Hero } from "../types";
import { getEngineSettings } from "./engineSettings";
import { evaluateTeamHistory } from "./historicalScoring";
import { teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

function isHistoricalStatsEligible(battles: number, wins: number): boolean {
  const { exactHistoryMinBattles, exactHistoryMinWinRate } =
    getEngineSettings().advanced;
  const winRate = battles > 0 ? (wins / battles) * 100 : 0;

  return battles >= exactHistoryMinBattles && winRate >= exactHistoryMinWinRate;
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
 * A team that has already been played but has never won must never be
 * proposed again, regardless of which recommendation source selected it.
 * An unseen team is still allowed: 0 battles is not a 0% historical record.
 */
export function isHistoricallyWinlessTeam(
  team: Hero[],
  combats: Combat[]
): boolean {
  if (team.length !== TEAM_SIZE) return false;

  const key = teamKey(team.map((hero) => hero.id));
  let battles = 0;
  let wins = 0;

  for (const combat of combats) {
    if (teamKey(uniqueIds(combat.my_heroes ?? [])) !== key) continue;
    battles++;
    if (combat.won) wins++;
  }

  return battles > 0 && wins === 0;
}

/**
 * A team that has already faced this exact enemy team and never beaten it
 * must not be recommended against that enemy, even if it has wins elsewhere.
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

  return battles > 0 && wins === 0;
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
