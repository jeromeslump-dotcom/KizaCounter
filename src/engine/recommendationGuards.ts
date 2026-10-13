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
  const { historicalTeamMinBattles } = getEngineSettings().advanced;
  let battles = 0;
  let wins = 0;

  for (const combat of combats) {
    if (teamKey(uniqueIds(combat.my_heroes ?? [])) !== key) continue;
    battles++;
    if (combat.won) wins++;
  }

  // Do not permanently reject a team on a tiny sample: the configured minimum
  // sample size controls when a low win rate becomes meaningful.
  return (
    battles >= historicalTeamMinBattles && battles > 0 && wins === 0
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
  const { historicalTeamMinBattles } = getEngineSettings().advanced;
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

  return (
    battles >= historicalTeamMinBattles && battles > 0 && wins === 0
  );
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
