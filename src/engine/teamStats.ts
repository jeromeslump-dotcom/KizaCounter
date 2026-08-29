import type { Combat } from "../types";
import { evaluateTeamHistory } from "./scoring";

export interface TeamHistoryStats {
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
}

/**
 * Historique global d'une équipe, quel que soit l'adversaire.
 *
 * Cette fonction reste volontairement inchangée pour les autres
 * endroits du moteur qui ont besoin des statistiques générales.
 */
export function getTeamHistoryStats(
  teamIds: string[],
  combats: Combat[]
): TeamHistoryStats {
  const history = evaluateTeamHistory(teamIds, combats);

  return {
    battles: history.battles,
    wins: history.wins,
    losses: history.losses,
    winRate: history.winRate,
  };
}

/**
 * Historique d'une équipe contre UNE équipe ennemie précise.
 *
 * L'ordre des héros n'a aucune importance :
 * [A,B,C,D,E] === [E,D,C,B,A]
 *
 * On ne compte que les combats où :
 * - les 5 ennemis correspondent exactement
 * - les 5 héros de notre équipe correspondent exactement
 */
export function getMatchupHistoryStats(
  enemyIds: string[],
  teamIds: string[],
  combats: Combat[]
): TeamHistoryStats {
  const enemySet = new Set(enemyIds);
  const teamSet = new Set(teamIds);

  let battles = 0;
  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (
      combat.enemy_heroes.length !== enemyIds.length ||
      combat.my_heroes.length !== teamIds.length
    ) {
      continue;
    }

    const combatEnemySet = new Set(combat.enemy_heroes);
    const combatTeamSet = new Set(combat.my_heroes);

    // Même équipe ennemie
    const sameEnemies =
      combatEnemySet.size === enemySet.size &&
      [...enemySet].every((id) => combatEnemySet.has(id));

    if (!sameEnemies) continue;

    // Même équipe recommandée
    const sameTeam =
      combatTeamSet.size === teamSet.size &&
      [...teamSet].every((id) => combatTeamSet.has(id));

    if (!sameTeam) continue;

    battles++;

    if (combat.won) {
      wins++;
    } else {
      losses++;
    }
  }

  return {
    battles,
    wins,
    losses,
    winRate: battles > 0 ? (wins / battles) * 100 : 0,
  };
}

export function formatWinRate(winRate: number): string {
  return `${Math.round(winRate)} %`;
}
