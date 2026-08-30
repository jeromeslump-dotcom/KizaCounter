import type { Combat } from "../types";
import { evaluateTeamHistory } from "./scoring";

export interface TeamHistoryStats {
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
}

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

export function formatWinRate(winRate: number): string {
  return `${Math.round(winRate)} %`;
}
