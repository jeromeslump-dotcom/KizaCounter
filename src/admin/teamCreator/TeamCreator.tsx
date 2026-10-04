import { useState } from "react";
import TeamCreatorTabs from "./TeamCreatorTabs";
import TeamCreatorEnemyHistory from "./TeamCreatorEnemyHistory";
import TeamCreatorEnemyCrossAnalysis from "./TeamCreatorEnemyCrossAnalysis";

export type TeamCreatorMode =
  | "enemySelection"
  | "enemyHistory"
  | "enemyCoreAnalysis"
  | "enemyCrossAnalysis";

interface TeamCreatorProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  enabledHeroIds: Set<string>;
}

export default function TeamCreator({
  open,
  onClose,
  onBack,
  enabledHeroIds,
}: TeamCreatorProps) {
  const [mode, setMode] = useState<TeamCreatorMode>("enemySelection");
  const [selectedEnemyIds, setSelectedEnemyIds] = useState<string[]>([]);

  if (!open) return null;

  const stepLabel =
    mode === "enemySelection"
      ? "A"
      : mode === "enemyHistory"
        ? "B"
        : mode === "enemyCoreAnalysis"
          ? "C"
          : "D";

  const description =
    mode === "enemySelection"
      ? "Sélection d'une équipe ennemie"
      : mode === "enemyHistory"
        ? "Historique de tous les combats contre l'équipe sélectionnée"
        : mode === "enemyCoreAnalysis"
          ? "Classement des teams par 4 héros identiques + 5e héros"
          : "Recherche d'équipes jamais testées en conservant le contexte d'un héros performant";

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex h-screen w-screen flex-col overflow-hidden border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-creator-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="team-creator-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Créateur d'équipes — Étape {stepLabel}
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                {description}
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

        <div className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
          <TeamCreatorTabs mode={mode} onChange={setMode} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {mode === "enemySelection" ||
          mode === "enemyHistory" ||
          mode === "enemyCoreAnalysis" ? (
            <TeamCreatorEnemyHistory
              open={open}
              enabledHeroIds={enabledHeroIds}
              selectedEnemyIds={selectedEnemyIds}
              onSelectedEnemyIdsChange={setSelectedEnemyIds}
              step={
                mode === "enemySelection"
                  ? "A"
                  : mode === "enemyCoreAnalysis"
                    ? "C"
                    : "B"
              }
            />
          ) : (
            <TeamCreatorEnemyCrossAnalysis
              selectedEnemyIds={selectedEnemyIds}
            />
          )}
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
