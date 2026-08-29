// src/components/HeroGrid.tsx

import { useMemo } from "react";

import type { Hero, HeroClassFilter, HeroSort } from "../types";

import HeroCard from "./HeroCard";
import { filterAndSortHeroes } from "../utils/heroRanking";

// ============================================================
// PROPS
// ============================================================

interface HeroGridProps {
  heroes: Hero[];

  enabledHeroIds: Set<string>;

  activeClass: HeroClassFilter;

  query: string;

  sortBy: HeroSort;

  usage?: Record<string, number>;

  selectedIds?: string[];

  onQueryChange: (query: string) => void;

  onClassChange: (cls: HeroClassFilter) => void;

  onSortChange: (sort: HeroSort) => void;

  onHeroClick: (hero: Hero) => void;
}

// ============================================================
// COMPOSANT
// ============================================================

export default function HeroGrid({
  heroes,
  enabledHeroIds,
  activeClass,
  query,
  sortBy,
  usage = {},
  selectedIds = [],
  onQueryChange,
  onClassChange,
  onSortChange,
  onHeroClick,
}: HeroGridProps) {
  // ==========================================================
  // FILTRAGE + CLASSEMENT
  // ==========================================================

  const filteredHeroes = useMemo(() => {
    return filterAndSortHeroes(heroes, {
      enabledHeroIds,
      activeClass: activeClass === "ALL" ? "All" : activeClass,
      query,
      sortBy,
      usage,
    });
  }, [heroes, enabledHeroIds, activeClass, query, sortBy, usage]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="w-full">
      {/* ======================================================
          FILTRES
          ====================================================== */}

      <div className="hero-grid-panel mb-3 rounded-xl border p-2 sm:mb-4 sm:p-3">
        <div className="flex flex-col gap-2 sm:gap-3">
          {/* ==================================================
              RECHERCHE
              ================================================== */}

          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="🔍 Rechercher un héros ou un pseudo..."
            className="hero-grid-input h-9 w-full rounded-lg border px-3 text-xs outline-none transition sm:h-auto sm:py-2 sm:text-sm"
          />

          {/* ==================================================
              CLASSE + TRI
              ================================================== */}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {/* =================================================
                CLASSE
                ================================================= */}

            <div className="flex flex-col gap-0.5">
              <label className="hero-grid-label px-1 text-[9px] font-bold uppercase tracking-wide sm:text-[11px]">
                Classe
              </label>

              <select
                value={activeClass}
                onChange={(event) =>
                  onClassChange(event.target.value as HeroClassFilter)
                }
                className="hero-grid-select h-8 w-full rounded-lg border px-2 text-xs font-semibold outline-none transition sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              >
                <option value="ALL">Toutes</option>
                <option value="STR">STR</option>
                <option value="AGI">AGI</option>
                <option value="INT">INT</option>
              </select>
            </div>

            {/* =================================================
                TRI
                ================================================= */}

            <div className="flex flex-col gap-0.5">
              <label className="hero-grid-label px-1 text-[9px] font-bold uppercase tracking-wide sm:text-[11px]">
                Trier par
              </label>

              <select
                value={sortBy}
                onChange={(event) =>
                  onSortChange(event.target.value as HeroSort)
                }
                className="hero-grid-select h-8 w-full rounded-lg border px-2 text-xs outline-none transition sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              >
                <option value="played">Joué</option>
                <option value="hp">PV</option>
                <option value="atk">ATK</option>
                <option value="matk">MATK</option>
                <option value="totalAtk">ATK totale</option>
                <option value="def">DEF</option>
                <option value="mdef">MDEF</option>
                <option value="totalDef">DEF totale</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          COMPTEUR
          ====================================================== */}

      <div className="mb-3 flex items-center justify-between">
        <span className="hero-grid-title text-sm font-semibold">Héros</span>

        <span className="hero-grid-result-count text-xs">
          {filteredHeroes.length} résultat
          {filteredHeroes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ======================================================
          GRILLE DES HÉROS
          ====================================================== */}

      {filteredHeroes.length === 0 ? (
        <div className="hero-grid-empty rounded-xl border border-dashed p-8 text-center">
          <p className="hero-grid-empty-text text-sm">Aucun héros trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-5">
          {filteredHeroes.map((hero) => {
            const selectionIndex = selectedIds.indexOf(hero.id);

            return (
              <HeroCard
                key={hero.id}
                hero={hero}
                selected={selectionIndex !== -1}
                selectionOrder={
                  selectionIndex !== -1 ? selectionIndex + 1 : undefined
                }
                onClick={() => onHeroClick(hero)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
