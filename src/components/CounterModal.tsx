import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import CompactTeam from "./CompactTeam";
import CombatForm from "./CombatForm";
import HeroGrid from "./HeroGrid";

interface CounterModalProps {
  open: boolean;
  enemies: Hero[];
  team: Hero[];
  recommendedTeam: Hero[];
  teamIds: string[];
  heroes: Hero[];
  enabledHeroIds: Set<string>;
  activeClass: HeroClassFilter;
  query: string;
  sortBy: HeroSort;
  usage: Record<string, number>;
  onClose: () => void;
  onHeroClick: (hero: Hero) => void;
  onQueryChange: (value: string) => void;
  onClassChange: (value: HeroClassFilter) => void;
  onSortChange: (value: HeroSort) => void;
  onSave: (combat: Combat) => Promise<void>;
}

export default function CounterModal({
  open,
  enemies,
  team,
  recommendedTeam,
  teamIds,
  heroes,
  enabledHeroIds,
  activeClass,
  query,
  sortBy,
  usage,
  onClose,
  onHeroClick,
  onQueryChange,
  onClassChange,
  onSortChange,
  onSave,
}: CounterModalProps) {
  if (!open) return null;

  return (
    <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 backdrop-blur-sm sm:p-4">
      <div className="ui-modal flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="flex items-center justify-between border-b ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 className="ui-text-primary text-lg font-black sm:text-xl">
              ⚔️ Contre recommandée
            </h2>
            <p className="ui-text-secondary mt-1 hidden text-xs sm:block">
              Modifiez les héros proposés si nécessaire.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ui-action ui-danger flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5">
          <CompactTeam
            title={`Ennemis (${enemies.length}/5)`}
            heroes={enemies}
            selectedIds={enemies.map((hero) => hero.id)}
            enemy
          />

          <div className="mt-4">
            <CompactTeam
              title={`Votre équipe (${team.length}/5)`}
              heroes={team}
              selectedIds={teamIds}
              onHeroClick={onHeroClick}
            />
          </div>

          {recommendedTeam.length > 0 && (
            <div className="ui-sky mt-4 rounded-xl border p-2 sm:p-3">
              <div className="mb-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                Recommandation initiale
              </div>

              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {recommendedTeam.map((hero) => (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => onHeroClick(hero)}
                    className={[
                      "min-w-0 overflow-hidden rounded-lg border px-1 py-2 transition",
                      "text-[9px] font-semibold leading-tight sm:px-2 sm:text-xs",
                      teamIds.includes(hero.id)
                        ? "ui-sky"
                        : "ui-card ui-text-muted",
                    ].join(" ")}
                  >
                    <span className="block truncate">{hero.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <CombatForm enemies={enemies} myHeroes={team} onSave={onSave} />
          </div>

          <div className="mt-5">
            <div className="ui-text-soft mb-3 text-sm font-bold">
              Roster — cliquez sur un héros pour l'ajouter ou le retirer
            </div>

            <HeroGrid
              heroes={heroes}
              enabledHeroIds={enabledHeroIds}
              activeClass={activeClass}
              query={query}
              sortBy={sortBy}
              usage={usage}
              selectedIds={teamIds}
              onQueryChange={onQueryChange}
              onClassChange={onClassChange}
              onSortChange={onSortChange}
              onHeroClick={onHeroClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
