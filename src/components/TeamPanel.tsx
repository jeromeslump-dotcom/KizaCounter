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
    <section className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      {/* ======================================================
          TITRE
          ====================================================== */}

      <div className="mb-4 flex min-h-[24px] items-center">
        <h2 className="text-base font-bold text-white">
          {title} ({heroes.length}/5)
        </h2>
      </div>

      {/* ======================================================
          ÉQUIPE VIDE
          ====================================================== */}

      {heroes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
          <p className="text-sm text-slate-500">
            {emptyMessage}
          </p>
        </div>
      ) : (
        /* ====================================================
           CARTES
           ==================================================== */

        <div className="grid grid-cols-1 gap-3">
          {heroes.map((hero, index) => {
            const selectedIndex = selectedIds.indexOf(hero.id);

            return (
              <HeroCard
                key={hero.id}
                hero={hero}
                selected={selectedIndex !== -1}
                selectionOrder={
                  selectedIndex !== -1
                    ? selectedIndex + 1
                    : index + 1
                }
                onClick={
                  onHeroClick
                    ? () => onHeroClick(hero)
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}