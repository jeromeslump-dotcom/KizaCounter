// src/auth/AuthPanel.tsx

import { useEffect, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import {
  getSession,
  signIn,
  signOut,
  onAuthStateChange,
} from "./auth";

export default function AuthPanel() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [showLogin, setShowLogin] =
    useState(false);

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  // ============================================================
  // SESSION
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const currentSession =
          await getSession();

        if (mounted) {
          setSession(currentSession);
        }
      } catch (error) {
        console.error(
          "Impossible de récupérer la session :",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = onAuthStateChange(
      (currentSession) => {
        setSession(currentSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // CONNEXION
  // ============================================================

  async function handleSignIn(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await signIn(
        email.trim(),
        password
      );

      setPassword("");
      setShowLogin(false);
    } catch (error) {
      console.error(
        "Erreur de connexion :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Connexion impossible."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // DÉCONNEXION
  // ============================================================

  async function handleSignOut() {
    setSubmitting(true);
    setError("");

    try {
      await signOut();
    } catch (error) {
      console.error(
        "Erreur de déconnexion :",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Déconnexion impossible."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ============================================================
  // NOM UTILISATEUR
  // ============================================================

  function getUserName() {
    const metadata =
      session?.user?.user_metadata;

    return (
      metadata?.display_name ||
      metadata?.username ||
      metadata?.name ||
      session?.user?.email?.split("@")[0] ||
      "Utilisateur"
    );
  }

  // ============================================================
  // CHARGEMENT
  // ============================================================

  if (loading) {
    return null;
  }

  // ============================================================
  // UTILISATEUR CONNECTÉ
  // ============================================================

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-300">
          👤 {getUserName()}
        </span>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={submitting}
          className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
        >
          {submitting
            ? "..."
            : "Déconnexion"}
        </button>
      </div>
    );
  }

  // ============================================================
  // NON CONNECTÉ
  // ============================================================

  if (!showLogin) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowLogin(true);
        }}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-sky-400/50 hover:text-sky-300"
      >
        Connexion
      </button>
    );
  }

  // ============================================================
  // FORMULAIRE DE CONNEXION
  // ============================================================

  return (
    <form
      onSubmit={handleSignIn}
      className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900 p-2 sm:flex-row sm:items-center"
    >
      <input
        type="email"
        value={email}
        onChange={(event) =>
          setEmail(event.target.value)
        }
        placeholder="Email"
        autoComplete="email"
        className="w-40 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-sky-400"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(event) =>
          setPassword(event.target.value)
        }
        placeholder="Mot de passe"
        autoComplete="current-password"
        className="w-32 rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-sky-400"
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
      >
        {submitting ? "..." : "OK"}
      </button>

      <button
        type="button"
        onClick={() => {
          setShowLogin(false);
          setError("");
        }}
        className="rounded-md px-2 py-1.5 text-xs text-slate-500 hover:text-slate-300"
      >
        ✕
      </button>

      {error && (
        <span className="text-[10px] text-red-400">
          {error}
        </span>
      )}
    </form>
  );
}