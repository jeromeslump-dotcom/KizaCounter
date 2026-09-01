// src/engine/historicalCore4.ts

import type { Combat } from "../types";
import { getEngineSettings, type EngineSettings } from "./engineSettings";

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

// ============================================================
// NORMALISATION
// ============================================================

function normalizeIds(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function teamKey(ids: string[]): string {
  return normalizeIds(ids).join("|");
}

function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}

// ============================================================
// EXTRACTION DU 5e HÉROS
// ============================================================

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

  for (const heroId of core) {
    if (!team.includes(heroId)) {
      return null;
    }
  }

  const replacements = team.filter((heroId) => !coreSet.has(heroId));

  if (replacements.length !== 1) {
    return null;
  }

  return replacements[0];
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

// ============================================================
// CONFIANCE
// ============================================================

function calculateConfidence(
  battles: number,
  settings: EngineSettings
): number {
  if (battles <= 0) {
    return 0;
  }

  return Math.min(
    battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
    1
  );
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

    const confidence = calculateConfidence(replacementBattles, settings);

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

  replacementStats.sort(
    (a, b) =>
      b.score - a.score ||
      b.battles - a.battles ||
      a.heroId.localeCompare(b.heroId)
  );

  return {
    enemyIds: normalizeIds(enemyIds),
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

  if (normalizedEnemy.length === 0) {
    return [];
  }

  const coreMap = new Map<string, Core4Accumulator>();

  // ----------------------------------------------------------
  // UN SEUL PARCOURS
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

    for (const coreIds of cores) {
      const key = teamKey(coreIds);

      let accumulator = coreMap.get(key);

      if (!accumulator) {
        accumulator = {
          coreIds,
          wins: 0,
          losses: 0,
          replacements: new Map<string, ReplacementAccumulator>(),
        };

        coreMap.set(key, accumulator);
      }

      const replacement = extractReplacement(teamIds, coreIds);

      if (!replacement) {
        continue;
      }

      if (combat.won) {
        accumulator.wins++;
      } else {
        accumulator.losses++;
      }

      let replacementStats = accumulator.replacements.get(replacement);

      if (!replacementStats) {
        replacementStats = {
          wins: 0,
          losses: 0,
        };

        accumulator.replacements.set(replacement, replacementStats);
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
      teamKey(a.coreIds).localeCompare(teamKey(b.coreIds))
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

  return [...analyses].sort((a, b) => {
    const aConfidence = Math.min(
      a.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
      1
    );

    const bConfidence = Math.min(
      b.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
      1
    );

    const aScore = a.winRate * aConfidence;

    const bScore = b.winRate * bConfidence;

    return (
      bScore - aScore ||
      b.battles - a.battles ||
      b.wins - a.wins ||
      teamKey(a.coreIds).localeCompare(teamKey(b.coreIds))
    );
  })[0];
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

  const key = teamKey(normalizedCore);

  const analysis = analyses.find((entry) => teamKey(entry.coreIds) === key);

  if (!analysis || analysis.replacements.length === 0) {
    return null;
  }

  return analysis.replacements[0];
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

  const key = teamKey(normalizedCore);

  const analysis = analyses.find((entry) => teamKey(entry.coreIds) === key);

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

export function getPossibleCore4s(teamIds: string[]): string[][] {
  return generateCore4s(teamIds);
}

export function core4Key(coreIds: string[]): string {
  return teamKey(coreIds);
}
