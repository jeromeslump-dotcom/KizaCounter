// src/auth/auth.ts

import { supabase } from "../storage/supabase";

import type { Session } from "@supabase/supabase-js";

// ============================================================
// SESSION
// ============================================================

export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Erreur récupération session Supabase :", error);

    throw error;
  }

  return session;
}

// ============================================================
// CONNEXION
// ============================================================

export async function signIn(
  email: string,
  password: string
): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Erreur connexion Supabase :", error);

    throw error;
  }

  if (!data.session) {
    throw new Error(
      "Connexion réussie mais aucune session Supabase n'a été créée."
    );
  }

  return data.session;
}

// ============================================================
// DÉCONNEXION
// ============================================================

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erreur déconnexion Supabase :", error);

    throw error;
  }
}

// ============================================================
// ÉCOUTER LES CHANGEMENTS DE SESSION
// ============================================================

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
