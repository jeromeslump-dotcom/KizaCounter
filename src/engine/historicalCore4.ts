// src/engine/historicalCore4.ts

import type { Combat } from "../types";

// ============================================================
// CONFIGURATION
// ============================================================
//
// Ce système est totalement indépendant de scoring.ts.
//
// Son rôle :
// analyser les combats contre une même équipe ennemie et
// détecter les situations où 4 héros sont identiques et où
// seul le 5e héros change.
//
// IMPORTANT :
// l'ordre des héros ne compte JAMAIS.
//

export const CORE4_CONFIG = {
  // Nombre minimum de combats utilisant le même Core 4.
  minCore4Battles: 2,

  // Nombre minimum de combats avec un même 5e héros.
  minReplacementBattles: 1,

  // Poids réservé au système lorsqu'il sera branché
  // au moteur de recommandation.
  //
  // Ce poids n'est PAS appliqué ici.
  weight: 1,
};

// ============================================================
// TYPES
// ============================================================

export interface Core4ReplacementStats {
  heroId: string;

  wins: number;
  losses: number;
  battles: number;

  winRate: number;

  /**
   * Différence entre le taux de victoire du 5e héros
   * et le taux de victoire du Core 4.
   */
  delta: number;

  /**
   * Niveau de confiance basé sur le nombre de combats.
   * 0 = aucune confiance
   * 1 = confiance maximale
   */
  confidence: number;

  /**
   * Score historique spécifique du 5e héros.
   */
  score: number;
}

export interface Core4Analysis {
  /**
   * Équipe ennemie normalisée.
   */
  enemyIds: string[];

  /**
   * Les 4 héros du Core.
   *
   * Toujours triés afin que l'ordre n'ait aucune importance.
   */
  coreIds: string[];

  battles: number;
  wins: number;
  losses: number;
  winRate: number;

  /**
   * Comparaison des différents 5e héros utilisés
   * avec ce Core 4.
   */
  replacements: Core4ReplacementStats[];
}

// ============================================================
// NORMALISATION
// ============================================================

/**
 * Supprime les doublons et trie les héros.
 *
 * Ainsi :
 *
 * A B C D
 *
 * et :
 *
 * D C A B
 *
 * deviennent exactement :
 *
 * A B C D
 */
function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

/**
 * Crée une clé indépendante de l'ordre.
 */
function teamKey(ids: string[]): string {
  return normalizeIds(ids).join("|");
}

/**
 * Vérifie si deux compositions contiennent exactement
 * les mêmes héros, sans tenir compte de l'ordre.
 */
function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}

// ============================================================
// EXTRACTION DU 5e HÉROS
// ============================================================

/**
 * Vérifie qu'une équipe contient le Core 4 et retourne
 * le héros supplémentaire.
 *
 * Exemple :
 *
 * Core :
 * A B C D
 *
 * Équipe :
 * D Tracker A C B
 *
 * Résultat :
 * Tracker
 */
function extractReplacement(
  teamIds: string[],
  coreIds: string[]
): string | null {
  const team = normalizeIds(teamIds);
  const core = normalizeIds(coreIds);

  if (team.length !== 5 || core.length !== 4) {
    return null;
  }

  const coreSet = new Set(core);

  // Les 4 héros du Core doivent être présents.
  for (const heroId of core) {
    if (!team.includes(heroId)) {
      return null;
    }
  }

  const replacements = team.filter((heroId) => !coreSet.has(heroId));

  // Il doit rester exactement un seul héros.
  if (replacements.length !== 1) {
    return null;
  }

  return replacements[0];
}

// ============================================================
// GÉNÉRATION DES CORE 4
// ============================================================

/**
 * Génère les 5 Core 4 possibles d'une équipe de 5 héros.
 *
 * Exemple :
 *
 * A B C D E
 *
 * donne :
 *
 * B C D E
 * A C D E
 * A B D E
 * A B C E
 * A B C D
 *
 * L'ordre de départ ne compte pas.
 */
function generateCore4s(teamIds: string[]): string[][] {
  const team = normalizeIds(teamIds);

  if (team.length !== 5) {
    return [];
  }

  const cores: string[][] = [];

  for (let index = 0; index < team.length; index++) {
    cores.push(team.filter((_, currentIndex) => currentIndex !== index));
  }

  return cores;
}

