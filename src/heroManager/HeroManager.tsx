import { useMemo, useState } from "react";

import { HEROES } from "../data/heroes";
import HeroGridItem from "../components/HeroGridItem";

interface HeroManagerProps {
  open: boolean;
  enabledHeroIds: Set<string>;
  activeCount: number;
  totalCount: number;
  onToggleHero: (heroId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onClose: () => void;
}

export default function HeroManager({
  open,
  enabledHeroIds,
  activeCount,
  totalCount,
  onToggleHero,
  onEnableAll,
  onDisableAll,
  onClose,
}: HeroManagerProps) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[var(--ui-bg)]/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="ui-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-modal-header p-4 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <div className="flex items-center gap-2">
                <span aria-hidden="true">⚙️</span>
                <h2 className="ui-text-primary text-xl font-black">
                  Gérer les héros
                </h2>
              </div>

              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Désactivez les héros que vous ne possédez pas. Ils ne seront
                plus proposés dans les équipes recommandées.
              </p>

              <div className="ui-card ui-active-heroes mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5">
                <span aria-hidden="true">☑️</span>
                <span className="ui-text-primary text-xs font-bold">
                  {activeCount} / {totalCount} héros actifs
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ui-button-icon"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEnableAll}
              className="ui-button-sm"
            >
              <span className="inline-flex items-center gap-2">
                ☑️ Tout cocher
              </span>
            </button>

            <button
              type="button"
              onClick={onDisableAll}
              className="ui-button-sm"
            >
              <span className="inline-flex items-center gap-2">
                ☐ Tout décocher
              </span>
            </button>

            <div className="relative min-w-[220px] flex-1">
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
                className="hero-grid-input w-full rounded-lg border py-2 pl-10 pr-3 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredHeroes.map((hero) => {
              const enabled = enabledHeroIds.has(hero.id);

              return (
                <HeroGridItem
                  key={hero.id}
                  hero={hero}
                  enabled={enabled}
                  showAlias
                  status={enabled ? "✓" : "✕"}
                  onClick={() => onToggleHero(hero.id)}
                />
              );
            })}
          </div>

          {filteredHeroes.length === 0 && (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucun héros ne correspond à votre recherche.
            </p>
          )}
        </div>

        <div className="ui-modal-footer flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <span className="ui-text-soft text-[10px]">
            La configuration est sauvegardée automatiquement.
          </span>

          <button type="button" onClick={onClose} className="ui-button">
            Terminé
          </button>
        </div>
      </div>
    </div>
  );
}
