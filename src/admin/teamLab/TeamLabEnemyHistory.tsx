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
  step: "A" | "B" | "C";
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
                              <span className="ui-text-primary text-center text-[11px] font-semibold leading-tight">
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
                              <span className="ui-text-primary text-center text-[11px] font-semibold leading-tight">
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


      {step === "C" && (
        <section className="ui-panel is-active rounded-xl border p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="ui-text-primary text-base font-black">
              Étape C — Classement par 4 héros identiques + 5e héros
            </h3>
            <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
              Les teams jouées dans les combats de l'étape B sont regroupées
              par noyau de 4 héros communs. Le 5e héros est affiché comme
              variante, avec le nombre de WIN et LOSS.
            </p>
          </div>

          {selectedEnemyIds.length !== TEAM_SIZE ? (
            <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
              <p className="ui-text-muted text-sm">
                Sélectionnez d'abord 5 héros ennemis dans l'étape A.
              </p>
            </div>
          ) : matchingCombats.length === 0 ? (
            <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
              <p className="ui-text-muted text-sm">
                Aucun combat à classer.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {(() => {
                const groups = new Map<
                  string,
                  {
                    coreIds: string[];
                    variants: Map<
                      string,
                      { hero: Hero; wins: number; losses: number }
                    >;
                  }
                >();

                for (const combat of matchingCombats) {
                  for (let removedIndex = 0; removedIndex < TEAM_SIZE; removedIndex++) {
                    const coreIds = combat.my_heroes
                      .filter((_, index) => index !== removedIndex)
                      .sort();
                    const coreKey = coreIds.join("|");
                    const fifthId = combat.my_heroes[removedIndex];
                    const fifth = heroesById.get(fifthId);
                    if (!fifth) continue;

                    const group = groups.get(coreKey) ?? {
                      coreIds,
                      variants: new Map(),
                    };

                    const variant = group.variants.get(fifth.id) ?? {
                      hero: fifth,
                      wins: 0,
                      losses: 0,
                    };

                    if (combat.won) variant.wins++;
                    else variant.losses++;

                    group.variants.set(fifth.id, variant);
                    groups.set(coreKey, group);
                  }
                }

                return Array.from(groups.values())
                  .sort((a, b) => {
                    const totalA = Array.from(a.variants.values()).reduce(
                      (sum, variant) => sum + variant.wins + variant.losses,
                      0
                    );
                    const totalB = Array.from(b.variants.values()).reduce(
                      (sum, variant) => sum + variant.wins + variant.losses,
                      0
                    );
                    return totalB - totalA;
                  })
                  .map(({ coreIds, variants }) => (
                    <section
                      key={coreIds.join("|")}
                      className="ui-card rounded-xl border p-4"
                    >
                      <h4 className="ui-text-primary mb-3 text-sm font-black">
                        Noyau de 4 héros
                      </h4>

                      <div className="mb-4 flex flex-wrap gap-2">
                        {coreIds.map((heroId) => {
                          const hero = heroesById.get(heroId);
                          return hero ? (
                            <div
                              key={heroId}
                              className="flex w-16 flex-col items-center gap-1"
                            >
                              <img
                                src={hero.img}
                                alt={hero.name}
                                className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                              />
                              <span className="ui-text-primary text-center text-[10px] font-semibold leading-tight">
                                {hero.name}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="ui-text-muted border-b border-white/10">
                              <th className="px-2 py-2">5e héros</th>
                              <th className="px-2 py-2 text-center">WIN</th>
                              <th className="px-2 py-2 text-center">LOSS</th>
                              <th className="px-2 py-2 text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(variants.values())
                              .sort(
                                (a, b) =>
                                  b.wins +
                                  b.losses -
                                  (a.wins + a.losses)
                              )
                              .map((variant) => (
                                <tr
                                  key={variant.hero.id}
                                  className="border-b border-white/5 last:border-0"
                                >
                                  <td className="px-2 py-2">
                                    <div className="flex items-center gap-2">
                                      <img
                                        src={variant.hero.img}
                                        alt={variant.hero.name}
                                        className="h-9 w-9 rounded-md border border-white/10 object-cover"
                                      />
                                      <span className="ui-text-primary font-semibold">
                                        {variant.hero.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-2 text-center font-bold">
                                    {variant.wins}
                                  </td>
                                  <td className="px-2 py-2 text-center font-bold">
                                    {variant.losses}
                                  </td>
                                  <td className="px-2 py-2 text-center font-bold">
                                    {variant.wins + variant.losses}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ));
              })()}              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
