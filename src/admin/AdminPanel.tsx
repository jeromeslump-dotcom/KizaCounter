import type { ReactNode } from "react";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  onUserManagement: () => void;
  onEncounteredTeams: () => void;
  onCombatHistory: () => void;
  onEngineSettings: () => void;
}

interface AdminActionProps {
  icon: ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
}

function AdminAction({ icon, title, description, onClick }: AdminActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-action w-full rounded-xl border p-4 text-left transition hover:scale-[1.01]"
    >
      <span className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ui-divider text-lg"
          aria-hidden="true"
        >
          {icon}
        </span>

        <span className="min-w-0">
          <span className="ui-text-primary block text-sm font-black">
            {title}
          </span>

          {description && (
            <span className="ui-text-secondary mt-1 block text-xs leading-relaxed">
              {description}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function AdminPanel({
  open,
  onClose,
  onUserManagement,
  onEncounteredTeams,
  onCombatHistory,
  onEngineSettings,
}: AdminPanelProps) {
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
        aria-labelledby="admin-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b ui-divider p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id="admin-panel-title"
                className="ui-text-primary text-xl font-black"
              >
                ⚙️ Admin Panel
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Gestion de l'application
              </p>
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

        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <AdminAction
            icon="👥"
            title="Gestion des utilisateurs"
            description="Rechercher les utilisateurs et gérer leurs rôles"
            onClick={onUserManagement}
          />

          <AdminAction
            icon="⚔️"
            title="Équipes rencontrées"
            description="Voir les compositions ennemies qui posent le plus de problèmes"
            onClick={onEncounteredTeams}
          />

          <AdminAction
            icon="📜"
            title="Historique des combats"
            onClick={onCombatHistory}
          />

          <AdminAction
            icon="⚙️"
            title="Réglages du moteur"
            description="Configurer les paramètres du moteur de recommandation"
            onClick={onEngineSettings}
          />
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
