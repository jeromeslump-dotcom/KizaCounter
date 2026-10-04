import { HEROES, type Hero } from "../data/heroes";
import type { Combat } from "../types";
import type { PositionHeroRanking } from "./teamByPosition/teamByPositionAnalysis";
import HeroListItem from "../components/HeroListItem";
import CompactTeam from "../components/CompactTeam";

export interface HeroEvaluationGroup {
  team: Hero[];
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
  positionRankings: PositionHeroRanking[][];
  knownOrderedMatchingCombats: Combat[];
  teamOrdersLoading: boolean;
  onEdit: () => void;
}

function heroName(heroId: string): string {
  return HEROES.find((hero) => hero.id === heroId)?.name ?? heroId;
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
  positionRankings,
  knownOrderedMatchingCombats,
  teamOrdersLoading,
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
          <button type="button" onClick={onEdit} className="ui-button-sm">
            ← Modifier les ennemis
          </button>
        </div>
        <CompactTeam
          title=""
          heroes={selectedEnemies}
          selectedIds={enemyIds}
          enemy
/>
      </div>

      <div className="ui-panel-alt mt-5 rounded-2xl border p-4 sm:p-5">
        <h3 className="ui-text-primary text-lg font-black">
          🧪 Croisement avec Team par position
        </h3>
        <p className="ui-text-secondary mb-4 mt-1 text-xs">
          L'historique exact de cette équipe ennemie est croisé avec le
          classement global des héros par position. Seuls les combats avec
          « ✓ Ordre connu » sont utilisés pour le croisement.
        </p>

        {teamOrdersLoading ? (
          <div className="ui-text-muted rounded-xl border border-dashed p-4 text-center text-xs">
            ⏳ Vérification des ordres connus…
          </div>
        ) : knownOrderedMatchingCombats.length === 0 ? (
          <div className="ui-text-muted rounded-xl border border-dashed p-4 text-center text-xs">
            Aucun combat correspondant avec « ✓ Ordre connu ». Le croisement
            positionnel n'est pas encore possible.
          </div>
        ) : (
          <div className="space-y-3">
            {positionRankings.map((rankings, position) => {
              const used = new Set(
                knownOrderedMatchingCombats
                  .map((combat) => combat.my_heroes[position])
                  .filter(Boolean)
              );

              const losses = new Map<string, number>();
              for (const combat of knownOrderedMatchingCombats) {
                if (!combat.won) {
                  const heroId = combat.my_heroes[position];
                  if (heroId) losses.set(heroId, (losses.get(heroId) ?? 0) + 1);
                }
              }

              const rankedUntriedIndex = rankings.findIndex(
                (ranking) => !used.has(ranking.heroId)
              );
              const rankedUntried =
                rankedUntriedIndex >= 0 ? rankings[rankedUntriedIndex] : null;

              return (
                <article
                  key={position}
                  className="ui-card rounded-xl border p-3 sm:p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="ui-text-primary text-sm font-black">
                        Position {position + 1}
                      </div>
                      <div className="ui-text-muted mt-1 text-[10px]">
                        {knownOrderedMatchingCombats.length} combat
                        {knownOrderedMatchingCombats.length > 1 ? "s" : ""} avec
                        ordre connu
                      </div>
                    </div>

                    {rankedUntried ? (
                      <div className="rounded-lg border p-2 text-right">
                        <div className="ui-text-muted text-[9px] uppercase">
                          Meilleur héros jamais essayé
                        </div>
                        <div className="ui-text-primary text-sm font-black">
                          #{rankedUntriedIndex + 1} {heroName(rankedUntried.heroId)}
                        </div>
                        <div className="ui-text-muted text-[9px]">
                          classement Team par position · score{" "}
                          {rankedUntried.score > 0
                            ? `+${rankedUntried.score}`
                            : rankedUntried.score}
                        </div>
                      </div>
                    ) : (
                      <div className="ui-text-muted rounded-lg border p-2 text-[10px]">
                        Tous les héros classés ont été essayés
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {losses.size > 0 ? (
                      [...losses.entries()]
                        .map(([heroId, count]) => ({
                          heroId,
                          count,
                          rank: rankings.findIndex(
                            (ranking) => ranking.heroId === heroId
                          ),
                        }))
                        .sort(
                          (a, b) =>
                            (a.rank < 0 ? Number.MAX_SAFE_INTEGER : a.rank) -
                            (b.rank < 0 ? Number.MAX_SAFE_INTEGER : b.rank)
                        )
                        .map(({ heroId, count, rank }) => (
                          <div
                            key={heroId}
                            className="ui-danger rounded-lg border p-2 text-xs"
                          >
                            ❌ Défaite avec{" "}
                            <strong>{heroName(heroId)}</strong> en position{" "}
                            {position + 1}
                            {rank >= 0 ? (
                              <span className="ui-text-muted">
                                {" "}· classé #{rank + 1} dans cette position
                              </span>
                            ) : null}
                            {count > 1 ? ` · ${count} défaites` : ""}
                          </div>
                        ))
                    ) : (
                      <div className="ui-text-muted text-[10px]">
                        Aucune défaite connue avec ordre enregistré en cette
                        position.
                      </div>
                    )}

                    {rankedUntried ? (
                      <div className="ui-success rounded-lg border p-2 text-xs">
                        💡 <strong>{heroName(rankedUntried.heroId)}</strong> est
                        classé <strong>#{rankedUntriedIndex + 1}</strong> en
                        position {position + 1} et n'a jamais été essayé contre
                        cette équipe ennemie.
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
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
            <div className="ui-success mt-1 text-xl font-black">
              {matchingCombats.filter((combat) => combat.won).length}
            </div>
          </div>
          <div className="ui-panel rounded-xl border p-3">
            <div className="ui-text-muted text-[9px] uppercase tracking-wider">
              Défaites
            </div>
            <div className="ui-danger mt-1 text-xl font-black">
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
              ({ team, count, wins, losses, latestDate }, index) => (
                <article
                  key={`${teamKey(team.map((hero) => hero.id))}-${index}`}
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
                        <HeroListItem hero={hero} size="standard" />
                      </div>
                    ))}
                  </div>

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
                      <span className="ui-text-muted">Taux de victoire</span>{" "}
                      <b>
                        {count > 0 ? ((wins / count) * 100).toFixed(1) : "0.0"}{" "}
                        %
                      </b>
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
