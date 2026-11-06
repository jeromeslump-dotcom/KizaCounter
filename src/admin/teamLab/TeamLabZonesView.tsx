import ZoneChart from "./ZoneChart";
import { completeZones, METRICS, type TeamLabMode } from "./teamLabData";
import { zoneSummary } from "./winningPatternsData";

export default function TeamLabZonesView({ mode }: { mode: TeamLabMode }) {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--ui-success)" }} aria-hidden="true" />WIN</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm" style={{ background: "var(--ui-theme-secondary)" }} aria-hidden="true" />LOSS</span>
        <span className="ui-text-muted">WIN / LOSS = {mode === "combats" ? "combats enregistrés" : "formations enregistrées"}</span>
        <span className="ui-text-muted">Source : winning-patterns.json</span>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {METRICS.map(({ key, label, xLabel, theoreticalMin, theoreticalMax }) => (
          <section key={key} className="ui-card rounded-2xl border p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="ui-text-primary text-sm font-black">{label} — Z1 à Z20</h3>
              <span className="ui-text-muted text-[11px]">X → {xLabel}</span>
            </div>
            <ZoneChart metric={key} xLabel={xLabel} theoreticalMin={theoreticalMin} theoreticalMax={theoreticalMax} rows={completeZones(zoneSummary[key] ?? [])} mode={mode} />
          </section>
        ))}
      </div>
      <div className="ui-panel-alt mt-5 rounded-xl border p-4">
        <p className="ui-text-secondary text-xs leading-relaxed">
          Cette étape est descriptive uniquement. Les graphiques montrent les {mode === "combats" ? "combats" : "formations"} enregistrés dans chaque zone, sans comparaison entre statistiques, sans score et sans classement.
        </p>
      </div>
    </>
  );
}
