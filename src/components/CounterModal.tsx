import { useMemo, type ReactNode } from "react";

import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeamHistory,
} from "../engine/historicalScoring";
import {
  analyzeCore4Plus1,
  type Core4Analysis,
} from "../engine/historicalCore4";
import { findHistoricalDefeatCounters } from "../engine/defeatHistory";
import { getEngineSettings } from "../engine/engineSettings";
import {
  recommendationSourceLabel,
  type RecommendationSource,
} from "../engine/recommendationSource";
import { teamKey } from "../engine/teamUtils";

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

const EMPTY_HISTORY = {
  wins: 0,
  losses: 0,
  battles: 0,
  winRate: 0,
};

function findMatchingCore4(
  teamIds: string[],
  analyses: Core4Analysis[]
): Core4Analysis | null {
  const ids = new Set(teamIds);
  if (ids.size !== 5) return null;

  const matches = analyses.filter((analysis) => {
    if (analysis.coreIds.length !== 4) return false;
    if (!analysis.coreIds.every((id) => ids.has(id))) return false;

    const replacementId = [...ids].find((id) => !analysis.coreIds.includes(id));
    if (!replacementId) return false;

    return analysis.replacements.some(
      (replacement) => replacement.heroId === replacementId
    );
  });

  if (matches.length === 0) return null;

  return [...matches].sort(
    (a, b) =>
      b.winRate - a.winRate ||
      b.battles - a.battles ||
      teamKey(a.coreIds).localeCompare(teamKey(b.coreIds))
  )[0];
}

