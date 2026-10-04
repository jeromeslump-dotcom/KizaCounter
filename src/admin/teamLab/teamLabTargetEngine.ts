import { HEROES, type Hero } from "../../data/heroes";
import winningPatterns from "../../../data/winning-patterns.json";
import teamLabTargets from "../../../data/team-lab-target-formations.json";
import { getZone, type MetricKey } from "./theoreticalData";

export type TargetGeneratorTargets = Record<MetricKey, number>;

export type TargetGeneratorTeam = {
  heroes: Hero[];
  zones: TargetGeneratorTargets;
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
  targetVectors: string[];
  targetFormationCount: number;
  formations: string[];
};

const TARGET_DATA = teamLabTargets as TargetData;
const TARGET_FORMATIONS = TARGET_DATA.formations;
const TARGET_VECTORS = new Set(TARGET_DATA.targetVectors);
const TESTED_FORMATIONS = new Set(
  winningPatterns.formations.all.map((formation) => formation.formation)
);
const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));
const METRICS: MetricKey[] = ["atk", "matk", "def", "mdef", "hp"];
const MAX_RESULTS = 24;

export function getTargetFormationTotal(): number {
  return TARGET_DATA.targetFormationCount;
}

export function getTargetCandidateTotal(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): number {
  if (requiredHeroIds.size === 0 || requiredHeroIds.size > 5) return 0;

  return TARGET_FORMATIONS.filter((formation) => {
    if (TESTED_FORMATIONS.has(formation)) return false;

    const heroIds = formation.split(",");

    if (heroIds.some((heroId) => !availableHeroIds.has(heroId))) {
      return false;
    }

    return [...requiredHeroIds].every((heroId) => heroIds.includes(heroId));
  }).length;
}

function getTeamZones(heroes: Hero[]): TargetGeneratorTargets {
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

function getVector(zones: TargetGeneratorTargets): string {
  return METRICS.map((key) => zones[key]).join("-");
}

function getSignalForVector(vector: string) {
  let bestSignal: {
    signal: TargetData["robustSignals"][number];
    distance: number;
  } | null = null;

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

export async function generateTargetTeams(
  availableHeroIds: Set<string>,
  requiredHeroIds: Set<string>
): Promise<TargetGeneratorTeam[]> {
  const formations = TARGET_FORMATIONS.filter((formation) => {
    if (TESTED_FORMATIONS.has(formation)) return false;

    const heroIds = formation.split(",");

    if (heroIds.some((heroId) => !availableHeroIds.has(heroId))) {
      return false;
    }

    return [...requiredHeroIds].every((heroId) => heroIds.includes(heroId));
  });

  if (requiredHeroIds.size === 0 || formations.length === 0) return [];
  if (formations.length > MAX_RESULTS) return [];

  return formations
    .map((formation) => {
      const heroes = formation
        .split(",")
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
    .filter((team): team is TargetGeneratorTeam => Boolean(team))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.signalWilsonLowerBound !== b.signalWilsonLowerBound) {
        return b.signalWilsonLowerBound - a.signalWilsonLowerBound;
      }
      return b.signalWinRate - a.signalWinRate;
    });
}

export function getTargetMaxResults(): number {
  return MAX_RESULTS;
}
