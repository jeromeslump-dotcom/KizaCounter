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
          <div className="flex items-center justify-center gap-3">
            {heroes.map((hero, index) => (
              <button
                key={hero.id}
                type="button"
                onClick={() => onHeroClick?.(hero)}
                className="group relative"
                title={`Retirer ${hero.name}`}
              >
                <img
                  src={hero.img}
                  alt={hero.name}
                  className="h-20 w-20 rounded-xl border border-slate-700 object-cover transition group-hover:border-red-400 group-hover:brightness-75"
                />

                {/* NUMÉRO DE SÉLECTION */}
                <span
                  className="
                    absolute -right-0.5 -top-0.5
                    flex h-3 w-3 items-center justify-center
                    rounded-full
                    border border-white/70
                    bg-amber-500
                    text-[5px] font-black leading-none text-slate-950
                    shadow-sm

                    sm:-right-1 sm:-top-1
                    sm:h-5 sm:w-5
                    sm:border
                    sm:text-[10px]
                  "
                >
                  {index + 1}
                </span>
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
