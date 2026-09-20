import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { HEROES } from "../src/data/heroes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const zonesPath = path.join(projectRoot, "data", "theoretical-zones.json");
const outputPath = path.join(projectRoot, "data", "winning-patterns.json");

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Variables Supabase manquantes : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PAGE_SIZE = 1000;

const STAT_NAMES = [
  "hp",
  "atk",
  "matk",
  "atkTotal",
  "def",
  "mdef",
  "defTotal",
] as const;

type StatName = (typeof STAT_NAMES)[number];

type Zone = {
  zone: number;
  min: number;
  max: number;
};

type ZonesFile = {
  zoneCount: number;
  stats: Record<
    StatName,
    {
      theoreticalMin: number;
      theoreticalMax: number;
      width: number;
      zones: Zone[];
    }
  >;
};

type CombatRow = {
  id: string;
  enemy_heroes: string[];
  my_heroes: string[];
  won: boolean;
  created_at: string;
  status: string;
  my_str: number;
  my_agi: number;
  my_int: number;
  enemy_str: number;
  enemy_agi: number;
  enemy_int: number;
  my_hp: number;
  my_atk: number;
  my_matk: number;
  my_def: number;
  my_mdef: number;
  my_atk_total: number;
  my_def_total: number;
  enemy_hp: number;
  enemy_atk: number;
  enemy_matk: number;
  enemy_def: number;
  enemy_mdef: number;
  enemy_atk_total: number;
  enemy_def_total: number;
};

type TeamObservation = {
  formation: string;
  heroes: string[];
  names: string[];
  classes: {
    STR: number;
    AGI: number;
    INT: number;
  };
  result: "WIN" | "LOSS";
  combatId: string;
  side: "my" | "enemy";
  createdAt: string;
  stats: Record<StatName, number>;
  zones: Record<StatName, number>;
  zoneCombination: string;
};

function loadZones(): ZonesFile {
  if (!fs.existsSync(zonesPath)) {
    throw new Error(`Fichier introuvable : ${zonesPath}`);
  }

  return JSON.parse(fs.readFileSync(zonesPath, "utf8")) as ZonesFile;
}

function getZone(value: number, stat: StatName, zones: ZonesFile): number {
  const definition = zones.stats[stat];

  const found = definition.zones.find(
    (zone) => value >= zone.min && value <= zone.max
  );

  if (!found) {
    throw new Error(
      `Valeur hors zones : ${stat}=${value} (${definition.theoreticalMin} → ${definition.theoreticalMax})`
    );
  }

  return found.zone;
}

function canonicalFormation(heroIds: string[]): string {
  return [...heroIds].sort().join(",");
}

function heroNames(heroIds: string[]): string[] {
  const heroesById = new Map(HEROES.map((hero) => [hero.id, hero.name]));

  return [...heroIds]
    .sort()
    .map((id) => heroesById.get(id) ?? id);
}

