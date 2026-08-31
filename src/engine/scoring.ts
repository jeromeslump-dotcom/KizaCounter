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
  findBestCore4,
  core4ReplacementScore,
  analyzeCore4Plus1,
} from "./historicalCore4";

import {
  getEngineSettings,
  getPointBudgets,
  normalizeModulePoints,
} from "./engineSettings";

const TEAM_SIZE = 5;

// ============================================================
// UTILITAIRES
// ============================================================

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

// ============================================================
// TAUX DE VICTOIRE
// ============================================================

export function calculateWinRate(wins: number, total: number): number {
  return total <= 0 ? 0 : (wins / total) * 100;
}

// ============================================================
// HISTORIQUE D'UNE ÉQUIPE EXACTE
// ============================================================

export function evaluateExactTeamHistory(
  teamIds: string[],
  enemyIds: string[],
  combats: Combat[]
): {
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
} {
  const normalizedTeam = uniqueIds(teamIds);

  if (normalizedTeam.length !== TEAM_SIZE) {
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
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) {
      continue;
    }

    if (!sameTeam(normalizedTeam, combat.my_heroes ?? [])) {
      continue;
    }

    if (combat.won) {
      wins++;
    } else {
      losses++;
    }
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
// MODULE A — HISTORIQUE SPÉCIFIQUE
//
// Victoires / Combats.
//
// Le nombre de combats sert uniquement à déterminer
// la confiance dans le résultat.
// ============================================================

export function calculateSpecificHistoryPoints(
  wins: number,
  losses: number,
  maxPoints: number
): number {
  const battles = wins + losses;

  if (battles <= 0 || maxPoints <= 0) {
    return 0;
  }

  const winRatio = wins / battles;

  const confidenceBattles =
    getEngineSettings().advanced.teamAHistoricalConfidenceBattles;

  const confidence = Math.min(battles / Math.max(1, confidenceBattles), 1);

  const rawScore = winRatio * confidence;

  return normalizeModulePoints(rawScore, maxPoints);
}

// ============================================================
// STATISTIQUES D'UTILISATION DES HÉROS
//
// Cette fonction reste disponible pour l'affichage
// statistique / administratif.
//
// IMPORTANT : ces statistiques ne participent plus
// au score de recommandation.
//
// Exemple :
// Tracker : utilisé 127 fois
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

      usage[heroId].total++;

      if (combat.won) {
        usage[heroId].wins++;
      } else {
        usage[heroId].losses++;
      }
    }
  }

  for (const entry of Object.values(usage)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return usage;
}

