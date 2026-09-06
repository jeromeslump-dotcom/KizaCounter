// src/auth/useAuthSession.ts

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getCurrentUserProfile, type UserProfile } from "../admin/adminAccess";
import { getSession, onAuthStateChange } from "./auth";

interface AuthSessionState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthSessionContext = createContext<AuthSessionState | null>(null);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let profileRequest = 0;

    async function applySession(currentSession: Session | null) {
      if (!mounted) return;

      const requestId = ++profileRequest;
      setSession(currentSession);
      setProfile(null);

      if (!currentSession) {
        setLoading(false);
        return;
      }

      try {
        const currentProfile = await getCurrentUserProfile(currentSession);
        if (mounted && requestId === profileRequest) {
          setProfile(currentProfile);
        }
      } catch (error) {
        console.error("Impossible de récupérer le profil utilisateur :", error);
      } finally {
        if (mounted && requestId === profileRequest) {
          setLoading(false);
        }
      }
    }

    async function initialize() {
      try {
        const currentSession = await getSession();
        await applySession(currentSession);
      } catch (error) {
        console.error("Impossible de récupérer la session :", error);
        if (mounted) {
          ++profileRequest;
          setSession(null);
          setProfile(null);
          setLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = onAuthStateChange((currentSession) => {
      void applySession(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthSessionContext.Provider value={{ session, profile, loading }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export default function useAuthSession(): AuthSessionState {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("useAuthSession doit être utilisé dans AuthSessionProvider.");
  }

  return context;
}
