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
    </div>
  );
}
