import type {
  Combat,
  Hero,
  HeroClassFilter,
  HeroSort,
} from "../types";

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
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4">

      <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">

        {/* ==================================================
            HEADER MODALE
            ================================================== */}

        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 sm:px-5 sm:py-4">

          <div>
            <h2 className="text-lg font-black text-white sm:text-xl">
              ⚔️ Contre recommandée
            </h2>

            <p className="mt-1 hidden text-xs text-slate-400 sm:block">
              Modifiez les héros proposés si nécessaire.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-lg text-slate-400 transition hover:border-red-400/50 hover:text-red-300"
            aria-label="Fermer"
          >
            ✕
          </button>

        </div>

        {/* ==================================================
            CONTENU MODALE
            ================================================== */}

        <div className="overflow-y-auto p-3 sm:p-5">

          {/* ==================================================
              ENNEMIS
              ================================================== */}

          <CompactTeam
            title={`Ennemis (${enemies.length}/5)`}
            heroes={enemies}
            enemy
          />

          {/* ==================================================
              MON ÉQUIPE
              ================================================== */}

          <div className="mt-4">
            <CompactTeam
              title={`Votre équipe (${team.length}/5)`}
              heroes={team}
              selectedIds={teamIds}
              onHeroClick={onHeroClick}
            />
          </div>

          {/* ==================================================
              RECOMMANDATION INITIALE
              ================================================== */}

          {recommendedTeam.length > 0 && (
            <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2 sm:p-3">

              <div className="mb-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-sky-300 sm:text-xs">
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
                        ? "border-sky-400/40 bg-sky-500/10 text-sky-200"
                        : "border-slate-700 bg-slate-950 text-slate-400",
                    ].join(" ")}
                  >
                    <span className="block truncate">
                      {hero.name}
                    </span>
                  </button>
                ))}

              </div>
            </div>
          )}

          {/* ==================================================
              WIN / LOSE
              ================================================== */}

          <div className="mt-4">

            <CombatForm
              enemies={enemies}
              myHeroes={team}
              onSave={onSave}
            />

          </div>

          {/* ==================================================
              ROSTER
              ================================================== */}

          <div className="mt-5">

            <div className="mb-3 text-sm font-bold text-slate-200">
              Roster — cliquez sur un héros pour l'ajouter
              ou le retirer
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