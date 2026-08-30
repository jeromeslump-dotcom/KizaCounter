import type { ReactNode } from "react";

interface EngineSettingsProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

interface SettingRowProps {
  icon: ReactNode;
  title: string;
  description?: string;
}

function SettingRow({ icon, title, description }: SettingRowProps) {
  return (
    <div className="ui-panel-alt rounded-xl border p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ui-divider text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="ui-text-primary text-sm font-black">{title}</div>
          {description && (
            <div className="ui-text-secondary mt-1 text-xs leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EngineSettings({
  open,
  onClose,
  onBack,
}: EngineSettingsProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal w-full max-w-lg overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="engine-settings-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="engine-settings-title"
                className="ui-text-primary text-xl font-black"
              >
                ⚙️ Réglages du moteur
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Configuration du moteur de recommandation
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="ui-action flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition"
              aria-label="Fermer les réglages du moteur"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <SettingRow
            icon="🎯"
            title="Réglages du moteur"
            description="Les paramètres du moteur seront configurables ici. Aucun réglage n'est modifié à cette étape."
          />
        </div>

        <footer className="flex justify-end border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={onBack}
            className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition"
          >
            ← Retour au Admin Panel
          </button>
        </footer>
      </section>
    </div>
  );
}
