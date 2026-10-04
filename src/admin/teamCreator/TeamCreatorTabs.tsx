import type { TeamCreatorMode } from "./TeamCreator";

interface TeamCreatorTabsProps {
  mode: TeamCreatorMode;
  onChange: (mode: TeamCreatorMode) => void;
}

export default function TeamCreatorTabs({ mode, onChange }: TeamCreatorTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Étapes du créateur d'équipes"
    >
      <button type="button" role="tab" aria-selected={mode === "enemySelection"} onClick={() => onChange("enemySelection")} className={mode === "enemySelection" ? "ui-button-success" : "ui-button"}>
        Étape A — Sélection ennemis
      </button>
      <button type="button" role="tab" aria-selected={mode === "enemyHistory"} onClick={() => onChange("enemyHistory")} className={mode === "enemyHistory" ? "ui-button-success" : "ui-button"}>
        Étape B — Historique contre l'équipe
      </button>
      <button type="button" role="tab" aria-selected={mode === "enemyCoreAnalysis"} onClick={() => onChange("enemyCoreAnalysis")} className={mode === "enemyCoreAnalysis" ? "ui-button-success" : "ui-button"}>
        Étape C — Classement 4 + 1
      </button>
      <button type="button" role="tab" aria-selected={mode === "enemyCrossAnalysis"} onClick={() => onChange("enemyCrossAnalysis")} className={mode === "enemyCrossAnalysis" ? "ui-button-success" : "ui-button"}>
        Étape D — Équipes à tester
      </button>
    </div>
  );
}
