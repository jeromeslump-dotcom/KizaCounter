import { type ReactNode } from "react";

import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import { type RecommendationSource } from "../engine/recommendationSource";
import { RECOMMENDATION_SOURCE_LABELS } from "../engine/recommendationLabels";
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

interface RecommendationDisplay {
  sourceText: string;
  historyLabel: ReactNode;
}

function getRecommendationDisplay({
  source,
  core4History,
  defeatHistory,
  exactHistory,
  classHistory,
  similarHistory,
  canViewDetailedHistory,
}: {
  source: RecommendationSource | null;
  core4History: Core4HistoryStats | null;
  defeatHistory: {
    counterWinRate: number;
    battles: number;
  } | null;
  exactHistory: {
    winRate: number;
    battles: number;
  };
  classHistory: {
    winRate: number;
    battles: number;
  };
  similarHistory: {
    winRate: number;
    battles: number;
  };
  canViewDetailedHistory: boolean;
}): RecommendationDisplay {
  let sourceText: (typeof RECOMMENDATION_SOURCE_LABELS)[keyof typeof RECOMMENDATION_SOURCE_LABELS] =
    RECOMMENDATION_SOURCE_LABELS.fallback;

  let historyLabel: ReactNode = (
    <span className="font-normal">Pas de stats disponibles</span>
  );

  if (source === "core4") {
    sourceText = RECOMMENDATION_SOURCE_LABELS.core4;

    if (core4History && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(core4History.winRate)} % ·{" "}
          {formatCount(core4History.battles, "combat")}
        </span>
      );
    }
  } else if (source === "defeat-history") {
    sourceText = RECOMMENDATION_SOURCE_LABELS.defeat;

    if (defeatHistory && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(defeatHistory.counterWinRate * 100)} % ·{" "}
          {formatCount(defeatHistory.battles, "combat")}
        </span>
      );
    }
  } else if (source === "exact-history") {
    sourceText = RECOMMENDATION_SOURCE_LABELS.exact;

    if (exactHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(exactHistory.winRate)} % ·{" "}
          {formatCount(exactHistory.battles, "combat")}
        </span>
      );
    }
  } else if (source === "class-history") {
    sourceText = RECOMMENDATION_SOURCE_LABELS.class;

    if (classHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(classHistory.winRate)} % ·{" "}
          {formatCount(classHistory.battles, "combat")}
        </span>
      );
    }
  } else if (source === "similar-history") {
    sourceText = RECOMMENDATION_SOURCE_LABELS.similar;

    if (similarHistory.battles > 0 && canViewDetailedHistory) {
      historyLabel = (
        <span className="font-normal">
          {Math.round(similarHistory.winRate)} % ·{" "}
          {formatCount(similarHistory.battles, "combat")}
        </span>
      );
    }
  }

  return {
    sourceText,
    historyLabel,
  };
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

  const { orderedRecommendedTeam, orderedAlternativeTeam } = useSavedTeamOrder({
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

  const recommendationDisplay = getRecommendationDisplay({
    source: recommendationSource,
    core4History: recommendationCore4History,
    defeatHistory: recommendedDefeatHistory,
    exactHistory: recommendedExactHistory,
    classHistory: recommendedClassHistory,
    similarHistory: recommendedSimilarHistory,
    canViewDetailedHistory,
  });

  const alternativeDisplay = getRecommendationDisplay({
    source: alternativeRecommendationSource,
    core4History: alternativeCore4History,
    defeatHistory: alternativeDefeatHistory,
    exactHistory: alternativeHistory,
    classHistory: alternativeClassHistory,
    similarHistory: alternativeSimilarHistory,
    canViewDetailedHistory,
  });

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
        <div className="ui-modal-header px-4 py-3 sm:px-5 sm:py-4">
          <div className="ui-modal-header-inner is-centered">
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
              className="ui-button-icon ui-button-danger"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
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
            <div className="ui-recommendations is-active mt-4 rounded-xl border p-2 sm:p-3">
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
                        <strong>{recommendationDisplay.sourceText}</strong>

                        <span className="ui-text-muted ml-1">
                          · {recommendationDisplay.historyLabel}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {orderedRecommendedTeam.map((hero) => (
                      <span
                        key={hero.id}
                        className="ui-recommendation-hero hover:!border-[var(--ui-theme)]
hover:!bg-[var(--ui-panel-alt)]
hover:!text-[var(--ui-theme-soft)]"
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
                          <strong>{alternativeDisplay.sourceText}</strong>

                          <span className="ui-text-muted ml-1">
                            · {alternativeDisplay.historyLabel}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {orderedAlternativeTeam.map((hero) => (
                        <span
                          key={hero.id}
                          className="ui-recommendation-hero hover:!border-[var(--ui-theme)]
hover:!bg-[var(--ui-panel-alt)]
hover:!text-[var(--ui-theme-soft)]"
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
