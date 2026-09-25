import { HEROES, type Hero } from "../../data/heroes";

export type GeneratorMetricKey = "atk" | "matk" | "def" | "mdef" | "hp";

export type GeneratorTargets = Record<GeneratorMetricKey, number>;

export type GeneratorTeam = {
  heroes: Hero[];
  zones: GeneratorTargets;
  relaxationDistance: number;
  relaxedMetric: GeneratorMetricKey | null;
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

const SEARCH_ORDER: GeneratorMetricKey[] = [
  "atk",
  "def",
  "mdef",
  "hp",
  "matk",
];

const ZONE_COUNT = 20;
export const TOTAL_FORMATIONS = 5_461_512;

const METRIC_BOUNDS: Record<
  GeneratorMetricKey,
  { min: number; max: number }
> = {
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
  const zoneWidth = Math.ceil(
    (theoreticalMax - theoreticalMin) / ZONE_COUNT
  );

  if (value >= theoreticalMax) return ZONE_COUNT;

  return Math.max(
    1,
    Math.min(
      ZONE_COUNT,
      Math.floor((value - theoreticalMin) / zoneWidth) + 1
    )
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
    matk: getZone(
      totals.matk,
      METRIC_BOUNDS.matk.min,
      METRIC_BOUNDS.matk.max
    ),
    def: getZone(totals.def, METRIC_BOUNDS.def.min, METRIC_BOUNDS.def.max),
    mdef: getZone(
      totals.mdef,
      METRIC_BOUNDS.mdef.min,
      METRIC_BOUNDS.mdef.max
    ),
    hp: getZone(totals.hp, METRIC_BOUNDS.hp.min, METRIC_BOUNDS.hp.max),
  };
}

function getRelaxationDistance(
  zones: GeneratorTargets,
  targets: GeneratorTargets
): { distance: number; metric: GeneratorMetricKey } | null {
  for (let distance = 1; distance < ZONE_COUNT; distance++) {
    for (const metric of SEARCH_ORDER) {
      const matchesOtherMetrics = GENERATOR_METRICS.every(
        ({ key }) => key === metric || zones[key] === targets[key]
      );

      if (
        matchesOtherMetrics &&
        Math.abs(zones[metric] - targets[metric]) === distance
      ) {
        return { distance, metric };
      }
    }
  }

  return null;
}

function getMatchRank(
  zones: GeneratorTargets,
  targets: GeneratorTargets
): { distance: number; metric: GeneratorMetricKey | null } | null {
  if (GENERATOR_METRICS.every(({ key }) => zones[key] === targets[key])) {
    return { distance: 0, metric: null };
  }

  return getRelaxationDistance(zones, targets);
}

export async function generateTeams(
  targets: GeneratorTargets,
  onProgress?: (progress: GeneratorProgress) => void
): Promise<GeneratorTeam[]> {
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestMetricIndex = Number.POSITIVE_INFINITY;
  let results: GeneratorTeam[] = [];
  let checked = 0;

  const reportEvery = 50_000;

  for (let i = 0; i < HEROES.length - 4; i++) {
    for (let j = i + 1; j < HEROES.length - 3; j++) {
      for (let k = i + 2; k < HEROES.length - 2; k++) {
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
              const metricIndex =
                match.metric === null
                  ? -1
                  : SEARCH_ORDER.indexOf(match.metric);

              const isBetter =
                match.distance < bestDistance ||
                (match.distance === bestDistance &&
                  metricIndex < bestMetricIndex);

              if (isBetter) {
                bestDistance = match.distance;
                bestMetricIndex = metricIndex;
                results = [
                  {
                    heroes,
                    zones,
                    relaxationDistance: match.distance,
                    relaxedMetric: match.metric,
                  },
                ];
              } else if (
                match.distance === bestDistance &&
                metricIndex === bestMetricIndex
              ) {
                results.push({
                  heroes,
                  zones,
                  relaxationDistance: match.distance,
                  relaxedMetric: match.metric,
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
  if (!team.relaxedMetric) {
    return "Correspondance exacte — les 5 caractéristiques sont dans la zone demandée";
  }

  const metricLabel =
    GENERATOR_METRICS.find(({ key }) => key === team.relaxedMetric)?.label ??
    team.relaxedMetric;

  return \`\${metricLabel} relâchée de ±\${team.relaxationDistance} zone\${
    team.relaxationDistance > 1 ? "s" : ""
  } — les 4 autres caractéristiques restent exactes\`;
}
