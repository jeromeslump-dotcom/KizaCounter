import winningPatterns from "../../data/winning-patterns.json";

type ZoneRow = {
  zone: number;
  winObservations: number;
  lossObservations: number;
  winFormations: number;
  lossFormations: number;
};

type MetricKey = "atk" | "matk" | "def" | "mdef";

interface WinningPatternsLabProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
}

const METRICS: Array<{ key: MetricKey; label: string }> = [
  { key: "atk", label: "ATK" },
  { key: "matk", label: "MATK" },
  { key: "def", label: "DEF" },
  { key: "mdef", label: "MDEF" },
];

const zoneSummary = winningPatterns.zoneSummary as Record<MetricKey, ZoneRow[]>;

function completeZones(rows: ZoneRow[]): ZoneRow[] {
  const byZone = new Map(rows.map((row) => [row.zone, row]));

  return Array.from({ length: 20 }, (_, index) => {
    const zone = index + 1;
    return (
      byZone.get(zone) ?? {
        zone,
        winObservations: 0,
        lossObservations: 0,
        winFormations: 0,
        lossFormations: 0,
      }
    );
  });
}

function ZoneChart({ metric, rows }: { metric: string; rows: ZoneRow[] }) {
  const width = 980;
  const height = 330;
  const left = 52;
  const right = 18;
  const top = 22;
  const bottom = 58;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.winObservations, row.lossObservations])
  );
  const slotWidth = chartWidth / rows.length;
  const barWidth = Math.max(5, slotWidth * 0.31);
  const gap = Math.max(2, slotWidth * 0.04);

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[760px] w-full"
        role="img"
        aria-label={`Répartition des observations WIN et LOSS pour ${metric}, zones Z1 à Z20`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + chartHeight * (1 - ratio);
          const value = Math.round(maxValue * ratio);

          return (
            <g key={ratio}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="var(--ui-border)"
                strokeWidth="1"
                opacity="0.55"
              />
              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ui-text-secondary)"
              >
                {value}
              </text>
            </g>
          );
        })}

        {rows.map((row, index) => {
          const center = left + index * slotWidth + slotWidth / 2;
          const winHeight =
            (row.winObservations / maxValue) * chartHeight;
          const lossHeight =
            (row.lossObservations / maxValue) * chartHeight;
          const winX = center - barWidth - gap / 2;
          const lossX = center + gap / 2;

          return (
            <g key={row.zone}>
              <rect
                x={winX}
                y={top + chartHeight - winHeight}
                width={barWidth}
                height={winHeight}
                rx="2"
                fill="var(--ui-success)"
                opacity="0.9"
              >
                <title>
                  {`Z${row.zone} — WIN: ${row.winObservations} observations`}
                </title>
              </rect>

              <rect
                x={lossX}
                y={top + chartHeight - lossHeight}
                width={barWidth}
                height={lossHeight}
                rx="2"
                fill="var(--ui-theme-secondary)"
                opacity="0.72"
              >
                <title>
                  {`Z${row.zone} — LOSS: ${row.lossObservations} observations`}
                </title>
              </rect>

              <text
                x={center}
                y={top + chartHeight + 22}
                textAnchor="middle"
                fontSize="10"
                fill="var(--ui-text-secondary)"
              >
                Z{row.zone}
              </text>
            </g>
          );
        })}

        <line
          x1={left}
          x2={width - right}
          y1={top + chartHeight}
          y2={top + chartHeight}
          stroke="var(--ui-border)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

export default function WinningPatternsLab({
  open,
  onClose,
  onBack,
}: WinningPatternsLabProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex max-h-[95vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="winning-patterns-lab-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="winning-patterns-lab-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Team Lab — Étape 1
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Répartition réelle des observations dans les 20 zones
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
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
              Source : winning-patterns.json
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {METRICS.map(({ key, label }) => (
              <section
                key={key}
                className="ui-card rounded-2xl border p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="ui-text-primary text-sm font-black">
                    {label} — Z1 à Z20
                  </h3>
                  <span className="ui-text-muted text-[11px]">
                    Observations
                  </span>
                </div>

                <ZoneChart
                  metric={label}
                  rows={completeZones(zoneSummary[key] ?? [])}
                />
              </section>
            ))}
          </div>

          <div className="ui-panel-alt mt-5 rounded-xl border p-4">
            <p className="ui-text-secondary text-xs leading-relaxed">
              Cette étape est descriptive uniquement. Les graphiques montrent
              les données présentes dans le fichier, sans comparaison entre
              statistiques, sans score et sans classement.
            </p>
          </div>
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
