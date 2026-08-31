import { useMemo, useState } from "react";
import type { Combat, HeroClassFilter, HeroSort } from "../types";
import type { Hero } from "../data/heroes";
import HeroGrid from "../components/HeroGrid";
import CompactTeam from "../components/CompactTeam";
import { evaluateTeam, calculateHeroUsage } from "../engine/scoring";

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
  const a = [...new Set(first)].sort().join("|");
  const b = [...new Set(second)].sort().join("|");
  return a === b;
}

function formatDate(value?: string): string {
  if (!value) return "Date inconnue";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AnalysisHelp({
  open,
  heroes,
  combats,
  onClose,
  onBack,
}: AnalysisHelpProps) {
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
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
    () => enemyIds.map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero)),
    [enemyIds, heroes]
  );

  const matchingCombats = useMemo(
    () =>
      enemyIds.length === TEAM_SIZE
        ? combats.filter((combat) => sameTeam(enemyIds, combat.enemy_heroes ?? []))
        : [],
    [combats, enemyIds]
  );

  const combatRows = useMemo(() => {
    const usage = calculateHeroUsage(combats, heroes);

    return matchingCombats.map((combat) => {
      const team = (combat.my_heroes ?? [])
        .map((id) => heroes.find((hero) => hero.id === id))
        .filter((hero): hero is Hero => Boolean(hero));

      const evaluation = team.length === TEAM_SIZE
        ? evaluateTeam(team, combats, usage)
        : null;

      return { combat, team, evaluation };
    });
  }, [combats, heroes, matchingCombats]);

  const toggleEnemy = (hero: Hero) => {
    setEnemyIds((current) => {
      if (current.includes(hero.id)) return current.filter((id) => id !== hero.id);
      if (current.length >= TEAM_SIZE) return current;
      return [...current, hero.id];
    });
  };

  const clearEnemies = () => setEnemyIds([]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4">
      <section className="ui-modal flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="analysis-help-title">
        <header className="flex items-start justify-between gap-4 border-b ui-divider p-5 sm:p-6">
          <div>
            <h2 id="analysis-help-title" className="ui-text-primary text-xl font-black">🔎 Aide à l'analyse du moteur</h2>
            <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
              Sélectionnez exactement les 5 ennemis pour analyser tous les combats correspondants.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition" aria-label="Fermer">✕</button>
        </header>

        <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
          <div className="ui-panel-alt rounded-2xl border p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="ui-text-primary text-sm font-black">Équipe ennemie à analyser ({enemyIds.length}/5)</div>
              <button type="button" onClick={clearEnemies} className="ui-action rounded-lg border px-3 py-1.5 text-[10px] font-bold transition">Effacer tout</button>
            </div>
            <CompactTeam title="" heroes={selectedEnemies} selectedIds={enemyIds} enemy compactPortrait />
          </div>

          <div className="mt-4">
            <HeroGrid
              heroes={heroes}
              enabledHeroIds={new Set(heroes.map((hero) => hero.id))}
              activeClass={activeClass}
              query={query}
              sortBy={sortBy}
              usage={heroUsage}
              selectedIds={enemyIds}
              onQueryChange={setQuery}
              onClassChange={setActiveClass}
              onSortChange={setSortBy}
              onHeroClick={toggleEnemy}
            />
          </div>

          <div className="ui-panel-alt mt-5 rounded-2xl border p-3 sm:p-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="ui-text-primary text-base font-black">Combats correspondant exactement</h3>
                <p className="ui-text-secondary mt-1 text-xs">
                  {enemyIds.length < TEAM_SIZE
                    ? "Sélectionnez les 5 ennemis pour lancer l'analyse."
                    : `${matchingCombats.length} combat${matchingCombats.length > 1 ? "s" : ""} trouvé${matchingCombats.length > 1 ? "s" : ""}.`}
                </p>
              </div>
            </div>

            {enemyIds.length === TEAM_SIZE && matchingCombats.length === 0 && (
              <div className="ui-text-muted rounded-xl border ui-divider p-5 text-center text-sm">
                Aucun combat enregistré avec cette composition ennemie exacte.
              </div>
            )}

            {combatRows.length > 0 && (
              <div className="space-y-3">
                {combatRows.map(({ combat, team, evaluation }, index) => (
                  <article key={combat.id ?? `${index}-${combat.created_at ?? "combat"}`} className="ui-action rounded-xl border p-3 sm:p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={combat.won ? "text-emerald-400" : "text-rose-400"}>{combat.won ? "🟢 Victoire" : "🔴 Défaite"}</span>
                        <span className="ui-text-muted text-[10px]">{formatDate(combat.created_at)}</span>
                      </div>
                      <div className="text-right">
                        <div className="ui-text-muted text-[9px] uppercase tracking-wider">Score moteur de l'équipe</div>
                        <div className="ui-text-primary text-lg font-black">{evaluation ? evaluation.score.toFixed(1) : "—"}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                      {team.map((hero) => (
                        <div key={hero.id} className="ui-panel rounded-lg border p-2 text-center">
                          <div className="ui-text-primary text-[10px] font-bold leading-tight sm:text-xs">{hero.name}</div>
                        </div>
                      ))}
                    </div>

                    {evaluation && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
                        <div><span className="ui-text-muted">Historique</span><br /><b>{evaluation.historicalWinRate.toFixed(1)} %</b></div>
                        <div><span className="ui-text-muted">Victoires</span><br /><b>{evaluation.historicalWins}</b></div>
                        <div><span className="ui-text-muted">Combats</span><br /><b>{evaluation.historicalBattles}</b></div>
                        <div><span className="ui-text-muted">Usage</span><br /><b>{evaluation.usageScore.toFixed(1)}</b></div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="flex justify-between gap-2 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onBack} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">← Retour au Admin Panel</button>
          <button type="button" onClick={onClose} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">Fermer</button>
        </footer>
      </section>
    </div>
  );
}
