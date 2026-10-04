import { useMemo, useState } from "react";
import { HEROES } from "../../data/heroes";
import HeroPortrait from "../../components/HeroPortrait";
import winningPatterns from "../../../data/winning-patterns.json";

const HERO_PLAYED_COUNT = new Map<string, number>();

for (const formation of winningPatterns.formations.all) {
  for (const heroId of formation.heroes) {
    HERO_PLAYED_COUNT.set(
      heroId,
      (HERO_PLAYED_COUNT.get(heroId) ?? 0) + formation.observations
    );
  }
}

interface TeamGeneratorCustomizationProps {
  enabledHeroIds: Set<string>;
  requiredHeroIds: Set<string>;
  onRequiredChange: (heroIds: Set<string>) => void;
}

export default function TeamGeneratorCustomization({
  enabledHeroIds,
  requiredHeroIds,
  onRequiredChange,
}: TeamGeneratorCustomizationProps) {
  const [query, setQuery] = useState("");

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const heroes = normalizedQuery
      ? HEROES.filter(
          (hero) =>
            hero.name.toLowerCase().includes(normalizedQuery) ||
            hero.alias.toLowerCase().includes(normalizedQuery)
        )
      : HEROES;

    return [...heroes].sort((a, b) => {
      const playedDifference =
        (HERO_PLAYED_COUNT.get(b.id) ?? 0) - (HERO_PLAYED_COUNT.get(a.id) ?? 0);

      if (playedDifference !== 0) return playedDifference;
      return HEROES.indexOf(a) - HEROES.indexOf(b);
    });
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
          <h3 className="ui-text-primary text-base font-black">
            Héros obligatoires
          </h3>

          <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
            La sélection est obligatoire : le Lab ne montre aucune équipe tant
            qu&apos;au moins un héros n&apos;est pas choisi. Le filtre est
            cumulatif et l&apos;ordre de sélection n&apos;a aucune importance.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="ui-card rounded-lg border px-3 py-1.5 text-xs font-bold"
              style={{ borderColor: "var(--ui-theme)" }}
            >
              <span className="ui-text-primary">{requiredHeroIds.size}</span>
              <span className="ui-text-muted"> / 5 héros sélectionnés</span>
            </span>

            <button
              type="button"
              onClick={() => onRequiredChange(new Set())}
              disabled={requiredHeroIds.size === 0}
              className="ui-button-sm"
            >
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="ui-panel-alt rounded-xl border p-3">
          <div>
            <h4 className="ui-text-primary text-sm font-black">
              Réduction progressive du pool
            </h4>

            <p className="ui-text-secondary mt-1 text-xs leading-relaxed">
              Commencez avec 1 héros. Si le pool reste trop large, ajoutez un
              deuxième, puis un troisième, jusqu&apos;à obtenir un nombre
              d&apos;équipes suffisamment réduit pour les tester.
            </p>
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
                  aria-pressed={required}
                  className={[
                    "relative overflow-hidden rounded-2xl border text-left transition-all",
                    available
                      ? "ui-card hover:scale-[1.02]"
                      : "ui-card cursor-not-allowed opacity-35",
                    required ? "ring-2 ring-[var(--ui-theme)]" : "",
                  ].join(" ")}
                >
                  <div className="relative p-2.5">
                    <div
                      className={[
                        "relative flex min-h-[150px] items-center justify-center overflow-hidden rounded-xl bg-[var(--ui-bg)]/20",
                        available
                          ? `hero-card-wallpaper-${hero.cls.toLowerCase()}`
                          : "",
                      ].join(" ")}
                    >
                      <HeroPortrait
                        hero={hero}
                        showName={false}
                        imageClassName={[
                          "h-auto max-h-[125px] w-full",
                          available ? "" : "grayscale",
                        ].join(" ")}
                      />

                      <span
                        className={[
                          "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md",
                          required
                            ? "bg-[var(--ui-theme)] text-[var(--ui-bg)]"
                            : "bg-[var(--ui-bg)]/75 text-[var(--ui-text-primary)]/50",
                        ].join(" ")}
                      >
                        {required ? "★" : available ? "○" : "✕"}
                      </span>
                    </div>

                    <p className="ui-text-primary mt-2 truncate text-center text-xs font-bold">
                      {hero.name}
                    </p>
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
