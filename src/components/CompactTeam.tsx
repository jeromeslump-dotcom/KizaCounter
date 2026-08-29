import type { Hero } from "../types";

import SelectionOrderBadge from "./SelectionOrderBadge";

interface CompactTeamProps {
  title: string;
  heroes: Hero[];
  selectedIds?: string[];
  enemy?: boolean;
  onHeroClick?: (hero: Hero) => void;
}

export default function CompactTeam({
  title,
  heroes,
  selectedIds = [],
  enemy = false,
  onHeroClick,
}: CompactTeamProps) {
  return (
    <section className="ui-panel w-full rounded-xl border p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="ui-text-primary text-sm font-bold sm:text-base">{title}</h3>
      </div>

      {heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
          <p className="ui-text-muted text-xs">Aucun héros sélectionné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {heroes.map((hero, index) => {
            const selectedIndex = selectedIds.indexOf(hero.id);
            const isSelected = selectedIndex !== -1;
            const order = isSelected ? selectedIndex + 1 : index + 1;

            return (
              <button
                key={hero.id}
                type="button"
                disabled={!onHeroClick}
                onClick={() => onHeroClick?.(hero)}
                className={[
                  "ui-card ui-card-hover group relative min-w-0 overflow-hidden rounded-lg border transition",
                  isSelected ? "hero-card-selected" : "",
                  onHeroClick ? "cursor-pointer hover:border-sky-400/70" : "cursor-default",
                ].join(" ")}
              >
                <div className="ui-card aspect-square w-full overflow-hidden">
                  <img
                    src={hero.img}
                    alt={hero.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>

                <span
                  className="selection-order-badge absolute left-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black leading-none shadow sm:left-2 sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm"
                >
                  {index + 1}
                </span>

                <div className="ui-divider ui-text-primary relative z-10 truncate border-t px-1 py-1 text-center text-[9px] font-bold leading-tight sm:text-xs">
                  {hero.name}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
