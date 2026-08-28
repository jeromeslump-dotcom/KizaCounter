
// src/components/HeroGrid.tsx

import { useMemo } from "react";

import type {
  Hero,
  HeroClassFilter,
  HeroSort,
} from "../types";

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

  onClassChange: (
    cls: HeroClassFilter
  ) => void;

  onSortChange: (
    sort: HeroSort
  ) => void;

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
    return filterAndSortHeroes(
      heroes,
      {
        enabledHeroIds,

        activeClass:
          activeClass === "ALL"
            ? "All"
            : activeClass,

        query,

        sortBy,

        usage,
      }
    );
  }, [
    heroes,
    enabledHeroIds,
    activeClass,
    query,
    sortBy,
    usage,
  ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="w-full">

      {/* ======================================================
          FILTRES
          ====================================================== */}

      <div className="mb-3 rounded-xl border border-slate-700 bg-slate-900/80 p-2 sm:mb-4 sm:p-3">

        <div className="flex flex-col gap-2 sm:gap-3">

          {/* ==================================================
              RECHERCHE
              ================================================== */}

          <input
            type="text"
            value={query}
            onChange={(event) =>
              onQueryChange(event.target.value)
            }
            placeholder="🔍 Rechercher un héros ou un pseudo..."
            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400 sm:h-auto sm:py-2 sm:text-sm"
          />

          {/* ==================================================
              CLASSE + TRI
              ================================================== */}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">

            {/* =================================================
                CLASSE
                ================================================= */}

            <div className="flex flex-col gap-0.5">

              <label className="px-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px] sm:text-slate-400">
                Classe
              </label>

              <select
                value={activeClass}
                onChange={(event) =>
                  onClassChange(
                    event.target.value as HeroClassFilter
                  )
                }
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs font-semibold text-white outline-none transition focus:border-sky-400 sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              >
                <option value="ALL">
                  Toutes
                </option>

                <option value="STR">
                  STR
                </option>

                <option value="AGI">
                  AGI
                </option>

                <option value="INT">
                  INT
                </option>
              </select>

            </div>

            {/* =================================================
                TRI
                ================================================= */}

            <div className="flex flex-col gap-0.5">

              <label className="px-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px] sm:text-slate-400">
                Trier par
              </label>

              <select
                value={sortBy}
                onChange={(event) =>
                  onSortChange(
                    event.target.value as HeroSort
                  )
                }
                className="h-8 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-white outline-none transition focus:border-sky-400 sm:h-auto sm:px-3 sm:py-2 sm:text-sm"
              >
                <option value="played">
                  Joué
                </option>

                <option value="hp">
                  PV
                </option>

                <option value="atk">
                  ATK
                </option>

                <option value="matk">
                  MATK
                </option>

                <option value="totalAtk">
                  ATK totale
                </option>

                <option value="def">
                  DEF
                </option>

                <option value="mdef">
                  MDEF
                </option>

                <option value="totalDef">
                  DEF totale
                </option>
              </select>

            </div>

          </div>

        </div>

      </div>

      {/* ======================================================
          COMPTEUR
          ====================================================== */}

      <div className="mb-3 flex items-center justify-between">

        <span className="text-sm font-semibold text-slate-300">
          Héros
        </span>

        <span className="text-xs text-slate-500">
          {filteredHeroes.length} résultat
          {filteredHeroes.length !== 1
            ? "s"
            : ""}
        </span>

      </div>

      {/* ======================================================
          GRILLE DES HÉROS
          ====================================================== */}

      {filteredHeroes.length === 0 ? (

        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-center">

          <p className="text-sm text-slate-400">
            Aucun héros trouvé.
          </p>

        </div>

      ) : (

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-5">

          {filteredHeroes.map((hero) => {

            const selectionIndex =
              selectedIds.indexOf(hero.id);

            return (
              <HeroCard
                key={hero.id}
                hero={hero}
                selected={
                  selectionIndex !== -1
                }
                selectionOrder={
                  selectionIndex !== -1
                    ? selectionIndex + 1
                    : undefined
                }
                onClick={() =>
                  onHeroClick(hero)
                }
              />
            );
          })}

        </div>

      )}

    </section>
  );
}
