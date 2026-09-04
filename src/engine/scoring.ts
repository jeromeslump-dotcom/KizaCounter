import type { Hero } from "../data/heroes";
import type {
  Combat,
  CoverageReport,
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

const TEAM_SIZE = 5;

// ============================================================
// SOURCE DE RECOMMANDATION
// ============================================================

export type RecommendationSource =
  "exact-history" | "class-history" | "core4" | "counter-usage" | "fallback";

export type RecommendationSourceCallback = (
  source: RecommendationSource
) => void;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function teamKey(ids: string[]): string {
  return uniqueIds(ids).sort().join("|");
}

function sameTeam(first: string[], second: string[]): boolean {
  return teamKey(first) === teamKey(second);
}

function isSameEnemyTeam(
  enemyIds: string[],
  combatEnemyIds: string[]
): boolean {
  return sameTeam(enemyIds, combatEnemyIds);
}

export function calculateWinRate(wins: number, total: number): number {
  return total <= 0 ? 0 : (wins / total) * 100;
}

export function evaluateExactTeamHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[]
): { wins: number; losses: number; battles: number; winRate: number } {
  const normalizedTeam = uniqueIds(teamIds);

  if (normalizedTeam.length !== TEAM_SIZE) {
    return { wins: 0, losses: 0, battles: 0, winRate: 0 };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) continue;
    if (!sameTeam(normalizedTeam, combat.my_heroes ?? [])) continue;

    combat.won ? wins++ : losses++;
  }

  const battles = wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate: calculateWinRate(wins, battles),
  };
}

