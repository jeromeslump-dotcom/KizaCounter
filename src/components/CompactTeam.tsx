
import type { Hero } from "../types";

interface CompactTeamProps {
  title: string;
  heroes: Hero[];
  selectedIds?: string[];
  enemy?: boolean;
  onHeroClick?: (hero: Hero) => void;
  compactPortrait?: boolean;
}

export default function CompactTeam({
  title,
  heroes,
  selectedIds = [],
  enemy = false,
  onHeroClick,
  compactPortrait = false,
}: CompactTeamProps) {
  return (
    <section className="ui-panel w-full rounded-xl border p-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="ui-text-primary text-sm font-bold sm:text-base">
          {title}
        </h3>
      </div>

      {heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
          <p className="ui-text-muted text-xs">
            Aucun héros sélectionné.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {heroes.map((hero, index) => {
            const selectedIndex = selectedIds.indexOf(hero.id);
            const isSelected = selectedIndex !== -1;

            return (
              <button
                key={hero.id}
                type="button"
                disabled={!onHeroClick}
                onClick={() => onHeroClick?.(hero)}
                className={[
                  "ui-card ui-card-hover ui-hover-sky group relative min-w-0 overflow-hidden rounded-lg border transition",
                  isSelected ? "hero-card-selected" : "",
                  onHeroClick ? "cursor-pointer" : "cursor-default",
                ].join(" ")}
              >
                <div
                  className={[
                    "relative aspect-square w-full overflow-hidden",
                    compactPortrait ? "compact-team-portrait" : "",
                  ].join(" ")}
                >
                  <img
                    src={hero.img}
                    alt={hero.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />

                  <span className="selection-order-badge absolute left-1 top-1 z-20 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black leading-none shadow sm:left-2 sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm">
                    {index + 1}
                  </span>
                </div>

                <div className="ui-divider ui-text-primary relative z-10 truncate border-t px-1 py-1.5 text-center text-[9px] font-bold leading-tight sm:px-2 sm:py-2 sm:text-xs">
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

