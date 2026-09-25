import { HEROES, type Hero } from "../../data/heroes";

export type GeneratorMetricKey = "atk" | "matk" | "def" | "mdef" | "hp";
export type GeneratorTargets = Record<GeneratorMetricKey, number>;

export type GeneratorTeam = {
  heroes: Hero[];
  zones: GeneratorTargets;
  relaxationDistance: number;
  relaxedMetric: GeneratorMetricKey | null;
  relaxationStage: number;
};

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
export const TOTAL_FORMATIONS = 5_461_512;

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

export async function generateTeams(
  targets: GeneratorTargets,
  onProgress?: (progress: GeneratorProgress) => void
): Promise<GeneratorTeam[]> {
  let bestStage = Number.POSITIVE_INFINITY;
  let results: GeneratorTeam[] = [];
  let checked = 0;

  const reportEvery = 50_000;

  for (let i = 0; i < HEROES.length - 4; i++) {
    for (let j = i + 1; j < HEROES.length - 3; j++) {
      for (let k = j + 1; k < HEROES.length - 2; k++) {
        for (let l = k + 1; l < HEROES.length - 1; l++) {
          for (let m = l + 1; m < HEROES.length; m++) {
            const heroes = [
              HEROES[i],
              HEROES[j],
              HEROES[k],
              HEROES[l],
              HEROES[m],
            ];

            const zones = getTeamZones(heroes);
            const match = getMatchRank(zones, targets);

            if (match) {
              const isBetter = match.stage < bestStage;

              if (isBetter) {
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
              onProgress?.({ checked, total: TOTAL_FORMATIONS });
              await new Promise<void>((resolve) => setTimeout(resolve, 0));
            }
          }
        }
      }
    }
  }

  onProgress?.({ checked: TOTAL_FORMATIONS, total: TOTAL_FORMATIONS });

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
