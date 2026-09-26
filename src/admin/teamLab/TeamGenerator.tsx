import { useState } from "react";
import {
  generateTeams,
  GENERATOR_METRICS,
  getRelaxationLabel,
  TOTAL_FORMATIONS,
  type GeneratorTargets,
  type GeneratorTeam,
} from "./teamGeneratorEngine";

const INITIAL_TARGETS: GeneratorTargets = {
  atk: 8,
  matk: 8,
  def: 6,
  mdef: 6,
  hp: 6,
};

const DISPLAY_LIMIT = 24;

function TeamCard({ team }: { team: GeneratorTeam }) {
  return (
    <article className="ui-card rounded-2xl border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
        {GENERATOR_METRICS.map(({ key, label }) => (
          <div key={key} className="ui-panel-alt rounded-lg border px-1 py-1">
            <div className="ui-text-muted">{label}</div>
            <div className="ui-text-primary font-black">Z{team.zones[key]}</div>
          </div>
        ))}
      </div>
    </article>
  );
}

export default function TeamGenerator() {
  const [targets, setTargets] = useState<GeneratorTargets>(INITIAL_TARGETS);
  const [results, setResults] = useState<GeneratorTeam[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [progress, setProgress] = useState(0);

  const updateTarget = (key: keyof GeneratorTargets, value: number) => {
    setTargets((current) => ({ ...current, [key]: value }));
    setSearched(false);
    setResults([]);
  };

  const handleGenerate = async () => {
    setSearching(true);
    setSearched(false);
    setResults([]);
    setProgress(0);

    try {
      const generated = await generateTeams(targets, ({ checked, total }) => {
        setProgress(Math.round((checked / total) * 100));
      });

      setResults(generated);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="ui-panel rounded-2xl border p-4 sm:p-5">
        <div className="mb-4">
          <h3 className="ui-text-primary text-base font-black">
            Zones recherchées
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Le générateur cherche d&apos;abord les 5 zones exactes, puis élargit
            progressivement les tolérances dans l&apos;ordre ATK → MATK → DEF →
            MDEF → PV. Il passe par exemple de 0 0 0 0 0 à 1 0 0 0 0, puis 1 1 0
            0 0, jusqu&apos;à 1 1 1 1 1, avant de passer à 2 1 1 1 1.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {GENERATOR_METRICS.map(({ key, label }) => (
            <label key={key} className="ui-card rounded-xl border p-3">
              <span className="ui-text-secondary block text-xs font-bold">
                {label}
              </span>
              <select
                value={targets[key]}
                onChange={(event) =>
                  updateTarget(key, Number(event.target.value))
                }
                className="ui-input mt-2 w-full"
                disabled={searching}
              >
                {Array.from({ length: 20 }, (_, index) => index + 1).map(
                  (zone) => (
                    <option key={zone} value={zone}>
                      Z{zone}
                    </option>
                  )
                )}
              </select>
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={searching}
            className="ui-button-success"
          >
            {searching ? "Recherche en cours…" : "Générer les teams"}
          </button>

          <span className="ui-text-muted text-xs">
            {TOTAL_FORMATIONS.toLocaleString("fr-FR")} formations théoriques
            parcourues
          </span>
        </div>

        {searching && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px]">
              <span className="ui-text-secondary">Analyse des formations</span>
              <span className="ui-text-muted">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${progress}%`,
                  background: "var(--ui-theme-primary)",
                }}
              />
            </div>
          </div>
        )}
      </section>

      {searched && (
        <section className="space-y-4">
          {results.length === 0 ? (
            <div className="ui-panel rounded-2xl border p-5">
              <p className="ui-text-primary text-sm font-black">
                Aucune formation trouvée.
              </p>
              <p className="ui-text-secondary mt-1 text-xs">
                Même après avoir élargi progressivement les 5 caractéristiques
                jusqu&apos;à ±19 zones, aucune des 5 461 512 formations ne
                correspond à cette progression.
              </p>
            </div>
          ) : (
            <>
              <div className="ui-panel rounded-2xl border p-4">
                <p className="ui-text-primary text-sm font-black">
                  {results.length.toLocaleString("fr-FR")} formation
                  {results.length > 1 ? "s" : ""} trouvée
                  {results.length > 1 ? "s" : ""}
                </p>
                <p className="ui-text-secondary mt-1 text-xs">
                  Le niveau affiché est le premier niveau de relaxation qui
                  produit un résultat. Les étapes suivantes ne sont pas
                  recherchées.
                </p>
              </div>

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
