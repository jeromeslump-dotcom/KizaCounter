import { useEffect, useMemo, useState } from "react";

import EnemyPanel from "../../components/EnemyPanel";
import HeroGrid from "../../components/HeroGrid";
import { HEROES } from "../../data/heroes";
import { calculateHeroUsage } from "../../engine/historicalScoring";
import { teamKey } from "../../engine/teamUtils";
import { loadCombats } from "../../storage/combatStorage";
import type { Combat, HeroClassFilter, HeroSort } from "../../types";
import type { Hero } from "../../data/heroes";

const TEAM_SIZE = 5;

interface TeamLabEnemyHistoryProps {
  open: boolean;
  enabledHeroIds: Set<string>;
  step: "A" | "B";
}


function formatCombatDate(createdAt?: string): string {
  if (!createdAt) return "Date inconnue";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function TeamLabEnemyHistory({
  open,
  enabledHeroIds,
  step,
}: TeamLabEnemyHistoryProps) {
  const [combats, setCombats] = useState<Combat[]>([]);
  const [selectedEnemyIds, setSelectedEnemyIds] = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HeroSort>("played");
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

        if (mounted) {
          setCombats(history);
        }
      } catch (loadError) {
        console.error(
          "Impossible de charger l'historique pour le Team Lab :",
          loadError
        );

        if (mounted) {
          setError("Impossible de charger l'historique des combats.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, [open]);

  const heroesById = useMemo(
    () => new Map(HEROES.map((hero) => [hero.id, hero])),
    []
  );

  const heroUsage = useMemo(() => {
    const usage = calculateHeroUsage(combats, HEROES);

    return Object.fromEntries(
      Object.entries(usage).map(([heroId, stats]) => [heroId, stats.total])
    );
  }, [combats]);

  const selectedEnemies = useMemo(
    () =>
      selectedEnemyIds
        .map((heroId) => heroesById.get(heroId))
        .filter((hero): hero is Hero => Boolean(hero)),
    [heroesById, selectedEnemyIds]
  );

  const matchingCombats = useMemo(() => {
    if (selectedEnemyIds.length !== TEAM_SIZE) return [];

    const selectedKey = teamKey(selectedEnemyIds);

    return combats.filter(
      (combat) => teamKey(combat.enemy_heroes) === selectedKey
    );
  }, [combats, selectedEnemyIds]);

  const toggleEnemy = (hero: Hero) => {
    setSelectedEnemyIds((current) => {
      if (current.includes(hero.id)) {
        return current.filter((id) => id !== hero.id);
      }

      if (current.length >= TEAM_SIZE) {
        return current;
      }

      return [...current, hero.id];
    });
  };

  const clearEnemies = () => {
    setSelectedEnemyIds([]);
  };

  return (
    <div className="mt-8 space-y-6">
      {step === "A" && (
        <section className="ui-panel is-active rounded-xl border p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="ui-text-primary text-base font-black">
            Étape A — Sélection ennemis
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Sélectionnez une équipe ennemie de 5 héros. La présentation et les
            filtres sont les mêmes que dans l'écran principal.
          </p>
        </div>

        <EnemyPanel
          heroes={selectedEnemies}
          maxHeroes={TEAM_SIZE}
          onHeroClick={toggleEnemy}
          onClear={clearEnemies}
          compact
        />

        <div className="mt-4">
          <HeroGrid
            heroes={HEROES}
            enabledHeroIds={enabledHeroIds}
            enabledOnly={false}
            activeClass={activeClass}
            query={query}
            sortBy={sortBy}
            usage={heroUsage}
            selectedIds={selectedEnemyIds}
            onQueryChange={setQuery}
            onClassChange={setActiveClass}
            onSortChange={setSortBy}
            onHeroClick={toggleEnemy}
          />
        </div>
        </section>
      )}

      {step === "B" && (
        <section className="ui-panel is-active rounded-xl border p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="ui-text-primary text-base font-black">
            Étape B — Combats historiques contre cette équipe
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Les 5 héros sont comparés sans tenir compte de leur ordre. Les
            combats affichent ensuite l'ordre réellement enregistré.
          </p>
        </div>

        {loading ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
            <p className="ui-text-muted text-sm">
              Chargement de l'historique des combats…
            </p>
          </div>
        ) : error ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
            <p className="ui-text-secondary text-sm">{error}</p>
          </div>
        ) : selectedEnemyIds.length !== TEAM_SIZE ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
            <p className="ui-text-muted text-sm">
              Sélectionnez exactement 5 héros pour afficher les combats
              correspondants.
            </p>
          </div>
        ) : matchingCombats.length === 0 ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
            <p className="ui-text-muted text-sm">
              Aucun combat enregistré contre cette équipe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="ui-panel-alt rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="ui-text-primary text-sm font-bold">
                  {matchingCombats.length} combat
                  {matchingCombats.length !== 1 ? "s" : ""} trouvé
                  {matchingCombats.length !== 1 ? "s" : ""}
                </span>
                <span className="ui-text-muted text-xs">
                  Équipe normalisée : {teamKey(selectedEnemyIds)}
                </span>
              </div>
            </div>

            {matchingCombats.map((combat, index) => {
              return (
                <article
                  key={combat.id ?? `${combat.created_at ?? "combat"}-${index}`}
                  className="ui-card rounded-xl border p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${
                          combat.won
                            ? "text-[var(--ui-success)]"
                            : "text-[var(--ui-theme-secondary)]"
                        }`}
                      >
                        {combat.won ? "WIN" : "LOSS"}
                      </span>
                      <span className="ui-text-muted text-xs">
                        Combat #{index + 1}
                      </span>
                    </div>

                    <span className="ui-text-muted text-xs">
                      {formatCombatDate(combat.created_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="ui-panel-alt rounded-lg border p-3">
                      <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                        Ma team
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {combat.my_heroes.map((heroId) => {
                          const hero = heroesById.get(heroId);
                          return hero ? (
                            <div key={heroId} className="flex items-center gap-2" title={hero.name}>
                              <img
                                src={hero.img}
                                alt={hero.name}
                                className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                              />
                              <span className="ui-text-primary text-xs font-semibold">
                                {hero.name}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    <div className="ui-panel-alt rounded-lg border p-3">
                      <p className="ui-text-muted mb-2 text-[10px] font-bold uppercase tracking-wide">
                        Ordre ennemi enregistré
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {combat.enemy_heroes.map((heroId) => {
                          const hero = heroesById.get(heroId);
                          return hero ? (
                            <div key={heroId} className="flex items-center gap-2" title={hero.name}>
                              <img
                                src={hero.img}
                                alt={hero.name}
                                className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                              />
                              <span className="ui-text-primary text-xs font-semibold">
                                {hero.name}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        </section>
      )}
    </div>
  );
}
