import { HEROES } from "../data/heroes";
import type { Combat } from "../types";
import { supabase } from "./supabase";
import {
  COMBAT_FULL_SYNC_INTERVAL_MS,
  getCombatCacheSnapshot,
  isFullCombatSyncDue,
  removeCachedCombat,
  replaceCombatCache,
  sortCombats,
  upsertCachedCombats,
  type CombatCacheSnapshot,
  type CombatSyncMetadata,
} from "./combatCache";

export { COMBAT_FULL_SYNC_INTERVAL_MS } from "./combatCache";

const COMBAT_SELECT = `
  id, user_id, enemy_heroes, my_heroes, won, created_at, status,
  my_str, my_agi, my_int, enemy_str, enemy_agi, enemy_int,
  my_hp, my_atk, my_matk, my_def, my_mdef, my_atk_total, my_def_total,
  enemy_hp, enemy_atk, enemy_matk, enemy_def, enemy_mdef,
  enemy_atk_total, enemy_def_total
`;

function calculateTeamData(heroIds: string[]) {
  const heroesById = new Map(HEROES.map((hero) => [hero.id, hero]));
  const selectedHeroes = heroIds
    .map((heroId) => heroesById.get(heroId))
    .filter((hero): hero is (typeof HEROES)[number] => Boolean(hero));

  const classes = {
    STR: selectedHeroes.filter((hero) => hero.cls === "STR").length,
    AGI: selectedHeroes.filter((hero) => hero.cls === "AGI").length,
    INT: selectedHeroes.filter((hero) => hero.cls === "INT").length,
  };

  const hp = selectedHeroes.reduce((sum, hero) => sum + hero.stats.hp, 0);
  const atk = selectedHeroes.reduce((sum, hero) => sum + hero.stats.atk, 0);
  const matk = selectedHeroes.reduce((sum, hero) => sum + hero.stats.matk, 0);
  const def = selectedHeroes.reduce((sum, hero) => sum + hero.stats.def, 0);
  const mdef = selectedHeroes.reduce((sum, hero) => sum + hero.stats.mdef, 0);

  return {
    classes,
    hp,
    atk,
    matk,
    def,
    mdef,
    atkTotal: atk + matk,
    defTotal: def + mdef,
  };
}

function enrichCombat(
  combat: Omit<Combat, "id" | "created_at">,
  userId: string
): Combat {
  const my = calculateTeamData(combat.my_heroes);
  const enemy = calculateTeamData(combat.enemy_heroes);

  return {
    ...combat,
    user_id: userId,
    status: "active",
    my_str: my.classes.STR,
    my_agi: my.classes.AGI,
    my_int: my.classes.INT,
    enemy_str: enemy.classes.STR,
    enemy_agi: enemy.classes.AGI,
    enemy_int: enemy.classes.INT,
    my_hp: my.hp,
    my_atk: my.atk,
    my_matk: my.matk,
    my_def: my.def,
    my_mdef: my.mdef,
    my_atk_total: my.atkTotal,
    my_def_total: my.defTotal,
    enemy_hp: enemy.hp,
    enemy_atk: enemy.atk,
    enemy_matk: enemy.matk,
    enemy_def: enemy.def,
    enemy_mdef: enemy.mdef,
    enemy_atk_total: enemy.atkTotal,
    enemy_def_total: enemy.defTotal,
  };
}

// ============================================================
// CHARGEMENT ET SYNCHRONISATION DE L'HISTORIQUE
// ============================================================

const COMBAT_PAGE_SIZE = 1000;

interface CombatCursor {
  created_at: string;
  id: string;
}

function isAfterCursor(combat: Combat, cursor: CombatCursor): boolean {
  const createdAt = Date.parse(combat.created_at ?? "");
  const cursorTime = Date.parse(cursor.created_at);

  // La comparaison en millisecondes tolère les formats ISO équivalents
  // (Z / +00:00) et peut relire quelques combats identiques sans en manquer.
  return Number.isFinite(createdAt) && createdAt >= cursorTime;
}

