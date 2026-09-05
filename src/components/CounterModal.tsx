import { useMemo } from "react";

import type { Combat, Hero, HeroClassFilter, HeroSort } from "../types";

import {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
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
  isAuthenticated,
  onClose,
  onHeroClick,
  onQueryChange,
  onClassChange,
  onSortChange,
  onSave,
}: CounterModalProps) {
  if (!open) return null;

  const enemyIds = useMemo(() => enemies.map((hero) => hero.id), [enemies]);
  const currentTeamIds = useMemo(() => team.map((hero) => hero.id), [team]);
  const recommendedIds = useMemo(
    () => recommendedTeam.map((hero) => hero.id),
    [recommendedTeam]
  );

  const currentTeamHistory = useMemo(
    () => evaluateExactTeamHistory(currentTeamIds, enemyIds, combats),
    [currentTeamIds, enemyIds, combats]
  );

  const currentTeamClassHistory = useMemo(
    () => evaluateEnemyClassHistory(currentTeamIds, enemyIds, combats, heroes),
    [currentTeamIds, enemyIds, combats, heroes]
  );

  const currentTeamConfidence = useMemo(() => {
    const battles =
      currentTeamHistory.battles > 0
        ? currentTeamHistory.battles
        : currentTeamClassHistory.battles;

    if (battles <= 0) return 0;

    const confidenceBattles = Math.max(
      1,
      getEngineSettings().advanced.teamAHistoricalConfidenceBattles
    );

    return (battles / (battles + confidenceBattles)) * 100;
  }, [currentTeamHistory.battles, currentTeamClassHistory.battles]);

  const recommendedExactHistory = useMemo(
    () => evaluateExactTeamHistory(recommendedIds, enemyIds, combats),
    [recommendedIds, enemyIds, combats]
  );

  const recommendedClassHistory = useMemo(
    () => evaluateEnemyClassHistory(recommendedIds, enemyIds, combats, heroes),
    [recommendedIds, enemyIds, combats, heroes]
  );

  // B doit chercher une AUTRE équipe ayant déjà gagné contre la même
  // composition de classes que l'ennemi, en excluant les 5 héros de A.
  const historicalClassAlternative = useMemo(() => {
    const primaryIds = new Set(recommendedIds);
    const targetClassKey = recommendedClassHistory.classKey;

    if (!targetClassKey) return null;

    const candidates = new Map<
      string,
      { heroIds: string[]; wins: number; losses: number }
    >();

    for (const combat of combats) {
      const enemyTeam = [...new Set(combat.enemy_heroes ?? [])];
      const myTeam = [...new Set(combat.my_heroes ?? [])];

      if (enemyTeam.length !== 5 || myTeam.length !== 5) continue;
      if (myTeam.some((id) => primaryIds.has(id))) continue;

      const classHistory = evaluateEnemyClassHistory(
        myTeam,
        enemyTeam,
        [combat],
        heroes
      );

      if (classHistory.classKey !== targetClassKey) continue;

      const key = [...myTeam].sort().join("|");
      const candidate = candidates.get(key) ?? {
        heroIds: myTeam,
        wins: 0,
        losses: 0,
      };

      combat.won ? candidate.wins++ : candidate.losses++;
      candidates.set(key, candidate);
    }

    const settings = getEngineSettings();
    const confidenceBattles = Math.max(
      1,
      settings.advanced.teamAHistoricalConfidenceBattles
    );

    const ordered = [...candidates.values()]
      .filter((candidate) => candidate.wins > 0)
      .sort((a, b) => {
        const aBattles = a.wins + a.losses;
        const bBattles = b.wins + b.losses;
        const aConfidence = aBattles / (aBattles + confidenceBattles);
        const bConfidence = bBattles / (bBattles + confidenceBattles);
        const aReliability =
          (a.wins / aBattles) *
          (settings.advanced.teamAHistoricalReliabilityBase +
            settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
              aConfidence);
        const bReliability =
          (b.wins / bBattles) *
          (settings.advanced.teamAHistoricalReliabilityBase +
            settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
              bConfidence);

        return (
          bReliability - aReliability ||
          bBattles - aBattles ||
          b.wins - a.wins ||
          a.heroIds.sort().join("|").localeCompare(b.heroIds.sort().join("|"))
        );
      });

    for (const candidate of ordered) {
      const candidateHeroes = candidate.heroIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero));

      if (candidateHeroes.length === 5) {
        const battles = candidate.wins + candidate.losses;
        return {
          team: candidateHeroes,
          wins: candidate.wins,
          losses: candidate.losses,
          battles,
          winRate: (candidate.wins / battles) * 100,
        };
      }
    }

    return null;
  }, [recommendedIds, recommendedClassHistory.classKey, combats, heroes]);

  const displayAlternativeTeam = historicalClassAlternative?.team ?? alternativeTeam;
  const displayAlternativeIds = useMemo(
    () => displayAlternativeTeam.map((hero) => hero.id),
    [displayAlternativeTeam]
  );

  const alternativeHistory = useMemo(
    () => evaluateExactTeamHistory(displayAlternativeIds, enemyIds, combats),
    [displayAlternativeIds, enemyIds, combats]
  );

  const alternativeClassHistory = useMemo(
    () => evaluateEnemyClassHistory(displayAlternativeIds, enemyIds, combats, heroes),
    [displayAlternativeIds, enemyIds, combats, heroes]
  );

  const currentTeamHistoryLabel =
    currentTeamHistory.battles === 0
      ? currentTeamClassHistory.battles > 0
        ? `Nouvelle équipe · Confiance statistique : ${Math.round(currentTeamConfidence)} %`
        : "Nouvelle équipe"
      : isAuthenticated
        ? `${Math.round(currentTeamHistory.winRate)} % · ${currentTeamHistory.battles} combat${currentTeamHistory.battles > 1 ? "s" : ""}`
        : `${Math.round(currentTeamHistory.winRate)} %`;

  let historyLabel = "Aucune statistique historique affichée";

  if (recommendationSource === "exact-history") {
    historyLabel =
      recommendedExactHistory.battles === 0
        ? "Aucun historique exact"
        : isAuthenticated
          ? `${Math.round(recommendedExactHistory.winRate)} % · ${recommendedExactHistory.battles} combat${recommendedExactHistory.battles > 1 ? "s" : ""}`
          : `${Math.round(recommendedExactHistory.winRate)} %`;
  } else if (recommendationSource === "class-history") {
    historyLabel =
      recommendedClassHistory.battles === 0
        ? "Aucun historique de classes"
        : isAuthenticated
          ? `${Math.round(recommendedClassHistory.winRate)} % · ${recommendedClassHistory.battles} combat${recommendedClassHistory.battles > 1 ? "s" : ""}`
          : `${Math.round(recommendedClassHistory.winRate)} %`;
  }

  const alternativeHistoryLabel =
    historicalClassAlternative
      ? isAuthenticated
        ? `Historique classes · ${Math.round(historicalClassAlternative.winRate)} % · ${historicalClassAlternative.battles} combat${historicalClassAlternative.battles > 1 ? "s" : ""}`
        : "Historique classes"
      : alternativeHistory.battles > 0
        ? isAuthenticated
          ? `${Math.round(alternativeHistory.winRate)} % · ${alternativeHistory.battles} combat${alternativeHistory.battles > 1 ? "s" : ""}`
          : `${Math.round(alternativeHistory.winRate)} %`
        : alternativeClassHistory.battles > 0
          ? isAuthenticated
            ? `Historique classes · ${Math.round(alternativeClassHistory.winRate)} % · ${alternativeClassHistory.battles} combat${alternativeClassHistory.battles > 1 ? "s" : ""}`
            : "Historique classes"
          : "Aucune statistique historique";

  const hasRecommendations =
    recommendedTeam.length > 0 || displayAlternativeTeam.length > 0;

  const recommendationSourceText = recommendationSource
    ? recommendationSourceLabel(recommendationSource)
    : "Source inconnue";

  return (
    <div className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2 backdrop-blur-sm sm:p-4">
      <div className="ui-modal flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        <div className="flex items-center justify-between border-b ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <h2 className="ui-text-primary text-lg font-black sm:text-xl">⚔️ Contre recommandée</h2>
            <p className="ui-text-secondary mt-1 hidden text-xs sm:block">Modifiez les héros proposés si nécessaire.</p>
          </div>
          <button type="button" onClick={onClose} className="ui-action ui-danger flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition" aria-label="Fermer">✕</button>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5">
          <CompactTeam title={`Ennemis (${enemies.length}/5)`} heroes={enemies} selectedIds={enemies.map((hero) => hero.id)} enemy compactPortrait />

          <div className="mt-4">
            <CompactTeam
              title={`Votre équipe (${team.length}/5)`}
              titleRight={team.length === 5 ? currentTeamHistoryLabel : undefined}
              heroes={team}
              selectedIds={teamIds}
              onHeroClick={onHeroClick}
              compactPortrait
            />
          </div>

          {hasRecommendations && (
            <div className="ui-recommendations mt-4 rounded-xl border p-2 sm:p-3">
              {recommendedTeam.length > 0 && (
                <button type="button" onClick={() => onSelectRecommendedTeam(recommendedIds)} className={["ui-recommendation-team", recommendedIds.every((id) => teamIds.includes(id)) ? "ui-recommendation-selected" : ""].join(" ")}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">Recommandation initiale</div>
                    <div className="shrink-0 text-right text-[10px] font-bold sm:text-xs">
                      <span className="hidden sm:inline">{recommendationSourceText}<span className="ui-text-muted ml-1 font-normal">· {historyLabel}</span></span>
                      <span className="sm:hidden">{recommendedExactHistory.battles > 0 ? `${Math.round(recommendedExactHistory.winRate)} %` : recommendedClassHistory.battles > 0 ? `${Math.round(recommendedClassHistory.winRate)} %` : "—"}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">{recommendedTeam.map((hero) => <span key={hero.id} className="ui-recommendation-hero">{hero.name}</span>)}</div>
                </button>
              )}

              {displayAlternativeTeam.length > 0 && (
                <div className={recommendedTeam.length > 0 ? "mt-3 border-t ui-divider pt-3" : ""}>
                  <button type="button" onClick={() => onSelectRecommendedTeam(displayAlternativeIds)} className={["ui-recommendation-team", displayAlternativeIds.every((id) => teamIds.includes(id)) ? "ui-recommendation-selected" : ""].join(" ")}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide sm:text-xs">Alternative</div>
                      <div className="shrink-0 text-right text-[10px] font-bold sm:text-xs">
                        <span className="hidden sm:inline">{alternativeHistoryLabel}</span>
                        <span className="sm:hidden">{alternativeHistory.battles > 0 ? `${Math.round(alternativeHistory.winRate)} %` : alternativeClassHistory.battles > 0 ? `${Math.round(alternativeClassHistory.winRate)} %` : "—"}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">{displayAlternativeTeam.map((hero) => <span key={hero.id} className="ui-recommendation-hero">{hero.name}</span>)}</div>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4"><CombatForm enemies={enemies} myHeroes={team} onSave={onSave} /></div>

          <div className="mt-5">
            <HeroGrid heroes={heroes} enabledHeroIds={enabledHeroIds} activeClass={activeClass} query={query} sortBy={sortBy} usage={usage} selectedIds={teamIds} onQueryChange={onQueryChange} onClassChange={onClassChange} onSortChange={onSortChange} onHeroClick={onHeroClick} />
          </div>
        </div>
      </div>
    </div>
  );
}
