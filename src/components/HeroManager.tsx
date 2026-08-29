import { useMemo, useState } from "react";

import type { Hero } from "../types";

interface HeroManagerProps {
  open: boolean;
  heroes: Hero[];
  enabledHeroIds: Set<string>;
  onToggleHero: (id: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onSave: () => void;
  onClose: () => void;
}

export default function HeroManager({
  open,
  heroes,
  enabledHeroIds,
  onToggleHero,
  onEnableAll,
  onDisableAll,
  onSave,
  onClose,
}: HeroManagerProps) {
  const [query, setQuery] = useState("");

  const filteredHeroes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return heroes;
    }

    return heroes.filter(
      (hero) =>
        hero.name.toLowerCase().includes(normalizedQuery) ||
        hero.alias.toLowerCase().includes(normalizedQuery)
    );
  }, [heroes, query]);

  if (!open) return null;

  const enabledCount = enabledHeroIds.size;

  function handleSave() {
    onSave();
    onClose();
  }

  return (
    <div
      className="ui-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        className="ui-modal flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="ui-text-primary text-lg font-black sm:text-xl">
                ⚙️ Gérer les héros
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Les héros décochés ne seront pas proposés dans les équipes recommandées.
              </p>
              <div className="ui-score mt-3 inline-flex rounded-lg border px-3 py-1.5 text-xs font-bold">
                {enabledCount} / {heroes.length} héros actifs
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ui-action ui-danger flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onEnableAll}
              className="ui-action ui-success rounded-lg border px-3 py-2 text-xs font-bold transition"
            >
              ☑️ Tout cocher
            </button>

            <button
              type="button"
              onClick={onDisableAll}
              className="ui-action ui-danger rounded-lg border px-3 py-2 text-xs font-bold transition"
            >
              ⬜ Tout décocher
            </button>

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="🔍 Rechercher un héros..."
              className="ui-input min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-3 sm:p-5">
          {filteredHeroes.length === 0 ? (
            <div className="ui-panel-empty rounded-xl border border-dashed p-8 text-center">
              <p className="ui-text-muted text-sm">Aucun héros trouvé.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredHeroes.map((hero) => {
                const enabled = enabledHeroIds.has(hero.id);

                return (
                  <button
                    key={hero.id}
                    type="button"
                    onClick={() => onToggleHero(hero.id)}
                    className={[
                      "relative overflow-hidden rounded-xl border p-2 text-left transition-all",
                      enabled
                        ? "border-emerald-400/50 bg-emerald-500/10"
                        : "border-slate-700 bg-slate-950/60 opacity-50",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-lg">
                      <img
                        src={`/heroes/${hero.id}.png`}
                        alt={hero.name}
                        className={[
                          "h-full w-full object-contain",
                          enabled ? "" : "grayscale",
                        ].join(" ")}
                        loading="lazy"
                      />

                      <span
                        className={[
                          "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-sm font-black",
                          enabled
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-950/80 text-slate-500",
                        ].join(" ")}
                      >
                        {enabled ? "✓" : "×"}
                      </span>
                    </div>

                    <div className="ui-text-primary mt-2 truncate text-xs font-bold">
                      {hero.name}
                    </div>
                    <div className="ui-text-muted mt-0.5 truncate text-[10px]">
                      {hero.alias}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t ui-divider px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ui-action ui-score rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            💾 Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
