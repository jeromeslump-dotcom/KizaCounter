import type { Hero } from "../data/heroes";
import type {
  HeroScore,
  HeroUsage,
  TeamEvaluation,
  TeamScore,
} from "../types";
import { analyzeCore4Plus1 } from "./historicalCore4";
import {
  getEngineSettings,
  getPointBudgets,
  normalizeModulePoints,
} from "./engineSettings";
import {
  calculateSpecificHistoryPoints,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
  calculateWinRate,
  calculateHeroUsage,
  coverageReport,
  evaluateSpecificHistoryModule,
} from "./historicalScoring";
import { calculateCounterUsage, counterHeroScore } from "./counterUsage";
import { sameTeam, teamKey, uniqueIds } from "./teamUtils";

export {
  calculateSpecificHistoryPoints,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
  findBestHistoricalClassTeam,
  findBestHistoricalTeam,
  historicalConfidence,
  calculateWinRate,
  calculateHeroUsage,
  coverageReport,
  evaluateSpecificHistoryModule,
};

const TEAM_SIZE = 5;

export type RecommendationSource =
  | "exact-history"
  | "class-history"
  | "core4"
  | "counter-usage"
  | "fallback";

export type RecommendationSourceCallback = (
  source: RecommendationSource
) => void;

export function scoreHero(hero: Hero): HeroScore {
  return { heroId: hero.id, score: 0 };
}

function calculateCore4ModulePoints(
  teamIds: string[],
  enemyIds: string[],
  combats: Parameters<typeof analyzeCore4Plus1>[1],
  settings: ReturnType<typeof getEngineSettings>,
  maxPoints: number
): number {
  if (enemyIds.length !== TEAM_SIZE || maxPoints <= 0) return 0;

  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  if (!analyses.length) return 0;

  const teamSet = new Set(teamIds);
  let bestRawScore = 0;

  for (const analysis of analyses) {
    if (!analysis.coreIds.every((id) => teamSet.has(id))) continue;
    const confidence = historicalConfidence(
      analysis.battles,
      settings.advanced.core4ConfidenceBattles
    );
    bestRawScore = Math.max(
      bestRawScore,
      (analysis.winRate / 100) * confidence
    );
  }

  return normalizeModulePoints(bestRawScore, maxPoints);
}