function getNewestCursor(
  combats: Combat[],
  fallback: CombatCursor
): CombatCursor {
  let newest = fallback;

  for (const combat of combats) {
    if (!combat.created_at || !combat.id) continue;

    if (
      combat.created_at > newest.created_at ||
      (combat.created_at === newest.created_at && combat.id > newest.id)
    ) {
      newest = { created_at: combat.created_at, id: combat.id };
    }
  }

  return newest;
}

interface FullCombatSnapshot {
  combats: Combat[];
  cursorCreatedAt: string;
}

export function getCombatPageCursor(page: Combat[]): CombatCursor | null {
  const last = page[page.length - 1];
  return last?.created_at && last.id
    ? { created_at: last.created_at, id: last.id }
    : null;
}

function cursorFilter(cursor: CombatCursor, direction: "older" | "newer"): string {
  const operator = direction === "older" ? "lt" : "gt";
  return `created_at.${operator}.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.${operator}.${cursor.id})`;
}

async function fetchActiveCombatSnapshot(): Promise<FullCombatSnapshot> {
  const combats: Combat[] = [];
  let cursorCreatedAt = "1970-01-01T00:00:00.000Z";
  let pageCursor: CombatCursor | null = null;

  while (true) {
    let query = supabase
      .from("combats")
      .select(COMBAT_SELECT)
      .eq("status", "active");

    if (pageCursor) {
      query = query.or(cursorFilter(pageCursor, "older"));
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, COMBAT_PAGE_SIZE - 1);

    if (error) {
      console.error("Erreur chargement complet des combats :", error);
      throw error;
    }

    const page = (data ?? []) as Combat[];

    if (!pageCursor && page[0]?.created_at) {
      // Borne haute figée au début : les insertions plus récentes ne décalent
      // pas les pages et seront récupérées par la synchronisation suivante.
      cursorCreatedAt = page[0].created_at;
    }

    combats.push(...page);
    if (page.length < COMBAT_PAGE_SIZE) break;

    const nextCursor = getCombatPageCursor(page);
    if (!nextCursor || (pageCursor &&
      nextCursor.created_at === pageCursor.created_at &&
      nextCursor.id === pageCursor.id)) {
      throw new Error("Pagination complète des combats bloquée.");
    }
    pageCursor = nextCursor;
  }

  return { combats: sortCombats(combats), cursorCreatedAt };
}
async function fetchActiveCombats(): Promise<Combat[]> {
  const snapshot = await fetchActiveCombatSnapshot();
  return snapshot.combats;
}

/** Téléchargement complet, utilisé à la première synchronisation et chaque jour. */
export async function loadCombats(): Promise<Combat[]> {
  return fetchActiveCombats();
}

