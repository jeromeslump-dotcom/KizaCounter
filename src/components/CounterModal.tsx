import { type ReactNode } from "react";

import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import { type RecommendationSource } from "../engine/recommendationSource";
import type { Core4HistoryStats } from "../engine/recommendationCore4";

import useCounterHistory from "../hooks/useCounterHistory";
import useSavedTeamOrder from "../hooks/useSavedTeamOrder";

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
  alternativeRecommendationSource: RecommendationSource | null;
  recommendationCore4History: Core4HistoryStats | null;
  alternativeCore4History: Core4HistoryStats | null;
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

function formatCount(
  value: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${value} ${value > 1 ? plural : singular}`;
}

export default function CounterModal({
  open,
  enemies,
  team,
  recommendedTeam,
  alternativeTeam,
  recommendationSource,
  alternativeRecommendationSource,
  recommendationCore4History,
  alternativeCore4History,
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
  const {
    enemyIds,
    recommendedIds,
    alternativeIds,
    currentTeamHistory,
    currentTeamGeneralHistory,
    currentTeamClassHistory,
    currentTeamConfidence,
    recommendedExactHistory,
    recommendedClassHistory,
    recommendedSimilarHistory,
    alternativeHistory,
    alternativeClassHistory,
    alternativeSimilarHistory,
    recommendedDefeatHistory,
    alternativeDefeatHistory,
  } = useCounterHistory({
    open,
    enemies,
    teamIds,
    recommendedTeam,
    alternativeTeam,
    recommendationSource,
    alternativeRecommendationSource,
    heroes,
    combats,
  });

  const { orderedRecommendedTeam, orderedAlternativeTeam } =
    useSavedTeamOrder({
      recommendedTeam,
      alternativeTeam,
      recommendedIds,
      alternativeIds,
    });

  const currentTeamHistoryLabel =
    currentTeamHistory.battles > 0 ? (
      canViewDetailedHistory ? (
        <>
          <strong>Historique exact</strong>{" "}
          <span className="font-normal">
            · {Math.round(currentTeamHistory.winRate)} % ·{" "}
            {formatCount(currentTeamHistory.battles, "combat")}
          </span>
        </>
      ) : (
        <strong>Historique exact</strong>
      )
    ) : currentTeamGeneralHistory.battles > 0 ? (
      canViewDetailedHistory ? (
        <>
          <strong>Nouvelle rencontre · Équipe déjà victorieuse</strong>{" "}
          <span className="font-normal">
            · {Math.round(currentTeamGeneralHistory.winRate)} % ·{" "}
            {formatCount(currentTeamGeneralHistory.battles, "combat")}
          </span>
        </>
      ) : (
        <strong>Nouvelle rencontre · Équipe déjà connue</strong>
      )
    ) : currentTeamClassHistory.battles > 0 ? (
      <>
        <strong>Nouvelle équipe</strong>{" "}
        <span className="font-normal">
          · Confiance statistique : {Math.round(currentTeamConfidence)} %
        </span>
      </>
    ) : (
      <strong>Nouvelle équipe</strong>
    );

  let historyLabel: ReactNode = (
    <span className="font-normal">Pas de stats disponibles</span>
  );

  let recommendationSourceText = "Nouvelle combinaison";

  if (recommendationSource === "core4") {
    recommendationSourceText = "Core4 historique";

    if (recommendationCore4History && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(recommendationCore4History.winRate)} % ·{" "}
          {formatCount(recommendationCore4History.battles, "combat")}
        </span>
      );
    }
  } else if (recommendationSource === "defeat-history") {
    recommendationSourceText = "Historique des défaites";

    if (recommendedDefeatHistory && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(recommendedDefeatHistory.counterWinRate * 100)} % ·{" "}
          {formatCount(recommendedDefeatHistory.battles, "combat")}
        </span>
      );
    }
  } else if (recommendationSource === "exact-history") {
    recommendationSourceText = "Historique exact";

    if (recommendedExactHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(recommendedExactHistory.winRate)} % ·{" "}
          {formatCount(recommendedExactHistory.battles, "combat")}
        </span>
      );
    }
  } else if (recommendationSource === "class-history") {
    recommendationSourceText = "Historique classes";

    if (recommendedClassHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(recommendedClassHistory.winRate)} % ·{" "}
          {formatCount(recommendedClassHistory.battles, "combat")}
        </span>
      );
    }
  } else if (recommendationSource === "similar-history") {
    recommendationSourceText = "Historique similaire";

    if (recommendedSimilarHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(recommendedSimilarHistory.winRate)} % ·{" "}
          {formatCount(recommendedSimilarHistory.battles, "combat")}
        </span>
      );
    }
  }

  let alternativeHistoryLabel: ReactNode = (
    <span className="font-normal">Pas de stats disponibles</span>
  );

  let alternativeSourceText = "Nouvelle combinaison";

  if (alternativeRecommendationSource === "exact-history") {
    alternativeSourceText = "Historique exact";

    if (alternativeHistory.battles > 0 && canViewDetailedHistory) {
      alternativeHistoryLabel = (
        <span className="font-normal">
          {Math.round(alternativeHistory.winRate)} % ·{" "}
          {formatCount(alternativeHistory.battles, "combat")}
        </span>
      );
    }
  } else if (alternativeRecommendationSource === "defeat-history") {
    alternativeSourceText = "Historique des défaites";

    if (alternativeDefeatHistory && canViewDetailedHistory) {
      alternativeHistoryLabel = (
        <span className="font-normal">
          {Math.round(alternativeDefeatHistory.counterWinRate * 100)} % ·{" "}
          {formatCount(alternativeDefeatHistory.battles, "combat")}
        </span>
      );
    }
  } else if (alternativeRecommendationSource === "core4") {
    alternativeSourceText = "Core4 historique";

    if (alternativeCore4History && canViewDetailedHistory) {
      alternativeHistoryLabel = (
        <span className="font-normal">
          {Math.round(alternativeCore4History.winRate)} % ·{" "}
          {formatCount(alternativeCore4History.battles, "combat")}
        </span>
      );
    }
  } else if (alternativeRecommendationSource === "similar-history") {
    alternativeSourceText = "Historique similaire";

    if (alternativeSimilarHistory.battles > 0 && canViewDetailedHistory) {
      alternativeHistoryLabel = (
        <span className="font-normal">
          {Math.round(alternativeSimilarHistory.winRate)} % ·{" "}
          {formatCount(alternativeSimilarHistory.battles, "combat")}
        </span>
      );
    }
  } else if (alternativeRecommendationSource === "class-history") {
    alternativeSourceText = "Historique classes";

    if (alternativeClassHistory.battles > 0 && canViewDetailedHistory) {
      alternativeHistoryLabel = (
        <span className="font-normal">
          {Math.round(alternativeClassHistory.winRate)} % ·{" "}
          {formatCount(alternativeClassHistory.battles, "combat")}
        </span>
      );
    }
  }

  const recommendationMobileHistoryLabel =
    recommendationSource === "core4" && recommendationCore4History
      ? `${Math.round(recommendationCore4History.winRate)} %`
      : recommendationSource === "defeat-history" && recommendedDefeatHistory
        ? `${Math.round(recommendedDefeatHistory.counterWinRate * 100)} %`
        : recommendationSource === "similar-history" &&
            recommendedSimilarHistory.battles > 0
          ? `${Math.round(recommendedSimilarHistory.winRate)} %`
          : recommendedExactHistory.battles > 0
            ? `${Math.round(recommendedExactHistory.winRate)} %`
            : recommendedClassHistory.battles > 0
              ? `${Math.round(recommendedClassHistory.winRate)} %`
              : null;

  const alternativeMobileHistoryLabel =
    alternativeRecommendationSource === "core4" && alternativeCore4History
      ? `${Math.round(alternativeCore4History.winRate)} %`
      : alternativeRecommendationSource === "exact-history" &&
          alternativeHistory.battles > 0
        ? `${Math.round(alternativeHistory.winRate)} %`
        : alternativeRecommendationSource === "defeat-history" &&
            alternativeDefeatHistory
          ? `${Math.round(alternativeDefeatHistory.counterWinRate * 100)} %`
          : alternativeRecommendationSource === "similar-history" &&
              alternativeSimilarHistory.battles > 0
            ? `${Math.round(alternativeSimilarHistory.winRate)} %`
            : alternativeRecommendationSource === "class-history" &&
                alternativeClassHistory.battles > 0
              ? `${Math.round(alternativeClassHistory.winRate)} %`
              : null;

  const hasRecommendations =
    recommendedTeam.length > 0 || alternativeTeam.length > 0;

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
                        <strong>{recommendationSourceText}</strong>

                        <span className="ui-text-muted ml-1">
                          · {historyLabel}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {orderedRecommendedTeam.map((hero) => (
                      <span
                        key={hero.id}
                        className="ui-recommendation-hero hover:!border-[var(--ui-accent)] hover:!bg-[var(--ui-panel-alt)] hover:!text-[var(--ui-accent-soft)]"
                      >
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
                          <strong>{alternativeSourceText}</strong>

                          <span className="ui-text-muted ml-1">
                            · {alternativeHistoryLabel}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {orderedAlternativeTeam.map((hero) => (
                        <span
                          key={hero.id}
                          className="ui-recommendation-hero hover:!border-[var(--ui-accent)] hover:!bg-[var(--ui-panel-alt)] hover:!text-[var(--ui-accent-soft)]"
                        >
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
