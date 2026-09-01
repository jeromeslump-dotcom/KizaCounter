import { useEffect, useMemo, useRef, useState } from "react";

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

  /*
   * Empêche l'ouverture multiple de la même contre
   * lorsque les 5 ennemis restent identiques.
   */
  const openedEnemyKeyRef = useRef<string | null>(null);

  // ==========================================================
  // ROSTER ACTIF
  //
  // IMPORTANT :
  // Le moteur de recommandation doit travailler uniquement
  // avec les héros activés dans le Hero Manager.
  //
  // Un héros désactivé est donc réellement retiré du moteur :
  // - Team A
  // - Team B
  // - Core4
  // - remplacements
  // - fallback
  // ==========================================================

  const enabledHeroes = useMemo(
    () => heroes.filter((hero) => enabledHeroIds.has(hero.id)),
    [heroes, enabledHeroIds]
  );

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
  // NOTRE ÉQUIPE
  // ==========================================================

  const team = useMemo(
    () =>
      teamIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [teamIds, heroes]
  );

  // ==========================================================
  // RECOMMANDATION PRINCIPALE
  // ==========================================================

  const recommendedTeam = useMemo(
    () =>
      recommendedIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [recommendedIds, heroes]
  );

  // ==========================================================
  // ÉQUIPE ALTERNATIVE
  // ==========================================================

  const alternativeTeam = useMemo(
    () =>
      alternativeIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [alternativeIds, heroes]
  );

  // ==========================================================
  // OUVERTURE DE LA FENÊTRE DE CONTRE
  // ==========================================================

  function openCounterModal(enemyTeamIds: string[]) {
    /*
     * --------------------------------------------------------
     * IMPORTANT :
     *
     * Le moteur reçoit UNIQUEMENT les héros activés.
     *
     * Avant :
     *
     *   const availableHeroes = heroes;
     *
     * Cela permettait à un héros désactivé dans le Hero Manager
     * de revenir dans les recommandations.
     *
     * Maintenant :
     *
     *   const availableHeroes = enabledHeroes;
     *
     * Un héros désactivé est donc réellement exclu.
     * --------------------------------------------------------
     */

    const availableHeroes = enabledHeroes;

    /*
     * Impossible de construire une équipe complète si moins
     * de 5 héros sont activés.
     */
    if (availableHeroes.length < TEAM_SIZE) {
      setRecommendedIds([]);
      setAlternativeIds([]);
      setTeamIds([]);
      setShowCounterModal(true);
      return;
    }

    // ----------------------------------------------------------
    // RECOMMANDATION PRINCIPALE — TEAM A
    // ----------------------------------------------------------

    const recommendation = recommendTeam(
      enemyTeamIds,
      availableHeroes,
      combats
    );

    /*
     * Sécurité :
     * une recommandation automatique doit toujours contenir
     * exactement 5 héros.
     */
    const validRecommendation =
      recommendation.length === TEAM_SIZE
        ? recommendation.filter((hero) => enabledHeroIds.has(hero.id))
        : [];

    /*
     * Deuxième sécurité :
     * si le moteur renvoyait malgré tout un héros désactivé,
     * on refuse la recommandation plutôt que de l'afficher.
     */
    const finalRecommendation =
      validRecommendation.length === TEAM_SIZE ? validRecommendation : [];

    // ----------------------------------------------------------
    // ALTERNATIVE — TEAM B
    // ----------------------------------------------------------

    const alternative = recommendAlternativeTeam(
      enemyTeamIds,
      availableHeroes,
      combats,
      finalRecommendation
    );

    /*
     * Même protection pour Team B.
     */
    const validAlternative =
      alternative.length === TEAM_SIZE
        ? alternative.filter((hero) => enabledHeroIds.has(hero.id))
        : [];

    const finalAlternative =
      validAlternative.length === TEAM_SIZE ? validAlternative : [];

    const ids = finalRecommendation.map((hero) => hero.id);

    const alternativeTeamIds = finalAlternative.map((hero) => hero.id);

    setRecommendedIds(ids);
    setAlternativeIds(alternativeTeamIds);

    /*
     * La recommandation initiale est automatiquement placée
     * dans notre équipe.
     *
     * Si aucune équipe complète n'est disponible, on laisse
     * l'équipe vide.
     */
    setTeamIds(ids);

    setShowCounterModal(true);
  }

  // ==========================================================
  // OUVERTURE AUTOMATIQUE À 5 ENNEMIS
  // ==========================================================

  useEffect(() => {
    if (enemyIds.length !== TEAM_SIZE) {
      /*
       * Tant qu'il n'y a pas 5 ennemis, aucune contre
       * n'est générée.
       */
      openedEnemyKeyRef.current = null;
      return;
    }

    const enemyKey = [...enemyIds].sort().join("|");

    /*
     * Même composition :
     * ne pas recalculer / rouvrir.
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
    /*
     * Une équipe sélectionnée doit uniquement contenir
     * des héros actuellement activés.
     */
    const validIds = ids
      .filter((id) => enabledHeroIds.has(id))
      .filter((id) => heroes.some((hero) => hero.id === id))
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

      return [...current, hero.id];
    });
  }

  // ==========================================================
  // SÉLECTION MANUELLE DE NOTRE ÉQUIPE
  // ==========================================================

  function toggleTeam(hero: Hero) {
    setTeamIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) {
        return current;
      }

      /*
       * Un héros désactivé ne peut jamais être ajouté
       * manuellement.
       */
      if (!enabledHeroIds.has(hero.id)) {
        return current;
      }

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

      /*
       * Un héros désactivé est toujours interdit.
       */
      if (!enabledHeroIds.has(hero.id)) {
        return current;
      }

      /*
       * Pas de blocage selon enemyIds.
       *
       * Un même héros peut être présent chez l'ennemi
       * et dans notre équipe.
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
