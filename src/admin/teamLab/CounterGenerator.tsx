import { useEffect, useMemo, useState } from "react";
import { HEROES, type Hero } from "../../data/heroes";
import type { Combat } from "../../types";
import { loadCombats } from "../../storage/combatStorage";
import {
  findCounterReferences,
  formatZoneReference,
  type CounterReference,
} from "./counterGeneratorEngine";
import {
  generateTeams,
  getGeneratorCandidateTotal,
  getRelaxationLabel,
  getTeamZones,
  type GeneratorTeam,
} from "./teamGeneratorEngine";

const DISPLAY_LIMIT = 24;

interface CounterGeneratorProps {
  enabledHeroIds: Set<string>;
  requiredHeroIds: Set<string>;
}

function TeamCard({ team }: { team: GeneratorTeam }) {
  return (
    <article className="ui-card rounded-2xl border p-3">
      <div className="mb-3">
        <span className="ui-text-primary text-sm font-black">
          {getRelaxationLabel(team)}
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {team.heroes.map((hero) => (
          <div key={hero.id} className="min-w-0 text-center">
            <img
              src={hero.img}
              alt={hero.name}
              title={hero.name}
              className="mx-auto aspect-square w-full max-w-20 rounded-xl object-cover"
            />
            <p className="ui-text-primary mt-1 truncate text-[11px] font-bold">
              {hero.name}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px]">
        {(["atk", "matk", "def", "mdef", "hp"] as const).map((key) => (
          <div key={key} className="ui-panel-alt rounded-lg border px-1 py-1">
            <div className="ui-text-muted">{key === "hp" ? "PV" : key.toUpperCase()}</div>
            <div className="ui-text-primary font-black">Z{team.zones[key]}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function CounterGenerator({
  enabledHeroIds,
  requiredHeroIds,
}: CounterGeneratorProps) {
  const [enemies, setEnemies] = useState<Hero[]>([]);
  const [query, setQuery] = useState("");
  const [combats, setCombats] = useState<Combat[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<GeneratorTeam[]>([]);
  const [reference, setReference] = useState<CounterReference | null>(null);
  const [progress, setProgress] = useState(0);
  const [neverTestedOnly, setNeverTestedOnly] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const history = await loadCombats();
        if (mounted) setCombats(history);
      } catch (error) {
        console.error("Impossible de charger les combats pour le générateur de contre :", error);
        if (mounted) setCombats([]);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return HEROES.filter((hero) => {
      if (!normalizedQuery) return true;

      return (
        hero.name.toLowerCase().includes(normalizedQuery) ||
        hero.alias.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query, enabledHeroIds]);

  const enemyIds = useMemo(() => enemies.map((hero) => hero.id), [enemies]);

  const toggleEnemy = (hero: Hero) => {
    setSearched(false);
    setResults([]);
    setReference(null);

    setEnemies((current) => {
      if (current.some((item) => item.id === hero.id)) {
        return current.filter((item) => item.id !== hero.id);
      }

      if (current.length >= 5) return current;
      return [...current, hero];
    });
  };

  const availableCounterHeroIds = useMemo(() => {
    const ids = new Set(enabledHeroIds);
    for (const enemyId of enemyIds) {
      ids.delete(enemyId);
    }
    return ids;
  }, [enabledHeroIds, enemyIds]);

  const candidateTotal = getGeneratorCandidateTotal(
    availableCounterHeroIds,
    requiredHeroIds
  );

  const handleGenerate = async () => {
    if (enemies.length !== 5 || exactReferences.length === 0) return;

    setSearching(true);
    setSearched(false);
    setResults([]);
    setReference(null);
    setProgress(0);

    try {
      for (let index = 0; index < exactReferences.length; index++) {
        const currentReference = exactReferences[index];
        setReference(currentReference);

        const generated = await generateTeams(
          currentReference.winningZones,
          availableCounterHeroIds,
          requiredHeroIds,
          neverTestedOnly,
          ({ checked, total }) => {
            const localProgress = total === 0 ? 0 : checked / total;
            const globalProgress =
              ((index + localProgress) / exactReferences.length) * 100;
            setProgress(Math.round(globalProgress));
          }
        );

        if (generated.length > 0) {
          setResults(generated);
          setSearched(true);
          return;
        }
      }

      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="ui-panel rounded-2xl border p-4 sm:p-5">
        <div className="mb-5">
          <h3 className="ui-text-primary text-base font-black">
            Ennemis ({enemies.length}/5)
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Sélectionnez les 5 héros ennemis. Le Lab calcule leurs 5 zones et
            recherche les combats réels où cette formation de zones a été battue.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="ui-card rounded-lg border px-3 py-1.5 text-xs font-bold">
              <span className="ui-text-primary">{combats.length.toLocaleString("fr-FR")}</span>
              <span className="ui-text-muted"> combats analysés</span>
            </span>
            <span
              className="ui-card rounded-lg border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: "var(--ui-theme)" }}
            >
              <span className="ui-text-primary">
                {neverTestedOnly ? "Activé" : "Désactivé"}
              </span>
              <span className="ui-text-muted"> — Formation jamais testée</span>
            </span>
          </div>
        </div>

        <div className="relative">
          <span
            className="ui-text-soft absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          >
            🔍
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un héros..."
            className="ui-input w-full rounded-lg border py-2 pl-10 pr-3 text-sm outline-none"
            disabled={searching}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredHeroes.map((hero) => {
            const selected = enemyIds.includes(hero.id);

            return (
              <button
                key={hero.id}
                type="button"
                onClick={() => toggleEnemy(hero)}
                disabled={searching || (!selected && enemies.length >= 5)}
                className={[
                  "relative overflow-hidden rounded-2xl border text-left transition-all",
                  "ui-card hover:scale-[1.02]",
                  selected ? "ring-2 ring-[var(--ui-theme)]" : "",
                  !selected && enemies.length >= 5 ? "opacity-40" : "",
                ].join(" ")}
              >
                <div className="relative p-2.5">
                  <div className={`relative aspect-square overflow-hidden rounded-xl bg-[var(--ui-bg)]/20 hero-card-wallpaper-${hero.cls.toLowerCase()}`}>
                    <img
                      src={hero.img}
                      alt={hero.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--ui-bg)]/90 to-transparent" />
                    <span className="absolute bottom-2 left-2 right-2 line-clamp-1 text-center text-xs font-bold ui-text-primary drop-shadow-lg">
                      {hero.name}
                    </span>
                    <span
                      className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md ${
                        selected
                          ? "bg-[var(--ui-theme)] text-[var(--ui-bg)]"
                          : "bg-[var(--ui-bg)]/75 text-[var(--ui-text-primary)]/50"
                      }`}
                    >
                      {selected ? "✓" : "○"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ui-panel rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="ui-text-primary text-base font-black">
              Recherche du contre
            </h3>
            <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
              La référence de contre est recherchée dans les combats réels.
              Le générateur réutilise ensuite sa relaxation progressive pour
              trouver une formation jamais testée.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNeverTestedOnly(true)}
              disabled={searching}
              className={neverTestedOnly ? "ui-button is-selected" : "ui-button"}
            >
              Formation jamais testée
            </button>
            <button
              type="button"
              onClick={() => setNeverTestedOnly(false)}
              disabled={searching}
              className={!neverTestedOnly ? "ui-button is-selected" : "ui-button"}
            >
              Autoriser les formations testées
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <p className="ui-text-muted mt-4 text-xs">Chargement des combats…</p>
        ) : enemies.length !== 5 ? (
          <p className="ui-text-muted mt-4 text-xs">
            Sélectionnez exactement 5 ennemis pour lancer la recherche.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="ui-panel-alt rounded-xl border p-4">
              <p className="ui-text-muted text-[11px]">Zones ennemies</p>
              <p className="ui-text-primary mt-1 text-lg font-black">
                {exactReferences.length > 0
                  ? formatZoneReference(exactReferences[0].beatenZones)
                  : enemyZones
                    ? formatZoneReference(enemyZones)
                    : "Aucune référence"}
              </p>
            </div>

            {exactReferences.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {exactReferences.slice(0, 6).map((item, index) => (
                  <div
                    key={`${formatZoneReference(item.winningZones)}-${formatZoneReference(item.beatenZones)}-${index}`}
                    className="ui-card rounded-xl border p-3"
                  >
                    <p className="ui-text-muted text-[11px]">Contre observé</p>
                    <p className="ui-text-primary mt-1 text-sm font-black">
                      {formatZoneReference(item.winningZones)}
                    </p>
                    <p className="ui-text-muted mt-1 text-[11px]">
                      {item.combats} combat{item.combats > 1 ? "s" : ""}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ui-error text-xs">
                Aucun combat enregistré ne possède exactement ces 5 zones comme
                formation battue.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={
                  searching ||
                  exactReferences.length === 0 ||
                  candidateTotal === 0
                }
                className="ui-button ui-button-success"
              >
                {searching ? "Recherche du contre…" : "Générer le contre"}
              </button>

              <span className="ui-text-muted text-xs">
                {candidateTotal.toLocaleString("fr-FR")} formations candidates
              </span>
            </div>

            {searching && (
              <div>
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="ui-text-secondary">
                    Recherche dans les références de contre
                  </span>
                  <span className="ui-text-muted">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/30">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: `${progress}%`,
                      background: "var(--ui-theme)",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {searched && (
        <section className="space-y-4">
          {results.length === 0 ? (
            <div className="ui-panel rounded-2xl border p-5">
              <p className="ui-text-primary text-sm font-black">
                Aucun contre généré.
              </p>
              <p className="ui-text-secondary mt-1 text-xs">
                Les références de zones ont été trouvées, mais aucune formation
                candidate ne correspond à la progression actuelle.
              </p>
            </div>
          ) : (
            <>
              {reference && (
                <div className="ui-panel rounded-2xl border p-4">
                  <p className="ui-text-primary text-sm font-black">
                    Contre basé sur {reference.combats} combat
                    {reference.combats > 1 ? "s" : ""}
                  </p>
                  <p className="ui-text-secondary mt-1 text-xs">
                    Zones gagnantes : {formatZoneReference(reference.winningZones)}
                  </p>
                  <p className="ui-text-secondary mt-1 text-xs">
                    Zones battues : {formatZoneReference(reference.beatenZones)}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {results.slice(0, DISPLAY_LIMIT).map((team, index) => (
                  <TeamCard key={index} team={team} />
                ))}
              </div>

              {results.length > DISPLAY_LIMIT && (
                <p className="ui-text-muted text-center text-xs">
                  Affichage des {DISPLAY_LIMIT} premières formations sur{" "}
                  {results.length.toLocaleString("fr-FR")}.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
