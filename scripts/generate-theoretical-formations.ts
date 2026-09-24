import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { HEROES } from "../src/data/heroes.ts";

const TEAM_SIZE = 5;
const ZONE_COUNT = 20;
const EXPECTED_FORMATION_COUNT = 5_461_512;

type MetricKey = "atk" | "matk" | "def" | "mdef" | "hp";

type MetricConfig = {
  theoreticalMin: number;
  theoreticalMax: number;
};

type ZoneResult = {
  zone: number;
  possibleFormations: number;
};

const METRICS: Record<MetricKey, MetricConfig> = {
  atk: { theoreticalMin: 1417, theoreticalMax: 14178 },
  matk: { theoreticalMin: 1287, theoreticalMax: 14004 },
  def: { theoreticalMin: 409, theoreticalMax: 3885 },
  mdef: { theoreticalMin: 714, theoreticalMax: 3534 },
  hp: { theoreticalMin: 53401, theoreticalMax: 177892 },
};

const OUTPUT_PATH = resolve(process.cwd(), "data", "theoretical-formations.json");

function getZone(value: number, theoreticalMin: number, theoreticalMax: number): number {
  const zoneWidth = Math.ceil((theoreticalMax - theoreticalMin) / ZONE_COUNT);
  if (value >= theoreticalMax) return ZONE_COUNT;
  return Math.max(1, Math.min(ZONE_COUNT, Math.floor((value - theoreticalMin) / zoneWidth) + 1));
}

function createCounters(): Record<MetricKey, number[]> {
  return {
    atk: Array(ZONE_COUNT).fill(0),
    matk: Array(ZONE_COUNT).fill(0),
    def: Array(ZONE_COUNT).fill(0),
    mdef: Array(ZONE_COUNT).fill(0),
    hp: Array(ZONE_COUNT).fill(0),
  };
}

if (HEROES.length !== 60) {
  throw new Error(`Nombre de héros inattendu : ${HEROES.length}. Le calcul attend exactement 60 héros.`);
}

const counters = createCounters();
let formationCount = 0;

console.log("");
console.log("==============================================");
console.log("  GENERATION DES FORMATIONS THEORIQUES");
console.log("==============================================");
console.log("");
console.log(`Héros              : ${HEROES.length}`);
console.log(`Taille équipe      : ${TEAM_SIZE}`);
console.log(`Formations prévues  : ${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")}`);
console.log(`Zones par métrique  : ${ZONE_COUNT}`);
console.log("");

for (let i = 0; i < HEROES.length - 4; i++) {
  for (let j = i + 1; j < HEROES.length - 3; j++) {
    for (let k = j + 1; k < HEROES.length - 2; k++) {
      for (let l = k + 1; l < HEROES.length - 1; l++) {
        for (let m = l + 1; m < HEROES.length; m++) {
          const heroes = [HEROES[i], HEROES[j], HEROES[k], HEROES[l], HEROES[m]];

          const values: Record<MetricKey, number> = {
            atk: heroes.reduce((sum, hero) => sum + hero.stats.atk, 0),
            matk: heroes.reduce((sum, hero) => sum + hero.stats.matk, 0),
            def: heroes.reduce((sum, hero) => sum + hero.stats.def, 0),
            mdef: heroes.reduce((sum, hero) => sum + hero.stats.mdef, 0),
            hp: heroes.reduce((sum, hero) => sum + hero.stats.hp, 0),
          };

          for (const metric of Object.keys(METRICS) as MetricKey[]) {
            const config = METRICS[metric];
            counters[metric][getZone(values[metric], config.theoreticalMin, config.theoreticalMax) - 1]++;
          }

          formationCount++;

          if (formationCount % 1_000_000 === 0) {
            console.log(`Progression : ${formationCount.toLocaleString("fr-FR")} / ${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")}`);
          }
        }
      }
    }
  }
}

if (formationCount !== EXPECTED_FORMATION_COUNT) {
  throw new Error(`Nombre de formations incorrect : ${formationCount}. Attendu : ${EXPECTED_FORMATION_COUNT}.`);
}

const metrics = {} as Record<MetricKey, {
  theoreticalMin: number;
  theoreticalMax: number;
  zones: ZoneResult[];
  total: number;
}>;

console.log("");
console.log("==============================================");
console.log("  VERIFICATION");
console.log("==============================================");
console.log("");
console.log(`Formations générées : ${formationCount.toLocaleString("fr-FR")} ✓`);

for (const metric of Object.keys(METRICS) as MetricKey[]) {
  const config = METRICS[metric];
  const zones = counters[metric].map((possibleFormations, index) => ({
    zone: index + 1,
    possibleFormations,
  }));
  const total = zones.reduce((sum, row) => sum + row.possibleFormations, 0);

  if (total !== EXPECTED_FORMATION_COUNT) {
    throw new Error(`${metric.toUpperCase()} : total incorrect (${total}). Attendu : ${EXPECTED_FORMATION_COUNT}.`);
  }

  metrics[metric] = {
    ...config,
    zones,
    total,
  };

  console.log(`${metric.toUpperCase().padEnd(5)} : ${total.toLocaleString("fr-FR")} / ${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")} ✓`);
}

writeFileSync(
  OUTPUT_PATH,
  JSON.stringify({
    version: 1,
    generatedFrom: "src/data/heroes.ts",
    heroCount: HEROES.length,
    teamSize: TEAM_SIZE,
    formationCount,
    zoneCount: ZONE_COUNT,
    metrics,
  }, null, 2) + "\n",
  "utf8",
);

console.log("");
console.log(`Fichier créé : ${OUTPUT_PATH}`);