// ============================================================
// COVERAGE
//
// Mesure combien de héros de l'équipe possèdent une
// expérience historique positive contre l'équipe ennemie,
// en analysant les Core4 associés.
// ============================================================

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

    if (myIds.length !== TEAM_SIZE) {
      continue;
    }

    for (const heroId of team) {
      if (!myIds.includes(heroId)) {
        continue;
      }

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

      if (combat.won) {
        stats.wins++;
      } else {
        stats.losses++;
      }

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

// ============================================================
// SCORE D'UN HÉROS
//
// IMPORTANT :
// Le score d'un héros ne dépend plus de son nombre
// d'utilisations historiques.
//
// Le ranking descriptif reste donc neutre.
// ============================================================

export function scoreHero(hero: Hero): HeroScore {
  return {
    heroId: hero.id,
    score: 0,
  };
}

// ============================================================
// HISTORIQUE LARGE D'UNE ÉQUIPE
//
// Recherche une équipe contenue dans les combats historiques.
// L'équipe ennemie n'est volontairement pas utilisée ici.
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

    if (combat.won) {
      wins++;
    } else {
      losses++;
    }
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
// ÉVALUATION D'ÉQUIPE
//
// IMPORTANT :
// Le score ne mélange plus le taux d'utilisation des héros
// avec l'historique.
//
// Score = historique de l'équipe × poids général.
// ============================================================

export function evaluateTeam(
  team: Hero[],
  combats: Combat[],
  _usage?: Record<string, HeroUsage>
): TeamEvaluation {
  const settings = getEngineSettings();

  const history = evaluateTeamHistory(
    team.map((hero) => hero.id),
    combats
  );

  const score = history.winRate * settings.teamA.generalWinRateWeight;

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
  usage?: Record<string, HeroUsage>
): TeamScore {
  const evaluation = evaluateTeam(team, combats, usage);

  return {
    heroIds: team.map((hero) => hero.id),
    score: evaluation.score,
  };
}

// ============================================================
// MEILLEURE ÉQUIPE HISTORIQUE
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

    let candidate = candidates.get(key);

    if (!candidate) {
      candidate = {
        heroIds,
        wins: 0,
        losses: 0,
      };

      candidates.set(key, candidate);
    }

    if (combat.won) {
      candidate.wins++;
    } else {
      candidate.losses++;
    }
  }

  const winningCandidates = [...candidates.values()].filter(
    (candidate) =>
      candidate.wins > 0 &&
      candidate.wins + candidate.losses >=
        settings.advanced.teamAHistoricalConfidenceBattles
  );

  if (!winningCandidates.length) {
    return null;
  }

  let bestTeam: Hero[] | null = null;

  let bestCandidate: (typeof winningCandidates)[number] | null = null;

  let bestEvaluation: TeamEvaluation | null = null;

  let bestReliability = -Infinity;
  let bestBattles = -Infinity;
  let bestWinRate = -Infinity;

  for (const candidate of winningCandidates) {
    const team = candidate.heroIds
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length !== TEAM_SIZE) {
      continue;
    }

    const battles = candidate.wins + candidate.losses;

    const winRate = calculateWinRate(candidate.wins, battles);

    const confidence = Math.min(
      battles / Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles),
      1
    );

    const reliability =
      winRate *
      (settings.advanced.teamAHistoricalReliabilityBase +
        settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
          confidence);

    const evaluation = evaluateTeam(team, combats);

    const currentTeamKey = teamKey(candidate.heroIds);

    const bestTeamKey = bestCandidate ? teamKey(bestCandidate.heroIds) : "";

    const isBetter =
      !bestCandidate ||
      winRate > bestWinRate ||
      (winRate === bestWinRate && battles > bestBattles) ||
      (winRate === bestWinRate &&
        battles === bestBattles &&
        candidate.wins > bestCandidate.wins) ||
      (winRate === bestWinRate &&
        battles === bestBattles &&
        candidate.wins === bestCandidate.wins &&
        reliability > bestReliability) ||
      (winRate === bestWinRate &&
        battles === bestBattles &&
        candidate.wins === bestCandidate.wins &&
        reliability === bestReliability &&
        evaluation.score > (bestEvaluation?.score ?? -Infinity)) ||
      (winRate === bestWinRate &&
        battles === bestBattles &&
        candidate.wins === bestCandidate.wins &&
        reliability === bestReliability &&
        evaluation.score === (bestEvaluation?.score ?? -Infinity) &&
        currentTeamKey < bestTeamKey);

    if (isBetter) {
      bestCandidate = candidate;
      bestEvaluation = evaluation;
      bestTeam = team;
      bestReliability = reliability;
      bestBattles = battles;
      bestWinRate = winRate;
    }
  }

  return bestTeam &&
    bestReliability >= settings.advanced.teamAHistoricalReliabilityMin
    ? bestTeam
    : null;
}

// ============================================================
// UTILISATION DES CONTRES PAR HÉROS
// ============================================================

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
      if (!result[heroId]) {
        result[heroId] = {
          wins: 0,
          losses: 0,
          total: 0,
          winRate: 0,
        };
      }

      result[heroId].total++;

      if (combat.won) {
        result[heroId].wins++;
      } else {
        result[heroId].losses++;
      }
    }
  }

  for (const entry of Object.values(result)) {
    entry.winRate = entry.total > 0 ? (entry.wins / entry.total) * 100 : 0;
  }

  return result;
}

// ============================================================
// SCORE D'UN HÉROS CONTRE L'ÉQUIPE ENNEMIE
//
// Ici seul l'historique spécifique au matchup intervient.
// Le nombre de fois où le héros a été joué globalement
// ne donne aucun point.
// ============================================================

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

  const confidenceBattles = settings.advanced.teamAHistoricalConfidenceBattles;

  const confidence = Math.min(
    counter.total / Math.max(1, confidenceBattles),
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
// RECOMMANDATION PRINCIPALE
// ============================================================

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): Hero[] {
  if (!enemyIds.length) {
    return [];
  }

  const settings = getEngineSettings();

  const enemySet = new Set(enemyIds);

  // ----------------------------------------------------------
  // 1. Équipe historique exacte suffisamment fiable
  // ----------------------------------------------------------

  const historicalTeam = findBestHistoricalTeam(enemyIds, combats, heroes);

  if (historicalTeam && historicalTeam.length === TEAM_SIZE) {
    return historicalTeam;
  }

  // ----------------------------------------------------------
  // 2. Héros disponibles
  // ----------------------------------------------------------

  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));

  if (availableHeroes.length <= TEAM_SIZE) {
    return availableHeroes;
  }

  // ----------------------------------------------------------
  // 3. Historique spécifique au matchup
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // 4. Recherche du meilleur Core4 historique
  // ----------------------------------------------------------

  const bestCore4 = findBestCore4(enemyIds, combats);

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
        }
      }

      // --------------------------------------------------------
      // 5. Recherche du meilleur 5e héros
      // --------------------------------------------------------

      if (recommended.length === 4) {
        const core4Ids = core4Heroes.map((hero) => hero.id);

        let bestReplacement: Hero | null = null;

        let bestReplacementScore = -Infinity;

        for (const candidate of ranked) {
          if (
            core4Ids.includes(candidate.hero.id) ||
            enemySet.has(candidate.hero.id)
          ) {
            continue;
          }

          const historicalScore = core4ReplacementScore(
            enemyIds,
            core4Ids,
            candidate.hero.id,
            combats
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

        if (bestReplacement) {
          recommended.push(bestReplacement);
        }
      }

      return recommended;
    }
  }

  // ----------------------------------------------------------
  // 6. Fallback : classement des héros
  // ----------------------------------------------------------

  while (recommended.length < TEAM_SIZE && ranked.length) {
    const selected = ranked.shift()?.hero;

    if (!selected) {
      break;
    }

    recommended.push(selected);
  }

  return recommended;
}

