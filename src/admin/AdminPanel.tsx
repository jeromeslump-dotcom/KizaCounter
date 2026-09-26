import { useEffect, useState, type ReactNode } from "react";
import EngineSettings from "./EngineSettings";
import AnalysisHelp from "./AnalysisHelp";
import type { Combat } from "../types";
import type { Hero } from "../data/heroes";

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  onUserManagement: () => void;
  onEncounteredTeams: () => void;
  onCombatHistory: () => void;
  onAnalysisHelp: () => void;
  onWinningPatternsLab: () => void;
  heroes?: Hero[];
  combats?: Combat[];
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
      className="ui-card is-active w-full rounded-xl p-4 text-left transition hover:scale-[1.01]"
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
  onAnalysisHelp,
  onWinningPatternsLab,
  heroes = [],
  combats = [],
}: AdminPanelProps) {
  const [showEngineSettings, setShowEngineSettings] = useState(false);
  const [showAnalysisHelp, setShowAnalysisHelp] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowEngineSettings(false);
      setShowAnalysisHelp(false);
    }
  }, [open]);

  if (!open) return null;

  if (showEngineSettings) {
    return (
      <EngineSettings
        open
        onClose={onClose}
        onBack={() => setShowEngineSettings(false)}
      />
    );
  }

  if (showAnalysisHelp) {
    return (
      <AnalysisHelp
        open
        heroes={heroes}
        combats={combats}
        onClose={onClose}
        onBack={() => setShowAnalysisHelp(false)}
      />
    );
  }

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
        <header className="ui-modal-header p-5 sm:p-6">
          <div className="ui-modal-header-inner">
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
              className="ui-button-icon"
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
            description="Consulter, rechercher et gérer les combats enregistrés"
            onClick={onCombatHistory}
          />
          <AdminAction
            icon="🔎"
            title="Aide à l'analyse"
            description="Analyser les combats correspondant exactement à une équipe ennemie"
            onClick={onAnalysisHelp}
          />
          <AdminAction
            icon="🧪"
            title="Team Lab — zones"
            description="Visualiser les 4 répartitions ATK, MATK, DEF et MDEF sur les 20 zones"
            onClick={onWinningPatternsLab}
          />
          <AdminAction
            icon="⚙️"
            title="Réglages du moteur"
            description="Configurer les paramètres du moteur de recommandation"
            onClick={() => setShowEngineSettings(true)}
          />
        </div>

        <footer className="ui-modal-footer flex justify-end px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onClose} className="ui-button">
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
