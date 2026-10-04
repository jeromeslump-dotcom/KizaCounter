import { HEROES, type Hero } from "../../data/heroes";
import winningPatterns from "../../../data/winning-patterns.json";
import teamLabTargets from "../../../data/team-lab-target-formations.json";
import { getZone, type MetricKey } from "./theoreticalData";

export type GeneratorMetricKey = MetricKey;
export type GeneratorTargets = Record<GeneratorMetricKey, number>;

export type GeneratorTeam = {
  heroes: Hero[];
  zones: GeneratorTargets;
  distance: number;
  signalVector: string;
  signalWinRate: number;
  signalWilsonLowerBound: number;
};

type TargetData = {
  robustSignals: Array<{
    vector: string;
    wins: number;
    losses: number;
    observations: number;
    distinctFormations: number;
    winRate: number;
    wilsonLowerBound: number;
  }>;
  formations: string[];
};

const TARGET_DATA = teamLabTargets as TargetData;
const TARGET_FORMATIONS = TARGET_DATA.formations;
const TARGET_VECTORS = new Set(
  TARGET_DATA.robustSignals.flatMap((signal) => {
    const vector = signal.vector.split("-").map(Number);
    const vectors = [signal.vector];

    for (let index = 0; index < vector.length; index++) {
      for (const delta of [-1, 1]) {
        const neighbor = [...vector];
        neighbor[index] += delta;

        if (neighbor[index] >= 1 && neighbor[index] <= 20) {
          vectors.push(neighbor.join("-"));
        }
      }
    }

    return vectors;
  })
);

const TESTED_FORMATIONS = new Set(
  winningPatterns.formations.all.map((formation) => formation.formation)
);

const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));
const SIGNAL_BY_VECTOR = new Map(
  TARGET_DATA.robustSignals.map((signal) => [signal.vector, signal])
);

export type GeneratorProgress = {
  checked: number;
  total: number;
};

export const GENERATOR_METRICS = [
  { key: "atk", label: "ATK" },
  { key: "matk", label: "MATK" },
  { key: "def", label: "DEF" },
  { key: "mdef", label: "MDEF" },
  { key: "hp", label: "PV" },
] as const;

const METRIC_KEYS: GeneratorMetricKey[] = [
  "atk",
  "matk",
  "def",
  "mdef",
  "hp",
];

const MAX_RESULTS = 24;

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

function getVector(zones: GeneratorTargets): string {
  return METRIC_KEYS.map((key) => zones[key]).join("-");
}

function getSignalForVector(vector: string) {
  let bestSignal = null;

  for (const signal of TARGET_DATA.robustSignals) {
    const signalZones = signal.vector.split("-").map(Number);
    const targetZones = vector.split("-").map(Number);
    const distance = signalZones.reduce(
      (sum, zone, index) => sum + Math.abs(zone - targetZones[index]),
      0
    );

    if (distance > 1) continue;

    if (
      !bestSignal ||
      signal.wilsonLowerBound > bestSignal.signal.wilsonLowerBound
    ) {
      bestSignal = { signal, distance };
    }
  }

  return bestSignal;
}

function getCandidateFormations(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): string[] {
  if (requiredHeroIds.size === 0 || requiredHeroIds.size > 5) return [];

  return TARGET_FORMATIONS.filter((formation) => {
    if (TESTED_FORMATIONS.has(formation)) return false;

    const heroIds = formation.split(",");

    if (heroIds.some((heroId) => !availableHeroIds.has(heroId))) {
      return false;
    }

    return [...requiredHeroIds].every((heroId) => heroIds.includes(heroId));
  });
}

export function getGeneratorCandidateTotal(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): number {
  return getCandidateFormations(
    availableHeroIds,
    requiredHeroIds
  ).length;
}

export async function generateTeams(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>,
  onProgress?: (progress: GeneratorProgress) => void
): Promise<GeneratorTeam[]> {
  const formations = getCandidateFormations(
    availableHeroIds,
    requiredHeroIds
  );
  const total = formations.length;

  onProgress?.({ checked: 0, total });

  if (requiredHeroIds.size === 0 || total === 0 || total > MAX_RESULTS) {
    onProgress?.({ checked: total, total });
    return [];
  }

  const results = formations
    .map((formation) => {
      const heroIds = formation.split(",");
      const heroes = heroIds
        .map((heroId) => HERO_BY_ID.get(heroId))
        .filter((hero): hero is Hero => Boolean(hero));

      const zones = getTeamZones(heroes);
      const vector = getVector(zones);
      const signal = getSignalForVector(vector);

      if (!signal || !TARGET_VECTORS.has(vector)) return null;

      return {
        heroes,
        zones,
        distance: signal.distance,
        signalVector: signal.signal.vector,
        signalWinRate: signal.signal.winRate,
        signalWilsonLowerBound: signal.signal.wilsonLowerBound,
      };
    })
    .filter((team): team is GeneratorTeam => Boolean(team))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.signalWilsonLowerBound !== b.signalWilsonLowerBound) {
        return b.signalWilsonLowerBound - a.signalWilsonLowerBound;
      }
      return b.signalWinRate - a.signalWinRate;
    });

  onProgress?.({ checked: total, total });

  return results;
}

export function getMaxResults(): number {
  return MAX_RESULTS;
}
