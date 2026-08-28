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

// ============================================================
// CONSTANTES
// ============================================================

const TEAM_SIZE = 5;

// ============================================================
// OUTILS
// ============================================================

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
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
    entry.winRate =
      entry.total > 0
        ? (entry.wins / entry.total) * 100
        : 0;
  }

  return usage;
}

// ============================================================
// TAUX DE VICTOIRE
// ============================================================

export function calculateWinRate(
  wins: number,
  total: number
): number {
  if (total <= 0) return 0;

  return (wins / total) * 100;
}

// ============================================================
// COUVERTURE HISTORIQUE
// ============================================================

export function coverageReport(
  teamIds: string[],
  combats: Combat[]
): CoverageReport {
  const team = uniqueIds(teamIds);

  if (team.length === 0) {
    return {
      covered: 0,
      total: 0,
      percentage: 0,
    };
  }

  const used = new Set<string>();

  for (const combat of combats) {
    for (const heroId of combat.my_heroes ?? []) {
      used.add(heroId);
    }
  }

  const covered = team.filter((heroId) =>
    used.has(heroId)
  ).length;

  return {
    covered,
    total: team.length,
    percentage:
      (covered / team.length) * 100,
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

  if (!entry || entry.total <= 0) {
    return 0;
  }

  const winRateScore = entry.winRate;

  const experienceBonus = Math.min(
    entry.total * 2,
    20
  );

  return clamp(
    winRateScore + experienceBonus,
    0,
    120
  );
}

// ============================================================
// SCORE STATISTIQUE D'UN HÉROS
// ============================================================

export function heroStatScore(
  hero: Hero
): number {
  const {
    hp,
    atk,
    matk,
    def,
    mdef,
  } = hero.stats;

  const totalAttack =
    atk + matk;

  const totalDefense =
    def + mdef;

  const hpScore =
    hp / 1000;

  const attackScore =
    totalAttack / 100;

  const defenseScore =
    totalDefense / 10;

  return (
    hpScore +
    attackScore +
    defenseScore
  );
}

// ============================================================
// SCORE D'UN HÉROS
// ============================================================

export function scoreHero(
  hero: Hero,
  usage: Record<string, HeroUsage>
): HeroScore {
  const usageScore =
    heroUsageScore(
      hero.id,
      usage
    );

  const statScore =
    heroStatScore(hero);

  return {
    heroId: hero.id,
    score:
      usageScore +
      statScore,
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
  const team =
    uniqueIds(teamIds);

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
    const historicalTeam =
      new Set(
        combat.my_heroes ?? []
      );

    const matches =
      team.every((heroId) =>
        historicalTeam.has(heroId)
      );

    if (!matches) continue;

    if (combat.won) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  const battles =
    wins + losses;

  return {
    wins,
    losses,
    battles,
    winRate:
      calculateWinRate(
        wins,
        battles
      ),
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
  const teamIds =
    team.map(
      (hero) => hero.id
    );

  const history =
    evaluateTeamHistory(
      teamIds,
      combats
    );

  const usageValues =
    team.map((hero) =>
      heroUsageScore(
        hero.id,
        usage
      )
    );

  const statValues =
    team.map((hero) =>
      heroStatScore(hero)
    );

  const usageScore =
    usageValues.length > 0
      ? usageValues.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        usageValues.length
      : 0;

  const statScore =
    statValues.length > 0
      ? statValues.reduce(
          (sum, value) =>
            sum + value,
          0
        ) /
        statValues.length
      : 0;

  const score =
    history.winRate * 2 +
    usageScore * 0.5 +
    statScore;

  return {
    score,
    historicalWins:
      history.wins,
    historicalLosses:
      history.losses,
    historicalBattles:
      history.battles,
    historicalWinRate:
      history.winRate,
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
  const evaluation =
    evaluateTeam(
      team,
      combats,
      usage
    );

  return {
    heroIds:
      team.map(
        (hero) => hero.id
      ),
    score:
      evaluation.score,
  };
}

// ============================================================
// IDENTIFIER LES COMBATS CONTRE LES MÊMES ENNEMIS
// ============================================================

function isSameEnemyTeam(
  enemyIds: string[],
  combatEnemyIds: string[]
): boolean {
  const enemy =
    new Set(
      uniqueIds(enemyIds)
    );

  const combatEnemy =
    uniqueIds(
      combatEnemyIds
    );

  if (
    enemy.size !==
    combatEnemy.length
  ) {
    return false;
  }

  return combatEnemy.every(
    (heroId) =>
      enemy.has(heroId)
  );
}

// ============================================================
// MEILLEURE ÉQUIPE HISTORIQUE
// ============================================================

export function findBestHistoricalTeam(
  enemyIds: string[],
  combats: Combat[],
  heroes: Hero[]
): Hero[] | null {
  let bestTeam:
    | Hero[]
    | null = null;

  let bestScore =
    -Infinity;

  const usage =
    calculateHeroUsage(
      combats,
      heroes
    );

  for (const combat of combats) {
    if (
      !isSameEnemyTeam(
        enemyIds,
        combat.enemy_heroes ?? []
      )
    ) {
      continue;
    }

    // On ne veut que les victoires.
    if (!combat.won) {
      continue;
    }

    const team =
      uniqueIds(
        combat.my_heroes ?? []
      )
        .map((id) =>
          heroes.find(
            (hero) =>
              hero.id === id
          )
        )
        .filter(
          (
            hero
          ): hero is Hero =>
            Boolean(hero)
        );

    if (
      team.length !==
      TEAM_SIZE
    ) {
      continue;
    }

    const evaluation =
      evaluateTeam(
        team,
        combats,
        usage
      );

    if (
      evaluation.score >
      bestScore
    ) {
      bestScore =
        evaluation.score;

      bestTeam =
        team;
    }
  }

  return bestTeam;
}

// ============================================================
// SCORE HISTORIQUE CONTRE LES ENNEMIS
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
    if (
      !isSameEnemyTeam(
        enemyIds,
        combat.enemy_heroes ?? []
      )
    ) {
      continue;
    }

    for (const heroId of
      combat.my_heroes ?? []) {
      if (!result[heroId]) {
        result[heroId] = {
          wins: 0,
          losses: 0,
          total: 0,
          winRate: 0,
        };
      }

      result[heroId].total += 1;

      if (combat.won) {
        result[heroId].wins += 1;
      } else {
        result[heroId].losses += 1;
      }
    }
  }

  for (const entry of
    Object.values(result)) {
    entry.winRate =
      entry.total > 0
        ? (entry.wins /
            entry.total) *
          100
        : 0;
  }

  return result;
}

// ============================================================
// SCORE SPÉCIFIQUE CONTRE LES ENNEMIS
// ============================================================

function counterHeroScore(
  hero: Hero,
  usage: Record<string, HeroUsage>,
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
  const general =
    heroUsageScore(
      hero.id,
      usage
    );

  const stats =
    heroStatScore(hero);

  const counter =
    counterUsage[
      hero.id
    ];

  // ----------------------------------------------------------
  // Le comportement du héros contre cette composition
  // est beaucoup plus important que ses statistiques brutes.
  // ----------------------------------------------------------

  let counterScore = 0;

  if (counter) {
    counterScore =
      counter.winRate * 2 +
      Math.min(
        counter.total * 3,
        15
      );
  }

  return (
    counterScore +
    general * 0.25 +
    stats * 0.15
  );
}

// ============================================================
// RECOMMANDATION D'ÉQUIPE
// ============================================================

export function recommendTeam(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[]
): Hero[] {
  // ----------------------------------------------------------
  // 1. Sécurité
  // ----------------------------------------------------------

  if (
    enemyIds.length === 0
  ) {
    return [];
  }

  const enemySet =
    new Set(enemyIds);

  // ----------------------------------------------------------
  // 2. Équipe historique gagnante exacte
  // ----------------------------------------------------------

  const historicalTeam =
    findBestHistoricalTeam(
      enemyIds,
      combats,
      heroes
    );

  if (
    historicalTeam &&
    historicalTeam.length ===
      TEAM_SIZE
  ) {
    return historicalTeam;
  }

  // ----------------------------------------------------------
  // 3. Héros disponibles
  // ----------------------------------------------------------

  const availableHeroes =
    heroes.filter(
      (hero) =>
        !enemySet.has(
          hero.id
        )
    );

  if (
    availableHeroes.length <=
    TEAM_SIZE
  ) {
    return availableHeroes;
  }

  // ----------------------------------------------------------
  // 4. Données historiques
  // ----------------------------------------------------------

  const usage =
    calculateHeroUsage(
      combats,
      heroes
    );

  const counterUsage =
    calculateCounterUsage(
      enemyIds,
      combats
    );

  // ----------------------------------------------------------
  // 5. Classer les candidats
  // ----------------------------------------------------------

  const ranked =
    availableHeroes
      .map((hero) => ({
        hero,
        score:
          counterHeroScore(
            hero,
            usage,
            counterUsage
          ),
      }))
      .sort(
        (a, b) =>
          b.score -
            a.score ||
          a.hero.name.localeCompare(
            b.hero.name
          )
      );

  // ----------------------------------------------------------
  // 6. Construction progressive
  //
  // On ne prend PAS simplement les 5 premiers.
  //
  // On pénalise les répétitions de classe afin d'éviter
  // qu'un classement individuel transforme automatiquement
  // l'équipe en 5 STR / 5 AGI / 5 INT.
  // ----------------------------------------------------------

  const recommended:
    Hero[] = [];

  const classCounts:
    Record<string, number> = {
      STR: 0,
      AGI: 0,
      INT: 0,
    };

  while (
    recommended.length <
      TEAM_SIZE &&
    ranked.length > 0
  ) {
    let bestIndex =
      -1;

    let bestAdjustedScore =
      -Infinity;

    for (
      let i = 0;
      i < ranked.length;
      i++
    ) {
      const candidate =
        ranked[i];

      const currentCount =
        classCounts[
          candidate.hero.cls
        ] ?? 0;

      // ------------------------------------------------------
      // Pénalité progressive de classe.
      //
      // 1er héros : aucune pénalité
      // 2e héros : légère pénalité
      // 3e héros : forte pénalité
      // 4e/5e : très forte pénalité
      // ------------------------------------------------------

      let classPenalty =
        0;

      if (
        currentCount >= 1
      ) {
        classPenalty +=
          8 *
          currentCount;
      }

      if (
        currentCount >= 2
      ) {
        classPenalty +=
          20;
      }

      if (
        currentCount >= 3
      ) {
        classPenalty +=
          40;
      }

      const adjustedScore =
        candidate.score -
        classPenalty;

      if (
        adjustedScore >
        bestAdjustedScore
      ) {
        bestAdjustedScore =
          adjustedScore;

        bestIndex =
          i;
      }
    }

    if (
      bestIndex < 0
    ) {
      break;
    }

    const selected =
      ranked.splice(
        bestIndex,
        1
      )[0].hero;

    recommended.push(
      selected
    );

    classCounts[
      selected.cls
    ] =
      (classCounts[
        selected.cls
      ] ?? 0) + 1;
  }

  return recommended;
}

// ============================================================
// TRI DES HÉROS PAR SCORE
// ============================================================

export function rankHeroes(
  heroes: Hero[],
  combats: Combat[]
): HeroScore[] {
  const usage =
    calculateHeroUsage(
      combats,
      heroes
    );

  return heroes
    .map((hero) =>
      scoreHero(
        hero,
        usage
      )
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    );
}