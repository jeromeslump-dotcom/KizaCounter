
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { HEROES } from "../src/data/heroes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(
  projectRoot,
  "data",
  "theoretical-bounds.json"
);

const TEAM_SIZE = 5;

type StatName =
  | "hp"
  | "atk"
  | "matk"
  | "def"
  | "mdef"
  | "atkTotal"
  | "defTotal";

type HeroWithValue = {
  id: string;
  name: string;
  value: number;
};

type Bound = {
  value: number;
  heroes: HeroWithValue[];
};

type StatBounds = {
  min: Bound;
  max: Bound;
};

const stats: StatName[] = [
  "hp",
  "atk",
  "matk",
  "def",
  "mdef",
  "atkTotal",
  "defTotal",
];

function getStatValue(
  hero: (typeof HEROES)[number],
  stat: StatName
): number {
  switch (stat) {
    case "hp":
      return hero.stats.hp;

    case "atk":
      return hero.stats.atk;

    case "matk":
      return hero.stats.matk;

    case "def":
      return hero.stats.def;

    case "mdef":
      return hero.stats.mdef;

    case "atkTotal":
      return hero.stats.atk + hero.stats.matk;

    case "defTotal":
      return hero.stats.def + hero.stats.mdef;
  }
}

function calculateBound(
  stat: StatName,
  direction: "min" | "max"
): Bound {
  const heroes = HEROES
    .map((hero) => ({
      id: hero.id,
      name: hero.name,
      value: getStatValue(hero, stat),
    }))
    .sort((a, b) =>
      direction === "min"
        ? a.value - b.value
        : b.value - a.value
    )
    .slice(0, TEAM_SIZE);

  return {
    value: heroes.reduce(
      (total, hero) => total + hero.value,
      0
    ),
    heroes,
  };
}

const result: Record<StatName, StatBounds> = {} as Record<
  StatName,
  StatBounds
>;

for (const stat of stats) {
  result[stat] = {
    min: calculateBound(stat, "min"),
    max: calculateBound(stat, "max"),
  };
}

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      heroCount: HEROES.length,
      teamSize: TEAM_SIZE,
      stats: result,
    },
    null,
    2
  ),
  "utf8"
);

console.log(`Héros analysés : ${HEROES.length}`);
console.log(`Taille équipe  : ${TEAM_SIZE}`);
console.log("");
console.log("Bornes théoriques :");

for (const stat of stats) {
  const bounds = result[stat];

  console.log(
    `${stat.padEnd(10)} : ${bounds.min.value} → ${bounds.max.value}`
  );
}

console.log("");
console.log(`Fichier créé : ${outputPath}`);
