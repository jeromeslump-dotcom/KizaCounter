// src/engine/historicalCore4.ts

import type { Combat } from "../types";
import { getEngineSettings, type EngineSettings } from "./engineSettings";
import {
  calculateHistoricalReliability,
  historicalConfidence,
} from "./historicalScoring";

// ============================================================
// TYPES
// ============================================================

export interface Core4ReplacementStats {
  heroId: string;
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  delta: number;
  confidence: number;
  score: number;
}

export interface Core4Analysis {
  enemyIds: string[];
  coreIds: string[];
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
  replacements: Core4ReplacementStats[];
}

interface ReplacementAccumulator {
  wins: number;
  losses: number;
}

interface Core4Accumulator {
  coreIds: string[];
  wins: number;
  losses: number;
  replacements: Map<string, ReplacementAccumulator>;
}

interface Core4Entry {
  key: string;
  coreIds: string[];
  replacement: string;
}

// ============================================================
// NORMALISATION
// ============================================================

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

// ============================================================
// GÉNÉRATION DES CORE4
// ============================================================

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

function generateCore4Entries(teamIds: string[]): Core4Entry[] {
  const team = normalizeIds(teamIds);

  if (team.length !== 5) {
    return [];
  }

  const entries: Core4Entry[] = [];

  for (let index = 0; index < team.length; index++) {
    const coreIds = team.filter((_, currentIndex) => currentIndex !== index);

    entries.push({
      key: coreIds.join("|"),
      coreIds,
      replacement: team[index],
    });
  }

  return entries;
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
// CONSTRUCTION D'UNE ANALYSE CORE4
// ============================================================

function buildCore4Analysis(
  enemyIds: string[],
  accumulator: Core4Accumulator,
  settings: EngineSettings
): Core4Analysis | null {
  const battles = accumulator.wins + accumulator.losses;

  if (battles < settings.advanced.core4MinBattles) {
    return null;
  }

  const coreWinRate = calculateWinRate(accumulator.wins, battles);
  const replacementStats: Core4ReplacementStats[] = [];

  for (const [heroId, stats] of accumulator.replacements.entries()) {
    const replacementBattles = stats.wins + stats.losses;

    if (replacementBattles < settings.advanced.core4MinReplacementBattles) {
      continue;
    }

    const winRate = calculateWinRate(stats.wins, replacementBattles);
    const delta = winRate - coreWinRate;
    const confidence = historicalConfidence(
      replacementBattles,
      settings.advanced.core4ConfidenceBattles
    );

    replacementStats.push({
      heroId,
      wins: stats.wins,
      losses: stats.losses,
      battles: replacementBattles,
      winRate,
      delta,
      confidence,
      score: delta * confidence,
    });
  }

  replacementStats.sort(
    (a, b) =>
      b.score - a.score ||
      b.battles - a.battles ||
      a.heroId.localeCompare(b.heroId)
  );

  return {
    enemyIds,
    coreIds: [...accumulator.coreIds],
    battles,
    wins: accumulator.wins,
    losses: accumulator.losses,
    winRate: coreWinRate,
    replacements: replacementStats,
  };
}

// ============================================================
// ANALYSE CORE4 + 1
//
// UN SEUL PARCOURS DES COMBATS.
// ============================================================

export function analyzeCore4Plus1(
  enemyIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4Analysis[] {
  const normalizedEnemy = normalizeIds(enemyIds);

  if (normalizedEnemy.length !== 5) {
    return [];
  }

  const enemyKey = normalizedEnemy.join("|");
  const coreMap = new Map<string, Core4Accumulator>();
  const coreEntriesCache = new Map<string, Core4Entry[]>();

  // ----------------------------------------------------------
  // UN SEUL PARCOURS DES COMBATS
  // ----------------------------------------------------------

  for (const combat of combats) {
    // Une donnée historique n'est valide pour Core4 que si les
    // deux équipes sont composées de 5 héros uniques.
    const combatEnemy = normalizeIds(combat.enemy_heroes ?? []);

    if (combatEnemy.length !== 5 || combatEnemy.join("|") !== enemyKey) {
      continue;
    }

    const teamIds = normalizeIds(combat.my_heroes ?? []);

    if (teamIds.length !== 5) {
      continue;
    }

    // Une même équipe peut apparaître dans beaucoup de combats.
    // On génère ses 5 Core4 une seule fois puis on réutilise le résultat.
    const teamKey = teamIds.join("|");
    let entries = coreEntriesCache.get(teamKey);

    if (!entries) {
      entries = generateCore4Entries(teamIds);
      coreEntriesCache.set(teamKey, entries);
    }

    // --------------------------------------------------------
    // Les 5 Core4 possibles d'une équipe de 5
    // --------------------------------------------------------

    for (const entry of entries) {
      let accumulator = coreMap.get(entry.key);

      if (!accumulator) {
        accumulator = {
          coreIds: entry.coreIds,
          wins: 0,
          losses: 0,
          replacements: new Map<string, ReplacementAccumulator>(),
        };

        coreMap.set(entry.key, accumulator);
      }

      // ------------------------------------------------------
      // Résultat global du Core4
      // ------------------------------------------------------

      if (combat.won) {
        accumulator.wins++;
      } else {
        accumulator.losses++;
      }

      // ------------------------------------------------------
      // Résultat du 5e héros
      // ------------------------------------------------------

      let replacementStats = accumulator.replacements.get(entry.replacement);

      if (!replacementStats) {
        replacementStats = {
          wins: 0,
          losses: 0,
        };

        accumulator.replacements.set(entry.replacement, replacementStats);
      }

      if (combat.won) {
        replacementStats.wins++;
      } else {
        replacementStats.losses++;
      }
    }
  }

  // ----------------------------------------------------------
  // CONSTRUCTION EN MÉMOIRE
  // ----------------------------------------------------------

  const analyses: Core4Analysis[] = [];

  for (const accumulator of coreMap.values()) {
    const analysis = buildCore4Analysis(normalizedEnemy, accumulator, settings);

    if (analysis) {
      analyses.push(analysis);
    }
  }

  // ----------------------------------------------------------
  // TRI
  // ----------------------------------------------------------

  analyses.sort(
    (a, b) =>
      b.battles - a.battles ||
      b.winRate - a.winRate ||
      a.coreIds.join("|").localeCompare(b.coreIds.join("|"))
  );

  return analyses;
}

// ============================================================
// MEILLEUR CORE4
// ============================================================

export function findBestCore4(
  enemyIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4Analysis | null {
  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  if (analyses.length === 0) {
    return null;
  }

  let best = analyses[0];
  let bestScore = calculateHistoricalReliability(
    best.wins,
    best.losses,
    settings.advanced.core4ConfidenceBattles,
    0,
    1
  );

  for (let index = 1; index < analyses.length; index++) {
    const current = analyses[index];
    const score = calculateHistoricalReliability(
      current.wins,
      current.losses,
      settings.advanced.core4ConfidenceBattles,
      0,
      1
    );

    if (
      score > bestScore ||
      (score === bestScore &&
        (current.battles > best.battles ||
          (current.battles === best.battles &&
            (current.wins > best.wins ||
              (current.wins === best.wins &&
                current.coreIds
                  .join("|")
                  .localeCompare(best.coreIds.join("|")) < 0)))))
    ) {
      best = current;
      bestScore = score;
    }
  }

  return best;
}

// ============================================================
// MEILLEUR 5e HÉROS
// ============================================================

export function findBestCore4Replacement(
  enemyIds: string[],
  coreIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4ReplacementStats | null {
  const normalizedEnemy = normalizeIds(enemyIds);
  const normalizedCore = normalizeIds(coreIds);

  if (normalizedEnemy.length === 0 || normalizedCore.length !== 4) {
    return null;
  }

  const analyses = analyzeCore4Plus1(normalizedEnemy, combats, settings);
  const key = normalizedCore.join("|");

  for (const analysis of analyses) {
    if (analysis.coreIds.join("|") !== key) {
      continue;
    }

    return analysis.replacements[0] ?? null;
  }

  return null;
}

// ============================================================
// SCORE D'UN 5e HÉROS
// ============================================================

export function core4ReplacementScore(
  enemyIds: string[],
  coreIds: string[],
  heroId: string,
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): number {
  const normalizedEnemy = normalizeIds(enemyIds);
  const normalizedCore = normalizeIds(coreIds);

  if (normalizedEnemy.length === 0 || normalizedCore.length !== 4) {
    return 0;
  }

  const analyses = analyzeCore4Plus1(normalizedEnemy, combats, settings);
  const key = normalizedCore.join("|");

  for (const analysis of analyses) {
    if (analysis.coreIds.join("|") !== key) {
      continue;
    }

    for (const replacement of analysis.replacements) {
      if (replacement.heroId === heroId) {
        return replacement.score;
      }
    }

    return 0;
  }

  return 0;
}

// ============================================================
// UTILITAIRES PUBLICS
// ============================================================

export function getPossibleCore4s(teamIds: string[]): string[][] {
  return generateCore4s(teamIds);
}

export function core4Key(coreIds: string[]): string {
  return coreIds.join("|");
}
