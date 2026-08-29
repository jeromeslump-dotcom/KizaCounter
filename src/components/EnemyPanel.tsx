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
    <section className="ui-panel w-full rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-text-primary text-base font-bold">
          Ennemis ({heroes.length}/{maxHeroes})
        </h2>

        {onClear && heroes.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ui-action ui-danger rounded-lg border px-3 py-1.5 text-xs font-semibold transition"
          >
            Effacer tout
          </button>
        )}
      </div>

      {compact ? (
        heroes.length === 0 ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
            <p className="ui-text-muted text-sm">
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
                className="ui-card group relative w-[calc((100%-1.5rem)/4)] min-w-0 max-w-[220px] overflow-hidden rounded-xl border transition hover:border-red-400 sm:w-[180px]"
                title={`Retirer ${hero.name}`}
              >
                <div className="relative z-10 aspect-square w-full overflow-hidden">
                  <img
                    src={hero.img}
                    alt={hero.name}
                    className="h-full w-full object-contain transition group-hover:brightness-75"
                    loading="lazy"
                  />
                </div>

                <span
                  className="selection-order-badge absolute left-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black leading-none shadow sm:left-2 sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm"
                >
                  {index + 1}
                </span>

                <div className="ui-divider ui-text-primary relative z-10 truncate border-t px-1.5 py-1.5 text-center text-[9px] font-bold leading-tight sm:text-xs">
                  {hero.name}
                </div>
              </button>
            ))}
          </div>
        )
      ) : heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">
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
