import { useMemo, useState } from "react";
import type { Combat, HeroClassFilter, HeroSort } from "../types";
import type { Hero } from "../data/heroes";
import HeroGrid from "../components/HeroGrid";
import CompactTeam from "../components/CompactTeam";
import { evaluateTeam, calculateHeroUsage } from "../engine/scoring";

interface AnalysisHelpProps { open: boolean; heroes: Hero[]; combats: Combat[]; onClose: () => void; onBack: () => void; }
const TEAM_SIZE = 5;
function sameTeam(first: string[], second: string[]): boolean { if (first.length !== second.length) return false; return [...new Set(first)].sort().join("|") === [...new Set(second)].sort().join("|"); }
function formatDate(value?: string): string { if (!value) return "Date inconnue"; const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date inconnue"; return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }); }

export default function AnalysisHelp({ open, heroes, combats, onClose, onBack }: AnalysisHelpProps) {
  const [enemyIds, setEnemyIds] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HeroSort>("played");

  const heroUsage = useMemo(() => { const usage = calculateHeroUsage(combats, heroes); const result: Record<string, number> = {}; for (const [id, value] of Object.entries(usage)) result[id] = value.total; return result; }, [combats, heroes]);
  const selectedEnemies = useMemo(() => enemyIds.map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero)), [enemyIds, heroes]);
  const matchingCombats = useMemo(() => enemyIds.length === TEAM_SIZE ? combats.filter((combat) => sameTeam(enemyIds, combat.enemy_heroes ?? [])) : [], [combats, enemyIds]);
  const combatRows = useMemo(() => { const usage = calculateHeroUsage(combats, heroes); return matchingCombats.map((combat) => { const team = (combat.my_heroes ?? []).map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero)); const evaluation = team.length === TEAM_SIZE ? evaluateTeam(team, combats, usage) : null; return { combat, team, evaluation }; }); }, [combats, heroes, matchingCombats]);

  const toggleEnemy = (hero: Hero) => { setEnemyIds((current) => { if (current.includes(hero.id)) { setShowResults(false); return current.filter((id) => id !== hero.id); } if (current.length >= TEAM_SIZE) return current; const next = [...current, hero.id]; if (next.length === TEAM_SIZE) setShowResults(true); return next; }); };
  const clearEnemies = () => { setEnemyIds([]); setShowResults(false); };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-2 backdrop-blur-sm sm:p-4">
      <section className="ui-modal flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="analysis-help-title">
        <header className="flex items-start justify-between gap-4 border-b ui-divider p-5 sm:p-6">
          <div><h2 id="analysis-help-title" className="ui-text-primary text-xl font-black">🔎 Aide à l'analyse du moteur</h2><p className="ui-text-secondary mt-1 text-xs sm:text-sm">{showResults ? "Résultats des combats correspondant exactement à l'équipe ennemie." : "Sélectionnez exactement les 5 ennemis à analyser."}</p></div>
          <button type="button" onClick={onClose} className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition" aria-label="Fermer">✕</button>
        </header>

        {!showResults ? (
          <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
            <div className="ui-panel-alt rounded-2xl border p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3"><div className="ui-text-primary text-sm font-black">Équipe ennemie à analyser ({enemyIds.length}/5)</div><button type="button" onClick={clearEnemies} className="ui-action rounded-lg border px-3 py-1.5 text-[10px] font-bold transition">Effacer tout</button></div>
              <CompactTeam title="" heroes={selectedEnemies} selectedIds={enemyIds} enemy compactPortrait />
            </div>
            <div className="mt-4"><HeroGrid heroes={heroes} enabledHeroIds={new Set(heroes.map((hero) => hero.id))} activeClass={activeClass} query={query} sortBy={sortBy} usage={heroUsage} selectedIds={enemyIds} onQueryChange={setQuery} onClassChange={setActiveClass} onSortChange={setSortBy} onHeroClick={toggleEnemy} /></div>
          </div>
        ) : (
          <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
            <div className="ui-panel-alt rounded-2xl border p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="ui-text-primary text-base font-black">Équipe ennemie analysée</div><div className="ui-text-secondary mt-1 text-xs">L'ordre des héros ne compte pas.</div></div><button type="button" onClick={() => setShowResults(false)} className="ui-action rounded-lg border px-3 py-2 text-xs font-bold transition">← Modifier les ennemis</button></div>
              <CompactTeam title="" heroes={selectedEnemies} selectedIds={enemyIds} enemy compactPortrait />
            </div>
            <div className="ui-panel-alt mt-5 rounded-2xl border p-4 sm:p-5">
              <div className="mb-5 grid grid-cols-3 gap-2 text-center">
                <div className="ui-panel rounded-xl border p-3"><div className="ui-text-muted text-[9px] uppercase tracking-wider">Combats</div><div className="ui-text-primary mt-1 text-xl font-black">{matchingCombats.length}</div></div>
                <div className="ui-panel rounded-xl border p-3"><div className="ui-text-muted text-[9px] uppercase tracking-wider">Victoires</div><div className="mt-1 text-xl font-black text-emerald-400">{matchingCombats.filter((combat) => combat.won).length}</div></div>
                <div className="ui-panel rounded-xl border p-3"><div className="ui-text-muted text-[9px] uppercase tracking-wider">Défaites</div><div className="mt-1 text-xl font-black text-rose-400">{matchingCombats.filter((combat) => !combat.won).length}</div></div>
              </div>
              <h3 className="ui-text-primary mb-1 text-lg font-black">Combats correspondant exactement</h3>
              <p className="ui-text-secondary mb-4 text-xs">{matchingCombats.length} combat{matchingCombats.length > 1 ? "s" : ""} trouvé{matchingCombats.length > 1 ? "s" : ""} pour cette composition.</p>
              {matchingCombats.length === 0 ? <div className="ui-text-muted rounded-xl border ui-divider p-6 text-center text-sm">Aucun combat enregistré avec cette composition ennemie exacte.</div> : <div className="space-y-3">{combatRows.map(({ combat, team, evaluation }, index) => <article key={combat.id ?? `${index}-${combat.created_at ?? "combat"}`} className="ui-action rounded-xl border p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={combat.won ? "font-black text-emerald-400" : "font-black text-rose-400"}>{combat.won ? "🏆 Victoire" : "❌ Défaite"}</span><span className="ui-text-muted text-[10px]">{formatDate(combat.created_at)}</span></div><div className="rounded-lg border ui-divider px-3 py-2 text-right"><div className="ui-text-muted text-[9px] uppercase tracking-wider">Score moteur</div><div className="ui-text-primary text-xl font-black">{evaluation ? evaluation.score.toFixed(1) : "—"}</div></div></div>
                <div className="ui-text-primary mb-2 text-xs font-black">Équipe utilisée</div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{team.map((hero) => <div key={hero.id} className="ui-panel rounded-lg border p-2 text-center"><img src={hero.img} alt={hero.name} className="mx-auto mb-1 h-12 w-12 rounded-lg object-cover" /><div className="ui-text-primary text-[10px] font-bold leading-tight sm:text-xs">{hero.name}</div></div>)}</div>
                {evaluation && <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4"><div><span className="ui-text-muted">Taux historique</span><br /><b>{evaluation.historicalWinRate.toFixed(1)} %</b></div><div><span className="ui-text-muted">Victoires</span><br /><b>{evaluation.historicalWins}</b></div><div><span className="ui-text-muted">Combats</span><br /><b>{evaluation.historicalBattles}</b></div><div><span className="ui-text-muted">Score usage</span><br /><b>{evaluation.usageScore.toFixed(1)}</b></div></div>}
              </article>)}</div>}
            </div>
          </div>
        )}

        <footer className="flex justify-between gap-2 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4"><button type="button" onClick={showResults ? () => setShowResults(false) : onBack} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">{showResults ? "← Modifier les ennemis" : "← Retour au Admin Panel"}</button><button type="button" onClick={onClose} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">Fermer</button></footer>
      </section>
    </div>
  );
}
