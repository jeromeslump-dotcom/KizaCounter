import { HEROES, type Hero } from "../../data/heroes";
import winningPatterns from "../../../data/winning-patterns.json";
import { getZone, METRICS, type MetricKey } from "./theoreticalData";

export type GeneratorMetricKey = MetricKey;
export type GeneratorTargets = Record<GeneratorMetricKey, number>;

export type GeneratorTeam = {
  heroes: Hero[];
  zones: GeneratorTargets;
  relaxationDistance: number;
  relaxedMetric: GeneratorMetricKey | null;
  relaxationStage: number;
};

const TESTED_FORMATIONS = new Set(
  winningPatterns.formations.all.map((formation) => formation.formation)
);

export type GeneratorProgress = {
  checked: number;
  total: number;
};

export const GENERATOR_METRICS = METRICS.map(({ key, label }) => ({
  key,
  label,
}));

const SEARCH_ORDER: GeneratorMetricKey[] = ["atk", "matk", "def", "mdef", "hp"];


export function getTeamZones(heroes: Hero[]): GeneratorTargets {
  const totals = heroes.reduce(
    (sum, hero) => ({
      atk: sum.atk + hero.stats.atk,
      matk: sum.matk + hero.stats.matk,
      def: sum.def + hero.stats.def,
      mdef: sum.mdef + hero.stats.mdef,
      hp: sum.hp + hero.stats.hp,
    }),
    { atk: 0, matk: 0, def: 0, mdef: 0, hp: 0 }
  );

  return {
    atk: getZone(totals.atk, "atk"),
    matk: getZone(totals.matk, "matk"),
    def: getZone(totals.def, "def"),
    mdef: getZone(totals.mdef, "mdef"),
    hp: getZone(totals.hp, "hp"),
  };
}

function getMatchRank(
  zones: GeneratorTargets,
  targets: GeneratorTargets
): {
  stage: number;
  distance: number;
  metric: GeneratorMetricKey | null;
} | null {
  const distances = SEARCH_ORDER.map((key) =>
    Math.abs(zones[key] - targets[key])
  );

  const distance = Math.max(...distances);

  if (distance === 0) {
    return { stage: 0, distance: 0, metric: null };
  }

  if (distance >= ZONE_COUNT) {
    return null;
  }

  let lastMaxIndex = -1;

  for (let index = 0; index < distances.length; index++) {
    if (distances[index] === distance) {
      lastMaxIndex = index;
    }
  }

  if (lastMaxIndex < 0) {
    return null;
  }

  return {
    stage: (distance - 1) * SEARCH_ORDER.length + lastMaxIndex + 1,
    distance,
    metric: SEARCH_ORDER[lastMaxIndex],
  };
}

function getToleranceVector(stage: number): GeneratorTargets {
  if (stage <= 0) {
    return {
      atk: 0,
      matk: 0,
      def: 0,
      mdef: 0,
      hp: 0,
    };
  }

  const level = Math.floor((stage - 1) / SEARCH_ORDER.length) + 1;
  const lastIndex = (stage - 1) % SEARCH_ORDER.length;

  return {
    atk: level,
    matk: lastIndex >= 1 ? level : level - 1,
    def: lastIndex >= 2 ? level : level - 1,
    mdef: lastIndex >= 3 ? level : level - 1,
    hp: lastIndex >= 4 ? level : level - 1,
  };
}

function combinationCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  const r = Math.min(k, n - k);
  let result = 1;

  for (let i = 1; i <= r; i++) {
    result = (result * (n - r + i)) / i;
  }

  return Math.round(result);
}

function getCandidateHeroes(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): { required: Hero[]; optional: Hero[] } {
  const available = HEROES.filter((hero) => availableHeroIds.has(hero.id));
  const availableById = new Map(available.map((hero) => [hero.id, hero]));

  // Preserve the order in which the user selected the required heroes.
  const required = [...requiredHeroIds]
    .map((heroId) => availableById.get(heroId))
    .filter((hero): hero is Hero => Boolean(hero));

  const requiredIds = new Set(required.map((hero) => hero.id));
  const optional = available.filter((hero) => !requiredIds.has(hero.id));

  return { required, optional };
}

export function getGeneratorCandidateTotal(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): number {
  const { required, optional } = getCandidateHeroes(
    availableHeroIds,
    requiredHeroIds
  );

  if (required.length > 5) return 0;

  return combinationCount(optional.length, 5 - required.length);
}

export async function generateTeams(
  targets: GeneratorTargets,
  availableHeroIds: Set<string> = new Set(HEROES.map((hero) => hero.id)),
  requiredHeroIds: Set<string> = new Set(),
  neverTestedOnly = false,
  onProgress?: (progress: GeneratorProgress) => void
): Promise<GeneratorTeam[]> {
  const { required, optional } = getCandidateHeroes(
    availableHeroIds,
    requiredHeroIds
  );
  const neededOptional = 5 - required.length;
  const total = getGeneratorCandidateTotal(availableHeroIds, requiredHeroIds);

  if (neededOptional < 0 || total === 0) {
    onProgress?.({ checked: 0, total });
    return [];
  }

  let bestStage = Number.POSITIVE_INFINITY;
  let results: GeneratorTeam[] = [];
  let checked = 0;
  const reportEvery = 50_000;

  const evaluate = (optionalSelection: Hero[]) => {
    const heroes = [...required, ...optionalSelection];
    const formation = [...heroes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((hero) => hero.id)
      .join(",");

    if (neverTestedOnly && TESTED_FORMATIONS.has(formation)) {
      checked++;
      return;
    }

    const zones = getTeamZones(heroes);
    const match = getMatchRank(zones, targets);

    if (match) {
      if (match.stage < bestStage) {
        bestStage = match.stage;
        results = [
          {
            heroes,
            zones,
            relaxationDistance: match.distance,
            relaxedMetric: match.metric,
            relaxationStage: match.stage,
          },
        ];
      } else if (match.stage === bestStage) {
        results.push({
          heroes,
          zones,
          relaxationDistance: match.distance,
          relaxedMetric: match.metric,
          relaxationStage: match.stage,
        });
      }
    }

    checked++;

    if (checked % reportEvery === 0) {
      onProgress?.({ checked, total });
    }
  };

  const choose = (start: number, selected: Hero[]) => {
    if (selected.length === neededOptional) {
      evaluate(selected);
      return;
    }

    const remaining = neededOptional - selected.length;

    for (let index = start; index <= optional.length - remaining; index++) {
      selected.push(optional[index]);
      choose(index + 1, selected);
      selected.pop();
    }
  };

  choose(0, []);

  onProgress?.({ checked: total, total });

  return results;
}

export function getRelaxationLabel(team: GeneratorTeam): string {
  if (team.relaxationStage === 0) {
    return "Correspondance exacte — les 5 caractéristiques sont dans la zone demandée";
  }

  const tolerances = getToleranceVector(team.relaxationStage);

  const tolerance = GENERATOR_METRICS.map(({ key, label }) => {
    return `${label} ±${tolerances[key]}`;
  }).join(", ");

  return `Tolérance cumulative : ${tolerance}`;
}
