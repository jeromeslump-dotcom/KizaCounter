import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Hero } from "../types";
import { getTeamOrder } from "../storage/teamOrderStorage";

interface CompactTeamProps {
  title: string;
  titleRight?: ReactNode;
  heroes: Hero[];
  selectedIds?: string[];
  enemy?: boolean;
  onHeroClick?: (hero: Hero) => void;
  compactPortrait?: boolean;
}

export default function CompactTeam({
  title,
  titleRight,
  heroes,
  selectedIds = [],
  enemy = false,
  onHeroClick,
  compactPortrait = false,
}: CompactTeamProps) {
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (heroes.length !== 5) {
      setSavedOrder(null);
      return () => {
        cancelled = true;
      };
    }

    getTeamOrder(heroes.map((hero) => hero.id))
      .then((order) => {
        if (!cancelled) setSavedOrder(order);
      })
      .catch(() => {
        if (!cancelled) setSavedOrder(null);
      });

    return () => {
      cancelled = true;
    };
  }, [heroes]);

  const orderedHeroes = (() => {
    if (!savedOrder) return heroes;

    const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
    const ordered = savedOrder
      .map((id) => heroesById.get(id))
      .filter((hero): hero is Hero => Boolean(hero));

    return ordered.length === heroes.length ? ordered : heroes;
  })();

  return (
    <section className="ui-panel w-full rounded-xl border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="ui-text-primary min-w-0 truncate text-sm font-bold sm:text-base">
          {title}
        </h3>

        {titleRight && (
          <div className="ui-text-primary shrink-0 text-[10px] font-bold sm:text-xs">
            {titleRight}
          </div>
        )}
      </div>

      {orderedHeroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
          <p className="ui-text-muted text-xs">Aucun héros sélectionné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {orderedHeroes.map((hero, index) => {
            const isSelected = selectedIds.includes(hero.id);

            const imageSrc = compactPortrait
              ? `/heroes_portrait/${hero.id}.png`
              : hero.img;

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
                <div className="relative aspect-square w-full overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={hero.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />

                  <span className="selection-order-badge absolute left-0 top-0 z-20 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black leading-none shadow sm:left-2 sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm">
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
