import type { Hero } from "../types";
import HeroCard from "./HeroCard";

interface TeamPanelProps {
  title: string;
  heroes: Hero[];
  selectedIds?: string[];
  emptyMessage?: string;
  onHeroClick?: (hero: Hero) => void;
}

export default function TeamPanel({
  title,
  heroes,
  selectedIds = [],
  emptyMessage = "Aucun héros sélectionné.",
  onHeroClick,
}: TeamPanelProps) {
  return (
    <section className="ui-panel w-full rounded-xl border p-4">
      <div className="mb-4 flex min-h-[24px] items-center">
        <h2 className="ui-text-primary text-base font-bold">
          {title} ({heroes.length}/5)
        </h2>
      </div>

      {heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {heroes.map((hero, index) => {
            const selectedIndex = selectedIds.indexOf(hero.id);

            return (
              <HeroCard
                key={hero.id}
                hero={hero}
                selected={selectedIndex !== -1}
                selectionOrder={
                  selectedIndex !== -1 ? selectedIndex + 1 : index + 1
                }
                onClick={onHeroClick ? () => onHeroClick(hero) : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
