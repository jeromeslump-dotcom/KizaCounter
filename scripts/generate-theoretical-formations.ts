import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { HEROES } from "../src/data/heroes.ts";

const TEAM_SIZE = 5;
const EXPECTED_FORMATION_COUNT = 5_461_512;
const METRIC_KEYS = ["atk", "matk", "def", "mdef", "hp"] as const;

type MetricKey = (typeof METRIC_KEYS)[number];

type ZoneDefinition = {
  theoreticalMin: number;
  theoreticalMax: number;
  width: number;
};

type ZoneFile = {
  zoneCount: number;
  stats: Record<string, ZoneDefinition>;
};

type ZoneResult = {
  zone: number;
  possibleFormations: number;
};

const ZONES_PATH = resolve(process.cwd(), "data", "theoretical-zones.json");
const OUTPUT_PATH = resolve(
  process.cwd(),
  "data",
  "theoretical-formations.json"
);

const theoreticalZones = JSON.parse(
  readFileSync(ZONES_PATH, "utf8")
) as ZoneFile;

const ZONE_COUNT = theoreticalZones.zoneCount;

const METRICS = Object.fromEntries(
  METRIC_KEYS.map((metric) => {
    const definition = theoreticalZones.stats[metric];

    if (!definition) {
      throw new Error(
        \`Définition théorique absente pour la métrique \${metric}.\`
      );
    }

    return [metric, definition];
  })
) as Record<MetricKey, ZoneDefinition>;

function getZone(value: number, definition: ZoneDefinition): number {
  if (
    value < definition.theoreticalMin ||
    value > definition.theoreticalMax
  ) {
    throw new Error(
      \`Valeur hors bornes : \${value} (\${definition.theoreticalMin} → \${definition.theoreticalMax})\`
    );
  }

  if (value >= definition.theoreticalMax) {
    return ZONE_COUNT;
  }

  return (
    Math.floor(
      (value - definition.theoreticalMin) / definition.width
    ) + 1
  );
}

function createCounters(): Record<MetricKey, number[]> {
  return Object.fromEntries(
    METRIC_KEYS.map((metric) => [metric, Array(ZONE_COUNT).fill(0)])
  ) as Record<MetricKey, number[]>;
}

if (HEROES.length !== 60) {
  throw new Error(
    \`Nombre de héros inattendu : \${HEROES.length}. Le calcul attend exactement 60 héros.\`
  );
}

if (ZONE_COUNT !== 20) {
  throw new Error(
    \`Nombre de zones inattendu : \${ZONE_COUNT}. Le calcul attend exactement 20 zones.\`
  );
}

const counters = createCounters();
let formationCount = 0;

console.log("");
console.log("==============================================");
console.log("  GENERATION DES FORMATIONS THEORIQUES");
console.log("==============================================");
console.log("");
console.log(\`Héros              : \${HEROES.length}\`);
console.log(\`Taille équipe      : \${TEAM_SIZE}\`);
console.log(
  \`Formations prévues : \${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")}\`
);
console.log(\`Zones par métrique : \${ZONE_COUNT}\`);
console.log(\`Bornes/zones       : data/theoretical-zones.json\`);
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

          for (const metric of METRIC_KEYS) {
            const definition = METRICS[metric];
            counters[metric][getZone(values[metric], definition) - 1]++;
          }

          formationCount++;

          if (formationCount % 1_000_000 === 0) {
            console.log(
              \`Progression : \${formationCount.toLocaleString("fr-FR")} / \${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")}\`
            );
          }
        }
      }
    }
  }
}

if (formationCount !== EXPECTED_FORMATION_COUNT) {
  throw new Error(
    \`Nombre de formations incorrect : \${formationCount}. Attendu : \${EXPECTED_FORMATION_COUNT}.\`
  );
}

const metrics = {} as Record<
  MetricKey,
  {
    theoreticalMin: number;
    theoreticalMax: number;
    zones: ZoneResult[];
    total: number;
  }
>;

console.log("");
console.log("==============================================");
console.log("  VERIFICATION");
console.log("==============================================");
console.log("");
console.log(
  \`Formations générées : \${formationCount.toLocaleString("fr-FR")} ✓\`
);

for (const metric of METRIC_KEYS) {
  const definition = METRICS[metric];
  const zones = counters[metric].map((possibleFormations, index) => ({
    zone: index + 1,
    possibleFormations,
  }));
  const total = zones.reduce(
    (sum, row) => sum + row.possibleFormations,
    0
  );

  if (total !== EXPECTED_FORMATION_COUNT) {
    throw new Error(
      \`\${metric.toUpperCase()} : total incorrect (\${total}). Attendu : \${EXPECTED_FORMATION_COUNT}.\`
    );
  }

  metrics[metric] = {
    theoreticalMin: definition.theoreticalMin,
    theoreticalMax: definition.theoreticalMax,
    zones,
    total,
  };

  console.log(
    \`\${metric.toUpperCase().padEnd(5)} : \${total.toLocaleString("fr-FR")} / \${EXPECTED_FORMATION_COUNT.toLocaleString("fr-FR")} ✓\`
  );
}

writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(
    {
      version: 1,
      generatedFrom: "src/data/heroes.ts",
      boundsSource: "data/theoretical-zones.json",
      heroCount: HEROES.length,
      teamSize: TEAM_SIZE,
      formationCount,
      zoneCount: ZONE_COUNT,
      metrics,
    },
    null,
    2
  ) + "\\n",
  "utf8"
);

console.log("");
console.log(\`Fichier créé : \${OUTPUT_PATH}\`);
