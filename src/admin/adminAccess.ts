import type { Session } from "@supabase/supabase-js";

import { supabase } from "../storage/supabase";

export type UserRole = "user" | "contributor" | "admin";

export interface UserProfile {
  display_name: string | null;
  role: UserRole;
  active: boolean;
}

export async function getCurrentUserProfile(
  session: Session | null
): Promise<UserProfile | null> {
  const userId = session?.user?.id;

  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Impossible de récupérer le profil utilisateur :", error);
    return null;
  }

  if (!data) return null;

  return {
    display_name: data.display_name,
    role: data.role as UserRole,
    active: data.active,
  };
}
