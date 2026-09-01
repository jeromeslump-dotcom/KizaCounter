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
  //
  // IMPORTANT :
  // Ne PAS filtrer avec enabledHeroIds ici.
  //
  // enabledHeroIds sert à gérer le roster cliquable.
  // Le moteur doit recevoir le roster complet afin de
  // pouvoir construire une vraie équipe de 5.
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
     * IMPORTANT :
     *
     * On utilise TOUT le roster.
     *
     * Avant :
     *
     *   heroes.filter(hero => enabledHeroIds.has(hero.id))
     *
     * pouvait donner seulement 2 héros au moteur.
     *
     * Maintenant le moteur dispose toujours du roster complet.
     */
    const availableHeroes = heroes;

    // ----------------------------------------------------------
    // RECOMMANDATION PRINCIPALE
    // ----------------------------------------------------------

    const recommendation = recommendTeam(
      enemyTeamIds,
      availableHeroes,
      combats
    );

    /*
     * Sécurité :
     * une recommandation affichée automatiquement doit être
     * une vraie équipe de 5.
     *
     * Si le moteur retourne moins de 5 héros, on ne l'injecte
     * pas dans "Votre équipe".
     */
    const validRecommendation =
      recommendation.length === TEAM_SIZE ? recommendation : [];

    // ----------------------------------------------------------
    // ALTERNATIVE
    // ----------------------------------------------------------

    const alternative = recommendAlternativeTeam(
      enemyTeamIds,
      availableHeroes,
      combats,
      validRecommendation
    );

    const validAlternative =
      alternative.length === TEAM_SIZE ? alternative : [];

    const ids = validRecommendation.map((hero) => hero.id);

    const alternativeTeamIds = validAlternative.map((hero) => hero.id);

    setRecommendedIds(ids);
    setAlternativeIds(alternativeTeamIds);

    /*
     * La recommandation initiale est automatiquement placée
     * dans notre équipe.
     *
     * Mais uniquement si elle contient bien 5 héros.
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
     * Une équipe sélectionnée doit toujours contenir
     * au maximum 5 héros.
     *
     * On ne filtre PAS avec enabledHeroIds :
     * les IDs viennent déjà d'une recommandation valide.
     */
    const validIds = ids
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
       * Ici, contrairement au moteur de recommandation,
       * enabledHeroIds reste volontairement utilisé :
       *
       * un héros désactivé dans le gestionnaire ne peut pas
       * être ajouté manuellement depuis le roster.
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
