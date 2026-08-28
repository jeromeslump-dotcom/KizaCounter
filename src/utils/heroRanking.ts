// src/utils/heroRanking.ts

import type {
  Hero,
  HeroClass,
  HeroSort,
} from "../types";

// ============================================================
// OPTIONS
// ============================================================

export interface HeroRankingOptions {
  enabledHeroIds: Set<string>;
  activeClass: HeroClass | "All";
  query: string;
  sortBy: HeroSort;
  usage: Record<string, number>;
}

// ============================================================
// VALEUR DE TRI
// ============================================================

function getSortValue(
  hero: Hero,
  sortBy: HeroSort
): number {
  switch (sortBy) {
    case "hp":
      return hero.stats.hp;

    case "atk":
      return hero.stats.atk;

    case "matk":
      return hero.stats.matk;

    case "totalAtk":
      return (
        hero.stats.atk +
        hero.stats.matk
      );

    case "def":
      return hero.stats.def;

    case "mdef":
      return hero.stats.mdef;

    case "totalDef":
      return (
        hero.stats.def +
        hero.stats.mdef
      );

    case "played":
      return 0;
  }
}

// ============================================================
// FILTRAGE + CLASSEMENT
// ============================================================

export function filterAndSortHeroes(
  heroes: Hero[],
  options: HeroRankingOptions
): Hero[] {
  const {
    enabledHeroIds,
    activeClass,
    query,
    sortBy,
    usage,
  } = options;

  const normalizedQuery =
    query.trim().toLowerCase();

  return heroes
    .filter((hero) => {
      // Héros activé
      if (!enabledHeroIds.has(hero.id)) {
        return false;
      }

      // Filtre STR / AGI / INT
      if (
        activeClass !== "All" &&
        hero.cls !== activeClass
      ) {
        return false;
      }

      // Recherche nom / alias
      if (
        normalizedQuery &&
        !hero.name
          .toLowerCase()
          .includes(normalizedQuery) &&
        !hero.alias
          .toLowerCase()
          .includes(normalizedQuery)
      ) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // ========================================================
      // JOUE
      // ========================================================

      if (sortBy === "played") {
        return (
          (usage[b.id] ?? 0) -
            (usage[a.id] ?? 0) ||
          a.name.localeCompare(b.name)
        );
      }

      // ========================================================
      // STATS : PLUS ÉLEVÉ → PLUS FAIBLE
      // ========================================================

      return (
        getSortValue(b, sortBy) -
          getSortValue(a, sortBy) ||
        a.name.localeCompare(b.name)
      );
    });
}