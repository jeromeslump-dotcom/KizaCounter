// src/auth/AuthPanel.tsx

import { useEffect, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import AdminPanel from "../admin/AdminPanel";
import { getCurrentUserProfile, type UserProfile } from "../admin/adminAccess";
import { getSession, signIn, signOut, onAuthStateChange } from "./auth";

export default function AuthPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const currentSession = await getSession();

        if (!mounted) return;

        setSession(currentSession);

        const currentProfile = await getCurrentUserProfile(currentSession);

        if (mounted) {
          setProfile(currentProfile);
        }
      } catch (error) {
        console.error("Impossible de récupérer la session :", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = onAuthStateChange((currentSession) => {
      setSession(currentSession);
      setShowAdminPanel(false);

      void getCurrentUserProfile(currentSession).then((currentProfile) => {
        if (mounted) {
          setProfile(currentProfile);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      setPassword("");
      setShowLogin(false);
    } catch (error) {
      console.error("Erreur de connexion :", error);
      setError(error instanceof Error ? error.message : "Connexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSubmitting(true);
    setError("");
    setShowAdminPanel(false);

    try {
      await signOut();
    } catch (error) {
      console.error("Erreur de déconnexion :", error);
      setError(error instanceof Error ? error.message : "Déconnexion impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  function getUserName() {
    const metadata = session?.user?.user_metadata;

    return (
      profile?.display_name ||
      metadata?.display_name ||
      metadata?.username ||
      metadata?.name ||
      session?.user?.email?.split("@")[0] ||
      "Utilisateur"
    );
  }

  const isAdmin = profile?.role === "admin" && profile.active;

  if (loading) return null;

  if (session?.user) {
    return (
      <>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setShowAdminPanel(true)}
              className="ui-action rounded-md border px-2.5 py-1.5 text-xs font-bold transition"
              aria-haspopup="dialog"
              aria-expanded={showAdminPanel}
            >
              👤 {getUserName()}
            </button>
          ) : (
            <span className="ui-text-soft text-xs font-bold">
              👤 {getUserName()}
            </span>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={submitting}
            className="ui-action ui-danger rounded-md border px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-50"
          >
            {submitting ? "..." : "Déconnexion"}
          </button>
        </div>

        {isAdmin && (
          <AdminPanel
            open={showAdminPanel}
            onClose={() => setShowAdminPanel(false)}
            onUserManagement={() => setShowAdminPanel(false)}
            onEncounteredTeams={() => setShowAdminPanel(false)}
            onCombatHistory={() => setShowAdminPanel(false)}
          />
        )}
      </>
    );
  }

  if (!showLogin) {
    return (
      <button
        type="button"
        onClick={() => {
          setError("");
          setShowLogin(true);
        }}
        className="ui-action ui-link-sky rounded-md border px-3 py-1.5 text-xs font-bold transition"
      >
        Connexion
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSignIn}
      className="ui-panel-alt flex flex-col gap-2 rounded-lg border p-2 sm:flex-row sm:items-center"
    >
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="ui-input w-40 rounded-md border px-2.5 py-1.5 text-xs outline-none sm:text-xs"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Mot de passe"
        autoComplete="current-password"
        className="ui-input w-32 rounded-md border px-2.5 py-1.5 text-xs outline-none sm:text-xs"
        required
      />

      <button
        type="submit"
        disabled={submitting}
        className="ui-sky rounded-md border px-3 py-1.5 text-xs font-black transition disabled:opacity-50"
      >
        {submitting ? "..." : "OK"}
      </button>

      <button
        type="button"
        onClick={() => {
          setShowLogin(false);
          setError("");
        }}
        className="ui-text-muted px-2 py-1.5 text-xs ui-muted-hover"
      >
        ✕
      </button>

      {error && <span className="ui-error text-[10px]">{error}</span>}
    </form>
  );
}
