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

const METRICS: Array<{
  key: MetricKey;
  label: string;
  xLabel: string;
  theoreticalMin: number;
  theoreticalMax: number;
}> = [
  {
    key: "atk",
    label: "ATK",
    xLabel: "ATK totale de l'équipe",
    theoreticalMin: 1417,
    theoreticalMax: 14178,
  },
  {
    key: "matk",
    label: "MATK",
    xLabel: "MATK totale de l'équipe",
    theoreticalMin: 1287,
    theoreticalMax: 14004,
  },
  {
    key: "def",
    label: "DEF",
    xLabel: "DEF totale de l'équipe",
    theoreticalMin: 409,
    theoreticalMax: 3885,
  },
  {
    key: "mdef",
    label: "MDEF",
    xLabel: "MDEF totale de l'équipe",
    theoreticalMin: 714,
    theoreticalMax: 3534,
  },
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

function getZoneBounds(
  theoreticalMin: number,
  theoreticalMax: number,
  zone: number
): { min: number; max: number } {
  const zoneWidth = Math.ceil((theoreticalMax - theoreticalMin) / 20);

  const min = theoreticalMin + (zone - 1) * zoneWidth;

  const max = zone === 20 ? theoreticalMax : min + zoneWidth - 1;

  return { min, max };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function ZoneChart({
  metric,
  xLabel,
  theoreticalMin,
  theoreticalMax,
  rows,
}: {
  metric: string;
  xLabel: string;
  theoreticalMin: number;
  theoreticalMax: number;
  rows: ZoneRow[];
}) {
  const width = 980;
  const height = 390;
  const left = 52;
  const right = 18;
  const top = 22;
  const bottom = 105;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.winObservations, row.lossObservations])
  );

  const slotWidth = chartWidth / rows.length;
  const barWidth = Math.max(5, slotWidth * 0.31);
  const gap = Math.max(2, slotWidth * 0.04);

  const zone1 = getZoneBounds(theoreticalMin, theoreticalMax, 1);

  const zone20 = getZoneBounds(theoreticalMin, theoreticalMax, 20);

  const middleValue = (theoreticalMin + theoreticalMax) / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[760px] w-full"
        role="img"
        aria-label={`Répartition des combats enregistrés WIN et LOSS selon la ${xLabel}, zones Z1 à Z20`}
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

          const winHeight = (row.winObservations / maxValue) * chartHeight;

          const lossHeight = (row.lossObservations / maxValue) * chartHeight;

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
                  {`Z${row.zone} — WIN: ${row.winObservations} combats enregistrés`}
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
                  {`Z${row.zone} — LOSS: ${row.lossObservations} combats enregistrés`}
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

        {/* X-axis numeric reference points */}
        <text
          x={left}
          y={top + chartHeight + 42}
          textAnchor="start"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-primary)"
        >
          Z1
        </text>

        <text
          x={left}
          y={top + chartHeight + 58}
          textAnchor="start"
          fontSize="10"
          fill="var(--ui-text-secondary)"
        >
          {formatNumber(zone1.min)}–{formatNumber(zone1.max)}
        </text>

        <text
          x={width / 2}
          y={top + chartHeight + 42}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-primary)"
        >
          Milieu
        </text>

        <text
          x={width / 2}
          y={top + chartHeight + 58}
          textAnchor="middle"
          fontSize="10"
          fill="var(--ui-text-secondary)"
        >
          {formatNumber(middleValue)}
        </text>

        <text
          x={width - right}
          y={top + chartHeight + 42}
          textAnchor="end"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-primary)"
        >
          Z20
        </text>

        <text
          x={width - right}
          y={top + chartHeight + 58}
          textAnchor="end"
          fontSize="10"
          fill="var(--ui-text-secondary)"
        >
          {formatNumber(zone20.min)}–{formatNumber(zone20.max)}
        </text>

        {/* X-axis legend */}
        <text
          x={width / 2}
          y={height - 18}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="var(--ui-text-primary)"
        >
          X → {xLabel}
        </text>

        {/* Y-axis legend */}
        <text
          x={12}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-secondary)"
          transform={`rotate(-90 12 ${top + chartHeight / 2})`}
        >
          Y → Nombre de combats enregistrés (observations)
        </text>
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
                Répartition réelle des combats enregistrés dans les 20 zones
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
              WIN / LOSS = combats enregistrés
            </span>

            <span className="ui-text-muted">
              Source : winning-patterns.json
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {METRICS.map(
              ({ key, label, xLabel, theoreticalMin, theoreticalMax }) => (
                <section key={key} className="ui-card rounded-2xl border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="ui-text-primary text-sm font-black">
                      {label} — Z1 à Z20
                    </h3>

                    <span className="ui-text-muted text-[11px]">
                      X → {xLabel}
                    </span>
                  </div>

                  <ZoneChart
                    metric={label}
                    xLabel={xLabel}
                    theoreticalMin={theoreticalMin}
                    theoreticalMax={theoreticalMax}
                    rows={completeZones(zoneSummary[key] ?? [])}
                  />
                </section>
              )
            )}
          </div>

          <div className="ui-panel-alt mt-5 rounded-xl border p-4">
            <p className="ui-text-secondary text-xs leading-relaxed">
              Cette étape est descriptive uniquement. Les graphiques montrent
              les combats enregistrés dans chaque zone, sans comparaison entre
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
