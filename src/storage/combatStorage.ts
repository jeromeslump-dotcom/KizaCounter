// src/storage/combatStorage.ts

import type { Combat } from "../types";
import { supabase } from "./supabase";

// ============================================================
// CHARGER LES COMBATS
// ============================================================

export async function loadCombats(): Promise<Combat[]> {
  const { data, error } = await supabase
    .from("combats")
    .select(
      "id, user_id, enemy_heroes, my_heroes, won, created_at, created_by, status"
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Erreur chargement combats :",
      error
    );

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

  // ----------------------------------------------------------
  // Vérifier la session
  // ----------------------------------------------------------

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error(
      "Erreur récupération utilisateur Supabase :",
      userError
    );

    throw userError;
  }

  if (!user) {
    throw new Error(
      "Impossible d'enregistrer le combat : utilisateur non connecté."
    );
  }

  // ----------------------------------------------------------
  // Préparer le combat
  // ----------------------------------------------------------

  const combatToInsert = {
    ...combat,

    // L'utilisateur connecté devient automatiquement
    // le créateur du combat.
    user_id: user.id,
    created_by: user.id,

    // Les nouveaux combats sont actifs.
    status: "active" as const,
  };

  // ----------------------------------------------------------
  // INSERT
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("combats")
    .insert(combatToInsert)
    .select(
      "id, user_id, enemy_heroes, my_heroes, won, created_at, created_by, status"
    )
    .single();

  if (error) {
    console.error(
      "Erreur ajout combat :",
      error
    );

    throw error;
  }

  return data as Combat;
}

// ============================================================
// SUPPRIMER UN COMBAT
// ============================================================

export async function deleteCombat(
  combatId: string
): Promise<void> {
  const { error } = await supabase
    .from("combats")
    .delete()
    .eq("id", combatId);

  if (error) {
    console.error(
      "Erreur suppression combat :",
      error
    );

    throw error;
  }
}