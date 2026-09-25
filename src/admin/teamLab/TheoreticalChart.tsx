import {
  formatNumber,
  getZoneBounds,
  type TheoreticalMetric,
  type ZoneRow,
} from "./teamLabData";

interface TheoreticalChartProps {
  xLabel: string;
  theoretical: TheoreticalMetric;
  observedRows: ZoneRow[];
}

export default function TheoreticalChart({
  xLabel,
  theoretical,
  observedRows,
}: TheoreticalChartProps) {
  const width = 980;
  const height = 390;
  const left = 68;
  const right = 68;
  const top = 22;
  const bottom = 105;

  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxTheoretical = Math.max(
    1,
    ...theoretical.zones.map((row) => row.possibleFormations)
  );

  const maxObserved = Math.max(
    1,
    ...observedRows.flatMap((row) => [row.winFormations, row.lossFormations])
  );

  const observedByZone = new Map(observedRows.map((row) => [row.zone, row]));

  const slotWidth = chartWidth / theoretical.zones.length;
  const barWidth = Math.max(5, slotWidth * 0.31);
  const gap = Math.max(2, slotWidth * 0.04);

  const zone1 = getZoneBounds(
    theoretical.theoreticalMin,
    theoretical.theoreticalMax,
    1
  );

  const zone20 = getZoneBounds(
    theoretical.theoreticalMin,
    theoretical.theoreticalMax,
    20
  );

  const middleValue =
    (theoretical.theoreticalMin + theoretical.theoreticalMax) / 2;

  /*
   * Courbe théorique
   * -----------------
   * Chaque point représente le nombre réel de formations possibles
   * dans la zone correspondante.
   *
   * La somme des 20 zones = 5 461 512.
   */
  const theoreticalPoints = theoretical.zones.map((row, index) => {
    const center = left + index * slotWidth + slotWidth / 2;

    const y =
      top +
      chartHeight -
      (row.possibleFormations / maxTheoretical) * chartHeight;

    return {
      row,
      center,
      y,
    };
  });

  const theoreticalPath = theoreticalPoints
    .map(
      (point, index) => `${index === 0 ? "M" : "L"} ${point.center} ${point.y}`
    )
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[760px] w-full"
        role="img"
        aria-label={
          "Distribution théorique des 5 461 512 formations possibles avec les formations WIN et LOSS observées selon la " +
          xLabel +
          ", zones Z1 à Z20"
        }
      >
        {/* ============================================================
            GRILLE + AXE GAUCHE : THÉORIQUE
           ============================================================ */}

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + chartHeight * (1 - ratio);
          const theoreticalValue = Math.round(maxTheoretical * ratio);

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
                strokeDasharray="5 4"
              />

              <text
                x={left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--ui-text-secondary)"
              >
                {formatNumber(theoreticalValue)}
              </text>

              <text
                x={width - right + 8}
                y={y + 4}
                textAnchor="start"
                fontSize="11"
                fill="var(--ui-text-secondary)"
              >
                {formatNumber(Math.round(maxObserved * ratio))}
              </text>
            </g>
          );
        })}

        {/* ============================================================
            BARRES WIN / LOSS
            Même principe visuel que ZoneChart
           ============================================================ */}

        {theoretical.zones.map((row, index) => {
          const center = left + index * slotWidth + slotWidth / 2;

          const observed = observedByZone.get(row.zone);

          const winValue = observed?.winFormations ?? 0;
          const lossValue = observed?.lossFormations ?? 0;

          const winHeight = (winValue / maxObserved) * chartHeight;

          const lossHeight = (lossValue / maxObserved) * chartHeight;

          const winX = center - barWidth - gap / 2;

          const lossX = center + gap / 2;

          return (
            <g key={row.zone}>
              {/* WIN */}
              <rect
                x={winX}
                y={top + chartHeight - winHeight}
                width={barWidth}
                height={winHeight}
                rx="2"
                fill="#4ade80"
                opacity="0.9"
              >
                <title>
                  {"Z" +
                    row.zone +
                    " — WIN : " +
                    formatNumber(winValue) +
                    " formations observées"}
                </title>
              </rect>

              {/* LOSS */}
              <rect
                x={lossX}
                y={top + chartHeight - lossHeight}
                width={barWidth}
                height={lossHeight}
                rx="2"
                fill="#ff5a62"
                opacity="0.9"
              >
                <title>
                  {"Z" +
                    row.zone +
                    " — LOSS : " +
                    formatNumber(lossValue) +
                    " formations observées"}
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

        {/* ============================================================
            COURBE THÉORIQUE
            Elle doit dominer visuellement les barres.
           ============================================================ */}

        <path
          d={theoreticalPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points de la courbe */}
        {theoreticalPoints.map(({ row, center, y }) => (
          <g key={row.zone}>
            <circle
              cx={center}
              cy={y}
              r="5"
              fill="#3b82f6"
              stroke="#60a5fa"
              strokeWidth="2"
            >
              <title>
                {"Z" +
                  row.zone +
                  " — " +
                  formatNumber(row.possibleFormations) +
                  " formations théoriquement possibles"}
              </title>
            </circle>
          </g>
        ))}

        {/* ============================================================
            AXE HORIZONTAL
           ============================================================ */}

        <line
          x1={left}
          x2={width - right}
          y1={top + chartHeight}
          y2={top + chartHeight}
          stroke="var(--ui-border)"
          strokeWidth="1"
        />

        {/* Z1 */}
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

        {/* Milieu */}
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

        {/* Z20 */}
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

        {/* ============================================================
            LABELS DES AXES
           ============================================================ */}

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

        {/* Axe gauche */}
        <text
          x={15}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#93c5fd"
          transform={"rotate(-90 15 " + (top + chartHeight / 2) + ")"}
        >
          Y → Formations théoriques
        </text>

        {/* Axe droit */}
        <text
          x={width - 15}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-secondary)"
          transform={
            "rotate(90 " + (width - 15) + " " + (top + chartHeight / 2) + ")"
          }
        >
          Y → Formations observées
        </text>

        {/* ============================================================
            INDICATIONS HAUT DU GRAPHIQUE
           ============================================================ */}

        <text
          x={left}
          y={top + 10}
          textAnchor="start"
          fontSize="10"
          fill="#93c5fd"
        >
          Max zone : {formatNumber(maxTheoretical)}
        </text>

        <text
          x={width - right}
          y={top + 10}
          textAnchor="end"
          fontSize="10"
          fill="var(--ui-text-secondary)"
        >
          Max WIN/LOSS : {formatNumber(maxObserved)}
        </text>
      </svg>

      {/* ================================================================
          LÉGENDE
         ================================================================ */}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px]">
        <span className="ui-text-secondary">
          <span
            className="mr-2 inline-block h-[3px] w-7 align-middle rounded"
            style={{ background: "#3b82f6" }}
          />
          Théorique —{" "}
          <strong className="ui-text-primary">
            {formatNumber(theoretical.total)}
          </strong>{" "}
          formations possibles
        </span>

        <span className="ui-text-secondary">
          <span
            className="mr-1 inline-block h-3 w-3 rounded-sm align-middle"
            style={{ background: "#4ade80" }}
          />
          WIN — formations observées
        </span>

        <span className="ui-text-secondary">
          <span
            className="mr-1 inline-block h-3 w-3 rounded-sm align-middle"
            style={{ background: "#ff5a62" }}
          />
          LOSS — formations observées
        </span>
      </div>

      <div className="mt-1 text-center text-[11px]">
        <span className="ui-text-muted">
          La courbe montre la distribution théorique des{" "}
          {formatNumber(theoretical.total)} formations possibles ; les barres
          montrent les formations réellement observées.
        </span>
      </div>
    </div>
  );
}
