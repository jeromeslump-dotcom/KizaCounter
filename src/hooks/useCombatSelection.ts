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

    // Le catalogue complet sert de référence (classes, IDs, historiques).
    // availableHeroes reste le pool strictement autorisé pour les équipes.
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

    // ÉQUIPE N°2 : même moteur de recommandation que l'équipe A.
    // B doit avoir au minimum 1 héros différent, mais peut conserver
    // les 4 autres héros de A si le moteur les considère meilleurs.
    const primaryIds = new Set(finalRecommendation.map((hero) => hero.id));

    const sourcePriority: Record<RecommendationSource, number> = {
      "exact-history": 5,
      core4: 4,
      "class-history": 3,
      "counter-usage": 2,
      fallback: 1,
    };

    let bestAlternative: Hero[] = [];
    let bestAlternativeScore = -1;

    // On lance le même moteur plusieurs fois, chaque fois en retirant
    // un seul héros différent de A. Cela garantit une vraie alternative
    // tout en laissant au moteur la possibilité de conserver les 4 autres.
    for (const excludedHeroId of primaryIds) {
      const alternativePool = availableHeroes.filter(
        (hero) => hero.id !== excludedHeroId
      );

      if (alternativePool.length < TEAM_SIZE) continue;

      const candidateRecommendation = recommendTeamWithSource(
        enemyTeamIds,
        heroes,
        combats,
        alternativePool
      );

      const candidateTeam =
        candidateRecommendation.team.length === TEAM_SIZE
          ? candidateRecommendation.team.filter((hero: Hero) =>
              enabledHeroIds.has(hero.id)
            )
          : [];

      if (candidateTeam.length !== TEAM_SIZE) continue;

      const differentHeroCount = candidateTeam.filter(
        (hero) => !primaryIds.has(hero.id)
      ).length;

      if (differentHeroCount < 1) continue;

      const score =
        sourcePriority[candidateRecommendation.source] * 100 +
        (TEAM_SIZE - differentHeroCount);

      if (score > bestAlternativeScore) {
        bestAlternative = candidateTeam;
        bestAlternativeScore = score;
      }
    }

    // Fallback de sécurité si aucune variante n'a été trouvée.
    if (bestAlternative.length !== TEAM_SIZE) {
      const alternativePool = availableHeroes.filter(
        (hero) => !primaryIds.has(hero.id)
      );

      if (alternativePool.length >= TEAM_SIZE) {
        const fallbackRecommendation = recommendTeamWithSource(
          enemyTeamIds,
          heroes,
          combats,
          alternativePool
        );

        if (fallbackRecommendation.team.length === TEAM_SIZE) {
          bestAlternative = fallbackRecommendation.team.filter((hero: Hero) =>
            enabledHeroIds.has(hero.id)
          );
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
    // Un héros désactivé ne doit jamais rester dans Votre équipe,
    // les recommandations ou l'alternative. En revanche, on ne touche
    // volontairement pas à enemyIds : tous les héros restent valides
    // pour composer l'équipe ennemie.
    setTeamIds((current) =>
      current.filter((id) => enabledHeroIds.has(id))
    );
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

    // Les combats sont chargés de façon asynchrone. Il est possible que
    // les 5 ennemis soient déjà sélectionnés quand l'historique arrive.
    // Le contexte de recommandation doit donc inclure l'état de l'historique
    // et le pool activé, sinon on conserverait une recommandation calculée
    // trop tôt sur un historique vide.
    const enemyKey = [...enemyIds].sort().join("|");
    const historyKey = `${combats.length}:${combats
      .map((combat) => combat.id ?? combat.created_at ?? "")
      .join(",")}`;
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