// ============================================================
// CONFIANCE
// ============================================================

/**
 * Transforme le nombre de combats en niveau de confiance.
 *
 * 1 combat  = 0.25
 * 2 combats = 0.50
 * 3 combats = 0.75
 * 4+        = 1.00
 */
function calculateConfidence(battles: number): number {
  if (battles <= 0) {
    return 0;
  }

  return Math.min(battles / 4, 1);
}

// ============================================================
// TAUX DE VICTOIRE
// ============================================================

function calculateWinRate(wins: number, battles: number): number {
  if (battles <= 0) {
    return 0;
  }

  return (wins / battles) * 100;
}

// ============================================================
// ANALYSE D'UN CORE 4
// ============================================================

function analyzeCore4(
  enemyIds: string[],
  coreIds: string[],
  combats: Combat[]
): Core4Analysis | null {
  const normalizedEnemy = normalizeIds(enemyIds);
  const normalizedCore = normalizeIds(coreIds);

  if (normalizedEnemy.length === 0) {
    return null;
  }

  if (normalizedCore.length !== 4) {
    return null;
  }

  const replacements = new Map<
    string,
    {
      wins: number;
      losses: number;
    }
  >();

  let wins = 0;
  let losses = 0;

  // ----------------------------------------------------------
  // Recherche des combats correspondant au Core 4
  // ----------------------------------------------------------

  for (const combat of combats) {
    // Même équipe ennemie, sans tenir compte de l'ordre.
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) {
      continue;
    }

    const teamIds = normalizeIds(combat.my_heroes ?? []);

    if (teamIds.length !== 5) {
      continue;
    }

    const replacement = extractReplacement(teamIds, normalizedCore);

    if (!replacement) {
      continue;
    }

    if (!replacements.has(replacement)) {
      replacements.set(replacement, {
        wins: 0,
        losses: 0,
      });
    }

    const stats = replacements.get(replacement)!;

    if (combat.won) {
      stats.wins++;
      wins++;
    } else {
      stats.losses++;
      losses++;
    }
  }

  const battles = wins + losses;

  // Pas assez de données pour ce Core.
  if (battles < CORE4_CONFIG.minCore4Battles) {
    return null;
  }

  const coreWinRate = calculateWinRate(wins, battles);

  // ----------------------------------------------------------
  // Analyse des 5e héros
  // ----------------------------------------------------------

  const replacementStats: Core4ReplacementStats[] = [];

  for (const [heroId, stats] of replacements.entries()) {
    const replacementBattles = stats.wins + stats.losses;

    if (replacementBattles < CORE4_CONFIG.minReplacementBattles) {
      continue;
    }

    const winRate = calculateWinRate(stats.wins, replacementBattles);

    const delta = winRate - coreWinRate;

    const confidence = calculateConfidence(replacementBattles);

    /**
     * Le delta est pondéré par la confiance.
     *
     * Exemple :
     *
     * Core = 60 %
     * Tracker = 100 % sur 1 combat
     *
     * delta = +40
     * confiance = 0.25
     *
     * score = +10
     *
     * Une seule victoire ne peut donc pas
     * complètement dominer l'historique.
     */
    const score = delta * confidence;

    replacementStats.push({
      heroId,
      wins: stats.wins,
      losses: stats.losses,
      battles: replacementBattles,
      winRate,
      delta,
      confidence,
      score,
    });
  }

  // Meilleur 5e héros en premier.
  replacementStats.sort(
    (a, b) =>
      b.score - a.score ||
      b.battles - a.battles ||
      a.heroId.localeCompare(b.heroId)
  );

  return {
    enemyIds: normalizedEnemy,
    coreIds: normalizedCore,
    battles,
    wins,
    losses,
    winRate: coreWinRate,
    replacements: replacementStats,
  };
}

// ============================================================
// ANALYSE CORE 4 + 1
// ============================================================

