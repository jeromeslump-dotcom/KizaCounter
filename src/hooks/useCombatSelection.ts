import { useEffect, useMemo, useRef, useState } from "react";

import type { Combat, Hero } from "../types";

import {
  findHistoricalAlternativeTeam,
  recommendTeamWithSource,
  type RecommendationSource,
} from "../engine/recommendationSource";

const TEAM_SIZE = 5;

interface UseCombatSelectionProps {
  heroes: Hero[];
  combats: Combat[];
  enabledHeroIds: Set<string>;
}

function toggleTeamSelection(
  current: string[],
  hero: Hero,
  enabledHeroIds: Set<string>
): string[] {
  if (current.includes(hero.id)) {
    return current.filter((id) => id !== hero.id);
  }

  if (current.length >= TEAM_SIZE || !enabledHeroIds.has(hero.id)) {
    return current;
  }

  return [...current, hero.id];
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
      heroes,
      combats,
      availableHeroes
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
    const primaryIds = finalRecommendation.map((hero) => hero.id);

    let bestAlternative: Hero[] = [];

    if (primaryIds.length === TEAM_SIZE) {
      // B est une vraie seconde recommandation historique.
      // La seule contrainte : B doit être différent de A.
      // Aucun nombre de héros communs n'est imposé.
      const candidateTeam = findHistoricalAlternativeTeam(
        enemyTeamIds,
        heroes,
        availableHeroes,
        combats,
        primaryIds
      );

      if (candidateTeam?.length === TEAM_SIZE) {
        const sameTeam = candidateTeam.every((hero) =>
          primaryIds.includes(hero.id)
        ) && primaryIds.every((id) =>
          candidateTeam.some((hero) => hero.id === id)
        );

        if (!sameTeam) {
          bestAlternative = candidateTeam;
        }
      }
    }

    setRecommendedIds(finalRecommendation.map((hero: Hero) => hero.id));
    setAlternativeIds(bestAlternative.map((hero: Hero) => hero.id));
    setRecommendationSource(finalSource);
    setTeamIds(finalRecommendation.map((hero: Hero) => hero.id));
    setShowCounterModal(true);
  }

  useEffect(() => {
    setTeamIds((current) => current.filter((id) => enabledHeroIds.has(id)));
    setRecommendedIds((current) =>
      current.filter((id) => enabledHeroIds.has(id))
    );
    setAlternativeIds((current) =>
      current.filter((id) => enabledHeroIds.has(id))
    );
  }, [enabledHeroIds]);

  useEffect(() => {
    if (enemyIds.length !== TEAM_SIZE) {
      openedEnemyKeyRef.current = null;
      return;
    }

    const enemyKey = [...enemyIds].sort().join("|");
    const historyKey = `${combats.length}:${combats.map((combat) => combat.id ?? combat.created_at ?? "").join(",")}`;
    const enabledKey = [...enabledHeroIds].sort().join("|");
    const recommendationKey = `${enemyKey}::${historyKey}::${enabledKey}`;

    if (openedEnemyKeyRef.current === recommendationKey) return;

    openedEnemyKeyRef.current = recommendationKey;
    openCounterModal(enemyIds);
  }, [enemyIds, combats, enabledHeroIds]);

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
    setTeamIds((current) =>
      toggleTeamSelection(current, hero, enabledHeroIds)
    );
  }

  function selectCounterHero(hero: Hero) {
    setTeamIds((current) =>
      toggleTeamSelection(current, hero, enabledHeroIds)
    );
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
