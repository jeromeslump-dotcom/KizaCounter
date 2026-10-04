import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Hero } from "../types";
import { getTeamOrder } from "../storage/teamOrderStorage";
import HeroTeamItem from "./HeroTeamItem";

interface CompactTeamProps {
  title: string;
  titleRight?: ReactNode;
  heroes: Hero[];
  selectedIds?: string[];
  enemy?: boolean;
  onHeroClick?: (hero: Hero) => void;
}

export default function CompactTeam({
  title,
  titleRight,
  heroes,
  selectedIds = [],
  enemy = false,
  onHeroClick,
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
    <section className="ui-panel is-active w-full rounded-xl border p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="ui-text-primary min-w-0 truncate text-sm font-bold sm:text-base">
          {title}
        </h3>

        {titleRight && (
          <div className="ui-text-primary min-w-0 text-right text-[10px] font-bold sm:text-xs">
            {titleRight}
          </div>
        )}
      </div>

      {orderedHeroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
          <p className="ui-text-muted text-xs">Aucun héros sélectionné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-5 justify-center gap-2 sm:flex sm:justify-center sm:gap-3">
          {orderedHeroes.map((hero, index) => {
            const isSelected = selectedIds.includes(hero.id);

            return (
              <HeroTeamItem
                key={hero.id}
                hero={hero}
                order={index + 1}
                selected={isSelected}
                onClick={onHeroClick}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
