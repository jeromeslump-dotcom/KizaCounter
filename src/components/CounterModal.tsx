import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import { evaluateExactTeamHistory } from "../engine/scoring";

import CompactTeam from "./CompactTeam";
import CombatForm from "./CombatForm";
import HeroGrid from "./HeroGrid";

interface CounterModalProps {
  open: boolean;
  enemies: Hero[];
  team: Hero[];
  recommendedTeam: Hero[];
  alternativeTeam: Hero[];
  onSelectRecommendedTeam: (ids: string[]) => void;
  teamIds: string[];
  heroes: Hero[];
  enabledHeroIds: Set<string>;
  activeClass: HeroClassFilter;
  query: string;
  sortBy: HeroSort;
  usage: Record<string, number>;
  combats: Combat[];
  isAuthenticated: boolean;
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
  alternativeTeam,
  onSelectRecommendedTeam,
  teamIds,
  heroes,
  enabledHeroIds,
  activeClass,
  query,
  sortBy,
  usage,
  combats,
  isAuthenticated,
  onClose,
  onHeroClick,
  onQueryChange,
  onClassChange,
  onSortChange,
  onSave,
}: CounterModalProps) {
  if (!open) return null;

  const enemyIds = enemies.map((hero) => hero.id);

  // ============================================================
  // HISTORIQUE DE L'ÉQUIPE ACTUELLEMENT SÉLECTIONNÉE
  // ============================================================
  //////// MODIF : calcul de l'historique sur l'équipe ACTUELLE
  //////// et non uniquement sur la recommandation initiale.

  const currentTeamIds = team.map((hero) => hero.id);

  const currentTeamHistory = evaluateExactTeamHistory(
    currentTeamIds,
    enemyIds,
    combats
  );

  const currentTeamHistoryLabel =
    currentTeamHistory.battles === 0
      ? "Nouvelle équipe"
      : isAuthenticated
        ? `${Math.round(currentTeamHistory.winRate)} % · ${
            currentTeamHistory.battles
          } combat${currentTeamHistory.battles > 1 ? "s" : ""}`
        : `${Math.round(currentTeamHistory.winRate)} %`;

  // ============================================================
  // HISTORIQUE RECOMMANDATION INITIALE
  // ============================================================

  const recommendedIds = recommendedTeam.map((hero) => hero.id);

  const history = evaluateExactTeamHistory(recommendedIds, enemyIds, combats);

  const historyLabel =
    history.battles === 0
      ? "Nouvelle équipe"
      : isAuthenticated
        ? `${Math.round(history.winRate)} % · ${history.battles} combat${
            history.battles > 1 ? "s" : ""
          }`
        : `${Math.round(history.winRate)} %`;

  // ============================================================
  // HISTORIQUE ALTERNATIVE
  // ============================================================

  const alternativeIds = alternativeTeam.map((hero) => hero.id);

  const alternativeHistory = evaluateExactTeamHistory(
    alternativeIds,
    enemyIds,
    combats
  );

  const alternativeHistoryLabel =
    alternativeHistory.battles === 0
      ? "Nouvelle équipe"
      : isAuthenticated
        ? `${Math.round(alternativeHistory.winRate)} % · ${
            alternativeHistory.battles
          } combat${alternativeHistory.battles > 1 ? "s" : ""}`
        : `${Math.round(alternativeHistory.winRate)} %`;

  const hasRecommendations =
    recommendedTeam.length > 0 || alternativeTeam.length > 0;

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
            compactPortrait
          />

          <div className="mt-4">
            <CompactTeam
              title={`Votre équipe (${team.length}/5)`}
              //////// MODIF : statistiques placées à droite,
              //////// exactement comme "Recommandation initiale".
              titleRight={
                team.length === 5 ? currentTeamHistoryLabel : undefined
              }
              heroes={team}
              selectedIds={teamIds}
              onHeroClick={onHeroClick}
              compactPortrait
            />
          </div>

          {hasRecommendations && (
            <div className="ui-recommendations mt-4 rounded-xl border p-2 sm:p-3">
              {recommendedTeam.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectRecommendedTeam(recommendedIds)}
                    className={[
                      "ui-recommendation-team",
                      recommendedIds.every((id) => teamIds.includes(id))
                        ? "ui-recommendation-selected"
                        : "",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                        Recommandation initiale
                      </div>

                      <div className="shrink-0 text-[10px] font-bold sm:text-xs">
                        {historyLabel}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {recommendedTeam.map((hero) => (
                        <span key={hero.id} className="ui-recommendation-hero">
                          {hero.name}
                        </span>
                      ))}
                    </div>
                  </button>
                </>
              )}

              {alternativeTeam.length > 0 && (
                <div
                  className={
                    recommendedTeam.length > 0
                      ? "mt-3 border-t ui-divider pt-3"
                      : ""
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelectRecommendedTeam(alternativeIds)}
                    className={[
                      "ui-recommendation-team",
                      alternativeIds.every((id) => teamIds.includes(id))
                        ? "ui-recommendation-selected"
                        : "",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">
                        Alternative
                      </div>

                      <div className="shrink-0 text-[10px] font-bold sm:text-xs">
                        {alternativeHistoryLabel}
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {alternativeTeam.map((hero) => (
                        <span key={hero.id} className="ui-recommendation-hero">
                          {hero.name}
                        </span>
                      ))}
                    </div>
                  </button>
                </div>
              )}
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
