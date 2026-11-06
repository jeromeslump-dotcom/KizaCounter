import TheoreticalChart from "./TheoreticalChart";
import { completeZones, METRICS } from "./teamLabData";
import { theoreticalSummary } from "./theoreticalSummaryData";
import { zoneSummary } from "./winningPatternsData";

export default function TeamLabTheoreticalView() {
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: "var(--ui-theme)" }} aria-hidden="true" />Distribution théorique</span>
        <span className="ui-text-muted">5 461 512 formations possibles</span>
        <span className="ui-text-muted">Source : theoretical-formations.json</span>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {METRICS.map(({ key, label, xLabel }) => (
          <section key={key} className="ui-card rounded-2xl border p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="ui-text-primary text-sm font-black">{label} — Z1 à Z20</h3>
              <span className="ui-text-muted text-[11px]">X → {xLabel}</span>
            </div>
            <TheoreticalChart metric={key} xLabel={xLabel} theoretical={theoreticalSummary[key]} observedRows={completeZones(zoneSummary[key] ?? [])} />
          </section>
        ))}
      </div>
      <div className="ui-panel-alt mt-5 rounded-xl border p-4">
        <p className="ui-text-secondary text-xs leading-relaxed">
          La courbe représente la distribution des 5 461 512 formations théoriquement possibles. Pour rester lisible avec les données historiques, son échelle verticale est normalisée sur le maximum observé entre WIN et LOSS dans les 20 zones. Les valeurs théoriques réelles restent disponibles au survol de chaque point.
        </p>
      </div>
    </>
  );
}
