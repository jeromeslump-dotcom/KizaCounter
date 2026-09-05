import type { Hero } from "../data/heroes";
import CompactTeam from "../components/CompactTeam";
import type { TeamEvaluation } from "../types";

export interface HeroEvaluationGroup {
  team: Hero[];
  evaluation: TeamEvaluation | null;
  scoreA: number | null;
  scoreB: number | null;
  count: number;
  wins: number;
  losses: number;
  latestDate?: string;
}

interface AnalysisHelpResultsProps {
  selectedEnemies: Hero[];
  enemyIds: string[];
  matchingCombats: Array<{ won: boolean }>;
  combatGroups: HeroEvaluationGroup[];
  onEdit: () => void;
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

function teamKey(ids: string[]): string {
  return [...new Set(ids)].sort().join("|");
}

export default function AnalysisHelpResults({
  selectedEnemies,
  enemyIds,
  matchingCombats,
  combatGroups,
  onEdit,
}: AnalysisHelpResultsProps) {
  return (
    <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
      <div className="ui-panel-alt rounded-2xl border p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="ui-text-primary text-base font-black">
              Équipe ennemie analysée
            </div>
            <div className="ui-text-secondary mt-1 text-xs">
              L'ordre des héros ne compte pas.
            </div>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="ui-action rounded-lg border px-3 py-2 text-xs font-bold transition"
          >
            ← Modifier les ennemis
          </button>
        </div>
        <CompactTeam
          title=""
          heroes={selectedEnemies}
          selectedIds={enemyIds}
          enemy
          compactPortrait
        />
      </div>

      <div className="ui-panel-alt mt-5 rounded-2xl border p-4 sm:p-5">
        <div className="mb-5 grid grid-cols-3 gap-2 text-center">
          <div className="ui-panel rounded-xl border p-3">
            <div className="ui-text-muted text-[9px] uppercase tracking-wider">
              Combats
            </div>
            <div className="ui-text-primary mt-1 text-xl font-black">
              {matchingCombats.length}
            </div>
          </div>
          <div className="ui-panel rounded-xl border p-3">
            <div className="ui-text-muted text-[9px] uppercase tracking-wider">
              Victoires
            </div>
            <div className="mt-1 text-xl font-black text-emerald-400">
              {matchingCombats.filter((combat) => combat.won).length}
            </div>
          </div>
          <div className="ui-panel rounded-xl border p-3">
            <div className="ui-text-muted text-[9px] uppercase tracking-wider">
              Défaites
            </div>
            <div className="mt-1 text-xl font-black text-rose-400">
              {matchingCombats.filter((combat) => !combat.won).length}
            </div>
          </div>
        </div>

        <h3 className="ui-text-primary mb-1 text-lg font-black">
          Combats correspondant exactement
        </h3>
        <p className="ui-text-secondary mb-4 text-xs">
          {matchingCombats.length} combat{matchingCombats.length > 1 ? "s" : ""}{" "}
          trouvé{matchingCombats.length > 1 ? "s" : ""} pour cette composition.
          Les combats avec la même équipe sont regroupés.
        </p>

        {matchingCombats.length === 0 ? (
          <div className="ui-text-muted rounded-xl border ui-divider p-6 text-center text-sm">
            Aucun combat enregistré avec cette composition ennemie exacte.
          </div>
        ) : (
          <div className="space-y-3">
            {combatGroups.map(
              (
                {
                  team,
                  evaluation,
                  scoreA,
                  scoreB,
                  count,
                  wins,
                  losses,
                  latestDate,
                },
                index
              ) => (
                <article
                  key={`${teamKey(team.map((hero) => hero.id))}-${index}`}
                  className="ui-action rounded-xl border p-3 sm:p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black">
                        {wins > 0 && losses === 0
                          ? "🏆 Victoire"
                          : wins === 0
                            ? "❌ Défaite"
                            : "⚔️ Mixte"}
                      </span>
                      <span className="ui-text-muted text-[10px]">
                        Dernier combat : {formatDate(latestDate)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="rounded-lg border ui-divider px-3 py-2 text-right">
                        <div className="ui-text-muted text-[9px] uppercase tracking-wider">
                          Score moteur A
                        </div>
                        <div className="ui-text-primary text-xl font-black">
                          {scoreA !== null ? scoreA.toFixed(1) : "—"}
                        </div>
                      </div>
                      <div className="rounded-lg border ui-divider px-3 py-2 text-right">
                        <div className="ui-text-muted text-[9px] uppercase tracking-wider">
                          Score moteur B
                        </div>
                        <div className="ui-text-primary text-xl font-black">
                          {scoreB !== null ? scoreB.toFixed(1) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ui-text-primary mb-2 text-xs font-black">
                    Équipe utilisée
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {team.map((hero) => (
                      <div
                        key={hero.id}
                        className="ui-panel rounded-lg border p-2 text-center"
                      >
                        <img
                          src={hero.img}
                          alt={hero.name}
                          className="mx-auto mb-1 h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="ui-text-primary text-[10px] font-bold leading-tight sm:text-xs">
                          {hero.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {evaluation && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px]">
                      <span className="ui-text-primary font-black">
                        ×{count} combats
                      </span>
                      <span>
                        <span className="ui-text-muted">Victoires</span>{" "}
                        <b>{wins}</b>
                      </span>
                      <span>
                        <span className="ui-text-muted">Défaites</span>{" "}
                        <b>{losses}</b>
                      </span>
                      <span>
                        <span className="ui-text-muted">Taux historique</span>{" "}
                        <b>{evaluation.historicalWinRate.toFixed(1)} %</b>
                      </span>
                    </div>
                  )}
                </article>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
