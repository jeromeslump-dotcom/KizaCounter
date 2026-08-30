import { useCallback, useEffect, useMemo, useState } from "react";

import { HEROES } from "../data/heroes";
import { supabase } from "../storage/supabase";
import { loadHeroPreferences, saveHeroPreferences } from "./heroPreferences";

const ALL_HERO_IDS = new Set(HEROES.map((hero) => hero.id));

export default function useHeroManager() {
  const [enabledHeroIds, setEnabledHeroIds] = useState<Set<string>>(
    () => new Set(ALL_HERO_IDS)
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadForUser(nextUserId: string | null) {
      setLoaded(false);
      setPreferencesReady(false);
      setUserId(nextUserId);

      try {
        const ids = await loadHeroPreferences(nextUserId);

        if (cancelled) return;

        setEnabledHeroIds(ids);
        setPreferencesReady(true);
      } catch (error) {
        console.error("Impossible de charger les préférences héros :", error);

        if (cancelled) return;

        // En cas d'erreur Supabase, on ne réutilise jamais la sélection
        // d'un autre utilisateur et on n'autorise pas une sauvegarde.
        setEnabledHeroIds(new Set(ALL_HERO_IDS));
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        if (!cancelled) {
          void loadForUser(user?.id ?? null);
        }
      })
      .catch((error) => {
        console.error("Impossible de récupérer l'utilisateur :", error);
        if (!cancelled) {
          void loadForUser(null);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;

      void loadForUser(session?.user.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loaded || !preferencesReady || !userId) return;

    void saveHeroPreferences(userId, enabledHeroIds).catch((error) => {
      console.error("Impossible de sauvegarder les préférences héros :", error);
    });
  }, [enabledHeroIds, loaded, preferencesReady, userId]);

  const toggleHero = useCallback((heroId: string) => {
    setEnabledHeroIds((current) => {
      const next = new Set(current);

      if (next.has(heroId)) {
        next.delete(heroId);
      } else {
        next.add(heroId);
      }

      return next;
    });
  }, []);

  const enableAll = useCallback(() => {
    setEnabledHeroIds(new Set(ALL_HERO_IDS));
  }, []);

  const disableAll = useCallback(() => {
    setEnabledHeroIds(new Set());
  }, []);

  const activeCount = enabledHeroIds.size;

  const enabledHeroes = useMemo(
    () => HEROES.filter((hero) => enabledHeroIds.has(hero.id)),
    [enabledHeroIds]
  );

  return {
    enabledHeroIds,
    enabledHeroes,
    activeCount,
    totalCount: HEROES.length,
    loaded,
    toggleHero,
    enableAll,
    disableAll,
  };
}
