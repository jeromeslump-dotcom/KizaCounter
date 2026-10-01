import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadLocalEnv() {
  for (const filename of [".env.local", ".env"]) {
    const envPath = path.join(projectRoot, filename);

    if (!fs.existsSync(envPath)) {
      continue;
    }

    for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("#") || !line.includes("=")) {
        continue;
      }

      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();

      if (
        (value.startsWith("\\\"") && value.endsWith("\\\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Variables Supabase manquantes : VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PAGE_SIZE = 1000;
const outputPath = path.join(
  projectRoot,
  "data",
  "stat-relations-analysis.json"
);

const STAT_NAMES = ["hp", "atk", "matk", "def", "mdef"] as const;
type StatName = (typeof STAT_NAMES)[number];

type CombatRow = {
  id: string;
  enemy_heroes: string[];
  my_heroes: string[];
  won: boolean;
  created_at: string;
  status: string;
  my_hp: number;
  my_atk: number;
  my_matk: number;
  my_def: number;
  my_mdef: number;
  enemy_hp: number;
  enemy_atk: number;
  enemy_matk: number;
  enemy_def: number;
  enemy_mdef: number;
};

type Bounds = {
  min: number;
  max: number;
};

type BoundsFile = {
  stats: Record<StatName, {
    min: { value: number };
    max: { value: number };
  }>;
};

type Side = "my" | "enemy";
type Result = "WIN" | "LOSS";

type Relation = {
  myStat: StatName;
  enemyStat: StatName;
  key: string;
  label: string;
};

type Band =
  | "very-unfavorable"
  | "unfavorable"
  | "neutral"
  | "favorable"
  | "very-favorable";

const BANDS: Band[] = [
  "very-unfavorable",
  "unfavorable",
  "neutral",
  "favorable",
  "very-favorable",
];

const BAND_DEFINITIONS: Record<Band, string> = {
  "very-unfavorable": "<= -5",
  unfavorable: "-4 to -2",
  neutral: "-1 to +1",
  favorable: "+2 to +4",
  "very-favorable": ">= +5",
};

function getBand(difference: number): Band {
  if (difference <= -5) {
    return "very-unfavorable";
  }

  if (difference <= -2) {
    return "unfavorable";
  }

  if (difference <= 1) {
    return "neutral";
  }

  if (difference <= 4) {
    return "favorable";
  }

  return "very-favorable";
}

function getRelations(): Relation[] {
  return STAT_NAMES.flatMap((myStat) =>
    STAT_NAMES.map((enemyStat) => ({
      myStat,
      enemyStat,
      key: `${myStat}Vs${enemyStat}`,
      label: `${myStat.toUpperCase()} vs ${enemyStat.toUpperCase()}`,
    }))
  );
}

function loadBounds(): BoundsFile {
  const filePath = path.join(projectRoot, "data", "theoretical-bounds.json");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable : ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as BoundsFile;

  return raw;
}

function getBounds(boundsFile: BoundsFile, stat: StatName): Bounds {
  return {
    min: boundsFile.stats[stat].min.value,
    max: boundsFile.stats[stat].max.value,
  };
}

/*
 * We do not compare raw values directly because ATK, MDEF and PV have
 * very different numerical scales.
 *
 * Each stat is first converted to its position between its theoretical
 * minimum and maximum, then expressed on the existing 20-zone scale.
 *
 * Example:
 *   normalized 0.00 -> position 0
 *   normalized 0.50 -> position 10
 *   normalized 1.00 -> position 20
 *
 * The resulting difference keeps the same interpretation as the existing
 * Team Lab relation bands without depending on the absolute unit of the stat.
 */
function getRelativePosition(value: number, bounds: Bounds): number {
  const width = bounds.max - bounds.min;

  if (width <= 0) {
    return 0;
  }

  return ((value - bounds.min) / width) * 20;
}

function getStatValue(
  combat: CombatRow,
  side: Side,
  stat: StatName
): number {
  const prefix = side === "my" ? "my" : "enemy";
  return combat[`${prefix}_${stat}` as keyof CombatRow] as number;
}

async function loadAllCombats(): Promise<CombatRow[]> {
  const rows: CombatRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("combats")
      .select(`
        id,
        enemy_heroes,
        my_heroes,
        won,
        created_at,
        status,
        my_hp,
        my_atk,
        my_matk,
        my_def,
        my_mdef,
        enemy_hp,
        enemy_atk,
        enemy_matk,
        enemy_def,
        enemy_mdef
      `)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const page = (data ?? []) as CombatRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

type BandStats = {
  observations: number;
  wins: number;
  losses: number;
  winRate: number;
  deltaFrom50: number;
  winShare: number;
  lossShare: number;
};

function emptyBandStats(): BandStats {
  return {
    observations: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    deltaFrom50: 0,
    winShare: 0,
    lossShare: 0,
  };
}

const boundsFile = loadBounds();
const combats = await loadAllCombats();

if (combats.length === 0) {
  throw new Error("Aucun combat actif trouvé dans Supabase.");
}

const relations = getRelations();

const analysis = new Map<
  string,
  {
    relation: Relation;
    bands: Record<Band, BandStats>;
  }
>();

for (const relation of relations) {
  analysis.set(relation.key, {
    relation,
    bands: Object.fromEntries(
      BANDS.map((band) => [band, emptyBandStats()])
    ) as Record<Band, BandStats>,
  });
}

const totalResults = {
  WIN: 0,
  LOSS: 0,
};

for (const combat of combats) {
  for (const side of ["my", "enemy"] as Side[]) {
    const opponent: Side = side === "my" ? "enemy" : "my";
    const result: Result =
      (side === "my" ? combat.won : !combat.won) ? "WIN" : "LOSS";

    totalResults[result]++;

    for (const relation of relations) {
      const myValue = getStatValue(combat, side, relation.myStat);
      const enemyValue = getStatValue(combat, opponent, relation.enemyStat);

      const myPosition = getRelativePosition(
        myValue,
        getBounds(boundsFile, relation.myStat)
      );
      const enemyPosition = getRelativePosition(
        enemyValue,
        getBounds(boundsFile, relation.enemyStat)
      );

      const difference = myPosition - enemyPosition;
      const band = getBand(difference);
      const stats = analysis.get(relation.key)!.bands[band];

      stats.observations++;

      if (result === "WIN") {
        stats.wins++;
      } else {
        stats.losses++;
      }
    }
  }
}

const results = relations.map((relation) => {
  const entry = analysis.get(relation.key)!;

  const totalWins = BANDS.reduce(
    (sum, band) => sum + entry.bands[band].wins,
    0
  );
  const totalLosses = BANDS.reduce(
    (sum, band) => sum + entry.bands[band].losses,
    0
  );

  for (const band of BANDS) {
    const stats = entry.bands[band];
    const total = stats.wins + stats.losses;

    stats.winRate = total === 0 ? 0 : stats.wins / total;
    stats.deltaFrom50 = stats.winRate - 0.5;
    stats.winShare = totalWins === 0 ? 0 : stats.wins / totalWins;
    stats.lossShare = totalLosses === 0 ? 0 : stats.losses / totalLosses;
  }

  return {
    relation: relation.label,
    myStat: relation.myStat,
    enemyStat: relation.enemyStat,
    bands: Object.fromEntries(
      BANDS.map((band) => [
        band,
        {
          definition: BAND_DEFINITIONS[band],
          ...entry.bands[band],
        },
      ])
    ),
  };
});

const result = {
  generatedAt: new Date().toISOString(),
  source: {
    table: "public.combats",
    status: "active",
  },
  method: {
    relationCount: relations.length,
    description:
      "Toutes les relations directionnelles entre les 5 statistiques d'une équipe et les 5 statistiques adverses.",
    statistics: STAT_NAMES,
    normalization:
      "Chaque statistique est normalisée entre son minimum et son maximum théorique, puis ramenée sur une échelle 0-20 avant comparaison.",
    bands: BAND_DEFINITIONS,
    baseline: "50% WIN / 50% LOSS",
    note:
      "Les résultats sont calculés sur les observations des deux côtés de chaque combat. Chaque combat fournit donc une observation WIN et une observation LOSS.",
  },
  totals: {
    combats: combats.length,
    observations: combats.length * 2,
    wins: totalResults.WIN,
    losses: totalResults.LOSS,
  },
  relations: results,
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(result, null, 2),
  "utf8"
);

console.log("");
console.log("=== ANALYSE DES 25 RELATIONS STATISTIQUES ===");
console.log(`Combats actifs : ${combats.length}`);
console.log(`Observations   : ${combats.length * 2}`);
console.log("");

for (const relation of results) {
  console.log(`--- ${relation.relation} ---`);

  for (const band of BANDS) {
    const stats = relation.bands[band];
    const winRate = (stats.winRate * 100).toFixed(1);
    const delta = (stats.deltaFrom50 * 100).toFixed(1);

    console.log(
      `${band.padEnd(17)} ${String(stats.wins).padStart(4)} WIN / ${String(
        stats.losses
      ).padStart(4)} LOSS | ${String(winRate).padStart(5)}% | delta 50%: ${delta.padStart(5)} pts`
    );
  }

  console.log("");
}

console.log(`Fichier créé : ${outputPath}`);
