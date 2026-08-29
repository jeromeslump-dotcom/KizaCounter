
import { useMemo, useState } from "react";

import type { Combat, Hero } from "../types";

import {
  recommendTeam,
  recommendAlternativeTeam,
} from "../engine/scoring";

const TEAM_SIZE = 5;

interface UseCombatSelectionProps {
  heroes: Hero[];
  combats: Combat[];
}

export default function useCombatSelection({
  heroes,
  combats,
}: UseCombatSelectionProps) {
  // ============================================================
  // ENNEMIS
  // ============================================================

  const [enemyIds, setEnemyIds] = useState<string[]>([]);

  // ============================================================
  // MON ÉQUIPE
  // ============================================================

  const [teamIds, setTeamIds] = useState<string[]>([]);

  // ============================================================
  // MODALE CONTRE
  // ============================================================

  const [showCounterModal, setShowCounterModal] = useState(false);

  // ============================================================
  // RECOMMANDATIONS
  // ============================================================

  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  const [alternativeIds, setAlternativeIds] = useState<string[]>([]);

  // ============================================================
  // HÉROS ENNEMIS
  // ============================================================

  const enemies = useMemo(
    () =>
      enemyIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds, heroes]
  );

  // ============================================================
  // MON ÉQUIPE
  // ============================================================

  const team = useMemo(
    () =>
      teamIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [teamIds, heroes]
  );

  // ============================================================
  // RECOMMANDATION A
  // ============================================================

  const recommendedTeam = useMemo(() => {
    if (recommendedIds.length === 0) {
      return [];
    }

    return recommendedIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));
  }, [recommendedIds, heroes]);

  // ============================================================
  // RECOMMANDATION B
  // ============================================================

  const alternativeTeam = useMemo(() => {
    if (alternativeIds.length === 0) {
      return [];
    }

    return alternativeIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));
  }, [alternativeIds, heroes]);

  // ============================================================
  // OUVRIR LA MODALE AVEC LES RECOMMANDATIONS
  // ============================================================

  function openCounterModal(enemyTeamIds: string[]) {
    const recommendation = recommendTeam(
      enemyTeamIds,
      heroes,
      combats
    );

    const alternative = recommendAlternativeTeam(
      enemyTeamIds,
      heroes,
      combats,
      recommendation
    );

    const ids = recommendation.map((hero) => hero.id);
    const alternativeTeamIds = alternative.map(
      (hero) => hero.id
    );

    setRecommendedIds(ids);
    setAlternativeIds(alternativeTeamIds);

    // A reste sélectionnée par défaut.
    setTeamIds(ids);

    setShowCounterModal(true);
  }

  // ============================================================
  // CHOISIR UNE RECOMMANDATION
  // ============================================================

  function selectRecommendedTeam(ids: string[]) {
    const validIds = ids
      .filter((id) => !enemyIds.includes(id))
      .slice(0, TEAM_SIZE);

    setTeamIds(validIds);
  }

  // ============================================================
  // SÉLECTION ENNEMI
  // ============================================================

  function toggleEnemy(hero: Hero) {
    setEnemyIds((current) => {
      // Retirer le héros.
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      // Maximum 5 ennemis.
      if (current.length >= TEAM_SIZE) {
        return current;
      }

      // Impossible d'avoir le même héros
      // dans les deux équipes.
      if (teamIds.includes(hero.id)) {
        return current;
      }

      const next = [...current, hero.id];

      // Au 5e ennemi, on ouvre la modale.
      if (next.length === TEAM_SIZE) {
        setTimeout(() => {
          openCounterModal(next);
        }, 0);
      }

      return next;
    });
  }

  // ============================================================
  // AJOUT / RETRAIT DANS MON ÉQUIPE
  // ============================================================

  function toggleTeam(hero: Hero) {
    setTeamIds((current) => {
      // Retirer le héros.
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      // Maximum 5 héros.
      if (current.length >= TEAM_SIZE) {
        return current;
      }

      // Un ennemi ne peut pas être sélectionné.
      if (enemyIds.includes(hero.id)) {
        return current;
      }

      return [...current, hero.id];
    });
  }

  // ============================================================
  // SÉLECTION DANS LA MODALE
  // ============================================================

  function selectCounterHero(hero: Hero) {
    setTeamIds((current) => {
      // Si le héros est déjà dans l'équipe :
      // on le retire.
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      // Impossible de sélectionner un ennemi.
      if (enemyIds.includes(hero.id)) {
        return current;
      }

      // Équipe complète :
      // on ne remplace pas automatiquement.
      if (current.length >= TEAM_SIZE) {
        return current;
      }

      return [...current, hero.id];
    });
  }

  // ============================================================
  // EFFACER LES ENNEMIS
  // ============================================================

  function clearEnemies() {
    setEnemyIds([]);
  }

  // ============================================================
  // FERMER / RESETTER LA MODALE
  // ============================================================

  function resetCombat() {
    setShowCounterModal(false);
    setEnemyIds([]);
    setTeamIds([]);
    setRecommendedIds([]);
    setAlternativeIds([]);
  }

  // ============================================================
  // RETOUR
  // ============================================================

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
