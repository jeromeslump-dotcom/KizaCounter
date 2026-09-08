import { supabase } from "./supabase";
import { teamKey } from "../engine/teamUtils";

export interface TeamOrder {
  team_key: string;
  ordered_hero_ids: string[];
  updated_at: string;
  updated_by: string | null;
}

export async function loadTeamOrders(): Promise<TeamOrder[]> {
  const { data, error } = await supabase
    .from("team_orders")
    .select("team_key, ordered_hero_ids, updated_at, updated_by");

  if (error) {
    console.error("Erreur chargement des ordres d'équipes :", error);
    throw error;
  }

  return (data ?? []) as TeamOrder[];
}

export async function getTeamOrder(
  heroIds: string[]
): Promise<string[] | null> {
  const key = teamKey(heroIds);

  const { data, error } = await supabase
    .from("team_orders")
    .select("ordered_hero_ids")
    .eq("team_key", key)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement ordre équipe :", error);
    throw error;
  }

  return data?.ordered_hero_ids ?? null;
}

export async function saveTeamOrder(
  heroIds: string[],
  orderedHeroIds: string[]
): Promise<TeamOrder> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) {
    throw new Error("Vous devez être connecté pour enregistrer un ordre.");
  }

  const normalizedTeam = [...new Set(heroIds)];
  const normalizedOrder = [...orderedHeroIds];

  if (normalizedTeam.length !== 5 || normalizedOrder.length !== 5) {
    throw new Error("Une équipe doit contenir exactement 5 héros.");
  }

  if (
    new Set(normalizedOrder).size !== 5 ||
    normalizedOrder.some((heroId) => !normalizedTeam.includes(heroId))
  ) {
    throw new Error(
      "L'ordre doit contenir les 5 héros de l'équipe, une seule fois chacun."
    );
  }

  const { data, error } = await supabase
    .from("team_orders")
    .upsert(
      {
        team_key: teamKey(normalizedTeam),
        ordered_hero_ids: normalizedOrder,
        updated_by: authData.user.id,
      },
      { onConflict: "team_key" }
    )
    .select("team_key, ordered_hero_ids, updated_at, updated_by")
    .single();

  if (error) {
    console.error("Erreur enregistrement ordre équipe :", error);
    throw error;
  }

  return data as TeamOrder;
}
