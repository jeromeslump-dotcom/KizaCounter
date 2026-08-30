// src/engine/scoring.ts

import type { Hero } from "../data/heroes";

import type {
  Combat,
  CoverageReport,
  HeroScore,
  HeroUsage,
  TeamEvaluation,
  TeamScore,
} from "../types";

import {
  CORE4_CONFIG,
  findBestCore4,
  core4ReplacementScore,
} from "./historicalCore4";

// ============================================================
// CONSTANTES
// ============================================================

const TEAM_SIZE = 5;
const MIN_HISTORICAL_RELIABILITY = 60;

// ============================================================
// OUTILS
// ============================================================

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function teamKey(ids: string[]): string {
  return uniqueIds(ids).sort().join("|");
}

function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}

// ============================================================
// UTILISATION DES HÉROS
// ============================================================

export function calculateHeroUsage(
  combats: Combat[],
  heroes: Hero[]
): Record<string, HeroUsage> {
  const usage: Record<string, HeroUsage> = {};

  for (const hero of heroes) {
    usage[hero.id] = {
      heroId: hero.id,
      total: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
    };
  }

  for (const combat of combats) {
    for (const heroId of combat.my_heroes ?? []) {
      if (!usage[heroId]) {
        usage[heroId] = {
          heroId,
          total: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
        };
      }

      usage[heroId].total += 1;

      if (combat.won) {
        usage[heroId].wins += 1;
      } else {
        usage[heroId].losses += 1;
      }
    }
  }

  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return usage;
}

// ============================================================
// TAUX DE VICTOIRE
// ============================================================

export function calculateWinRate(wins: number, total: number): number {
  if (total <= 0) return 0;
  return (wins / total) * 100;
}

// ============================================================
// COUVERTURE HISTORIQUE — COMPOSITION ENNEMIE COMPLÈTE
// ============================================================

/**
 * Analyse les héros candidats uniquement contre UNE composition
 * ennemie complète.
 *
 * Exemple :
 *   Ennemi = A B C D E
 *
 * Les combats contre A B C D X, A B C D Y, etc. sont comparés
 * uniquement lorsqu'ils affrontent exactement A B C D E.
 *
 * Pour chaque héros candidat, le héros constitue le 5e élément d'un
 * Core4 implicite : les quatre autres héros de notre équipe forment
 * le Core4. L'ordre n'a aucune importance.
 *
 * Le score est pondéré par la confiance :
 *   confiance = min(combats / 4, 1)
 *   score = taux de victoire × confiance
 *
 * Ainsi un 1-0 ne domine pas automatiquement un historique plus fourni.
 */
