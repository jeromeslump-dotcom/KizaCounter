import { HEROES, type Hero } from "../../data/heroes";
import winningPatterns from "../../../data/winning-patterns.json";

export type GeneratorMetricKey = "atk" | "matk" | "def" | "mdef" | "hp";
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

export const GENERATOR_METRICS: Array<{
  key: GeneratorMetricKey;
  label: string;
}> = [
  { key: "atk", label: "ATK" },
  { key: "matk", label: "MATK" },
  { key: "def", label: "DEF" },
  { key: "mdef", label: "MDEF" },
  { key: "hp", label: "PV" },
];

const SEARCH_ORDER: GeneratorMetricKey[] = ["atk", "matk", "def", "mdef", "hp"];

const ZONE_COUNT = 20;

const METRIC_BOUNDS: Record<GeneratorMetricKey, { min: number; max: number }> =
  {
    atk: { min: 1417, max: 14178 },
    matk: { min: 1287, max: 14004 },
    def: { min: 409, max: 3885 },
    mdef: { min: 714, max: 3534 },
    hp: { min: 53401, max: 177892 },
  };

function getZone(
  value: number,
  theoreticalMin: number,
  theoreticalMax: number
): number {
  const zoneWidth = Math.ceil((theoreticalMax - theoreticalMin) / ZONE_COUNT);

  if (value >= theoreticalMax) return ZONE_COUNT;

  return Math.max(
    1,
    Math.min(ZONE_COUNT, Math.floor((value - theoreticalMin) / zoneWidth) + 1)
  );
}

function getTeamZones(heroes: Hero[]): GeneratorTargets {
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
    atk: getZone(totals.atk, METRIC_BOUNDS.atk.min, METRIC_BOUNDS.atk.max),
    matk: getZone(totals.matk, METRIC_BOUNDS.matk.min, METRIC_BOUNDS.matk.max),
    def: getZone(totals.def, METRIC_BOUNDS.def.min, METRIC_BOUNDS.def.max),
    mdef: getZone(totals.mdef, METRIC_BOUNDS.mdef.min, METRIC_BOUNDS.mdef.max),
    hp: getZone(totals.hp, METRIC_BOUNDS.hp.min, METRIC_BOUNDS.hp.max),
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
  const required = available.filter((hero) => requiredHeroIds.has(hero.id));
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
    const heroes = [...required, ...optionalSelection].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const formation = heroes.map((hero) => hero.id).join(",");

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
