import type { Combat } from "../types";

interface CombatHistoryProps {
  open: boolean;
  combats: Combat[];
  onClose: () => void;
}

export default function CombatHistory({
  open,
  combats,
  onClose,
}: CombatHistoryProps) {
  if (!open) return null;

  const totalCombats = combats.length;
  const victories = combats.filter((combat) => combat.won).length;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="combat-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="combat-history-title"
                className="ui-text-primary text-xl font-black"
              >
                📜 Historique des combats
              </h2>

              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Historique commun des combats enregistrés.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border ui-divider px-3 py-1.5">
                <span className="ui-text-primary text-xs font-bold">
                  {totalCombats} combats · {victories} victoires
                </span>
              </div>
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
          {combats.length === 0 ? (
            <p className="ui-text-soft py-12 text-center text-sm">
              Aucun combat enregistré.
            </p>
          ) : (
            <div className="space-y-2">
              {combats.map((combat, index) => (
                <div
                  key={combat.id ?? `${combat.created_at ?? "combat"}-${index}`}
                  className="ui-action rounded-xl border p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="ui-text-primary text-xs font-bold">
                      Combat #{index + 1}
                    </span>
                    <span
                      className={
                        combat.won
                          ? "text-xs font-black text-emerald-400"
                          : "text-xs font-black text-red-400"
                      }
                    >
                      {combat.won ? "Victoire" : "Défaite"}
                    </span>
                  </div>

                  <div className="ui-text-secondary mt-2 text-xs">
                    Ennemis : {combat.enemy_heroes.join(", ") || "—"}
                  </div>
                  <div className="ui-text-secondary mt-1 text-xs">
                    Équipe : {combat.my_heroes.join(", ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