function getClasses(heroIds: string[]) {
  const heroesById = new Map(HEROES.map((hero) => [hero.id, hero]));

  const classes = {
    STR: 0,
    AGI: 0,
    INT: 0,
  };

  for (const heroId of heroIds) {
    const hero = heroesById.get(heroId);

    if (!hero) {
      throw new Error(`Héros inconnu dans Supabase : ${heroId}`);
    }

    classes[hero.cls]++;
  }

  return classes;
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
        my_str,
        my_agi,
        my_int,
        enemy_str,
        enemy_agi,
        enemy_int,
        my_hp,
        my_atk,
        my_matk,
        my_def,
        my_mdef,
        my_atk_total,
        my_def_total,
        enemy_hp,
        enemy_atk,
        enemy_matk,
        enemy_def,
        enemy_mdef,
        enemy_atk_total,
        enemy_def_total
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

function makeObservation(
  combat: CombatRow,
  side: "my" | "enemy",
  zones: ZonesFile
): TeamObservation {
  const isMySide = side === "my";
  const heroes = isMySide ? combat.my_heroes : combat.enemy_heroes;

  const stats: Record<StatName, number> = {
    hp: isMySide ? combat.my_hp : combat.enemy_hp,
    atk: isMySide ? combat.my_atk : combat.enemy_atk,
    matk: isMySide ? combat.my_matk : combat.enemy_matk,
    atkTotal: isMySide ? combat.my_atk_total : combat.enemy_atk_total,
    def: isMySide ? combat.my_def : combat.enemy_def,
    mdef: isMySide ? combat.my_mdef : combat.enemy_mdef,
    defTotal: isMySide ? combat.my_def_total : combat.enemy_def_total,
  };

  const result =
    (isMySide ? combat.won : !combat.won) ? "WIN" : "LOSS";

  const zoneMap = Object.fromEntries(
    STAT_NAMES.map((stat) => [stat, getZone(stats[stat], stat, zones)])
  ) as Record<StatName, number>;

  const zoneCombination = STAT_NAMES
    .map((stat) => `${stat}:Z${String(zoneMap[stat]).padStart(2, "0")}`)
    .join("|");

  return {
    formation: canonicalFormation(heroes),
    heroes: [...heroes].sort(),
    names: heroNames(heroes),
    classes: isMySide
      ? {
          STR: combat.my_str,
          AGI: combat.my_agi,
          INT: combat.my_int,
        }
      : {
          STR: combat.enemy_str,
          AGI: combat.enemy_agi,
          INT: combat.enemy_int,
        },
    result,
    combatId: combat.id,
    side,
    createdAt: combat.created_at,
    stats,
    zones: zoneMap,
    zoneCombination,
  };
}

function summarizeFormations(observations: TeamObservation[]) {
  const map = new Map<
    string,
    {
      formation: string;
      heroes: string[];
      names: string[];
      classes: TeamObservation["classes"];
      observations: number;
      wins: number;
      losses: number;
      firstSeen: string;
      lastSeen: string;
    }
  >();

  for (const observation of observations) {
    const existing = map.get(observation.formation);

    if (!existing) {
      map.set(observation.formation, {
        formation: observation.formation,
        heroes: observation.heroes,
        names: observation.names,
        classes: observation.classes,
        observations: 1,
        wins: observation.result === "WIN" ? 1 : 0,
        losses: observation.result === "LOSS" ? 1 : 0,
        firstSeen: observation.createdAt,
        lastSeen: observation.createdAt,
      });
      continue;
    }

    existing.observations++;
    existing.wins += observation.result === "WIN" ? 1 : 0;
    existing.losses += observation.result === "LOSS" ? 1 : 0;
    existing.firstSeen =
      observation.createdAt < existing.firstSeen
        ? observation.createdAt
        : existing.firstSeen;
    existing.lastSeen =
      observation.createdAt > existing.lastSeen
        ? observation.createdAt
        : existing.lastSeen;
  }

  return [...map.values()].sort((a, b) =>
    a.formation.localeCompare(b.formation)
  );
}

function summarizeZones(observations: TeamObservation[]) {
  const result: Record<
    StatName,
    Array<{
      zone: number;
      winObservations: number;
      lossObservations: number;
      winFormations: number;
      lossFormations: number;
    }>
  > = {} as Record<StatName, Array<{
    zone: number;
    winObservations: number;
    lossObservations: number;
    winFormations: number;
    lossFormations: number;
  }>>;

  for (const stat of STAT_NAMES) {
    const map = new Map<
      number,
      {
        winObservations: number;
        lossObservations: number;
        winFormations: Set<string>;
        lossFormations: Set<string>;
      }
    >();

    for (const observation of observations) {
      const zone = observation.zones[stat];

      if (!map.has(zone)) {
        map.set(zone, {
          winObservations: 0,
          lossObservations: 0,
          winFormations: new Set(),
          lossFormations: new Set(),
        });
      }

      const bucket = map.get(zone)!;

      if (observation.result === "WIN") {
        bucket.winObservations++;
        bucket.winFormations.add(observation.formation);
      } else {
        bucket.lossObservations++;
        bucket.lossFormations.add(observation.formation);
      }
    }

    result[stat] = [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([zone, bucket]) => ({
        zone,
        winObservations: bucket.winObservations,
        lossObservations: bucket.lossObservations,
        winFormations: bucket.winFormations.size,
        lossFormations: bucket.lossFormations.size,
      }));
  }

  return result;
}

function summarizeWinningZoneCombinations(
  winningFormations: ReturnType<typeof summarizeFormations>,
  observations: TeamObservation[]
) {
  const winningFormationSet = new Set(
    winningFormations
      .filter((formation) => formation.wins > 0)
      .map((formation) => formation.formation)
  );

  const map = new Map<
    string,
    {
      observations: number;
      formations: Set<string>;
      wins: number;
      losses: number;
    }
  >();

  for (const observation of observations) {
    if (!winningFormationSet.has(observation.formation)) {
      continue;
    }

    const existing = map.get(observation.zoneCombination) ?? {
      observations: 0,
      formations: new Set<string>(),
      wins: 0,
      losses: 0,
    };

    existing.observations++;
    existing.formations.add(observation.formation);

    if (observation.result === "WIN") {
      existing.wins++;
    } else {
      existing.losses++;
    }

    map.set(observation.zoneCombination, existing);
  }

  return [...map.entries()]
    .map(([combination, value]) => ({
      combination,
      observations: value.observations,
      distinctFormations: value.formations.size,
      wins: value.wins,
      losses: value.losses,
    }))
    .sort(
      (a, b) =>
        b.distinctFormations - a.distinctFormations ||
        b.wins - a.wins
    );
}

function buildCommonWinningPatterns(
  winningFormations: ReturnType<typeof summarizeFormations>,
  observations: TeamObservation[],
  minimumDistinctFormations = 5
) {
  const winningFormationSet = new Set(
    winningFormations
      .filter((formation) => formation.wins > 0)
      .map((formation) => formation.formation)
  );

  const result: Record<
    StatName,
    Array<{
      zone: number;
      distinctWinningFormations: number;
      winningObservations: number;
      shareOfWinningFormations: number;
    }>
  > = {} as Record<StatName, Array<{
    zone: number;
    distinctWinningFormations: number;
    winningObservations: number;
    shareOfWinningFormations: number;
  }>>;

  const totalWinningFormations = winningFormationSet.size;

  for (const stat of STAT_NAMES) {
    const formationsByZone = new Map<number, Set<string>>();
    const observationsByZone = new Map<number, number>();

    for (const observation of observations) {
      if (
        observation.result !== "WIN" ||
        !winningFormationSet.has(observation.formation)
      ) {
        continue;
      }

      const zone = observation.zones[stat];

      if (!formationsByZone.has(zone)) {
        formationsByZone.set(zone, new Set());
      }

      formationsByZone.get(zone)!.add(observation.formation);
      observationsByZone.set(
        zone,
        (observationsByZone.get(zone) ?? 0) + 1
      );
    }

    result[stat] = [...formationsByZone.entries()]
      .map(([zone, formationSet]) => ({
        zone,
        distinctWinningFormations: formationSet.size,
        winningObservations: observationsByZone.get(zone) ?? 0,
        shareOfWinningFormations:
          totalWinningFormations === 0
            ? 0
            : formationSet.size / totalWinningFormations,
      }))
      .filter(
        (entry) =>
          entry.distinctWinningFormations >= minimumDistinctFormations
      )
      .sort(
        (a, b) =>
          b.distinctWinningFormations - a.distinctWinningFormations ||
          b.winningObservations - a.winningObservations
      );
  }

  return {
    minimumDistinctFormations,
    totalWinningFormations,
    byStat: result,
  };
}

const zones = loadZones();
const combats = await loadAllCombats();

if (combats.length === 0) {
  throw new Error("Aucun combat actif trouvé dans Supabase.");
}

const observations = combats.flatMap((combat) => [
  makeObservation(combat, "my", zones),
  makeObservation(combat, "enemy", zones),
]);

const formations = summarizeFormations(observations);
const winningFormations = formations.filter((formation) => formation.wins > 0);
const losingFormations = formations.filter((formation) => formation.losses > 0);

const result = {
  generatedAt: new Date().toISOString(),
  source: {
    table: "public.combats",
    status: "active",
  },
  theoreticalReference: {
    bounds: "data/theoretical-bounds.json",
    zones: "data/theoretical-zones.json",
  },
  totals: {
    combats: combats.length,
    teamObservations: observations.length,
    winObservations: observations.filter((item) => item.result === "WIN").length,
    lossObservations: observations.filter((item) => item.result === "LOSS").length,
    distinctFormations: formations.length,
    distinctWinningFormations: winningFormations.length,
    distinctLosingFormations: losingFormations.length,
  },
  note:
    "Chaque combat produit deux observations d'équipe : côté joueur et côté ennemi. Les observations WIN/LOSS sont donc symétriques à l'échelle globale.",
  formations: {
    all: formations,
    winning: winningFormations,
    losing: losingFormations,
  },
  zoneSummary: summarizeZones(observations),
  winningZoneCombinations: summarizeWinningZoneCombinations(
    winningFormations,
    observations
  ),
  commonWinningPatterns: buildCommonWinningPatterns(
    winningFormations,
    observations
  ),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(result, null, 2),
  "utf8"
);

console.log(`Combats actifs      : ${combats.length}`);
console.log(`Observations équipe : ${observations.length}`);
console.log(`Formations distinctes : ${formations.length}`);
console.log(`Formations avec WIN : ${winningFormations.length}`);
console.log(`Formations avec LOSS: ${losingFormations.length}`);
console.log("");
console.log(`Fichier créé : ${outputPath}`);
