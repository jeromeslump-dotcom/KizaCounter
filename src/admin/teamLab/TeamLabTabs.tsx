import type { TeamLabMode } from "./teamLabData";

interface TeamLabTabsProps {
  mode: TeamLabMode;
  onChange: (mode: TeamLabMode) => void;
}

export default function TeamLabTabs({ mode, onChange }: TeamLabTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Étapes du Team Lab"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "combats"}
        onClick={() => onChange("combats")}
        className={mode === "combats" ? "ui-button-success" : "ui-button"}
      >
        Étape 1 — Combats
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "formations"}
        onClick={() => onChange("formations")}
        className={mode === "formations" ? "ui-button-success" : "ui-button"}
      >
        Étape 2 — Formations
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "theoretical"}
        onClick={() => onChange("theoretical")}
        className={mode === "theoretical" ? "ui-button-success" : "ui-button"}
      >
        Étape 3 — Théorique
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "customization"}
        onClick={() => onChange("customization")}
        className={mode === "customization" ? "ui-button-success" : "ui-button"}
      >
        Étape 4 — Personnalisation
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "generator"}
        onClick={() => onChange("generator")}
        className={mode === "generator" ? "ui-button-success" : "ui-button"}
      >
        Étape 5 — Générateur de team
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "counter"}
        onClick={() => onChange("counter")}
        className={mode === "counter" ? "ui-button-success" : "ui-button"}
      >
        Étape 6 — Générateur de contre
      </button>
      <div className="flex basis-full flex-wrap gap-2 border-t border-white/10 pt-2">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "enemySelection"}
          onClick={() => onChange("enemySelection")}
          className={mode === "enemySelection" ? "ui-button-success" : "ui-button"}
        >
          Étape A — Sélection ennemis
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "enemyHistory"}
          onClick={() => onChange("enemyHistory")}
          className={mode === "enemyHistory" ? "ui-button-success" : "ui-button"}
        >
          Étape B — Historique contre l'équipe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "enemyCoreAnalysis"}
          onClick={() => onChange("enemyCoreAnalysis")}
          className={mode === "enemyCoreAnalysis" ? "ui-button-success" : "ui-button"}
        >
          Étape C — Classement 4 + 1
        </button>
      </div>
    </div>
  );
}
