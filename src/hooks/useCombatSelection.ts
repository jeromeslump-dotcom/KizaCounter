import { useEffect, useMemo, useState } from "react";

import type { Combat, Hero } from "../types";

import { recommendTeam, recommendAlternativeTeam } from "../engine/scoring";

const TEAM_SIZE = 5;

interface UseCombatSelectionProps {
  heroes: Hero[];
  combats: Combat[];
  enabledHeroIds: Set<string>;
}

export default function useCombatSelection({
  heroes,
  combats,
  enabledHeroIds,
}: UseCombatSelectionProps) {
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [alternativeIds, setAlternativeIds] = useState<string[]>([]);

  const recommendationHeroes = useMemo(
    () => heroes.filter((hero) => enabledHeroIds.has(hero.id)),
    [heroes, enabledHeroIds]
  );

  const enemies = useMemo(
    () =>
      enemyIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds, heroes]
  );

  const team = useMemo(
    () =>
      teamIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [teamIds, heroes]
  );

  const recommendedTeam = useMemo(
    () =>
      recommendedIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [recommendedIds, heroes]
  );

  const alternativeTeam = useMemo(
    () =>
      alternativeIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [alternativeIds, heroes]
  );

  function openCounterModal(enemyTeamIds: string[]) {
    const recommendation = recommendTeam(
      enemyTeamIds,
      recommendationHeroes,
      combats
    );

    const alternative = recommendAlternativeTeam(
      enemyTeamIds,
      recommendationHeroes,
      combats,
      recommendation
    );

    const ids = recommendation.map((hero) => hero.id);
    const alternativeTeamIds = alternative.map((hero) => hero.id);

    setRecommendedIds(ids);
    setAlternativeIds(alternativeTeamIds);
    setTeamIds(ids);
    setShowCounterModal(true);
  }

  useEffect(() => {
    if (enemyIds.length !== TEAM_SIZE) return;
    openCounterModal(enemyIds);
  }, [enemyIds, recommendationHeroes, combats]);

  function selectRecommendedTeam(ids: string[]) {
    const validIds = ids
      .filter((id) => !enemyIds.includes(id))
      .filter((id) => enabledHeroIds.has(id))
      .slice(0, TEAM_SIZE);

    setTeamIds(validIds);
  }

  function toggleEnemy(hero: Hero) {
    setEnemyIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) return current;
      if (teamIds.includes(hero.id)) return current;

      return [...current, hero.id];
    });
  }

  function toggleTeam(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) return current;
      if (enemyIds.includes(hero.id)) return current;
      if (!enabledHeroIds.has(hero.id)) return current;

      return [...current, hero.id];
    });
  }

  function selectCounterHero(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (enemyIds.includes(hero.id)) return current;
      if (current.length >= TEAM_SIZE) return current;
      if (!enabledHeroIds.has(hero.id)) return current;

      return [...current, hero.id];
    });
  }

  function clearEnemies() {
    setEnemyIds([]);
  }

  function resetCombat() {
    setShowCounterModal(false);
    setEnemyIds([]);
    setTeamIds([]);
    setRecommendedIds([]);
    setAlternativeIds([]);
  }

  return {
    enemyIds,
    teamIds,
    showCounterModal,
    recommendedIds,
    alternativeIds,
    enemies,
    team,
    recommendedTeam,
    alternativeTeam,
    toggleEnemy,
    toggleTeam,
    selectCounterHero,
    selectRecommendedTeam,
    clearEnemies,
    resetCombat,
    openCounterModal,
  };
}