export function coverageReport(
  enemyIds: string[],
  teamIds: string[],
  combats: Combat[]
): CoverageReport {
  const normalizedEnemy = uniqueIds(enemyIds);
  const team = uniqueIds(teamIds);

  if (normalizedEnemy.length !== TEAM_SIZE || team.length === 0) {
    return {
      enemyIds: normalizedEnemy,
      covered: 0,
      total: team.length,
      percentage: 0,
      heroes: [],
    };
  }

  const stats = new Map<string, { wins: number; losses: number }>();

  // Seuls les combats contre la composition ennemie COMPLETE comptent.
  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) {
      continue;
    }

    const myIds = uniqueIds(combat.my_heroes ?? []);

    if (myIds.length !== TEAM_SIZE) {
      continue;
    }

    for (const heroId of team) {
      // Le héros est le 5e héros du Core4 implicite.
      if (!myIds.includes(heroId)) {
        continue;
      }

      const entry = stats.get(heroId) ?? { wins: 0, losses: 0 };

      if (combat.won) {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }

      stats.set(heroId, entry);
    }
  }

  const heroes = team
    .map((heroId) => {
      const entry = stats.get(heroId) ?? { wins: 0, losses: 0 };
      const battles = entry.wins + entry.losses;
      const winRate = calculateWinRate(entry.wins, battles);
      const confidence = Math.min(battles / 4, 1);
      const score = winRate * confidence;

      return {
        heroId,
        wins: entry.wins,
        losses: entry.losses,
        battles,
        winRate,
        confidence,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.wins - a.wins ||
        a.heroId.localeCompare(b.heroId)
    );

  const covered = heroes.filter((hero) => hero.wins > 0).length;

  return {
    enemyIds: normalizedEnemy,
    covered,
    total: team.length,
    percentage: team.length > 0 ? (covered / team.length) * 100 : 0,
    heroes,
  };
}

// ============================================================
// SCORE D'UTILISATION D'UN HÉROS
// ============================================================

export function heroUsageScore(
  heroId: string,
  usage: Record<string, HeroUsage>
): number {
  const entry = usage[heroId];

  if (!entry || entry.total <= 0) return 0;

  const winRateScore = entry.winRate;
  const experienceBonus = Math.min(entry.total * 2, 20);

  return clamp(winRateScore + experienceBonus, 0, 120);
}

// ============================================================
// SCORE STATISTIQUE D'UN HÉROS
// ============================================================

export function heroStatScore(hero: Hero): number {
  const { hp, atk, matk, def, mdef } = hero.stats;
  const totalAttack = atk + matk;
  const totalDefense = def + mdef;

  const hpScore = hp / 1000;
  const attackScore = totalAttack / 100;
  const defenseScore = totalDefense / 10;

  return hpScore + attackScore + defenseScore;
}

// ============================================================
// SCORE D'UN HÉROS
// ============================================================

export function scoreHero(
  hero: Hero,
  usage: Record<string, HeroUsage>
): HeroScore {
  const usageScore = heroUsageScore(hero.id, usage);
  const statScore = heroStatScore(hero);

  return {
    heroId: hero.id,
    score: usageScore + statScore,
  };
}

// ============================================================
// SCORE HISTORIQUE D'UNE ÉQUIPE
// ============================================================

export function evaluateTeamHistory(
  teamIds: string[],
  combats: Combat[]
): {
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
} {
  const team = uniqueIds(teamIds);

  if (team.length === 0) {
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    const historicalTeam = new Set(combat.my_heroes ?? []);
    const matches = team.every((heroId) => historicalTeam.has(heroId));

    if (!matches) continue;

    if (combat.won) wins += 1;
    else losses += 1;
  }

  const battles = wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate: calculateWinRate(wins, battles),
  };
}

// ============================================================
// ÉVALUATION D'UNE ÉQUIPE
// ============================================================

export function evaluateTeam(
  team: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage>
): TeamEvaluation {
  const teamIds = team.map((hero) => hero.id);
  const history = evaluateTeamHistory(teamIds, combats);

  const usageValues = team.map((hero) => heroUsageScore(hero.id, usage));
  const statValues = team.map((hero) => heroStatScore(hero));

  const usageScore =
    usageValues.length > 0
      ? usageValues.reduce((sum, value) => sum + value, 0) / usageValues.length
      : 0;

  const statScore =
    statValues.length > 0
      ? statValues.reduce((sum, value) => sum + value, 0) / statValues.length
      : 0;

  const score = history.winRate * 2 + usageScore * 0.5 + statScore;

  return {
    score,
    historicalWins: history.wins,
    historicalLosses: history.losses,
    historicalBattles: history.battles,
    historicalWinRate: history.winRate,
    usageScore,
    statScore,
  };
}

// ============================================================
// SCORE D'UNE ÉQUIPE
// ============================================================

export function scoreTeam(
  team: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage>
): TeamScore {
  const evaluation = evaluateTeam(team, combats, usage);

  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluation.score,
  };
}

// ============================================================
// IDENTIFIER LES COMBATS CONTRE LES MÊMES ENNEMIS
// ============================================================

function isSameEnemyTeam(
  enemyIds: string[],
  combatEnemyIds: string[]
): boolean {
  return sameTeam(enemyIds, combatEnemyIds);
}

