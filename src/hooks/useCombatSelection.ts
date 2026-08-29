import { useEffect, useMemo, useRef, useState } from "react";

import type { Combat, Hero } from "../types";

import {
  recommendTeam,
  recommendAlternativeTeam,
} from "../engine/scoring";

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

  /*
   * Permet d'éviter de rouvrir plusieurs fois la fenêtre
   * tant que la même équipe ennemie reste à 5 héros.
   */
  const openedEnemyKeyRef = useRef<string | null>(null);

  // ==========================================================
  // ENNEMIS
  // ==========================================================

  const enemies = useMemo(
    () =>
      enemyIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds, heroes]
  );

  // ==========================================================
  // ÉQUIPE DU JOUEUR
  // ==========================================================

  const team = useMemo(
    () =>
      teamIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [teamIds, heroes]
  );

  // ==========================================================
  // RECOMMANDATION
  // ==========================================================

  const recommendedTeam = useMemo(
    () =>
      recommendedIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter(
          (hero): hero is Hero =>
            hero !== undefined && enabledHeroIds.has(hero.id)
        ),
    [recommendedIds, heroes, enabledHeroIds]
  );

  const alternativeTeam = useMemo(
    () =>
      alternativeIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter(
          (hero): hero is Hero =>
            hero !== undefined && enabledHeroIds.has(hero.id)
        ),
    [alternativeIds, heroes, enabledHeroIds]
  );

  // ==========================================================
  // OUVERTURE DE LA FENÊTRE DE CONTRE
  // ==========================================================

  function openCounterModal(enemyTeamIds: string[]) {
    const availableHeroes = heroes.filter((hero) =>
      enabledHeroIds.has(hero.id)
    );

    const recommendation = recommendTeam(
      enemyTeamIds,
      availableHeroes,
      combats
    );

    const alternative = recommendAlternativeTeam(
      enemyTeamIds,
      availableHeroes,
      combats,
      recommendation
    );

    const ids = recommendation.map((hero) => hero.id);
    const alternativeTeamIds = alternative.map(
      (hero) => hero.id
    );

    setRecommendedIds(ids);
    setAlternativeIds(alternativeTeamIds);
    setTeamIds(ids);
    setShowCounterModal(true);
  }

  // ==========================================================
  // OUVERTURE AUTOMATIQUE À 5 ENNEMIS
  // ==========================================================

  useEffect(() => {
    if (enemyIds.length !== TEAM_SIZE) {
      /*
       * Dès qu'on repasse sous 5, on autorise une nouvelle
       * ouverture pour le prochain combat.
       */
      openedEnemyKeyRef.current = null;
      return;
    }

    const enemyKey = [...enemyIds].sort().join("|");

    /*
     * Si cette même composition a déjà déclenché la fenêtre,
     * on ne la rouvre pas à chaque render.
     */
    if (openedEnemyKeyRef.current === enemyKey) {
      return;
    }

    openedEnemyKeyRef.current = enemyKey;

    openCounterModal(enemyIds);
  }, [enemyIds]);

  // ==========================================================
  // SÉLECTION D'UNE RECOMMANDATION
  // ==========================================================

  function selectRecommendedTeam(ids: string[]) {
    const validIds = ids
      .filter((id) => enabledHeroIds.has(id))
      .slice(0, TEAM_SIZE);

    setTeamIds(validIds);
  }

  // ==========================================================
  // SÉLECTION DES ENNEMIS
  // ==========================================================

  function toggleEnemy(hero: Hero) {
    setEnemyIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) {
        return current;
      }

      /*
       * IMPORTANT :
       * Un héros ennemi peut parfaitement être présent
       * dans notre propre équipe.
       *
       * Il n'existe aucune règle empêchant :
       *
       * Ennemi : Rose Knight
       * Notre équipe : Rose Knight
       */
      return [...current, hero.id];
    });
  }

  // ==========================================================
  // SÉLECTION DE NOTRE ÉQUIPE
  // ==========================================================

  function toggleTeam(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) {
        return current;
      }

      if (!enabledHeroIds.has(hero.id)) {
        return current;
      }

      /*
       * IMPORTANT :
       * On ne bloque PAS un héros simplement parce qu'il
       * est également présent chez l'ennemi.
       */
      return [...current, hero.id];
    });
  }

  // ==========================================================
  // SÉLECTION DE NOTRE ÉQUIPE DEPUIS LA GRILLE
  // ==========================================================

  function selectCounterHero(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) {
        return current;
      }

      if (!enabledHeroIds.has(hero.id)) {
        return current;
      }

      /*
       * Aucun blocage lié à enemyIds.
       *
       * Le même héros peut être sélectionné des deux côtés.
       */
      return [...current, hero.id];
    });
  }

  // ==========================================================
  // RESET
  // ==========================================================

  function clearEnemies() {
    setEnemyIds([]);
  }

  function resetCombat() {
    setShowCounterModal(false);
    setEnemyIds([]);
    setTeamIds([]);
    setRecommendedIds([]);
    setAlternativeIds([]);

    /*
     * Autorise immédiatement la prochaine composition
     * ennemie à déclencher une nouvelle fenêtre.
     */
    openedEnemyKeyRef.current = null;
  }

  // ==========================================================
  // RETOUR
  // ==========================================================

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