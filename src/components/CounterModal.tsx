import { useMemo } from "react";

import type {
  Combat,
  Hero,
  HeroClassFilter,
  HeroSort,
  TeamEvaluation,
} from "../types";

import {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
} from "../engine/scoring";
import { getEngineSettings } from "../engine/engineSettings";
import {
  recommendationSourceLabel,
  type RecommendationSource,
} from "../engine/recommendationSource";

import CompactTeam from "./CompactTeam";
import CombatForm from "./CombatForm";
import HeroGrid from "./HeroGrid";

interface CounterModalProps {
  open: boolean;
  enemies: Hero[];
  team: Hero[];
  recommendedTeam: Hero[];
  alternativeTeam: Hero[];
  recommendationSource: RecommendationSource | null;
  onSelectRecommendedTeam: (ids: string[]) => void;
  teamIds: string[];
  heroes: Hero[];
  enabledHeroIds: Set<string>;
  activeClass: HeroClassFilter;
  query: string;
  sortBy: HeroSort;
  usage: Record<string, number>;
  combats: Combat[];
  canViewDetailedHistory: boolean;
  onClose: () => void;
  onHeroClick: (hero: Hero) => void;
  onQueryChange: (value: string) => void;
  onClassChange: (value: HeroClassFilter) => void;
  onSortChange: (value: HeroSort) => void;
  onSave: (combat: Combat) => Promise<void>;
}

const EMPTY_HISTORY: TeamEvaluation = {
  score: 0,
  historicalWins: 0,
  historicalLosses: 0,
  historicalBattles: 0,
  historicalWinRate: 0,
};

