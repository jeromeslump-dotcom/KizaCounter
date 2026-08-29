import { useEffect, useMemo, useState } from "react";

import { HEROES } from "../data/heroes";
import type { Combat, Hero } from "../types";
import { loadCombats } from "../storage/combatStorage";

interface EncounteredTeamsProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

interface EncounteredTeam {
  heroIds: string[];
  total: number;
  losses: number;
  lossRate: number;
  score: number;
}

const MIN_COMBATS = 5;
const MAX_TEAMS = 100;

const HERO_BY_ID = new Map(HEROES.map((hero) => [hero.id, hero]));

function teamKey(heroIds: string[]) {
  return [...heroIds].sort().join("|");
}

function getHero(heroId: string): Hero | undefined {
  return HERO_BY_ID.get(heroId);
}

export default function EncounteredTeams({
  open,
  onClose,
  onBack,
}: EncounteredTeamsProps) {
  const [combats, setCombats] = useState<Combat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    async function loadHistory() {
      setLoading(true);
      setError(null);

      try {
        const history = await loadCombats();
        if (mounted) setCombats(history);
      } catch (loadError) {
        console.error("Impossible de charger les équipes rencontrées :", loadError);
        if (mounted) setError("Impossible de charger les équipes rencontrées.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [open]);

  const rankedTeams = useMemo<EncounteredTeam[]>(() => {
    const grouped = new Map<string, EncounteredTeam>();

    for (const combat of combats) {
      const heroIds = Array.isArray(combat.enemy_heroes)
        ? combat.enemy_heroes.filter(Boolean)
        : [];

      if (heroIds.length !== 5) continue;

      const key = teamKey(heroIds);
      const existing = grouped.get(key);

      if (existing) {
        existing.total += 1;
        if (!combat.won) existing.losses += 1;
      } else {
        grouped.set(key, {
          heroIds: [...heroIds],
          total: 1,
          losses: combat.won ? 0 : 1,
          lossRate: 0,
          score: 0,
        });
      }
    }

    return [...grouped.values()]
      .filter((team) => team.total >= MIN_COMBATS)
      .map((team) => {
        const lossRate = team.losses / team.total;
        return {
          ...team,
          lossRate,
          score: lossRate * Math.sqrt(team.total),
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.total !== a.total) return b.total - a.total;
        return teamKey(a.heroIds).localeCompare(teamKey(b.heroIds));
      })
      .slice(0, MAX_TEAMS);
  }, [combats]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="encountered-teams-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="encountered-teams-title" className="ui-text-primary text-xl font-black">
                ⚔️ Équipes rencontrées
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Compositions ennemies classées selon leur difficulté
              </p>
              <p className="ui-text-soft mt-1 text-[11px]">
                Minimum {MIN_COMBATS} combats pour apparaître dans le classement.
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
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="ui-text-soft py-12 text-center text-sm">
              Chargement des équipes rencontrées...
            </p>
          ) : error ? (
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : rankedTeams.length === 0 ? (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucune équipe ne possède encore {MIN_COMBATS} combats ou plus.
            </p>
          ) : (
            <div className="space-y-3">
              {rankedTeams.map((team, index) => {
                const lossPercentage = team.lossRate * 100;

                return (
                  <article key={teamKey(team.heroIds)} className="ui-action rounded-2xl border p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ui-divider text-sm font-black">
                          #{index + 1}
                        </div>

                        <div className="grid min-w-0 grid-cols-5 gap-2 sm:gap-3">
                          {team.heroIds.map((heroId) => {
                            const hero = getHero(heroId);

                            return (
                              <div key={heroId} className="flex min-w-0 flex-col items-center gap-1.5" title={hero?.name ?? heroId}>
                                <div className="h-14 w-14 overflow-hidden rounded-lg border ui-divider sm:h-16 sm:w-16">
                                  {hero ? (
                                    <img src={hero.img} alt={hero.name} loading="lazy" className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="ui-text-soft flex h-full w-full items-center justify-center text-[9px]">?</div>
                                  )}
                                </div>
                                <span className="ui-text-primary max-w-20 truncate text-center text-[10px] font-bold sm:text-[11px]">
                                  {hero?.name ?? heroId}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-x-5 gap-y-2 border-t ui-divider pt-3 text-xs sm:grid-cols-4 lg:min-w-[390px] lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
                        <div>
                          <div className="ui-text-soft">Combats</div>
                          <div className="ui-text-primary mt-0.5 font-black">{team.total}</div>
                        </div>
                        <div>
                          <div className="ui-text-soft">Défaites</div>
                          <div className="ui-text-primary mt-0.5 font-black">{team.losses}</div>
                        </div>
                        <div>
                          <div className="ui-text-soft">Défaites</div>
                          <div className="mt-0.5 font-black text-red-400">{lossPercentage.toFixed(1)}%</div>
                        </div>
                        <div>
                          <div className="ui-text-soft">Score</div>
                          <div className="ui-text-primary mt-0.5 font-black">{team.score.toFixed(3)}</div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <span className="ui-text-soft text-xs">
            {rankedTeams.length} équipe{rankedTeams.length > 1 ? "s" : ""} différente{rankedTeams.length > 1 ? "s" : ""}
          </span>
          <button type="button" onClick={onBack} className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition">
            Retour au Admin Panel
          </button>
        </footer>
      </section>
    </div>
  );
}
