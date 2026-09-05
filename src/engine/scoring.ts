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
  calculateHeroUsage,
  calculateSpecificHistoryPoints,
  coverageReport,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateSpecificHistoryModule,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
} from "./historicalScoring";
import {
  calculateCounterUsage,
  counterHeroScore,
} from "./counterUsage";
import { analyzeCore4Plus1 } from "./historicalCore4";
import {
  getEngineSettings,
  getPointBudgets,
  normalizeModulePoints,
} from "./engineSettings";
import { teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;

function scoreHero(hero: Hero): number {
  return 0;
}

function calculateCore4ModulePoints(
  core4Heroes: Hero[],
  candidate: Hero,
  enemyIds: string[],
  combats: Combat[],
  budgets: ReturnType<typeof getPointBudgets>
): number {
  const analysis = analyzeCore4Plus1(
    core4Heroes,
    candidate.hero,
    enemyIds,
    combats
  );
  return normalizeModulePoints(analysis.score / 100, budgets.core4);
}

export function evaluateTeam(
  team: Hero[],
  combats: Combat[],
  _usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamEvaluation {
  const settings = getEngineSettings();
  const budgets = getPointBudgets();
  const ids = team.map((hero) => hero.id);

  const history = evaluateTeamHistory(ids, combats);
  const exactHistory = evaluateExactTeamHistory(ids, enemyIds, combats);
  const core4Analysis = analyzeCore4Plus1(
    team.slice(0, TEAM_SIZE - 1),
    team[TEAM_SIZE - 1],
    enemyIds,
    combats
  );

  const historyPoints = normalizeModulePoints(
    calculateSpecificHistoryPoints(exactHistory),
    budgets.specificHistory
  );
  const core4Points = normalizeModulePoints(
    core4Analysis.score / 100,
    budgets.core4
  );

  const total =
    historyPoints * settings.teamA.specificHistoryWeight +
    core4Points * settings.teamA.core4Weight;

  return {
    team,
    score: total,
    history,
    exactHistory,
    core4: core4Analysis,
  };
}

export function scoreTeam(
  team: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamScore {
  const evaluation = evaluateTeam(team, combats, usage, enemyIds);
  return {
    team,
    score: evaluation.score,
  };
}

export function recommendTeam(
  heroes: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamScore {
  const exact = findBestHistoricalTeam(enemyIds, combats, heroes);
  if (exact) {
    return scoreTeam(exact, combats, usage, enemyIds);
  }

  const coreCandidates: TeamScore[] = [];
  const settings = getEngineSettings();
  const budgets = getPointBudgets();

  for (const candidate of heroes) {
    const core4 = findBestHistoricalTeam(
      enemyIds,
      combats,
      heroes.filter((hero) => hero.id !== candidate.id)
    );
    if (!core4) continue;

    const analysis = analyzeCore4Plus1(
      core4,
      candidate,
      enemyIds,
      combats
    );
    const core4Points = normalizeModulePoints(
      analysis.score / 100,
      budgets.core4
    );
    const score = core4Points * settings.teamA.core4Weight;

    coreCandidates.push({
      team: [...core4, candidate],
      score,
    });
  }

  if (coreCandidates.length) {
    coreCandidates.sort((a, b) => b.score - a.score);
    return coreCandidates[0];
  }

  const historicalClass = findBestHistoricalClassTeam(
    enemyIds,
    combats,
    heroes
  );
  if (historicalClass) {
    return scoreTeam(historicalClass, combats, usage, enemyIds);
  }

  const ranked = heroes
    .map((hero) => ({
      hero,
      score: counterHeroScore(
        hero.id,
        calculateCounterUsage(hero.id, enemyIds, combats)
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TEAM_SIZE)
    .map((entry) => entry.hero);

  return scoreTeam(ranked, combats, usage, enemyIds);
}

export function recommendAlternativeTeam(
  heroes: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[],
  primaryTeam: Hero[]
): TeamScore {
  const primaryKey = teamKey(primaryTeam.map((hero) => hero.id));
  const historicalCandidates = findBestHistoricalClassTeam(
    enemyIds,
    combats,
    heroes
  );

  const candidates: Hero[][] = [];
  if (historicalCandidates) {
    candidates.push(historicalCandidates);
  }

  const ranked = heroes
    .filter((hero) => !primaryTeam.some((item) => item.id === hero.id))
    .map((hero) => ({
      hero,
      score: counterHeroScore(
        hero.id,
        calculateCounterUsage(hero.id, enemyIds, combats)
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TEAM_SIZE)
    .map((entry) => entry.hero);

  if (ranked.length === TEAM_SIZE) {
    candidates.push(ranked);
  }

  for (const candidate of heroes) {
    const replacement = historicalCandidates?.find(
      (hero) => hero.id === candidate.id
    );
    if (!replacement) continue;

    const completeTeam = [...historicalCandidates!.filter((hero) => hero.id !== candidate.id), candidate];
    if (completeTeam.length !== TEAM_SIZE) continue;
    candidates.push(completeTeam);
  }

  let bestTeam: Hero[] | null = null;
  let bestScore = -Infinity;

  for (const candidateTeam of candidates) {
    const key = teamKey(candidateTeam.map((hero) => hero.id));
    if (key === primaryKey) continue;

    const evaluated = scoreTeam(candidateTeam, combats, usage, enemyIds);
    if (
      evaluated.score > bestScore ||
      (evaluated.score === bestScore &&
        (!bestTeam || key.localeCompare(teamKey(bestTeam.map((hero) => hero.id))) < 0))
    ) {
      bestTeam = candidateTeam;
      bestScore = evaluated.score;
    }
  }

  if (bestTeam) {
    return scoreTeam(bestTeam, combats, usage, enemyIds);
  }

  const fallback = heroes.filter(
    (hero) => !primaryTeam.some((item) => item.id === hero.id)
  ).slice(0, TEAM_SIZE);

  return scoreTeam(fallback, combats, usage, enemyIds);
}

export function rankHeroes(
  heroes: Hero[],
  combats: Combat[],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): HeroScore[] {
  void combats;
  void usage;
  void enemyIds;

  return heroes
    .map((hero) => ({
      hero,
      score: scoreHero(hero),
    }))
    .sort((a, b) => b.score - a.score);
}

export {
  calculateHeroUsage,
  coverageReport,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateSpecificHistoryModule,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
};
