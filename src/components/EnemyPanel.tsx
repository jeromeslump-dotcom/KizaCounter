
import type { Hero } from "../types";
import HeroCard from "./HeroCard";


interface EnemyPanelProps {
  heroes: Hero[];
  maxHeroes?: number;
  onHeroClick?: (hero: Hero) => void;
  onClear?: () => void;
  compact?: boolean;
}

export default function EnemyPanel({
  heroes,
  maxHeroes = 5,
  onHeroClick,
  onClear,
  compact = false,
}: EnemyPanelProps) {
  return (
    <section className="w-full rounded-xl border border-red-500/20 bg-slate-900/80 p-4">
      {/* ======================================================
          EN-TÊTE
          ====================================================== */}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">
          Ennemis ({heroes.length}/{maxHeroes})
        </h2>

        {onClear && heroes.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-red-400/50 hover:text-red-300"
          >
            Effacer tout
          </button>
        )}
      </div>

      {/* ======================================================
          MODE COMPACT
          ====================================================== */}

      {compact ? (
        heroes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-4 text-center">
            <p className="text-sm text-slate-500">
              Sélectionnez jusqu'à {maxHeroes} héros ennemis.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {heroes.map((hero, index) => (
              <button
                key={hero.id}
                type="button"
                onClick={() => onHeroClick?.(hero)}
                className="group relative w-[calc((100%-1.5rem)/4)] min-w-0 max-w-[220px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 transition hover:border-red-400"
                title={`Retirer ${hero.name}`}
              >


                {/* IMAGE */}
                <div className="relative z-10 aspect-square w-full overflow-hidden">
                  <img
                    src={hero.img}
                    alt={hero.name}
                    className="h-full w-full object-contain transition group-hover:brightness-75"
                    loading="lazy"
                  />
                </div>

                {/* NUMÉRO DE SÉLECTION */}
                <span
                  className="
                    absolute left-1 top-1 z-20
                    flex h-5 w-5 items-center justify-center
                    rounded-full
                    border border-white/90
                    bg-amber-500
                    text-[10px] font-black leading-none text-slate-950
                    shadow
                    sm:left-2 sm:top-2
                    sm:h-7 sm:w-7
                    sm:border-2
                    sm:text-sm
                  "
                >
                  {index + 1}
                </span>

                {/* NOM */}
                <div className="relative z-10 truncate border-t border-slate-700 px-1.5 py-1.5 text-center text-[9px] font-bold leading-tight text-white sm:text-xs">
                  {hero.name}
                </div>
              </button>
            ))}
          </div>
        )
      ) : /* ====================================================
           MODE DÉTAILLÉ
           ==================================================== */

      heroes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
          <p className="text-sm text-slate-500">
            Sélectionnez jusqu'à {maxHeroes} héros ennemis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {heroes.map((hero, index) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              selected
              selectionOrder={index + 1}
              onClick={onHeroClick ? () => onHeroClick(hero) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