export function calculateSpecificHistoryPoints(
  wins: number,
  losses: number,
  maxPoints: number
): number {
  const battles = wins + losses;

  if (battles <= 0 || maxPoints <= 0) return 0;

  const confidenceBattles =
    getEngineSettings().advanced.teamAHistoricalConfidenceBattles;

  const confidence = Math.min(battles / Math.max(1, confidenceBattles), 1);

  return normalizeModulePoints((wins / battles) * confidence, maxPoints);
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

      usage[heroId].total++;

      combat.won ? usage[heroId].wins++ : usage[heroId].losses++;
    }
  }

  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return usage;
}

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

  type ReplacementStats = {
    wins: number;
    losses: number;
  };

  const byHeroAndCore = new Map<string, Map<string, ReplacementStats>>();

  for (const combat of combats) {
    if (!sameTeam(normalizedEnemy, combat.enemy_heroes ?? [])) {
      continue;
    }

    const myIds = uniqueIds(combat.my_heroes ?? []);

    if (myIds.length !== TEAM_SIZE) continue;

    for (const heroId of team) {
      if (!myIds.includes(heroId)) continue;

      const coreIds = myIds.filter((id) => id !== heroId);

      if (coreIds.length !== TEAM_SIZE - 1) {
        continue;
      }

      const coreKey = teamKey(coreIds);

      const heroGroups =
        byHeroAndCore.get(heroId) ?? new Map<string, ReplacementStats>();

      const stats = heroGroups.get(coreKey) ?? {
        wins: 0,
        losses: 0,
      };

      combat.won ? stats.wins++ : stats.losses++;

      heroGroups.set(coreKey, stats);
      byHeroAndCore.set(heroId, heroGroups);
    }
  }

  const settings = getEngineSettings();

  const heroes = team
    .map((heroId) => {
      let wins = 0;
      let losses = 0;

      const heroGroups = byHeroAndCore.get(heroId);

      if (heroGroups) {
        for (const stats of heroGroups.values()) {
          const battles = stats.wins + stats.losses;

          if (battles < settings.advanced.core4MinBattles) {
            continue;
          }

          wins += stats.wins;
          losses += stats.losses;
        }
      }

      const battles = wins + losses;

      const winRate = calculateWinRate(wins, battles);

      const confidence = Math.min(
        battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
        1
      );

      return {
        heroId,
        wins,
        losses,
        battles,
        winRate,
        confidence,
        score: winRate * confidence,
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

export function scoreHero(hero: Hero): HeroScore {
  return {
    heroId: hero.id,
    score: 0,
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
    return {
      wins: 0,
      losses: 0,
      battles: 0,
      winRate: 0,
    };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    const historicalTeam = new Set(combat.my_heroes ?? []);

    if (!team.every((heroId) => historicalTeam.has(heroId))) {
      continue;
    }

    combat.won ? wins++ : losses++;
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
// SCORE RÉEL DE L'ÉQUIPE A
// ============================================================
//
// Les trois budgets configurés dans engineSettings participent
// réellement au score : historique exact, Core4 et historique
// général. enemyIds reste optionnel pour préserver les appels
// existants ; sans ennemi, les deux modules dépendants de la
// composition ennemie valent simplement 0.
// ============================================================

function calculateCore4ModulePoints(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  settings: ReturnType<typeof getEngineSettings>,
  maxPoints: number
): number {
  if (enemyIds.length !== TEAM_SIZE || maxPoints <= 0) {
    return 0;
  }

  const analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  if (!analyses.length) {
    return 0;
  }

  const teamSet = new Set(teamIds);
  let bestRawScore = 0;

  for (const analysis of analyses) {
    if (!analysis.coreIds.every((id) => teamSet.has(id))) {
      continue;
    }

    const confidence = Math.min(
      analysis.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
      1
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
  combats: Combat[],
  _usage?: Record<string, HeroUsage>,
  enemyIds: string[] = []
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
  combats: Combat[],
  usage?: Record<string, HeroUsage>,
  enemyIds: string[] = []
): TeamScore {
  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluateTeam(team, combats, usage, enemyIds).score,
  };
}

// ============================================================
// HISTORIQUE EXACT : MÊMES 5 ENNEMIS
// ============================================================

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  const settings = getEngineSettings();

  const candidates = new Map<
    string,
    {
      heroIds: string[];
      wins: number;
      losses: number;
    }
  >();

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) {
      continue;
    }

    const heroIds = uniqueIds(combat.my_heroes ?? []);

    if (heroIds.length !== TEAM_SIZE) {
      continue;
    }

    const key = teamKey(heroIds);

    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
    };

    combat.won ? candidate.wins++ : candidate.losses++;

    candidates.set(key, candidate);
  }

  const winningCandidates = [...candidates.values()].filter(
    (candidate) => candidate.wins > 0
  );

  if (!winningCandidates.length) {
    return null;
  }

  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  const calculateHistoricalReliability = (
    wins: number,
    battles: number
  ): number => {
    if (battles <= 0) return 0;

    const winRate = wins / battles;

    const confidence = battles / (battles + confidenceBattles);

    return (
      winRate *
      (settings.advanced.teamAHistoricalReliabilityBase +
        settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
          confidence)
    );
  };

  winningCandidates.sort((a, b) => {
    const aBattles = a.wins + a.losses;
    const bBattles = b.wins + b.losses;

    const aReliability = calculateHistoricalReliability(a.wins, aBattles);

    const bReliability = calculateHistoricalReliability(b.wins, bBattles);

    return (
      bReliability - aReliability ||
      bBattles - aBattles ||
      b.wins - a.wins ||
      teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
    );
  });

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) {
      return team;
    }
  }

  return null;
}

// ============================================================
// HISTORIQUE PAR COMPOSITION DE CLASSES ENNEMIES
// ============================================================

function getEnemyClassKey(enemyIds: string[], heroes: Hero[]): string | null {
  const classes = enemyIds
    .map((id) => heroes.find((hero) => hero.id === id)?.cls)
    .filter(
      (cls): cls is Hero["cls"] =>
        cls === "STR" || cls === "AGI" || cls === "INT"
    );

  if (classes.length !== TEAM_SIZE) {
    return null;
  }

  return [...classes].sort().join("|");
}