async function fetchCombatsAfter(cursor: CombatCursor): Promise<Combat[]> {
  const combats: Combat[] = [];
  let pageCursor: CombatCursor | null = null;

  while (true) {
    let query = supabase
      .from("combats")
      .select(COMBAT_SELECT)
      .eq("status", "active");

    if (pageCursor) {
      query = query.or(cursorFilter(pageCursor, "newer"));
    } else if (cursor.id) {
      query = query.or(cursorFilter(cursor, "newer"));
    } else {
      query = query.gte("created_at", cursor.created_at);
    }

    const { data, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(0, COMBAT_PAGE_SIZE - 1);

    if (error) {
      console.error("Erreur synchronisation des nouveaux combats :", error);
      throw error;
    }

    const page = (data ?? []) as Combat[];
    combats.push(...page);
    if (page.length < COMBAT_PAGE_SIZE) break;

    const nextCursor = getCombatPageCursor(page);
    if (!nextCursor || (pageCursor &&
      nextCursor.created_at === pageCursor.created_at &&
      nextCursor.id === pageCursor.id)) {
      throw new Error("Pagination incrémentale des combats bloquée.");
    }
    pageCursor = nextCursor;
  }

  return sortCombats(combats.filter((combat) => isAfterCursor(combat, cursor)));
}

/**
 * Renvoie l'historique complet depuis IndexedDB, puis ne récupère que les
 * nouveaux combats. Une réconciliation complète quotidienne récupère aussi
 * les suppressions et modifications invisibles via les règles RLS.
 */
export async function syncCombats(): Promise<Combat[]> {
  let snapshot: CombatCacheSnapshot | null;

  try {
    snapshot = await getCombatCacheSnapshot();
  } catch (error) {
    console.warn(
      "Cache IndexedDB indisponible, chargement complet de secours :",
      error
    );
    return loadCombats();
  }

  const now = new Date().toISOString();

  if (!snapshot || isFullCombatSyncDue(snapshot.metadata.lastFullSyncAt)) {
    const fullSnapshot = await fetchActiveCombatSnapshot();
    const combats = fullSnapshot.combats;
    const cursor: CombatCursor = {
      created_at: fullSnapshot.cursorCreatedAt,
      id: "",
    };
    const metadata: CombatSyncMetadata = {
      key: "sync",
      lastFullSyncAt: now,
      lastIncrementalSyncAt: now,
      cursorCreatedAt: cursor.created_at,
      cursorId: cursor.id,
    };

    try {
      await replaceCombatCache(combats, metadata);
    } catch (error) {
      console.warn("Impossible d'enregistrer le cache des combats :", error);
    }

    return combats;
  }

  const cursor: CombatCursor = {
    created_at: snapshot.metadata.cursorCreatedAt,
    id: snapshot.metadata.cursorId,
  };

  const newCombats = await fetchCombatsAfter(cursor);
  const mergedById = new Map<string, Combat>();

  for (const combat of snapshot.combats) {
    if (combat.id) mergedById.set(combat.id, combat);
  }

  for (const combat of newCombats) {
    if (combat.id) mergedById.set(combat.id, combat);
  }

  const mergedCombats = sortCombats([...mergedById.values()]);
  const newestCursor = getNewestCursor(mergedCombats, cursor);
  const metadata: CombatSyncMetadata = {
    ...snapshot.metadata,
    lastIncrementalSyncAt: now,
    cursorCreatedAt: newestCursor.created_at,
    cursorId: newestCursor.id,
  };

  try {
    await upsertCachedCombats(newCombats, metadata);
  } catch (error) {
    console.warn("Impossible de mettre à jour le cache des combats :", error);
  }

  return mergedCombats;
}

// ============================================================
// AJOUTER UN COMBAT
// ============================================================

export async function addCombat(
  combat: Omit<Combat, "id" | "created_at">
): Promise<Combat> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Erreur récupération utilisateur Supabase :", userError);
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Impossible d'enregistrer le combat : utilisateur non connecté."
    );
  }

  const enrichedCombat = enrichCombat(combat, user.id);

  const { data, error } = await supabase
    .from("combats")
    .insert(enrichedCombat)
    .select(COMBAT_SELECT)
    .single();

  if (error) {
    console.error("Erreur ajout combat :", error);
    throw error;
  }

  const savedCombat = data as Combat;

  try {
    await upsertCachedCombats([savedCombat]);
  } catch (cacheError) {
    console.warn("Impossible d'ajouter le combat au cache local :", cacheError);
  }

  return savedCombat;
}

// ============================================================
// SUPPRIMER UN COMBAT
// ============================================================

export async function deleteCombat(combatId: string): Promise<void> {
  const { error } = await supabase.from("combats").delete().eq("id", combatId);

  if (error) {
    console.error("Erreur suppression combat :", error);
    throw error;
  }

  try {
    await removeCachedCombat(combatId);
  } catch (cacheError) {
    console.warn("Impossible de retirer le combat du cache local :", cacheError);
  }
}
