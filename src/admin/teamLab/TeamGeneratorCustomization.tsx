import { useMemo, useState } from "react";
import { HEROES } from "../../data/heroes";

interface TeamGeneratorCustomizationProps {
  enabledHeroIds: Set<string>;
  requiredHeroIds: Set<string>;
  neverTestedOnly: boolean;
  onNeverTestedChange: (enabled: boolean) => void;
  onRequiredChange: (heroIds: Set<string>) => void;
}

export default function TeamGeneratorCustomization({
  enabledHeroIds,
  requiredHeroIds,
  neverTestedOnly,
  onNeverTestedChange,
  onRequiredChange,
}: TeamGeneratorCustomizationProps) {
  const [query, setQuery] = useState("");

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) return HEROES;

    return HEROES.filter(
      (hero) =>
        hero.name.toLowerCase().includes(normalizedQuery) ||
        hero.alias.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  const toggleRequired = (heroId: string) => {
    if (!enabledHeroIds.has(heroId)) return;

    const next = new Set(requiredHeroIds);

    if (next.has(heroId)) {
      next.delete(heroId);
    } else if (next.size < 5) {
      next.add(heroId);
    }

    onRequiredChange(next);
  };

  return (
    <div className="space-y-5">
      <section className="ui-panel rounded-2xl border p-4 sm:p-5">
        <div className="mb-5">
          <h3 className="ui-text-primary text-base font-black">Formation jamais testée</h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Lorsque cette option est activée, le générateur exclut les formations de 5 héros déjà présentes dans l&apos;historique.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNeverTestedChange(true)}
              className={neverTestedOnly ? "ui-button-success" : "ui-button"}
            >
              Formation jamais testée : activé
            </button>
            <button
              type="button"
              onClick={() => onNeverTestedChange(false)}
              className={!neverTestedOnly ? "ui-button-success" : "ui-button"}
            >
              Formation jamais testée : désactivé
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--ui-border)] pt-5">
        <div className="mb-4">
          <h3 className="ui-text-primary text-base font-black">
            Héros disponibles
          </h3>
          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            Le générateur utilise automatiquement les héros activés dans
            « Gérer les héros ». Les héros désactivés ne peuvent jamais être
            proposés.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="ui-card rounded-lg border px-3 py-1.5 text-xs font-bold">
              <span className="ui-text-primary">{enabledHeroIds.size}</span>
              <span className="ui-text-muted"> / {HEROES.length} héros disponibles</span>
            </span>

            <span className="ui-card rounded-lg border px-3 py-1.5 text-xs font-bold">
              <span className="ui-text-primary">{requiredHeroIds.size}</span>
              <span className="ui-text-muted">
                {" "}
                héros obligatoire{requiredHeroIds.size > 1 ? "s" : ""}
              </span>
            </span>
          </div>
        </div>

        <div className="ui-panel-alt rounded-xl border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="ui-text-primary text-sm font-black">
                Héros obligatoires
              </h4>
              <p className="ui-text-secondary mt-1 text-xs">
                Sélectionnez jusqu&apos;à 5 héros qui doivent obligatoirement
                apparaître dans chaque team générée.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRequiredChange(new Set())}
              disabled={requiredHeroIds.size === 0}
              className="ui-button-sm"
            >
              Tout désélectionner
            </button>
          </div>

          <div className="relative mt-4">
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
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredHeroes.map((hero) => {
              const available = enabledHeroIds.has(hero.id);
              const required = requiredHeroIds.has(hero.id);

              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => toggleRequired(hero.id)}
                  disabled={!available}
                  className={[
                    "relative overflow-hidden rounded-2xl border text-left transition-all",
                    available
                      ? "ui-card hover:scale-[1.02]"
                      : "ui-card cursor-not-allowed opacity-35",
                    required ? "ring-2 ring-[var(--ui-theme-primary)]" : "",
                  ].join(" ")}
                >
                  <div className="relative p-2.5">
                    <div
                      className={[
                        "relative aspect-square overflow-hidden rounded-xl bg-[var(--ui-bg)]/20",
                        available
                          ? `hero-card-wallpaper-${hero.cls.toLowerCase()}`
                          : "",
                      ].join(" ")}
                    >
                      <img
                        src={hero.img}
                        alt={hero.name}
                        loading="lazy"
                        className={[
                          "absolute inset-0 h-full w-full object-cover",
                          available ? "" : "grayscale",
                        ].join(" ")}
                      />

                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--ui-bg)]/90 to-transparent" />

                      <span className="absolute bottom-2 left-2 right-2 line-clamp-1 text-center text-xs font-bold ui-text-primary drop-shadow-lg">
                        {hero.name}
                      </span>

                      <span
                        className={[
                          "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md",
                          required
                            ? "bg-[var(--ui-theme-primary)] text-[var(--ui-bg)]"
                            : "bg-[var(--ui-bg)]/75 text-[var(--ui-text-primary)]/50",
                        ].join(" ")}
                      >
                        {required ? "★" : available ? "○" : "✕"}
                      </span>
                    </div>

                    <div className="ui-text-soft mt-2 truncate text-center text-[10px] font-semibold sm:text-xs">
                      {available ? "Disponible" : "Non disponible"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredHeroes.length === 0 && (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucun héros ne correspond à votre recherche.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