export function evaluateEnemyClassHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): {
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  classKey: string | null;
} {
  const team = uniqueIds(teamIds);

  const targetClassKey = getEnemyClassKey(enemyIds, heroes);

  if (team.length !== TEAM_SIZE || !targetClassKey) {
    return {
      wins: 0,
      losses: 0,
      battles: 0,
      winRate: 0,
      classKey: targetClassKey,
    };
  }

  let wins = 0;
  let losses = 0;

  for (const combat of combats) {
    if (!sameTeam(team, combat.my_heroes ?? [])) {
      continue;
    }

    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);

    if (historicalEnemy.length !== TEAM_SIZE) {
      continue;
    }

    if (getEnemyClassKey(historicalEnemy, heroes) !== targetClassKey) {
      continue;
    }

    combat.won ? wins++ : losses++;
  }

  const battles = wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate: calculateWinRate(wins, battles),
    classKey: targetClassKey,
  };
}

function findBestHistoricalClassTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  const targetClassKey = getEnemyClassKey(enemyIds, heroes);

  if (!targetClassKey) {
    return null;
  }

  const candidates = new Map<
    string,
    {
      heroIds: string[];
      wins: number;
      losses: number;
    }
  >();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);

    if (historicalEnemy.length !== TEAM_SIZE) {
      continue;
    }

    if (getEnemyClassKey(historicalEnemy, heroes) !== targetClassKey) {
      continue;
    }

    const heroIds = uniqueIds(combat.my_heroes ?? []);

    if (heroIds.length !== TEAM_SIZE) {
      continue;
    }

    const key = teamKey(heroIds);

    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
    };

    combat.won ? candidate.wins++ : candidate.losses++;

    candidates.set(key, candidate);
  }

  const settings = getEngineSettings();

  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  const ordered = [...candidates.values()]
    .filter((candidate) => candidate.wins > 0)
    .sort((a, b) => {
      const aBattles = a.wins + a.losses;
      const bBattles = b.wins + b.losses;

      const aReliability =
        aBattles > 0
          ? (a.wins / aBattles) *
            (settings.advanced.teamAHistoricalReliabilityBase +
              settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
                (aBattles / (aBattles + confidenceBattles)))
          : 0;

      const bReliability =
        bBattles > 0
          ? (b.wins / bBattles) *
            (settings.advanced.teamAHistoricalReliabilityBase +
              settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
                (bBattles / (bBattles + confidenceBattles)))
          : 0;

      return (
        bReliability - aReliability ||
        bBattles - aBattles ||
        b.wins - a.wins ||
        teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
      );
    });

  for (const candidate of ordered) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) {
      return team;
    }
  }

  return null;
}

function calculateCounterUsage(
  enemyIds: string[],
  combats: Combat[]
): Record<
  string,
  {
    wins: number;
    losses: number;
    total: number;
    winRate: number;
  }
> {
  const result: Record<
    string,
    {
      wins: number;
      losses: number;
      total: number;
      winRate: number;
    }
  > = {};

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) {
      continue;
    }

    for (const heroId of combat.my_heroes ?? []) {
      result[heroId] ??= {
        wins: 0,
        losses: 0,
        total: 0,
        winRate: 0,
      };

      result[heroId].total++;

      combat.won ? result[heroId].wins++ : result[heroId].losses++;
    }
  }

  for (const entry of Object.values(result)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return result;
}

function counterHeroScore(
  hero: Hero,
  counterUsage: Record<
    string,
    {
      wins: number;
      losses: number;
      total: number;
      winRate: number;
    }
  >
): number {
  const settings = getEngineSettings();

  const counter = counterUsage[hero.id];

  if (!counter || counter.total <= 0) {
    return 0;
  }

  const confidence = Math.min(
    counter.total /
      Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles),
    1
  );

  return (
    counter.winRate *
    confidence *
    settings.advanced.teamACounterWinRateMultiplier *
    settings.teamA.specificHistoryWeight
  );
}

