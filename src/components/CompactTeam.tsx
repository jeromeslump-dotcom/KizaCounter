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
    <section
      className={[
        "w-full rounded-xl border bg-slate-900/80 p-3",
        enemy ? "border-red-500/20" : "border-slate-700",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white sm:text-base">{title}</h3>
      </div>

      {heroes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-4 text-center">
          <p className="text-xs text-slate-500">Aucun héros sélectionné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {heroes.map((hero, index) => {
            const selectedIndex = selectedIds.indexOf(hero.id);
            const order = selectedIndex !== -1 ? selectedIndex + 1 : index + 1;

            return (
              <button
                key={hero.id}
                type="button"
                disabled={!onHeroClick}
                onClick={() => onHeroClick?.(hero)}
                className={[
                  "group relative min-w-0 overflow-hidden rounded-lg border bg-slate-950 transition",
                  selectedIndex !== -1
                    ? "border-amber-400 ring-1 ring-amber-400/40"
                    : enemy
                      ? "border-red-500/20"
                      : "border-slate-700",
                  onHeroClick
                    ? "cursor-pointer hover:border-sky-400/70"
                    : "cursor-default",
                ].join(" ")}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                  <img
                    src={hero.img}
                    alt={hero.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />

                  <SelectionOrderBadge order={order} />
                </div>

                <div
                  className="
                    truncate px-1 py-1
                    text-center
                    text-[9px] font-bold leading-tight text-white
                    sm:text-xs
                  "
                >
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
