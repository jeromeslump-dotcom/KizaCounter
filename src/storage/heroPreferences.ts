import type { HeroPreferences } from "../types";

const STORAGE_KEY = "kiza-counter-hero-preferences";

export function loadHeroPreferences(heroIds: string[]): HeroPreferences {
  const defaults: HeroPreferences = {};

  for (const heroId of heroIds) {
    defaults[heroId] = true;
  }

  if (typeof window === "undefined") {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaults;
    }

    const saved = JSON.parse(raw) as Record<string, unknown>;

    for (const heroId of heroIds) {
      if (typeof saved[heroId] === "boolean") {
        defaults[heroId] = saved[heroId];
      }
    }
  } catch (error) {
    console.error("Impossible de charger le roster des héros :", error);
  }

  return defaults;
}

export function saveHeroPreferences(preferences: HeroPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
