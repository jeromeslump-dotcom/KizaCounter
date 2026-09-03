// src/auth/auth.ts

import { supabase } from "../storage/supabase";

import type { Session } from "@supabase/supabase-js";

// ============================================================
// NETTOYAGE SESSION INVALIDE
// ============================================================

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error) return false;

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.toLowerCase().includes("invalid refresh token") ||
    message.toLowerCase().includes("refresh token not found")
  );
}

async function clearInvalidSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "local" });
    return;
  } catch (error) {
    console.warn(
      "Déconnexion locale Supabase impossible, nettoyage du stockage :",
      error
    );
  }

  // Le refresh token peut être tellement invalide que signOut() ne peut
  // pas terminer normalement. On supprime alors uniquement la clé Auth
  // locale utilisée par Supabase, sans toucher aux autres données de l'app.
  try {
    const projectRef = new URL(supabaseUrl()).hostname.split(".")[0];
    window.localStorage.removeItem(`sb-${projectRef}-auth-token`);
  } catch (error) {
    console.error("Impossible de nettoyer la session locale :", error);
  }
}

function supabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL as string;
}

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

    if (isInvalidRefreshTokenError(error)) {
      await clearInvalidSession();
      return null;
    }

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
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    console.error("Erreur déconnexion Supabase :", error);

    throw error;
  }
}

// ============================================================
// ÉCOUTER LES CHANGEMENTS DE SESSION
// ============================================================

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);

    if (event === "SIGNED_OUT") {
      console.info("Session Supabase locale terminée.");
    }
  });
}