export default function CounterModal({
  open,
  enemies,
  team,
  recommendedTeam,
  alternativeTeam,
  recommendationSource,
  onSelectRecommendedTeam,
  teamIds,
  heroes,
  enabledHeroIds,
  activeClass,
  query,
  sortBy,
  usage,
  combats,
  canViewDetailedHistory,
  onClose,
  onHeroClick,
  onQueryChange,
  onClassChange,
  onSortChange,
  onSave,
}: CounterModalProps) {
  const enemyIds = useMemo(() => enemies.map((hero) => hero.id), [enemies]);
  const currentTeamIds = useMemo(() => teamIds, [teamIds]);
  const recommendedIds = useMemo(
    () => recommendedTeam.map((hero) => hero.id),
    [recommendedTeam]
  );
  const alternativeIds = useMemo(
    () => alternativeTeam.map((hero) => hero.id),
    [alternativeTeam]
  );

  const currentTeamHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(currentTeamIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, currentTeamIds, enemyIds, combats]
  );

  const currentTeamGeneralHistory = useMemo(
    () => (open ? evaluateTeamHistory(currentTeamIds, combats) : EMPTY_HISTORY),
    [open, currentTeamIds, combats]
  );

  const currentTeamClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(currentTeamIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, currentTeamIds, enemyIds, combats, heroes]
  );

  const currentTeamConfidence = useMemo(() => {
    const battles =
      currentTeamHistory.historicalBattles > 0
        ? currentTeamHistory.historicalBattles
        : currentTeamClassHistory.historicalBattles;

    if (battles <= 0) return 0;

    const confidenceBattles = Math.max(
      1,
      getEngineSettings().advanced.historicalConfidenceBattles
    );

    return (battles / (battles + confidenceBattles)) * 100;
  }, [currentTeamHistory.historicalBattles, currentTeamClassHistory.historicalBattles]);

  const recommendedExactHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(recommendedIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, recommendedIds, enemyIds, combats]
  );

  const recommendedClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(recommendedIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, recommendedIds, enemyIds, combats, heroes]
  );

  const alternativeHistory = useMemo(
    () =>
      open
        ? evaluateExactTeamHistory(alternativeIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, alternativeIds, enemyIds, combats]
  );

  const alternativeClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(alternativeIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, alternativeIds, enemyIds, combats, heroes]
  );

  const currentTeamHistoryLabel =
    currentTeamHistory.historicalBattles > 0 ? (
      canViewDetailedHistory ? (
        <>
          <strong>Historique exact</strong>{" "}
          <span className="font-normal">
            · {Math.round(currentTeamHistory.historicalWinRate)} % ·{" "}
            {currentTeamHistory.historicalBattles} combat
            {currentTeamHistory.historicalBattles > 1 ? "s" : ""}
          </span>
        </>
      ) : (
        <strong>Historique exact</strong>
      )
    ) : currentTeamGeneralHistory.historicalBattles > 0 ? (
      canViewDetailedHistory ? (
        <>
          <strong>Nouvelle rencontre · Équipe déjà victorieuse</strong>{" "}
          <span className="font-normal">
            · {Math.round(currentTeamGeneralHistory.historicalWinRate)} % ·{" "}
            {currentTeamGeneralHistory.historicalBattles} combat
            {currentTeamGeneralHistory.historicalBattles > 1 ? "s" : ""}
          </span>
        </>
      ) : (
        <strong>Nouvelle rencontre · Équipe déjà connue</strong>
      )
    ) : currentTeamClassHistory.historicalBattles > 0 ? (
      <>
        <strong>Nouvelle équipe</strong>{" "}
        <span className="font-normal">
          · Confiance statistique : {Math.round(currentTeamConfidence)} %
        </span>
      </>
    ) : (
      <strong>Nouvelle équipe</strong>
    );

  let historyLabel = "Aucune statistique historique affichée";

  if (recommendationSource === "exact-history") {
    historyLabel =
      recommendedExactHistory.historicalBattles === 0
        ? "Aucun historique exact"
        : canViewDetailedHistory
          ? `${Math.round(recommendedExactHistory.historicalWinRate)} % · ${recommendedExactHistory.historicalBattles} combat${recommendedExactHistory.historicalBattles > 1 ? "s" : ""}`
          : `${Math.round(recommendedExactHistory.historicalWinRate)} %`;
  } else if (recommendationSource === "class-history") {
    historyLabel =
      recommendedClassHistory.historicalBattles === 0
        ? "Aucun historique de classes"
        : canViewDetailedHistory
          ? `${Math.round(recommendedClassHistory.historicalWinRate)} % · ${recommendedClassHistory.historicalBattles} combat${recommendedClassHistory.historicalBattles > 1 ? "s" : ""}`
          : `${Math.round(recommendedClassHistory.historicalWinRate)} %`;
  }

  const alternativeHistoryLabel =
    alternativeHistory.historicalBattles > 0
      ? canViewDetailedHistory
        ? `Historique exact · ${Math.round(alternativeHistory.historicalWinRate)} % · ${alternativeHistory.historicalBattles} combat${alternativeHistory.historicalBattles > 1 ? "s" : "s"}`
        : "Historique exact"
      : alternativeClassHistory.historicalBattles > 0
        ? canViewDetailedHistory
          ? `Historique classes · ${Math.round(alternativeClassHistory.historicalWinRate)} % · ${alternativeClassHistory.historicalBattles} combat${alternativeClassHistory.historicalBattles > 1 ? "s" : ""}`
          : "Historique classes"
        : "Aucune statistique historique";

  const recommendationMobileHistoryLabel =
    recommendationSource === "exact-history" &&
    recommendedExactHistory.historicalBattles > 0
      ? `${Math.round(recommendedExactHistory.historicalWinRate)} %`
      : recommendationSource === "class-history" &&
          recommendedClassHistory.historicalBattles > 0
        ? `${Math.round(recommendedClassHistory.historicalWinRate)} %`
        : null;

  const alternativeMobileHistoryLabel =
    alternativeHistory.historicalBattles > 0
      ? `${Math.round(alternativeHistory.historicalWinRate)} %`
      : alternativeClassHistory.historicalBattles > 0
        ? `${Math.round(alternativeClassHistory.historicalWinRate)} %`
        : null;

  const hasRecommendations =
    recommendedTeam.length > 0 || alternativeTeam.length > 0;

  const recommendationSourceText = recommendationSource
    ? recommendationSourceLabel(recommendationSource)
    : "Source inconnue";

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
            compactPortrait
          />

          <div className="mt-4">
            <CompactTeam
              title={`Votre équipe (${team.length}/5)`}
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
                    <div className="shrink-0 text-right text-[10px] font-bold sm:text-xs">
                      <span className="sm:hidden">
                        {recommendationMobileHistoryLabel}
                      </span>
                      <span className="hidden sm:inline">
                        {recommendationSourceText}
                        <span className="ui-text-muted ml-1 font-normal">
                          · {historyLabel}
                        </span>
                      </span>
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
                      <div className="shrink-0 text-right text-[10px] font-bold sm:text-xs">
                        <span className="sm:hidden">
                          {alternativeMobileHistoryLabel}
                        </span>
                        <span className="hidden sm:inline">
                          {alternativeHistoryLabel}
                        </span>
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
