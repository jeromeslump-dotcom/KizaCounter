import { useEffect, useMemo, useRef, useState } from "react";

import type { Combat, Hero } from "../types";

import {
  recommendTeamWithSource,
  type RecommendationSource,
} from "../engine/recommendationSource";

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
  const [recommendationSource, setRecommendationSource] =
    useState<RecommendationSource | null>(null);
  const openedEnemyKeyRef = useRef<string | null>(null);

  const enabledHeroes = useMemo(
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
    const availableHeroes = enabledHeroes;

    if (availableHeroes.length < TEAM_SIZE) {
      setRecommendedIds([]);
      setAlternativeIds([]);
      setRecommendationSource(null);
      setTeamIds([]);
      setShowCounterModal(true);
      return;
    }

    const recommendation = recommendTeamWithSource(
      enemyTeamIds,
      availableHeroes,
      combats
    );

    const validRecommendation =
      recommendation.team.length === TEAM_SIZE
        ? recommendation.team.filter((hero: Hero) =>
            enabledHeroIds.has(hero.id)
          )
        : [];

    const finalRecommendation =
      validRecommendation.length === TEAM_SIZE ? validRecommendation : [];
    const finalSource =
      finalRecommendation.length === TEAM_SIZE ? recommendation.source : null;

    // ÉQUIPE N°2 : on relance exactement le même moteur de recommandation,
    // mais sans les 5 héros de l'équipe n°1. Cela remplace l'ancien moteur
    // d'alternative (score individuel + Core4 + historiques + pénalité), qui
    // pouvait reconstruire une équipe générique indépendante de l'ennemi.
    const alternativePool = availableHeroes.filter(
      (hero) => !finalRecommendation.some((selected) => selected.id === hero.id)
    );

    const secondRecommendation =
      alternativePool.length >= TEAM_SIZE
        ? recommendTeamWithSource(enemyTeamIds, alternativePool, combats).team
        : [];

    const validAlternative =
      secondRecommendation.length === TEAM_SIZE
        ? secondRecommendation.filter((hero: Hero) =>
            enabledHeroIds.has(hero.id)
          )
        : [];

    const finalAlternative =
      validAlternative.length === TEAM_SIZE ? validAlternative : [];

    setRecommendedIds(finalRecommendation.map((hero: Hero) => hero.id));
    setAlternativeIds(finalAlternative.map((hero: Hero) => hero.id));
    setRecommendationSource(finalSource);
    setTeamIds(finalRecommendation.map((hero: Hero) => hero.id));
    setShowCounterModal(true);
  }

  useEffect(() => {
    if (enemyIds.length !== TEAM_SIZE) {
      openedEnemyKeyRef.current = null;
      return;
    }

    const enemyKey = [...enemyIds].sort().join("|");
    if (openedEnemyKeyRef.current === enemyKey) return;

    openedEnemyKeyRef.current = enemyKey;
    openCounterModal(enemyIds);
  }, [enemyIds]);

  function selectRecommendedTeam(ids: string[]) {
    const validIds = ids
      .filter((id) => enabledHeroIds.has(id))
      .filter((id) => heroes.some((hero) => hero.id === id))
      .slice(0, TEAM_SIZE);
    setTeamIds(validIds);
  }

  function toggleEnemy(hero: Hero) {
    setEnemyIds((current) => {
      if (current.includes(hero.id))
        return current.filter((id) => id !== hero.id);
      if (current.length >= TEAM_SIZE) return current;
      return [...current, hero.id];
    });
  }

  function toggleTeam(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id))
        return current.filter((id) => id !== hero.id);
      if (current.length >= TEAM_SIZE || !enabledHeroIds.has(hero.id))
        return current;
      return [...current, hero.id];
    });
  }

  function selectCounterHero(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id))
        return current.filter((id) => id !== hero.id);
      if (current.length >= TEAM_SIZE || !enabledHeroIds.has(hero.id))
        return current;
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
    setRecommendationSource(null);
    openedEnemyKeyRef.current = null;
  }

  return {
    enemyIds,
    teamIds,
    showCounterModal,
    recommendedIds,
    alternativeIds,
    recommendationSource,
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