// ============================================================
// MEILLEURE ÉQUIPE HISTORIQUE
// ============================================================

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  const candidates = new Map<
    string,
    { heroIds: string[]; wins: number; losses: number }
  >();

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) continue;

    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE) continue;

    const key = teamKey(heroIds);
    let candidate = candidates.get(key);

    if (!candidate) {
      candidate = { heroIds, wins: 0, losses: 0 };
      candidates.set(key, candidate);
    }

    if (combat.won) candidate.wins += 1;
    else candidate.losses += 1;
  }

  const winningCandidates = [...candidates.values()].filter(
    (candidate) => candidate.wins > 0
  );

  if (winningCandidates.length === 0) return null;

  const usage = calculateHeroUsage(combats, heroes);

  let bestTeam: Hero[] | null = null;
  let bestCandidate: (typeof winningCandidates)[number] | null = null;
  let bestEvaluation: TeamEvaluation | null = null;
  let bestReliability = -Infinity;
  let bestBattles = -Infinity;

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length !== TEAM_SIZE) continue;

    const battles = candidate.wins + candidate.losses;
    const winRate = calculateWinRate(candidate.wins, battles);
    const confidence = Math.min(battles / 10, 1);
    const reliability = winRate * (0.35 + 0.65 * confidence);

    const evaluation = evaluateTeam(team, combats, usage);
    const currentTeamKey = teamKey(candidate.heroIds);
    const bestTeamKey = bestCandidate ? teamKey(bestCandidate.heroIds) : "";

    const isBetter =
      !bestCandidate ||
      reliability > bestReliability ||
      (reliability === bestReliability && battles > bestBattles) ||
      (reliability === bestReliability && battles === bestBattles && candidate.wins > bestCandidate.wins) ||
      (reliability === bestReliability && battles === bestBattles && candidate.wins === bestCandidate.wins && evaluation.score > (bestEvaluation?.score ?? -Infinity)) ||
      (reliability === bestReliability && battles === bestBattles && candidate.wins === bestCandidate.wins && evaluation.score === (bestEvaluation?.score ?? -Infinity) && currentTeamKey < bestTeamKey);

    if (isBetter) {
      bestCandidate = candidate;
      bestEvaluation = evaluation;
      bestTeam = team;
      bestReliability = reliability;
      bestBattles = battles;
    }
  }

  return bestTeam && bestReliability >= MIN_HISTORICAL_RELIABILITY
    ? bestTeam
    : null;
}

// ============================================================
// SCORE HISTORIQUE CONTRE LES ENNEMIS
// ============================================================

function calculateCounterUsage(
  enemyIds: string[],
  combats: Combat[]
): Record<string, { wins: number; losses: number; total: number; winRate: number }> {
  const result: Record<string, { wins: number; losses: number; total: number; winRate: number }> = {};

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) continue;

    for (const heroId of combat.my_heroes ?? []) {
      if (!result[heroId]) {
        result[heroId] = { wins: 0, losses: 0, total: 0, winRate: 0 };
      }

      result[heroId].total += 1;
      if (combat.won) result[heroId].wins += 1;
      else result[heroId].losses += 1;
    }
  }

  for (const entry of Object.values(result)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return result;
}

// ============================================================
// SCORE SPÉCIFIQUE CONTRE LES ENNEMIS
// ============================================================

function counterHeroScore(
  hero: Hero,
  usage: Record<string, HeroUsage>,
  counterUsage: Record<string, { wins: number; losses: number; total: number; winRate: number }>
): number {
  const general = heroUsageScore(hero.id, usage);
  const stats = heroStatScore(hero);
  const counter = counterUsage[hero.id];

  let counterScore = 0;
  if (counter) {
    counterScore = counter.winRate * 2 + Math.min(counter.total * 3, 15);
  }

  return counterScore + general * 0.25 + stats * 0.15;
}

