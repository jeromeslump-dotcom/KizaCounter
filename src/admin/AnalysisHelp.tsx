import { useMemo, useState } from "react";
import type { Combat, HeroClassFilter, HeroSort } from "../types";
import type { Hero } from "../data/heroes";
import { evaluateTeam, calculateHeroUsage } from "../engine/scoring";
import { getEngineSettings } from "../engine/engineSettings";
import AnalysisHelpEnemySelection from "./AnalysisHelpEnemySelection";
import AnalysisHelpResults, {
  type HeroEvaluationGroup,
} from "./AnalysisHelpResults";

interface AnalysisHelpProps {
  open: boolean;
  heroes: Hero[];
  combats: Combat[];
  onClose: () => void;
  onBack: () => void;
}

const TEAM_SIZE = 5;

function sameTeam(first: string[], second: string[]): boolean {
  if (first.length !== second.length) return false;
  return (
    [...new Set(first)].sort().join("|") ===
    [...new Set(second)].sort().join("|")
  );
}

function teamKey(ids: string[]): string {
  return [...new Set(ids)].sort().join("|");
}

export default function AnalysisHelp({
  open,
  heroes,
  combats,
  onClose,
  onBack,
}: AnalysisHelpProps) {
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HeroSort>("played");

  const heroUsage = useMemo(() => {
    const usage = calculateHeroUsage(combats, heroes);
    const result: Record<string, number> = {};
    for (const [id, value] of Object.entries(usage)) result[id] = value.total;
    return result;
  }, [combats, heroes]);

  const selectedEnemies = useMemo(
    () =>
      enemyIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds, heroes]
  );

  const matchingCombats = useMemo(
    () =>
      enemyIds.length === TEAM_SIZE
        ? combats.filter((combat) =>
            sameTeam(enemyIds, combat.enemy_heroes ?? [])
          )
        : [],
    [combats, enemyIds]
  );

  const combatGroups = useMemo<HeroEvaluationGroup[]>(() => {
    const usage = calculateHeroUsage(combats, heroes);
    const settings = getEngineSettings();
    const groups = new Map<string, HeroEvaluationGroup>();

    for (const combat of matchingCombats) {
      const heroIds = [...new Set(combat.my_heroes ?? [])];
      if (heroIds.length !== TEAM_SIZE) continue;

      const key = teamKey(heroIds);
      const existing = groups.get(key);
      const team = heroIds
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero));
      const evaluation =
        team.length === TEAM_SIZE
          ? evaluateTeam(team, combats, usage, enemyIds)
          : null;
      const scoreA = evaluation
        ? evaluation.historicalWinRate * settings.teamA.generalWinRateWeight
        : null;
      const scoreB = evaluation
        ? evaluation.historicalWinRate * settings.teamB.generalWinRateWeight
        : null;

      if (existing) {
        existing.count += 1;
        if (combat.won) existing.wins += 1;
        else existing.losses += 1;
        if (
          !existing.latestDate ||
          (combat.created_at ?? "") > existing.latestDate
        )
          existing.latestDate = combat.created_at;
      } else {
        groups.set(key, {
          team,
          evaluation,
          scoreA,
          scoreB,
          count: 1,
          wins: combat.won ? 1 : 0,
          losses: combat.won ? 0 : 1,
          latestDate: combat.created_at,
        });
      }
    }

    return [...groups.values()].sort((a, b) => {
      const scoreA = a.scoreA ?? -Infinity;
      const scoreB = b.scoreA ?? -Infinity;
      return (
        scoreB - scoreA ||
        b.wins - a.wins ||
        b.count - a.count ||
        (b.latestDate ?? "").localeCompare(a.latestDate ?? "")
      );
    });
  }, [combats, heroes, matchingCombats, enemyIds]);

  const toggleEnemy = (hero: Hero) => {
    setEnemyIds((current) => {
      if (current.includes(hero.id)) {
        setShowResults(false);
        return current.filter((id) => id !== hero.id);
      }
      if (current.length >= TEAM_SIZE) return current;
      const next = [...current, hero.id];
      if (next.length === TEAM_SIZE) setShowResults(true);
      return next;
    });
  };

  const clearEnemies = () => {
    setEnemyIds([]);
    setShowResults(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4">
      <section
        className="ui-modal flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-help-title"
      >
        <header className="flex items-start justify-between gap-4 border-b ui-divider p-5 sm:p-6">
          <div>
            <h2
              id="analysis-help-title"
              className="ui-text-primary text-xl font-black"
            >
              🔎 Aide à l'analyse du moteur
            </h2>
            <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
              {showResults
                ? "Résultats des combats correspondant exactement à l'équipe ennemie."
                : "Sélectionnez exactement les 5 ennemis à analyser."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition"
            aria-label="Fermer"
          >
            ✕
          </button>
        </header>

        {!showResults ? (
          <AnalysisHelpEnemySelection
            heroes={heroes}
            selectedEnemies={selectedEnemies}
            enemyIds={enemyIds}
            heroUsage={heroUsage}
            activeClass={activeClass}
            query={query}
            sortBy={sortBy}
            onQueryChange={setQuery}
            onClassChange={setActiveClass}
            onSortChange={setSortBy}
            onHeroClick={toggleEnemy}
            onClear={clearEnemies}
          />
        ) : (
          <AnalysisHelpResults
            selectedEnemies={selectedEnemies}
            enemyIds={enemyIds}
            matchingCombats={matchingCombats}
            combatGroups={combatGroups}
            onEdit={() => setShowResults(false)}
          />
        )}

        <footer className="flex justify-between gap-2 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={showResults ? () => setShowResults(false) : onBack}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            {showResults ? "← Modifier les ennemis" : "← Retour au Admin Panel"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