// ============================================================
// ÉQUIPE ALTERNATIVE — TEAM B
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

  const enemySet = new Set(enemyIds);

  const primaryIds = new Set(primaryTeam.map((hero) => hero.id));

  const availableHeroes = heroes.filter((hero) => !enemySet.has(hero.id));

  if (availableHeroes.length <= TEAM_SIZE) {
    return availableHeroes;
  }

  const settings = getEngineSettings();

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

      const confidenceBattles =
        settings.advanced.teamAHistoricalConfidenceBattles;

      const confidence = Math.min(
        counter.total / Math.max(1, confidenceBattles),
        1
      );

      const counterScore =
        counter.winRate *
        confidence *
        settings.advanced.teamBCounterWinRateMultiplier *
        settings.teamB.specificHistoryWeight;

      return {
        hero,
        score: counterScore,
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

  // ----------------------------------------------------------
  // Bonus Core4 pour Team B
  // ----------------------------------------------------------

  const getCore4Bonus = (team: Hero[]): number => {
    const teamIds = team.map((hero) => hero.id);

    let bestScore = 0;

    for (const core of analyzeCore4Plus1(enemyIds, combats, settings)) {
      if (!core.coreIds.every((id) => teamIds.includes(id))) {
        continue;
      }

      const confidence = Math.min(
        core.battles / Math.max(1, settings.advanced.core4ConfidenceBattles),
        1
      );

      const score = core.winRate * confidence;

      if (score > bestScore) {
        bestScore = score;
      }
    }

    return bestScore * settings.teamB.core4Weight;
  };

  // ----------------------------------------------------------
  // Évaluation Team B
  // ----------------------------------------------------------

  const evaluateAlternative = (team: Hero[]) => {
    const individualScore = team.reduce((total, hero) => {
      const candidate = ranked.find((entry) => entry.hero.id === hero.id);

      return total + (candidate?.score ?? 0);
    }, 0);

    const core4Bonus = getCore4Bonus(team);

    const history = evaluateTeamHistory(
      team.map((hero) => hero.id),
      combats
    );

    const losingHistory = history.battles > 0 && history.wins === 0;

    return {
      team,
      score:
        individualScore +
        core4Bonus -
        (losingHistory ? Number.MAX_SAFE_INTEGER : 0),
      history,
    };
  };

  const candidates: Hero[][] = [baseAlternative];

  // ----------------------------------------------------------
  // Variantes de Team B
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Ajouter les équipes historiques gagnantes
  // ----------------------------------------------------------

  const historicalTeams = new Map<string, Hero[]>();

  for (const combat of combats) {
    if (!isSameEnemyTeam(enemyIds, combat.enemy_heroes ?? [])) {
      continue;
    }

    if (!combat.won) {
      continue;
    }

    const ids = uniqueIds(combat.my_heroes ?? []);

    if (ids.length !== TEAM_SIZE) {
      continue;
    }

    if (ids.some((id) => primaryIds.has(id) || enemySet.has(id))) {
      continue;
    }

    const team = ids
      .map((id) => heroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length !== TEAM_SIZE) {
      continue;
    }

    historicalTeams.set(teamKey(ids), team);
  }

  candidates.push(...historicalTeams.values());

  // ----------------------------------------------------------
  // Choix final
  // ----------------------------------------------------------

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

// ============================================================
// RANKING DES HÉROS
//
// Ranking descriptif neutre.
// L'utilisation historique n'est plus transformée
// en score moteur.
// ============================================================

export function rankHeroes(heroes: Hero[], combats: Combat[]): HeroScore[] {
  void combats;

  return heroes
    .map((hero) => scoreHero(hero))
    .sort((a, b) => b.score - a.score || a.heroId.localeCompare(b.heroId));
}

// ============================================================
// DÉTAIL DU MODULE HISTORIQUE
// ============================================================

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
