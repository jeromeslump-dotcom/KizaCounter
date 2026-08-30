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

import { findBestCore4, core4ReplacementScore } from "./historicalCore4";
import { getEngineSettings, type EngineSettings } from "./engineSettings";

const TEAM_SIZE = 5;

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
      if (combat.won) usage[heroId].wins += 1;
      else usage[heroId].losses += 1;
    }
  }

  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return usage;
}

export function calculateWinRate(wins: number, total: number): number {
  if (total <= 0) return 0;
  return (wins / total) * 100;
}

export function coverageReport(
  enemyIds: string[],
  teamIds: string[],
  combats: Combat[]
): CoverageReport {
  const normalizedEnemy = uniqueIds(enemyIds);
  const team = uniqueIds(teamIds);
  const settings = getEngineSettings();

  if (normalizedEnemy.length !== TEAM_SIZE || team.length === 0) {
    return {
      enemyIds: normalizedEnemy,
      covered: 0,
      total: team.length,
      percentage: 0,
      heroes: [],
    };
  }

  type ReplacementStats = { wins: number; losses: number };
  const byHeroAndCore = new Map<string, Map<string, ReplacementStats>>();

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) continue;

    const myIds = uniqueIds(combat.my_heroes ?? []);
    if (myIds.length !== TEAM_SIZE) continue;

    for (const heroId of team) {
      if (!myIds.includes(heroId)) continue;

      const coreIds = myIds.filter((id) => id !== heroId);
      if (coreIds.length !== TEAM_SIZE - 1) continue;

      const coreKey = teamKey(coreIds);
      const heroGroups =
        byHeroAndCore.get(heroId) ?? new Map<string, ReplacementStats>();
      const stats = heroGroups.get(coreKey) ?? { wins: 0, losses: 0 };

      if (combat.won) stats.wins += 1;
      else stats.losses += 1;

      heroGroups.set(coreKey, stats);
      byHeroAndCore.set(heroId, heroGroups);
    }
  }

  const heroes = team
    .map((heroId) => {
      let wins = 0;
      let losses = 0;
      const heroGroups = byHeroAndCore.get(heroId);

      if (heroGroups) {
        for (const stats of heroGroups.values()) {
          const battles = stats.wins + stats.losses;
          if (battles < settings.advanced.core4MinBattles) continue;
          wins += stats.wins;
          losses += stats.losses;
        }
      }

      const battles = wins + losses;
      const winRate = calculateWinRate(wins, battles);
      const confidence = Math.min(
        battles / settings.advanced.core4ConfidenceBattles,
        1
      );
      const score = winRate * confidence;

      return {
        heroId,
        wins,
        losses,
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

export function heroUsageScore(
  heroId: string,
  usage: Record<string, HeroUsage>,
  settings: EngineSettings = getEngineSettings()
): number {
  const entry = usage[heroId];
  if (!entry || entry.total <= 0) return 0;

  const experienceBonus = Math.min(
    entry.total * settings.advanced.heroUsageExperiencePerBattle,
    settings.advanced.heroUsageExperienceCap
  );

  return clamp(
    entry.winRate + experienceBonus,
    0,
    settings.advanced.heroUsageScoreCap
  );
}

export function heroStatScore(hero: Hero): number {
  const { hp, atk, matk, def, mdef } = hero.stats;
  const totalAttack = atk + matk;
  const totalDefense = def + mdef;

  const hpScore = hp / 1000;
  const attackScore = totalAttack / 100;
  const defenseScore = totalDefense / 10;

  return hpScore + attackScore + defenseScore;
}

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

export function evaluateTeam(
  team: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage>,
  settings: EngineSettings = getEngineSettings()
): TeamEvaluation {
  const teamIds = team.map((hero) => hero.id);
  const history = evaluateTeamHistory(teamIds, combats);

  const usageValues = team.map((hero) =>
    heroUsageScore(hero.id, usage, settings)
  );
  const statValues = team.map((hero) => heroStatScore(hero));

  const usageScore =
    usageValues.length > 0
      ? usageValues.reduce((sum, value) => sum + value, 0) / usageValues.length
      : 0;

  const statScore =
    statValues.length > 0
      ? statValues.reduce((sum, value) => sum + value, 0) / statValues.length
      : 0;

  const score =
    history.winRate * 2 +
    usageScore * settings.teamA.generalWinRateWeight +
    statScore * settings.teamA.statsWeight;

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

function isSameEnemyTeam(
  enemyIds: string[],
  combatEnemyIds: string[]
): boolean {
  return sameTeam(enemyIds, combatEnemyIds);
}

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[],
  settings: EngineSettings = getEngineSettings()
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
    const confidence = Math.min(
      battles / settings.advanced.teamAHistoricalConfidenceBattles,
      1
    );
    const reliability =
      winRate *
      (settings.advanced.teamAHistoricalReliabilityBase +
        settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
          confidence);

    const evaluation = evaluateTeam(team, combats, usage, settings);
    const currentTeamKey = teamKey(candidate.heroIds);
    const bestTeamKey = bestCandidate ? teamKey(bestCandidate.heroIds) : "";

    const isBetter =
      !bestCandidate ||
      reliability > bestReliability ||
      (reliability === bestReliability && battles > bestBattles) ||
      (reliability === bestReliability &&
        battles === bestBattles &&
        candidate.wins > bestCandidate.wins) ||
      (reliability === bestReliability &&
        battles === bestBattles &&
        candidate.wins === bestCandidate.wins &&
        evaluation.score > (bestEvaluation?.score ?? -Infinity)) ||
      (reliability === bestReliability &&
        battles === bestBattles &&
        candidate.wins === bestCandidate.wins &&
        evaluation.score === (bestEvaluation?.score ?? -Infinity) &&
        currentTeamKey < bestTeamKey);

    if (isBetter) {
      bestCandidate = candidate;
      bestEvaluation = evaluation;
      bestTeam = team;
      bestReliability = reliability;
      bestBattles = battles;
    }
  }

  return bestTeam &&
    bestReliability >= settings.advanced.teamAHistoricalReliabilityMin
    ? bestTeam
    : null;
}

function calculateCounterUsage(
  enemyIds: string[],
  combats: Combat[]
): Record<
  string,
  { wins: number; losses: number; total: number; winRate: number }
> {
  const result: Record<
    string,
    { wins: number; losses: number; total: number; winRate: number }
  > = {};

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

function counterHeroScore(
  hero: Hero,
  usage: Record<string, HeroUsage>,
  counterUsage: Record<
    string,
    { wins: number; losses: number; total: number; winRate: number }
  >,
  settings: EngineSettings,
  team: "A" | "B"
): number {
  const general = heroUsageScore(hero.id, usage, settings);
  const stats = heroStatScore(hero);
  const counter = counterUsage[hero.id];

  let counterScore = 0;
  if (counter) {
    const winRateMultiplier =
      team === "A"
        ? settings.advanced.teamACounterWinRateMultiplier
        : settings.advanced.teamBCounterWinRateMultiplier;
    const experiencePerBattle =
      team === "A"
        ? settings.advanced.teamACounterExperiencePerBattle
        : settings.advanced.teamBCounterExperiencePerBattle;
    const experienceCap =
      team === "A"
        ? settings.advanced.teamACounterExperienceCap
        : settings.advanced.teamBCounterExperienceCap;

    counterScore =
      counter.winRate * winRateMultiplier +
      Math.min(counter.total * experiencePerBattle, experienceCap);
  }

  const weights = team === "A" ? settings.teamA : settings.teamB;

  return (
    counterScore * weights.specificHistoryWeight +
    general * weights.generalWinRateWeight +
    stats * weights.statsWeight
  );
}

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): Hero[] {
  if (enemyIds.length === 0) return [];

  const settings = getEngineSettings();
  const enemySet = new Set(enemyIds);
  const historicalTeam = findBestHistoricalTeam(
    enemyIds,
    combats,
    heroes,
    settings
  );

  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    return historicalTeam;
  }

  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));
  if (availableHeroes.length <= TEAM_SIZE) return availableHeroes;

  const usage = calculateHeroUsage(combats, heroes);
  const counterUsage = calculateCounterUsage(enemyIds, combats);

  const ranked = availableHeroes
    .map((hero) => ({
      hero,
      score: counterHeroScore(hero, usage, counterUsage, settings, "A"),
    }))
    .sort(
      (a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const recommended: Hero[] = [];
  const classCounts: Record<string, number> = { STR: 0, AGI: 0, INT: 0 };
  const bestCore4 = findBestCore4(enemyIds, combats, settings);

  if (bestCore4) {
    const core4Heroes = bestCore4.coreIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (core4Heroes.length === 4) {
      for (const hero of core4Heroes) {
        if (
          !enemySet.has(hero.id) &&
          !recommended.some((selected) => selected.id === hero.id)
        ) {
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
            combats,
            settings
          );

          const finalScore =
            candidate.score + historicalScore * settings.teamA.core4Weight;

          if (
            finalScore > bestReplacementScore ||
            (finalScore === bestReplacementScore &&
              (!bestReplacement ||
                candidate.hero.name.localeCompare(bestReplacement.name) < 0))
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

  while (recommended.length < TEAM_SIZE && ranked.length > 0) {
    let bestIndex = -1;
    let bestAdjustedScore = -Infinity;

    for (let i = 0; i < ranked.length; i++) {
      const candidate = ranked[i];
      const currentCount = classCounts[candidate.hero.cls] ?? 0;
      let classPenalty = 0;

      if (currentCount >= 1) {
        classPenalty += settings.advanced.teamAClassPenaltyFirst * currentCount;
      }
      if (currentCount >= 2) {
        classPenalty += settings.advanced.teamAClassPenaltySecond;
      }
      if (currentCount >= 3) {
        classPenalty += settings.advanced.teamAClassPenaltyThird;
      }

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
// RECOMMANDATION ÉQUIPE B — ANALYSE ALTERNATIVE
// ============================================================

export function recommendAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  _primaryTeam: Hero[] = []
): Hero[] {
  if (enemyIds.length === 0) return [];

  const settings = getEngineSettings();
  const enemySet = new Set(enemyIds);
  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));

  if (availableHeroes.length <= TEAM_SIZE) return availableHeroes;

  const usage = calculateHeroUsage(combats, heroes);
  const counterUsage = calculateCounterUsage(enemyIds, combats);
  const bestCore4 = findBestCore4(enemyIds, combats, settings);
  const bestCore4Ids = new Set(bestCore4?.coreIds ?? []);

  const ranked = availableHeroes
    .map((hero) => {
      const counter = counterUsage[hero.id];
      const counterScore = counter
        ? counter.winRate * settings.advanced.teamBCounterWinRateMultiplier +
          Math.min(
            counter.total * settings.advanced.teamBCounterExperiencePerBattle,
            settings.advanced.teamBCounterExperienceCap
          )
        : 0;

      let core4Score = 0;
      if (bestCore4) {
        if (bestCore4Ids.has(hero.id)) {
          const confidence = Math.min(
            bestCore4.battles / settings.advanced.core4ConfidenceBattles,
            1
          );
          core4Score = bestCore4.winRate * confidence;
        } else {
          core4Score = core4ReplacementScore(
            enemyIds,
            bestCore4.coreIds,
            hero.id,
            combats,
            settings
          );
        }
      }

      const general = heroUsageScore(hero.id, usage, settings);
      const stats = heroStatScore(hero);

      const score =
        counterScore * settings.teamB.specificHistoryWeight +
        core4Score * settings.teamB.core4Weight +
        general * settings.teamB.generalWinRateWeight +
        stats * settings.teamB.statsWeight;

      return { hero, score, general, stats };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.general - a.general ||
        b.stats - a.stats ||
        a.hero.name.localeCompare(b.hero.name)
    );

  return ranked.slice(0, TEAM_SIZE).map((candidate) => candidate.hero);
}

export function rankHeroes(heroes: Hero[], combats: Combat[]): HeroScore[] {
  const usage = calculateHeroUsage(combats, heroes);

  return heroes
    .map((hero) => scoreHero(hero, usage))
    .sort((a, b) => b.score - a.score);
}
