import { useMemo } from "react";

import type { Combat, Hero } from "../types";

import {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
} from "../engine/historicalScoring";
import { findHistoricalDefeatCounters } from "../engine/defeatHistory";
import { getEngineSettings } from "../engine/engineSettings";
import { type RecommendationSource } from "../engine/recommendationSource";
import {
  SIMILAR_HISTORY_SHARED_HEROES,
  teamKey,
} from "../engine/teamUtils";

const EMPTY_HISTORY = {
  wins: 0,
  losses: 0,
  battles: 0,
  winRate: 0,
};

function evaluateSimilarTeamHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[]
) {
  const teamKeyValue = teamKey(teamIds);

  if (teamIds.length !== 5 || enemyIds.length !== 5) {
    return EMPTY_HISTORY;
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (teamKey(combat.my_heroes ?? []) !== teamKeyValue) continue;

    const historicalEnemy = [...new Set(combat.enemy_heroes ?? [])];

    if (historicalEnemy.length !== 5) continue;

    const sharedHeroes = historicalEnemy.reduce(
      (count, heroId) => count + (enemyIds.includes(heroId) ? 1 : 0),
      0
    );

    if (sharedHeroes !== SIMILAR_HISTORY_SHARED_HEROES) continue;

    if (combat.won) {
      wins++;
    } else {
      losses++;
    }
  }

  const battles = wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate: battles > 0 ? (wins / battles) * 100 : 0,
  };
}

interface UseCounterHistoryProps {
  open: boolean;
  enemies: Hero[];
  teamIds: string[];
  recommendedTeam: Hero[];
  alternativeTeam: Hero[];
  recommendationSource: RecommendationSource | null;
  alternativeRecommendationSource: RecommendationSource | null;
  heroes: Hero[];
  combats: Combat[];
}

export default function useCounterHistory({
  open,
  enemies,
  teamIds,
  recommendedTeam,
  alternativeTeam,
  recommendationSource,
  alternativeRecommendationSource,
  heroes,
  combats,
}: UseCounterHistoryProps) {
  const enemyIds = useMemo(() => enemies.map((hero) => hero.id), [enemies]);

  const recommendedIds = useMemo(
    () => recommendedTeam.map((hero) => hero.id),
    [recommendedTeam]
  );

  const alternativeIds = useMemo(
    () => alternativeTeam.map((hero) => hero.id),
    [alternativeTeam]
  );

  const currentTeamHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(teamIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, teamIds, enemyIds, combats]
  );

  const currentTeamGeneralHistory = useMemo(
    () => (open ? evaluateTeamHistory(teamIds, combats) : EMPTY_HISTORY),
    [open, teamIds, combats]
  );

  const currentTeamClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(teamIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, teamIds, enemyIds, combats, heroes]
  );

  const currentTeamConfidence = useMemo(() => {
    const battles =
      currentTeamHistory.battles > 0
        ? currentTeamHistory.battles
        : currentTeamClassHistory.battles;

    if (battles <= 0) return 0;

    const confidenceBattles = Math.max(
      1,
      getEngineSettings().advanced.historicalConfidenceBattles
    );

    return (battles / (battles + confidenceBattles)) * 100;
  }, [currentTeamHistory.battles, currentTeamClassHistory.battles]);

  const recommendedExactHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(recommendedIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, recommendedIds, enemyIds, combats]
  );

  const recommendedClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(recommendedIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, recommendedIds, enemyIds, combats, heroes]
  );

  const recommendedSimilarHistory = useMemo(
    () =>
      open && recommendationSource === "similar-history"
        ? evaluateSimilarTeamHistory(recommendedIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, recommendationSource, recommendedIds, enemyIds, combats]
  );

  const alternativeHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(alternativeIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, alternativeIds, enemyIds, combats]
  );

  const alternativeClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(alternativeIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, alternativeIds, enemyIds, combats, heroes]
  );

  const alternativeSimilarHistory = useMemo(
    () =>
      open && alternativeRecommendationSource === "similar-history"
        ? evaluateSimilarTeamHistory(alternativeIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, alternativeRecommendationSource, alternativeIds, enemyIds, combats]
  );

  const recommendedDefeatHistory = useMemo(() => {
    if (!open || recommendedIds.length !== 5) return null;

    return (
      findHistoricalDefeatCounters(enemyIds, combats, heroes).find(
        (candidate) => teamKey(candidate.heroIds) === teamKey(recommendedIds)
      ) ?? null
    );
  }, [open, recommendedIds, enemyIds, combats, heroes]);

  const alternativeDefeatHistory = useMemo(() => {
    if (!open || alternativeIds.length !== 5) return null;

    return (
      findHistoricalDefeatCounters(enemyIds, combats, heroes).find(
        (candidate) => teamKey(candidate.heroIds) === teamKey(alternativeIds)
      ) ?? null
    );
  }, [open, alternativeIds, enemyIds, combats, heroes]);

  return {
    enemyIds,
    recommendedIds,
    alternativeIds,
    currentTeamHistory,
    currentTeamGeneralHistory,
    currentTeamClassHistory,
    currentTeamConfidence,
    recommendedExactHistory,
    recommendedClassHistory,
    recommendedSimilarHistory,
    alternativeHistory,
    alternativeClassHistory,
    alternativeSimilarHistory,
    recommendedDefeatHistory,
    alternativeDefeatHistory,
  };
}