// ============================================================
// RECOMMANDATION D'ÉQUIPE
// ============================================================

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): Hero[] {
  if (enemyIds.length === 0) return [];

  const enemySet = new Set(enemyIds);
  const historicalTeam = findBestHistoricalTeam(enemyIds, combats, heroes);

  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    return historicalTeam;
  }

  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));
  if (availableHeroes.length <= TEAM_SIZE) return availableHeroes;

  const usage = calculateHeroUsage(combats, heroes);
  const counterUsage = calculateCounterUsage(enemyIds, combats);

  const ranked = availableHeroes
    .map((hero) => ({ hero, score: counterHeroScore(hero, usage, counterUsage) }))
    .sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name));

  const recommended: Hero[] = [];
  const classCounts: Record<string, number> = { STR: 0, AGI: 0, INT: 0 };

  // ==========================================================
  // CORE 4 HISTORIQUE
  // ==========================================================

  const bestCore4 = findBestCore4(enemyIds, combats);

  if (bestCore4) {
    const core4Heroes = bestCore4.coreIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (core4Heroes.length === 4) {
      for (const hero of core4Heroes) {
        if (!enemySet.has(hero.id) && !recommended.some((selected) => selected.id === hero.id)) {
          recommended.push(hero);
          classCounts[hero.cls] = (classCounts[hero.cls] ?? 0) + 1;
        }
      }

      if (recommended.length === 4) {
        const core4Ids = core4Heroes.map((hero) => hero.id);
        let bestReplacement: Hero | null = null;
        let bestReplacementScore = -Infinity;

        for (const candidate of ranked) {
          if (core4Ids.includes(candidate.hero.id)) continue;
          if (enemySet.has(candidate.hero.id)) continue;

          const historicalScore = core4ReplacementScore(
            enemyIds,
            core4Ids,
            candidate.hero.id,
            combats
          );

          const finalScore = candidate.score + historicalScore * CORE4_CONFIG.weight;

          if (
            finalScore > bestReplacementScore ||
            (finalScore === bestReplacementScore &&
              (!bestReplacement || candidate.hero.name.localeCompare(bestReplacement.name) < 0))
          ) {
            bestReplacementScore = finalScore;
            bestReplacement = candidate.hero;
          }
        }

        if (bestReplacement) recommended.push(bestReplacement);
      }

      return recommended;
    }
  }

  // ==========================================================
  // FALLBACK : MOTEUR NORMAL
  // ==========================================================

  while (recommended.length < TEAM_SIZE && ranked.length > 0) {
    let bestIndex = -1;
    let bestAdjustedScore = -Infinity;

    for (let i = 0; i < ranked.length; i++) {
      const candidate = ranked[i];
      const currentCount = classCounts[candidate.hero.cls] ?? 0;
      let classPenalty = 0;

      if (currentCount >= 1) classPenalty += 8 * currentCount;
      if (currentCount >= 2) classPenalty += 20;
      if (currentCount >= 3) classPenalty += 40;

      const adjustedScore = candidate.score - classPenalty;

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) break;

    const selected = ranked.splice(bestIndex, 1)[0].hero;
    recommended.push(selected);
    classCounts[selected.cls] = (classCounts[selected.cls] ?? 0) + 1;
  }

  return recommended;
}

// ============================================================
// RECOMMANDATION ALTERNATIVE
// ============================================================

export function recommendAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  primaryTeam: Hero[] = []
): Hero[] {
  if (enemyIds.length === 0) return [];

  const enemySet = new Set(enemyIds);
  const primarySet = new Set(primaryTeam.map((hero) => hero.id));
  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));

  if (availableHeroes.length <= TEAM_SIZE) return availableHeroes;

  const usage = calculateHeroUsage(combats, heroes);
  const counterUsage = calculateCounterUsage(enemyIds, combats);

  const ranked = availableHeroes
    .map((hero) => {
      const general = heroUsageScore(hero.id, usage);
      const stats = heroStatScore(hero);
      const counter = counterUsage[hero.id];
      const counterScore = counter ? counter.winRate * 1.2 + Math.min(counter.total * 2, 10) : 0;
      const explorationBonus = primarySet.has(hero.id) ? -18 : 8;
      const score = stats * 1.35 + counterScore + general * 0.1 + explorationBonus;
      return { hero, score };
    })
    .sort((a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name));

  const alternative: Hero[] = [];
  const classCounts: Record<string, number> = { STR: 0, AGI: 0, INT: 0 };

  while (alternative.length < TEAM_SIZE && ranked.length > 0) {
    let bestIndex = -1;
    let bestAdjustedScore = -Infinity;

    for (let i = 0; i < ranked.length; i++) {
      const candidate = ranked[i];
      const currentCount = classCounts[candidate.hero.cls] ?? 0;
      let classPenalty = 0;

      if (currentCount >= 1) classPenalty += 8 * currentCount;
      if (currentCount >= 2) classPenalty += 20;
      if (currentCount >= 3) classPenalty += 40;

      const adjustedScore = candidate.score - classPenalty;
      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) break;

    const selected = ranked.splice(bestIndex, 1)[0].hero;
    alternative.push(selected);
    classCounts[selected.cls] = (classCounts[selected.cls] ?? 0) + 1;
  }

  return alternative;
}

// ============================================================
// TRI DES HÉROS PAR SCORE
// ============================================================

export function rankHeroes(heroes: Hero[], combats: Combat[]): HeroScore[] {
  const usage = calculateHeroUsage(combats, heroes);

  return heroes
    .map((hero) => scoreHero(hero, usage))
    .sort((a, b) => b.score - a.score);
}
