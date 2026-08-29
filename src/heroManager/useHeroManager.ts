import { useCallback, useEffect, useMemo, useState } from "react";

import { HEROES } from "../data/heroes";
import {
  loadHeroPreferences,
  saveHeroPreferences,
} from "./heroPreferences";

export default function useHeroManager() {
  const [enabledHeroIds, setEnabledHeroIds] = useState<Set<string>>(
    () => new Set(HEROES.map((hero) => hero.id))
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadHeroPreferences().then((ids) => {
      if (cancelled) return;

      setEnabledHeroIds(ids);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;

    void saveHeroPreferences(enabledHeroIds);
  }, [enabledHeroIds, loaded]);

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
    setEnabledHeroIds(new Set(HEROES.map((hero) => hero.id)));
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
