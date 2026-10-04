import type { Combat } from "../../types";

interface TeamByPositionProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  combats: Combat[];
}

export default function TeamByPosition({
  open,
  onClose,
  onBack,
  combats,
}: TeamByPositionProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-by-position-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="team-by-position-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Team par position
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Analyse indépendante des formations historiques selon leur
                position
              </p>
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
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="ui-card rounded-2xl border p-5">
            <p className="ui-text-primary text-sm font-black">
              Analyse en préparation
            </p>
            <p className="ui-text-secondary mt-2 text-xs leading-relaxed">
              Cette analyse utilisera les formations dans leur ordre exact et
              restera totalement indépendante du moteur de recommandation.
            </p>
            <p className="ui-text-muted mt-3 text-xs">
              {combats.length} combat{combats.length > 1 ? "s" : ""} disponible
              {combats.length > 1 ? "s" : ""} dans l'historique.
            </p>
          </div>
        </div>

        <footer className="ui-modal-footer flex shrink-0 justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onBack} className="ui-button">
            ← Retour
          </button>
          <button type="button" onClick={onClose} className="ui-button">
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
