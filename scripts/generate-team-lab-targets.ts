import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { HEROES } from "../src/data/heroes.ts";

const METRICS = ["atk", "matk", "def", "mdef", "hp"] as const;
const TEAM_SIZE = 5;
const MIN_OBSERVATIONS = 10;
const MIN_DISTINCT_FORMATIONS = 2;
const MIN_WILSON_LOWER_BOUND = 0.5;
const WILSON_Z = 1.959963984540054;
const MAX_ZONE_DISTANCE = 1;

type MetricKey = (typeof METRICS)[number];

type WinningFormation = {
  formation: string;
  heroes: string[];
  observations: number;
  wins: number;
  losses: number;
};

type WinningPatterns = {
  generatedAt: string;
  formations: {
    all: WinningFormation[];
  };
};

type Zone = {
  zone: number;
  min: number;
  max: number;
};

type ZoneFile = {
  zoneCount: number;
  stats: Record<MetricKey, { zones: Zone[] }>;
};

type Signal = {
  vector: string;
  wins: number;
  losses: number;
  observations: number;
  distinctFormations: number;
  winRate: number;
  wilsonLowerBound: number;
};

const WINNING_PATTERNS_PATH = resolve(
  process.cwd(),
  "data",
  "winning-patterns.json"
);
const ZONES_PATH = resolve(process.cwd(), "data", "theoretical-zones.json");
const OUTPUT_PATH = resolve(
  process.cwd(),
  "data",
  "team-lab-target-formations.json"
);

const winningPatterns = JSON.parse(
  readFileSync(WINNING_PATTERNS_PATH, "utf8")
) as WinningPatterns;
const theoreticalZones = JSON.parse(
  readFileSync(ZONES_PATH, "utf8")
) as ZoneFile;

function getZone(value: number, metric: MetricKey): number {
  const definition = theoreticalZones.stats[metric];
  const zone = definition.zones.find(
    (item) => value >= item.min && value <= item.max
  );

  if (!zone) {
    throw new Error(`Valeur hors zones : ${metric}=${value}`);
  }

  return zone.zone;
}

function wilsonLowerBound(wins: number, observations: number): number {
  if (observations === 0) return 0;

  const p = wins / observations;
  const z = WILSON_Z;
  const denominator = 1 + (z * z) / observations;
  const center = p + (z * z) / (2 * observations);
  const margin =
    z * Math.sqrt(
      (p * (1 - p) + (z * z) / (4 * observations)) / observations
    );

  return (center - margin) / denominator;
}

function getFormationVector(
  heroIds: string[],
  heroesById: Map<string, (typeof HEROES)[number]>
): string {
  const totals = Object.fromEntries(
    METRICS.map((metric) => [metric, 0])
  ) as Record<MetricKey, number>;

  for (const heroId of heroIds) {
    const hero = heroesById.get(heroId);

    if (!hero) {
      throw new Error(`Héros introuvable : ${heroId}`);
    }

    for (const metric of METRICS) {
      totals[metric] += hero.stats[metric];
    }
  }

  return METRICS.map((metric) => getZone(totals[metric], metric)).join("-");
}

