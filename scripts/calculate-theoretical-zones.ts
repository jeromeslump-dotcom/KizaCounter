
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");

const inputPath = path.join(
  projectRoot,
  "data",
  "theoretical-bounds.json"
);

const outputPath = path.join(
  projectRoot,
  "data",
  "theoretical-zones.json"
);

const ZONE_COUNT = 20;

type Bound = {
  value: number;
};

type StatBounds = {
  min: Bound;
  max: Bound;
};

type BoundsFile = {
  generatedAt: string;
  heroCount: number;
  teamSize: number;
  stats: Record<string, StatBounds>;
};

type Zone = {
  zone: number;
  min: number;
  max: number;
};

type StatZones = {
  theoreticalMin: number;
  theoreticalMax: number;
  rawWidth: number;
  width: number;
  zones: Zone[];
};

type ZonesFile = {
  generatedAt: string;
  source: string;
  zoneCount: number;
  stats: Record<string, StatZones>;
};

if (!fs.existsSync(inputPath)) {
  throw new Error(
    `Fichier introuvable : ${inputPath}`
  );
}

const bounds = JSON.parse(
  fs.readFileSync(inputPath, "utf8")
) as BoundsFile;

const result: ZonesFile = {
  generatedAt: new Date().toISOString(),
  source: "data/theoretical-bounds.json",
  zoneCount: ZONE_COUNT,
  stats: {},
};

for (const [stat, statBounds] of Object.entries(
  bounds.stats
)) {
  const theoreticalMin =
    statBounds.min.value;

  const theoreticalMax =
    statBounds.max.value;

  const rawWidth =
    (theoreticalMax - theoreticalMin) /
    ZONE_COUNT;

  const width = Math.ceil(rawWidth);

  const zones: Zone[] = [];

  for (
    let index = 0;
    index < ZONE_COUNT;
    index++
  ) {
    const min =
      theoreticalMin +
      index * width;

    const max =
      index === ZONE_COUNT - 1
        ? theoreticalMax
        : min + width - 1;

    zones.push({
      zone: index + 1,
      min,
      max,
    });
  }

  result.stats[stat] = {
    theoreticalMin,
    theoreticalMax,
    rawWidth,
    width,
    zones,
  };
}

fs.mkdirSync(
  path.dirname(outputPath),
  {
    recursive: true,
  }
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    result,
    null,
    2
  ),
  "utf8"
);

console.log(
  `Zones créées : ${ZONE_COUNT}`
);

console.log("");

for (
  const [stat, data] of
  Object.entries(result.stats)
) {
  console.log(
    `${stat.padEnd(10)} : ` +
    `${data.theoreticalMin} → ` +
    `${data.theoreticalMax} | ` +
    `brut ${data.rawWidth.toFixed(2)} | ` +
    `largeur ${data.width}`
  );

  console.log(
    `  Z01 : ` +
    `${data.zones[0].min} → ` +
    `${data.zones[0].max}`
  );

  console.log(
    `  Z20 : ` +
    `${data.zones[19].min} → ` +
    `${data.zones[19].max}`
  );

  console.log("");
}

console.log(
  `Fichier créé : ${outputPath}`
);