export function evaluateTeam(
  team: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  _usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamEvaluation {
  const settings = getEngineSettings();
  const teamIds = team.map((hero) => hero.id);
  const history = evaluateTeamHistory(teamIds, combats);
  const budgets = getPointBudgets(settings, "A");

  const generalWinRatePoints = normalizeModulePoints(
    history.battles > 0 ? history.winRate / 100 : 0,
    budgets.generalWinRate
  );

  const exactHistory =
    enemyIds.length === TEAM_SIZE
      ? evaluateExactTeamHistory(teamIds, enemyIds, combats)
      : { wins: 0, losses: 0, battles: 0, winRate: 0 };

  const specificHistoryPoints = calculateSpecificHistoryPoints(
    exactHistory.wins,
    exactHistory.losses,
    budgets.specificHistory
  );

  const core4Points = calculateCore4ModulePoints(
    teamIds,
    enemyIds,
    combats,
    settings,
    budgets.core4
  );

  const score =
    specificHistoryPoints * settings.teamA.specificHistoryWeight +
    core4Points * settings.teamA.core4Weight +
    generalWinRatePoints * settings.teamA.generalWinRateWeight;

  return {
    score,
    historicalWins: history.wins,
    historicalLosses: history.losses,
    historicalBattles: history.battles,
    historicalWinRate: history.winRate,
  };
}

export function scoreTeam(
  team: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  usage: Record<string, HeroUsage> | undefined,
  enemyIds: string[]
): TeamScore {
  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluateTeam(team, combats, usage, enemyIds).score,
  };
}

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  onSource?: RecommendationSourceCallback
): Hero[] {
  if (!enemyIds.length) {
    onSource?.("fallback");
    return [];
  }

  const settings = getEngineSettings();
  const historicalTeam = findBestHistoricalTeam(enemyIds, combats, heroes);

  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    onSource?.("exact-history");
    return historicalTeam;
  }

  const availableHeroes = heroes;
  if (availableHeroes.length <= TEAM_SIZE) {
    onSource?.("fallback");
    return availableHeroes;
  }

  const counterUsage = calculateCounterUsage(enemyIds, combats);
  const ranked = availableHeroes
    .map((hero) => ({ hero, score: counterHeroScore(hero, counterUsage) }))
    .sort(
      (a, b) =>
        b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const recommended: Hero[] = [];
  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  if (core4Analyses.length > 0) {
    const budgets = getPointBudgets(settings, "A");
    let bestCompleteTeam: Hero[] | null = null;
    let bestCompleteScore = -Infinity;
    let bestCoreScore = -Infinity;
    let bestReplacementScore = -Infinity;

    for (const analysis of core4Analyses) {
      const core4Heroes = analysis.coreIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero));
      if (core4Heroes.length !== TEAM_SIZE - 1) continue;

      const coreConfidence = historicalConfidence(
        analysis.battles,
        settings.advanced.core4ConfidenceBattles
      );
      const coreScore = analysis.winRate * coreConfidence;
      const core4Ids = new Set(core4Heroes.map((hero) => hero.id));

      for (const candidate of ranked) {
        if (core4Ids.has(candidate.hero.id)) continue;
        const replacement = analysis.replacements.find(
          (entry) => entry.heroId === candidate.hero.id
        );
        if (!replacement) continue;

        const replacementScore = replacement.score;
        const core4Points = normalizeModulePoints(
          coreScore / 100,
          budgets.core4
        );
        const completeScore =
          core4Points * settings.teamA.core4Weight +
          replacementScore *
            settings.teamA.core4Weight *
            (budgets.core4 / 100);
        const completeTeam = [...core4Heroes, candidate.hero];
        const completeTeamKey = teamKey(
          completeTeam.map((hero) => hero.id)
        );
        const bestCompleteTeamKey = bestCompleteTeam
          ? teamKey(bestCompleteTeam.map((hero) => hero.id))
          : "";

        if (
          completeScore > bestCompleteScore ||
          (completeScore === bestCompleteScore &&
            (coreScore > bestCoreScore ||
              (coreScore === bestCoreScore &&
                (replacementScore > bestReplacementScore ||
                  (replacementScore === bestReplacementScore &&
                    completeTeamKey.localeCompare(bestCompleteTeamKey) < 0)))))
        ) {
          bestCompleteTeam = completeTeam;
          bestCompleteScore = completeScore;
          bestCoreScore = coreScore;
          bestReplacementScore = replacementScore;
        }
      }
    }

    if (bestCompleteTeam && bestCompleteTeam.length === TEAM_SIZE) {
      onSource?.("core4");
      return bestCompleteTeam;
    }
  }

  const historicalClassTeam = findBestHistoricalClassTeam(
    enemyIds,
    combats,
    heroes
  );
  if (historicalClassTeam && historicalClassTeam.length === TEAM_SIZE) {
    onSource?.("class-history");
    return historicalClassTeam;
  }

  const usedIds = new Set(recommended.map((hero) => hero.id));
  while (recommended.length < TEAM_SIZE && ranked.length) {
    const selected = ranked.shift()?.hero;
    if (!selected) break;
    if (usedIds.has(selected.id)) continue;
    recommended.push(selected);
    usedIds.add(selected.id);
  }

  if (recommended.length < TEAM_SIZE) {
    for (const hero of availableHeroes) {
      if (recommended.length >= TEAM_SIZE) break;
      if (usedIds.has(hero.id)) continue;
      recommended.push(hero);
      usedIds.add(hero.id);
    }
  }

  onSource?.("counter-usage");
  return recommended;
}

