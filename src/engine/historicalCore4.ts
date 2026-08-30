// src/engine/historicalCore4.ts

import type { Combat } from "../types";
import {
  DEFAULT_ENGINE_SETTINGS,
  getEngineSettings,
  type EngineSettings,
} from "./engineSettings";

// ============================================================
// COMPATIBILITÉ
// ============================================================

// Conservé pour les éventuels appelants existants. Les fonctions
// ci-dessous utilisent désormais les réglages du moteur au moment
// de leur exécution.
export const CORE4_CONFIG = {
  minCore4Battles: DEFAULT_ENGINE_SETTINGS.advanced.core4MinBattles,
  minReplacementBattles:
    DEFAULT_ENGINE_SETTINGS.advanced.core4MinReplacementBattles,
  weight: DEFAULT_ENGINE_SETTINGS.teamA.core4Weight,
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

  if (team.length !== 5 || core.length !== 4) return null;

  const coreSet = new Set(core);

  for (const heroId of core) {
    if (!team.includes(heroId)) return null;
  }

  const replacements = team.filter((heroId) => !coreSet.has(heroId));
  if (replacements.length !== 1) return null;

  return replacements[0];
}

// ============================================================
// GÉNÉRATION DES CORE 4
// ============================================================

function generateCore4s(teamIds: string[]): string[][] {
  const team = normalizeIds(teamIds);

  if (team.length !== 5) return [];

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
  if (battles <= 0) return 0;

  return Math.min(
    battles / settings.advanced.core4ConfidenceBattles,
    1
  );
}

// ============================================================
// TAUX DE VICTOIRE
// ============================================================

function calculateWinRate(wins: number, battles: number): number {
  if (battles <= 0) return 0;
  return (wins / battles) * 100;
}

// ============================================================
// ANALYSE D'UN CORE 4
// ============================================================

function analyzeCore4(
  enemyIds: string[],
  coreIds: string[],
  combats: Combat[],
  settings: EngineSettings
): Core4Analysis | null {
  const normalizedEnemy = normalizeIds(enemyIds);
  const normalizedCore = normalizeIds(coreIds);

  if (normalizedEnemy.length === 0 || normalizedCore.length !== 4) {
    return null;
  }

  const replacements = new Map<
    string,
    { wins: number; losses: number }
  >();

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) {
      continue;
    }

    const teamIds = normalizeIds(combat.my_heroes ?? []);
    if (teamIds.length !== 5) continue;

    const replacement = extractReplacement(teamIds, normalizedCore);
    if (!replacement) continue;

    if (!replacements.has(replacement)) {
      replacements.set(replacement, { wins: 0, losses: 0 });
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

  if (battles < settings.advanced.core4MinBattles) return null;

  const coreWinRate = calculateWinRate(wins, battles);
  const replacementStats: Core4ReplacementStats[] = [];

  for (const [heroId, stats] of replacements.entries()) {
    const replacementBattles = stats.wins + stats.losses;

    if (
      replacementBattles <
      settings.advanced.core4MinReplacementBattles
    ) {
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

export function analyzeCore4Plus1(
  enemyIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4Analysis[] {
  const normalizedEnemy = normalizeIds(enemyIds);

  if (normalizedEnemy.length === 0) return [];

  const coreMap = new Map<string, string[]>();

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) continue;

    const teamIds = normalizeIds(combat.my_heroes ?? []);
    if (teamIds.length !== 5) continue;

    for (const core of generateCore4s(teamIds)) {
      const key = teamKey(core);
      if (!coreMap.has(key)) coreMap.set(key, core);
    }
  }

  const analyses: Core4Analysis[] = [];

  for (const coreIds of coreMap.values()) {
    const analysis = analyzeCore4(
      normalizedEnemy,
      coreIds,
      combats,
      settings
    );

    if (analysis) analyses.push(analysis);
  }

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

export function findBestCore4(
  enemyIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4Analysis | null {
  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  if (analyses.length === 0) return null;

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

export function findBestCore4Replacement(
  enemyIds: string[],
  coreIds: string[],
  combats: Combat[],
  settings: EngineSettings = getEngineSettings()
): Core4ReplacementStats | null {
  const analysis = analyzeCore4(enemyIds, coreIds, combats, settings);

  if (!analysis || analysis.replacements.length === 0) return null;

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
  const analysis = analyzeCore4(enemyIds, coreIds, combats, settings);

  if (!analysis) return 0;

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