// ============================================================
// RECOMMANDATION
// ============================================================

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  onSource?: RecommendationSourceCallback
): Hero[] {
  if (!enemyIds.length) {
    onSource?.("fallback");
    return [];
  }

  const settings = getEngineSettings();

  // ==========================================================
  // 1. HISTORIQUE EXACT
  // ==========================================================

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
    .map((hero) => ({
      hero,
      score: counterHeroScore(hero, counterUsage),
    }))
    .sort(
      (a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const recommended: Hero[] = [];

  // ==========================================================
  // 2. CORE4 HISTORIQUE
  // ==========================================================
  //
  //
  // On ne choisit PLUS d'abord un "meilleur Core4".
  //
  // Toutes les analyses Core4 sont parcourues.
  // Pour CHAQUE Core4, on teste ses 5e héros disponibles.
  // Ensuite seulement, on compare les ensembles complets.
  //
  // Le calcul utilise les scores déjà présents dans le moteur :
  //
  //   score Core4 =
  //     winRate * confidence
  //
  //   score 5e =
  //     replacement.score
  //
  // Puis on conserve le même poids Core4 existant.
  // ==========================================================

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

      if (core4Heroes.length !== TEAM_SIZE - 1) {
        continue;
      }

      const coreConfidence = Math.min(
        analysis.battles /
          Math.max(1, settings.advanced.core4ConfidenceBattles),
        1
      );

      const coreScore = analysis.winRate * coreConfidence;

      const core4Ids = new Set(core4Heroes.map((hero) => hero.id));

      for (const candidate of ranked) {
        if (core4Ids.has(candidate.hero.id)) {
          continue;
        }

        const replacement = analysis.replacements.find(
          (entry) => entry.heroId === candidate.hero.id
        );

        if (!replacement) {
          continue;
        }

        const replacementScore = replacement.score;

        const core4Points = normalizeModulePoints(
          coreScore / 100,
          budgets.core4
        );

        const completeScore =
          core4Points * settings.teamA.core4Weight +
          replacementScore * settings.teamA.core4Weight * (budgets.core4 / 100);

        const completeTeam = [...core4Heroes, candidate.hero];

        const completeTeamKey = teamKey(completeTeam.map((hero) => hero.id));

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

  // ==========================================================
  // 3. HISTORIQUE PAR COMPOSITION DE CLASSES
  // ==========================================================

  const historicalClassTeam = findBestHistoricalClassTeam(
    enemyIds,
    combats,
    heroes
  );

  if (historicalClassTeam && historicalClassTeam.length === TEAM_SIZE) {
    onSource?.("class-history");
    return historicalClassTeam;
  }

  // ==========================================================
  // 4. COUNTER USAGE / SCORE
  // ==========================================================

  const usedIds = new Set(recommended.map((hero) => hero.id));

  while (recommended.length < TEAM_SIZE && ranked.length) {
    const selected = ranked.shift()?.hero;

    if (!selected) break;
    // Aucun filtrage des héros ennemis.
    if (usedIds.has(selected.id)) {
      continue;
    }

    recommended.push(selected);
    usedIds.add(selected.id);
  }

  if (recommended.length < TEAM_SIZE) {
    for (const hero of availableHeroes) {
      if (recommended.length >= TEAM_SIZE) {
        break;
      }

      if (usedIds.has(hero.id)) {
        continue;
      }

      recommended.push(hero);
      usedIds.add(hero.id);
    }
  }

  onSource?.("counter-usage");

  return recommended;
}

// ============================================================
// ÉQUIPE ALTERNATIVE
// ============================================================

export function recommendAlternativeTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  primaryTeam: Hero[] = []
): Hero[] {
  if (!enemyIds.length) {
    return [];
  }

  const primaryIds = new Set(primaryTeam.map((hero) => hero.id));

  const availableHeroes = heroes.filter((hero) => !primaryIds.has(hero.id));

  if (availableHeroes.length <= TEAM_SIZE) {
    return availableHeroes;
  }

  const settings = getEngineSettings();

  const budgets = getPointBudgets(settings, "B");

  const counterUsage = calculateCounterUsage(enemyIds, combats);

  const ranked = availableHeroes
    .map((hero) => {
      const counter = counterUsage[hero.id];

      if (!counter) {
        return {
          hero,
          score: 0,
        };
      }

      const confidence = Math.min(
        counter.total /
          Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles),
        1
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
      (a, b) => b.score - a.score || a.hero.name.localeCompare(b.hero.name)
    );

  const buildCandidate = (orderedHeroes: typeof ranked): Hero[] => {
    const team: Hero[] = [];

    for (const candidate of orderedHeroes) {
      if (primaryIds.has(candidate.hero.id)) {
        continue;
      }

      team.push(candidate.hero);

      if (team.length === TEAM_SIZE) {
        break;
      }
    }

    return team;
  };

  const baseAlternative = buildCandidate(ranked);

  if (baseAlternative.length !== TEAM_SIZE) {
    return baseAlternative;
  }

  // ==========================================================
  // CORE4 ANALYSÉ UNE SEULE FOIS
  // ==========================================================

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);

  const getCore4Points = (team: Hero[]): number => {
    const teamIds = new Set(team.map((hero) => hero.id));

    let bestRawScore = 0;

    for (const core of core4Analyses) {
      if (!core.coreIds.every((id) => teamIds.has(id))) {
        continue;
      }

      const confidence = Math.min(
        core.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
        1
      );

      bestRawScore = Math.max(bestRawScore, (core.winRate / 100) * confidence);
    }

    return normalizeModulePoints(bestRawScore, budgets.core4);
  };

  // ==========================================================
  // ÉVALUATION D'UNE ÉQUIPE
  // ==========================================================

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

    const classHistoryPoints =
      classHistory.battles > 0
        ? normalizeModulePoints(
            (classHistory.winRate / 100) *
              Math.min(
                classHistory.battles /
                  Math.max(
                    1,
                    settings.advanced.teamAHistoricalConfidenceBattles * 2
                  ),
                1
              ),
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
          (hero, heroIndex) => heroIndex !== index && hero.id === replacement.id
        )
      ) {
        continue;
      }

      const candidate = [...baseAlternative];

      candidate[index] = replacement;

      candidates.push(candidate);
    }
  }

  // ==========================================================
  // HISTORIQUES EXACTS EXISTANTS
  // ==========================================================

  const historicalTeams = new Map<string, Hero[]>();

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? []) || !combat.won) {
      continue;
    }

    const ids = uniqueIds(combat.my_heroes ?? []);

    if (ids.length !== TEAM_SIZE) {
      continue;
    }
    // On exclut seulement l'équipe principale.
    // Les héros ennemis restent parfaitement autorisés.
    if (ids.some((id) => primaryIds.has(id))) {
      continue;
    }

    const team = ids
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) {
      historicalTeams.set(teamKey(ids), team);
    }
  }

  candidates.push(...historicalTeams.values());

  // ==========================================================
  // CLASSEMENT FINAL
  // ==========================================================

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

export function rankHeroes(heroes: Hero[], combats: Combat[]): HeroScore[] {
  void combats;

  return heroes
    .map((hero) => scoreHero(hero))
    .sort((a, b) => b.score - a.score || a.heroId.localeCompare(b.heroId));
}

export function evaluateSpecificHistoryModule(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[],
  team: "A" | "B"
) {
  const history = evaluateExactTeamHistory(teamIds, enemyIds, combats);

  const settings = getEngineSettings();

  const budgets = getPointBudgets(settings, team);

  const points = calculateSpecificHistoryPoints(
    history.wins,
    history.losses,
    budgets.specificHistory
  );

  return {
    wins: history.wins,
    losses: history.losses,
    battles: history.battles,
    winRate: history.winRate,
    points,
    maxPoints: budgets.specificHistory,
  };
}