/**
 * Analyse tous les Core 4 possibles contre une équipe ennemie.
 *
 * IMPORTANT :
 *
 * L'ordre des héros ne joue absolument aucun rôle.
 *
 * Exemple :
 *
 * [A, B, C, D, Tracker]
 *
 * [Tracker, D, B, A, C]
 *
 * [C, A, Tracker, D, B]
 *
 * sont tous analysés comme :
 *
 * Core = A B C D
 * 5e   = Tracker
 */
export function analyzeCore4Plus1(
  enemyIds: string[],
  combats: Combat[]
): Core4Analysis[] {
  const normalizedEnemy = normalizeIds(enemyIds);

  if (normalizedEnemy.length === 0) {
    return [];
  }

  /**
   * Map utilisée pour éviter les doublons.
   */
  const coreMap = new Map<string, string[]>();

  // ----------------------------------------------------------
  // Recherche des Core 4 présents dans l'historique
  // ----------------------------------------------------------

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) {
      continue;
    }

    const teamIds = normalizeIds(combat.my_heroes ?? []);

    if (teamIds.length !== 5) {
      continue;
    }

    const cores = generateCore4s(teamIds);

    for (const core of cores) {
      const key = teamKey(core);

      if (!coreMap.has(key)) {
        coreMap.set(key, core);
      }
    }
  }

  // ----------------------------------------------------------
  // Analyse de chaque Core
  // ----------------------------------------------------------

  const analyses: Core4Analysis[] = [];

  for (const coreIds of coreMap.values()) {
    const analysis = analyzeCore4(normalizedEnemy, coreIds, combats);

    if (!analysis) {
      continue;
    }

    analyses.push(analysis);
  }

  // Les Core les plus documentés d'abord.
  analyses.sort(
    (a, b) =>
      b.battles - a.battles ||
      b.winRate - a.winRate ||
      teamKey(a.coreIds).localeCompare(teamKey(b.coreIds))
  );

  return analyses;
}

// ============================================================
// MEILLEUR CORE 4
// ============================================================

/**
 * Retourne le Core 4 ayant les meilleures données
 * historiques.
 */
export function findBestCore4(
  enemyIds: string[],
  combats: Combat[]
): Core4Analysis | null {
  const analyses = analyzeCore4Plus1(enemyIds, combats);

  if (analyses.length === 0) {
    return null;
  }

  return [...analyses].sort(
    (a, b) =>
      b.winRate - a.winRate ||
      b.battles - a.battles ||
      teamKey(a.coreIds).localeCompare(teamKey(b.coreIds))
  )[0];
}

// ============================================================
// MEILLEUR 5e HÉROS
// ============================================================

/**
 * Cherche le meilleur 5e héros pour un Core 4 précis.
 *
 * L'ordre des héros n'intervient jamais.
 */
export function findBestCore4Replacement(
  enemyIds: string[],
  coreIds: string[],
  combats: Combat[]
): Core4ReplacementStats | null {
  const analysis = analyzeCore4(enemyIds, coreIds, combats);

  if (!analysis || analysis.replacements.length === 0) {
    return null;
  }

  return analysis.replacements[0];
}

// ============================================================
// SCORE D'UN 5e HÉROS
// ============================================================

/**
 * Retourne uniquement le score Core 4+1
 * d'un héros donné.
 *
 * Ce score est volontairement indépendant
 * du score général du moteur.
 */
export function core4ReplacementScore(
  enemyIds: string[],
  coreIds: string[],
  heroId: string,
  combats: Combat[]
): number {
  const analysis = analyzeCore4(enemyIds, coreIds, combats);

  if (!analysis) {
    return 0;
  }

  const replacement = analysis.replacements.find(
    (entry) => entry.heroId === heroId
  );

  return replacement?.score ?? 0;
}

// ============================================================
// UTILITAIRES PUBLICS
// ============================================================

/**
 * Retourne les 5 Core 4 possibles d'une équipe.
 *
 * Utile pour les tests.
 */
export function getPossibleCore4s(teamIds: string[]): string[][] {
  return generateCore4s(teamIds);
}

/**
 * Génère une clé stable pour un Core 4.
 *
 * L'ordre est ignoré.
 */
export function core4Key(coreIds: string[]): string {
  return teamKey(coreIds);
}
