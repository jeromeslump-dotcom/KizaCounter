import { HEROES } from "../data/heroes";
import type { Combat } from "../types";
import { supabase } from "./supabase";

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

function enrichCombat(combat: Omit<Combat, "id" | "created_at">, userId: string): Combat {
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
// CHARGER LES COMBATS
// ============================================================

export async function loadCombats(): Promise<Combat[]> {
  const { data, error } = await supabase
    .from("combats")
    .select(COMBAT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur chargement combats :", error);
    throw error;
  }

  return (data ?? []) as Combat[];
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

  return data as Combat;
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
}