export function recommendAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1],
  primaryTeam: Hero[] = []
): Hero[] {
  if (!enemyIds.length) return [];

  const primaryIds = new Set(primaryTeam.map((hero) => hero.id));
  const availableHeroes = heroes.filter((hero) => !primaryIds.has(hero.id));
  if (availableHeroes.length <= TEAM_SIZE) return availableHeroes;

  const settings = getEngineSettings();
  const budgets = getPointBudgets(settings, "B");
  const counterUsage = calculateCounterUsage(enemyIds, combats);
  const ranked = availableHeroes
    .map((hero) => {
      const counter = counterUsage[hero.id];
      if (!counter) return { hero, score: 0 };
      const confidence = historicalConfidence(
        counter.total,
        settings.advanced.teamAHistoricalConfidenceBattles
      );
      return {
        hero,
        score:
          counter.winRate *
          confidence *
          settings.advanced.teamBCounterWinRateMultiplier *
          settings.teamB.specificHistoryWeight,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const buildCandidate = (orderedHeroes: typeof ranked): Hero[] => {
    const team: Hero[] = [];
    for (const candidate of orderedHeroes) {
      if (primaryIds.has(candidate.hero.id)) continue;
      team.push(candidate.hero);
      if (team.length === TEAM_SIZE) break;
    }
    return team;
  };

  const baseAlternative = buildCandidate(ranked);
  if (baseAlternative.length !== TEAM_SIZE) return baseAlternative;

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  const getCore4Points = (team: Hero[]): number => {
    const teamIds = new Set(team.map((hero) => hero.id));
    let bestRawScore = 0;
    for (const core of core4Analyses) {
      if (!core.coreIds.every((id) => teamIds.has(id))) continue;
      const confidence = historicalConfidence(
        core.battles,
        settings.advanced.core4ConfidenceBattles
      );
      bestRawScore = Math.max(
        bestRawScore,
        (core.winRate / 100) * confidence
      );
    }
    return normalizeModulePoints(bestRawScore, budgets.core4);
  };

  const evaluateAlternative = (team: Hero[]) => {
    const teamIds = team.map((hero) => hero.id);
    const history = evaluateTeamHistory(teamIds, combats);
    const generalWinRatePoints =
      history.battles > 0
        ? normalizeModulePoints(history.winRate / 100, budgets.generalWinRate)
        : 0;
    const exact = evaluateExactTeamHistory(teamIds, enemyIds, combats);
    const specificHistoryPoints = calculateSpecificHistoryPoints(
      exact.wins,
      exact.losses,
      budgets.specificHistory
    );
    const core4Points = getCore4Points(team);
    const classHistory = evaluateEnemyClassHistory(
      teamIds,
      enemyIds,
      combats,
      heroes
    );
    const classHistoryConfidenceBattles = Math.max(
      1,
      settings.advanced.teamAHistoricalConfidenceBattles * 2
    );
    const classHistoryConfidence = historicalConfidence(
      classHistory.battles,
      classHistoryConfidenceBattles
    );
    const classHistoryPoints =
      classHistory.battles > 0
        ? normalizeModulePoints(
            (classHistory.winRate / 100) * classHistoryConfidence,
            budgets.generalWinRate
          )
        : 0;
    const losingHistory = history.battles > 0 && history.wins === 0;
    const fallbackPoints =
      exact.battles > 0
        ? specificHistoryPoints
        : classHistory.battles > 0
          ? classHistoryPoints
          : generalWinRatePoints;

    return {
      team,
      score:
        specificHistoryPoints * settings.teamB.specificHistoryWeight +
        core4Points * settings.teamB.core4Weight +
        fallbackPoints * settings.teamB.generalWinRateWeight -
        (losingHistory ? Number.MAX_SAFE_INTEGER : 0),
      history,
    };
  };

  const candidates: Hero[][] = [baseAlternative];
  const pool = ranked
    .filter((candidate) => !primaryIds.has(candidate.hero.id))
    .map((candidate) => candidate.hero);

  for (let index = 0; index < baseAlternative.length; index++) {
    for (const replacement of pool) {
      if (
        baseAlternative.some(
          (hero, heroIndex) =>
            heroIndex !== index && hero.id === replacement.id
        )
      ) continue;
      const candidate = [...baseAlternative];
      candidate[index] = replacement;
      candidates.push(candidate);
    }
  }

  const historicalTeams = new Map<string, Hero[]>();
  for (const combat of combats) {
    if (!sameTeam(enemyIds, combat.enemy_heroes ?? []) || !combat.won) continue;
    const ids = uniqueIds(combat.my_heroes ?? []);
    if (ids.length !== TEAM_SIZE) continue;
    if (ids.some((id) => primaryIds.has(id))) continue;
    const team = ids
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));
    if (team.length === TEAM_SIZE) historicalTeams.set(teamKey(ids), team);
  }
  candidates.push(...historicalTeams.values());

  let best = evaluateAlternative(baseAlternative);
  for (const candidate of candidates.slice(1)) {
    const evaluation = evaluateAlternative(candidate);
    if (
      evaluation.score > best.score ||
      (evaluation.score === best.score &&
        evaluation.history.winRate > best.history.winRate) ||
      (evaluation.score === best.score &&
        evaluation.history.winRate === best.history.winRate &&
        evaluation.history.wins > best.history.wins) ||
      (evaluation.score === best.score &&
        evaluation.history.winRate === best.history.winRate &&
        evaluation.history.wins === best.history.wins &&
        evaluation.history.battles > best.history.battles)
    ) {
      best = evaluation;
    }
  }

  return best.team;
}

export function rankHeroes(
  heroes: Hero[],
  combats: Parameters<typeof evaluateTeamHistory>[1]
): HeroScore[] {
  void combats;
  return heroes
    .map((hero) => scoreHero(hero))
    .sort(
      (a, b) =>
        b.score - a.score || a.heroId.localeCompare(b.heroId)
    );
}
