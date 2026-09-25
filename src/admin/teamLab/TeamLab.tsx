import { useState } from "react";
import TeamLabTabs from "./TeamLabTabs";
import TheoreticalChart from "./TheoreticalChart";
import ZoneChart from "./ZoneChart";
import {
  completeZones,
  METRICS,
  theoreticalSummary,
  type TeamLabMode,
  zoneSummary,
} from "./teamLabData";

interface TeamLabProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function TeamLab({ open, onClose, onBack }: TeamLabProps) {
  const [mode, setMode] = useState<TeamLabMode>("combats");

  if (!open) return null;

  const stepLabel =
    mode === "combats" ? "1" : mode === "formations" ? "2" : "3";
  const description =
    mode === "combats"
      ? "Répartition réelle des combats enregistrés dans les 20 zones"
      : mode === "formations"
        ? "Répartition réelle des formations enregistrées dans les 20 zones"
        : "Distribution théorique des 5 461 512 formations possibles dans les 20 zones";

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
        aria-labelledby="team-lab-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="team-lab-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Team Lab — Étape {stepLabel}
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
          <TeamLabTabs mode={mode} onChange={setMode} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {mode === "theoretical" ? (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: "var(--ui-theme-primary)" }}
                    aria-hidden="true"
                  />
                  Distribution théorique
                </span>

                <span className="ui-text-muted">
                  5 461 512 formations possibles
                </span>
                <span className="ui-text-muted">
                  Source : theoretical-formations.json
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {METRICS.map(({ key, label, xLabel }) => (
                  <section key={key} className="ui-card rounded-2xl border p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="ui-text-primary text-sm font-black">
                        {label} — Z1 à Z20
                      </h3>
                      <span className="ui-text-muted text-[11px]">
                        X → {xLabel}
                      </span>
                    </div>

                    <TheoreticalChart
                      xLabel={xLabel}
                      theoretical={theoreticalSummary[key]}
                      observedRows={completeZones(zoneSummary[key] ?? [])}
                    />
                  </section>
                ))}
              </div>

              <div className="ui-panel-alt mt-5 rounded-xl border p-4">
                <p className="ui-text-secondary text-xs leading-relaxed">
                  La courbe représente la distribution des 5 461 512 formations
                  théoriquement possibles. Pour rester lisible avec les données
                  historiques, son échelle verticale est normalisée sur le
                  maximum observé entre WIN et LOSS dans les 20 zones. Les
                  valeurs théoriques réelles restent disponibles au survol de
                  chaque point.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-4 text-xs">
                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: "var(--ui-success)" }}
                    aria-hidden="true"
                  />
                  WIN
                </span>

                <span className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: "var(--ui-theme-secondary)" }}
                    aria-hidden="true"
                  />
                  LOSS
                </span>

                <span className="ui-text-muted">
                  WIN / LOSS ={" "}
                  {mode === "combats"
                    ? "combats enregistrés"
                    : "formations enregistrées"}
                </span>

                <span className="ui-text-muted">
                  Source : winning-patterns.json
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {METRICS.map(
                  ({ key, label, xLabel, theoreticalMin, theoreticalMax }) => (
                    <section
                      key={key}
                      className="ui-card rounded-2xl border p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="ui-text-primary text-sm font-black">
                          {label} — Z1 à Z20
                        </h3>
                        <span className="ui-text-muted text-[11px]">
                          X → {xLabel}
                        </span>
                      </div>

                      <ZoneChart
                        xLabel={xLabel}
                        theoreticalMin={theoreticalMin}
                        theoreticalMax={theoreticalMax}
                        rows={completeZones(zoneSummary[key] ?? [])}
                        mode={mode}
                      />
                    </section>
                  )
                )}
              </div>

              <div className="ui-panel-alt mt-5 rounded-xl border p-4">
                <p className="ui-text-secondary text-xs leading-relaxed">
                  Cette étape est descriptive uniquement. Les graphiques
                  montrent les {mode === "combats" ? "combats" : "formations"}{" "}
                  enregistrés dans chaque zone, sans comparaison entre
                  statistiques, sans score et sans classement.
                </p>
              </div>
            </>
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