function buildTargetVectors(signals: Signal[]): Set<string> {
  const targetVectors = new Set<string>();

  for (const signal of signals) {
    const vector = signal.vector.split("-").map(Number);
    targetVectors.add(signal.vector);

    for (let index = 0; index < vector.length; index++) {
      for (const delta of [-MAX_ZONE_DISTANCE, MAX_ZONE_DISTANCE]) {
        const neighbor = [...vector];
        neighbor[index] += delta;

        if (
          neighbor[index] >= 1 &&
          neighbor[index] <= theoreticalZones.zoneCount
        ) {
          targetVectors.add(neighbor.join("-"));
        }
      }
    }
  }

  return targetVectors;
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

const heroesById = new Map(HEROES.map((hero) => [hero.id, hero]));
const byVector = new Map<
  string,
  { wins: number; losses: number; observations: number; formations: number }
>();

for (const formation of winningPatterns.formations.all) {
  const vector = getFormationVector(formation.heroes, heroesById);
  const current = byVector.get(vector) ?? {
    wins: 0,
    losses: 0,
    observations: 0,
    formations: 0,
  };

  current.wins += formation.wins;
  current.losses += formation.losses;
  current.observations += formation.observations;
  current.formations += 1;
  byVector.set(vector, current);
}

const robustSignals: Signal[] = [];

for (const [vector, stats] of byVector) {
  const lowerBound = wilsonLowerBound(stats.wins, stats.observations);

  if (
    stats.observations >= MIN_OBSERVATIONS &&
    stats.formations >= MIN_DISTINCT_FORMATIONS &&
    lowerBound > MIN_WILSON_LOWER_BOUND
  ) {
    robustSignals.push({
      vector,
      wins: stats.wins,
      losses: stats.losses,
      observations: stats.observations,
      distinctFormations: stats.formations,
      winRate: stats.wins / stats.observations,
      wilsonLowerBound: lowerBound,
    });
  }
}

const targetVectors = buildTargetVectors(robustSignals);
const sortedHeroes = [...HEROES].sort((a, b) => a.id.localeCompare(b.id));
const targetFormations: string[] = [];

for (let a = 0; a < sortedHeroes.length - 4; a++) {
  for (let b = a + 1; b < sortedHeroes.length - 3; b++) {
    for (let c = b + 1; c < sortedHeroes.length - 2; c++) {
      for (let d = c + 1; d < sortedHeroes.length - 1; d++) {
        for (let e = d + 1; e < sortedHeroes.length; e++) {
          const heroes = [
            sortedHeroes[a],
            sortedHeroes[b],
            sortedHeroes[c],
            sortedHeroes[d],
            sortedHeroes[e],
          ];
          const vector = getFormationVector(
            heroes.map((hero) => hero.id),
            heroesById
          );

          if (targetVectors.has(vector)) {
            targetFormations.push(heroes.map((hero) => hero.id).join(","));
          }
        }
      }
    }
  }
}

const theoreticalFormationCount = combinationCount(
  sortedHeroes.length,
  TEAM_SIZE
);

if (theoreticalFormationCount !== 5_461_512) {
  throw new Error(
    `Nombre théorique inattendu : ${theoreticalFormationCount}`
  );
}

if (robustSignals.length !== 5) {
  throw new Error(
    `Nombre de signaux robustes inattendu : ${robustSignals.length}`
  );
}

if (targetVectors.size !== 53) {
  throw new Error(
    `Nombre de vecteurs cibles inattendu : ${targetVectors.size}`
  );
}

if (targetFormations.length !== 5240) {
  throw new Error(
    `Nombre de formations cibles inattendu : ${targetFormations.length}`
  );
}

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    winningPatternsGeneratedAt: winningPatterns.generatedAt,
    algorithm:
      "Vecteurs robustes 5D + distance L1 <= 1 (une seule métrique peut varier de ±1 zone).",
    metrics: METRICS,
  },
  thresholds: {
    minObservations: MIN_OBSERVATIONS,
    minDistinctFormations: MIN_DISTINCT_FORMATIONS,
    minWilsonLowerBound: MIN_WILSON_LOWER_BOUND,
    confidenceLevel: 0.95,
    maxZoneDistance: MAX_ZONE_DISTANCE,
  },
  robustSignals,
  targetVectorCount: targetVectors.size,
  theoreticalFormationCount,
  targetFormationCount: targetFormations.length,
  formations: targetFormations,
};

writeFileSync(OUTPUT_PATH, \`\${JSON.stringify(output, null, 2)}\\n\`, "utf8");

console.log("");
console.log("==============================================");
console.log("  GENERATION DES CIBLES DU TEAM LAB");
console.log("==============================================");
console.log("");
console.log(\`Signaux robustes : \${robustSignals.length}\`);
console.log(\`Vecteurs cibles : \${targetVectors.size}\`);
console.log(\`Formations théoriques : \${theoreticalFormationCount.toLocaleString("fr-FR")}\`);
console.log(\`Formations dans la zone cible : \${targetFormations.length.toLocaleString("fr-FR")}\`);
console.log(\`Fichier : \${OUTPUT_PATH}\`);