function formatCount(
  value: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${value} ${value > 1 ? plural : singular}`;
}

function historyLabelWithStats(
  source: string,
  winRate: number,
  battles: number
): ReactNode {
  return (
    <>
      <strong>{source}</strong>
      <span className="font-normal">
        {" · "}
        {Math.round(winRate)} % · {formatCount(battles, "combat")}
      </span>
    </>
  );
}

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
        ? evaluateExactTeamHistory(teamIds, enemyIds, combats)
        : EMPTY_HISTORY,
    [open, teamIds, enemyIds, combats]
  );

  const currentTeamGeneralHistory = useMemo(
    () => (open ? evaluateTeamHistory(teamIds, combats) : EMPTY_HISTORY),
    [open, teamIds, combats]
  );

  const currentTeamClassHistory = useMemo(
    () =>
      open
        ? evaluateEnemyClassHistory(teamIds, enemyIds, combats, heroes)
        : EMPTY_HISTORY,
    [open, teamIds, enemyIds, combats, heroes]
  );

  const currentTeamConfidence = useMemo(() => {
    const battles =
      currentTeamHistory.battles > 0
        ? currentTeamHistory.battles
        : currentTeamClassHistory.battles;

    if (battles <= 0) return 0;

    const confidenceBattles = Math.max(
      1,
      getEngineSettings().advanced.historicalConfidenceBattles
    );

    return (battles / (battles + confidenceBattles)) * 100;
  }, [currentTeamHistory.battles, currentTeamClassHistory.battles]);

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

  const core4Analyses = useMemo(
    () =>
      open && enemyIds.length === 5 ? analyzeCore4Plus1(enemyIds, combats) : [],
    [open, enemyIds, combats]
  );

  const recommendedCore4 = useMemo(
    () => findMatchingCore4(recommendedIds, core4Analyses),
    [recommendedIds, core4Analyses]
  );

  const alternativeCore4 = useMemo(
    () => findMatchingCore4(alternativeIds, core4Analyses),
    [alternativeIds, core4Analyses]
  );

  const recommendedDefeatHistory = useMemo(() => {
    if (!open || recommendedIds.length !== 5) return null;
    return (
      findHistoricalDefeatCounters(enemyIds, combats, heroes).find(
        (candidate) => teamKey(candidate.heroIds) === teamKey(recommendedIds)
      ) ?? null
    );
  }, [open, recommendedIds, enemyIds, combats, heroes]);

  const alternativeDefeatHistory = useMemo(() => {
    if (!open || alternativeIds.length !== 5) return null;
    return (
      findHistoricalDefeatCounters(enemyIds, combats, heroes).find(
        (candidate) => teamKey(candidate.heroIds) === teamKey(alternativeIds)
      ) ?? null
    );
  }, [open, alternativeIds, enemyIds, combats, heroes]);

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

  let historyLabel: ReactNode = "Pas d’historique disponible";

  if (recommendationSource === "exact-history") {
    historyLabel =
      recommendedExactHistory.battles === 0
        ? "Aucun historique exact"
        : canViewDetailedHistory
          ? historyLabelWithStats(
              "Historique exact",
              recommendedExactHistory.winRate,
              recommendedExactHistory.battles
            )
          : "Historique exact";
  } else if (recommendationSource === "class-history") {
    historyLabel =
      recommendedClassHistory.battles === 0
        ? "Aucun historique de classes"
        : canViewDetailedHistory
          ? historyLabelWithStats(
              "Historique classes",
              recommendedClassHistory.winRate,
              recommendedClassHistory.battles
            )
          : "Historique classes";
  } else if (recommendationSource === "core4" && recommendedCore4) {
    const replacementId = recommendedIds.find(
      (id) => !recommendedCore4.coreIds.includes(id)
    );
    const replacement = replacementId
      ? recommendedCore4.replacements.find(
          (entry) => entry.heroId === replacementId
        )
      : undefined;

    historyLabel = canViewDetailedHistory ? (
      <span>
        <strong>Core4</strong>
        <span className="font-normal">
          {" · "}
          {formatCount(recommendedCore4.battles, "combat")} · {recommendedCore4.wins} V · {recommendedCore4.losses} D ·{" "}
          {Math.round(recommendedCore4.winRate)} %
          {replacement && (
            <>
              {" · Remplacement : "}
              {formatCount(replacement.battles, "combat")} · {replacement.wins} V · {replacement.losses} D ·{" "}
              {Math.round(replacement.winRate)} %
            </>
          )}
        </span>
      </span>
    ) : (
      <strong>Core4 : {Math.round(recommendedCore4.winRate)} %</strong>
    );
  } else if (
    recommendationSource === "defeat-history" &&
    recommendedDefeatHistory
  ) {
    historyLabel = canViewDetailedHistory ? (
      <>
        <strong>Historique des défaites</strong>
        <span className="font-normal">
          {" · "}
          {Math.round(recommendedDefeatHistory.counterWinRate * 100)} % · {formatCount(recommendedDefeatHistory.battles, "combat")} · {recommendedDefeatHistory.wins} V / {recommendedDefeatHistory.losses} D
        </span>
      </>
    ) : (
      "Historique des défaites"
    );
  }

  let alternativeHistoryLabel: ReactNode = "Pas d’historique disponible";

  if (alternativeHistory.battles > 0) {
    alternativeHistoryLabel = canViewDetailedHistory ? (
      historyLabelWithStats(
        "Historique exact",
        alternativeHistory.winRate,
        alternativeHistory.battles
      )
    ) : (
      <strong>Historique exact</strong>
    );
  } else if (alternativeClassHistory.battles > 0) {
    alternativeHistoryLabel = canViewDetailedHistory ? (
      historyLabelWithStats(
        "Historique classes",
        alternativeClassHistory.winRate,
        alternativeClassHistory.battles
      )
    ) : (
      <strong>Historique classes</strong>
    );
  } else if (alternativeCore4) {
    const replacementId = alternativeIds.find(
      (id) => !alternativeCore4.coreIds.includes(id)
    );
    const replacement = replacementId
      ? alternativeCore4.replacements.find(
          (entry) => entry.heroId === replacementId
        )
      : undefined;
    alternativeHistoryLabel = canViewDetailedHistory ? (
      <span>
        <strong>Core4</strong>
        <span className="font-normal">
          {" · "}
          {Math.round(alternativeCore4.winRate)} % · {formatCount(alternativeCore4.battles, "combat")}
          {replacement && (
            <>
              {" · Remplacement "}
              {Math.round(replacement.winRate)} % · {formatCount(replacement.battles, "combat")}
            </>
          )}
        </span>
      </span>
    ) : (
      <strong>Core4 · {Math.round(alternativeCore4.winRate)} %</strong>
    );
  } else if (alternativeDefeatHistory) {
    alternativeHistoryLabel = canViewDetailedHistory ? (
      <>
        <strong>Historique des défaites</strong>
        <span className="font-normal">
          {" · "}
          {Math.round(alternativeDefeatHistory.counterWinRate * 100)} % · {formatCount(alternativeDefeatHistory.battles, "combat")}
        </span>
      </>
    ) : (
      <strong>Historique des défaites</strong>
    );
  }

  const recommendationMobileHistoryLabel =
    recommendationSource === "exact-history" &&
    recommendedExactHistory.battles > 0
      ? `${Math.round(recommendedExactHistory.winRate)} %`
      : recommendationSource === "class-history" &&
          recommendedClassHistory.battles > 0
        ? `${Math.round(recommendedClassHistory.winRate)} %`
        : recommendationSource === "core4" && recommendedCore4
          ? `${Math.round(recommendedCore4.winRate)} %`
          : recommendationSource === "defeat-history" &&
              recommendedDefeatHistory
            ? `${Math.round(recommendedDefeatHistory.counterWinRate * 100)} %`
            : null;

  const alternativeMobileHistoryLabel =
    alternativeHistory.battles > 0
      ? `${Math.round(alternativeHistory.winRate)} %`
      : alternativeClassHistory.battles > 0
        ? `${Math.round(alternativeClassHistory.winRate)} %`
        : alternativeCore4
          ? `${Math.round(alternativeCore4.winRate)} %`
          : alternativeDefeatHistory
            ? `${Math.round(alternativeDefeatHistory.counterWinRate * 100)} %`
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
            <div className="ui-panel-alt mt-4 rounded-xl border p-2 sm:p-3">
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
            <CombatForm
              enemies={enemies}
              myTeam={team}
              onSave={onSave}
              canViewDetailedHistory={canViewDetailedHistory}
            />
          </div>

          <HeroGrid
            heroes={heroes}
            selectedIds={teamIds}
            enabledHeroIds={enabledHeroIds}
            activeClass={activeClass}
            query={query}
            sortBy={sortBy}
            usage={usage}
            onHeroClick={onHeroClick}
            onQueryChange={onQueryChange}
            onClassChange={onClassChange}
            onSortChange={onSortChange}
          />
        </div>
      </div>
    </div>
  );
}
