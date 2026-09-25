import {
  formatNumber,
  getZoneBounds,
  type TeamLabMode,
  type ZoneRow,
} from "./teamLabData";

interface ZoneChartProps {
  xLabel: string;
  theoreticalMin: number;
  theoreticalMax: number;
  rows: ZoneRow[];
  mode: TeamLabMode;
}

export default function ZoneChart({
  xLabel,
  theoreticalMin,
  theoreticalMax,
  rows,
  mode,
}: ZoneChartProps) {
  const width = 980,
    height = 390,
    left = 52,
    right = 18,
    top = 22,
    bottom = 105;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const valueKey = mode === "combats" ? "Observations" : "Formations";
  const values = rows.flatMap((row) =>
    mode === "combats"
      ? [row.winObservations, row.lossObservations]
      : [row.winFormations, row.lossFormations]
  );
  const maxValue = Math.max(1, ...values);
  const slotWidth = chartWidth / rows.length;
  const barWidth = Math.max(5, slotWidth * 0.31);
  const gap = Math.max(2, slotWidth * 0.04);
  const zone1 = getZoneBounds(theoreticalMin, theoreticalMax, 1);
  const zone20 = getZoneBounds(theoreticalMin, theoreticalMax, 20);
  const middleValue = (theoreticalMin + theoreticalMax) / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={"0 0 " + width + " " + height}
        className="min-w-[760px] w-full"
        role="img"
        aria-label={
          "Répartition des " +
          valueKey.toLowerCase() +
          " enregistrés WIN et LOSS selon la " +
          xLabel +
          ", zones Z1 à Z20"
        }
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
          const winValue =
            mode === "combats" ? row.winObservations : row.winFormations;
          const lossValue =
            mode === "combats" ? row.lossObservations : row.lossFormations;
          const winHeight = (winValue / maxValue) * chartHeight;
          const lossHeight = (lossValue / maxValue) * chartHeight;
          const winX = center - barWidth - gap / 2,
            lossX = center + gap / 2;
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
                  {"Z" +
                    row.zone +
                    " — WIN: " +
                    winValue +
                    " " +
                    valueKey.toLowerCase() +
                    " enregistrés"}
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
                  {"Z" +
                    row.zone +
                    " — LOSS: " +
                    lossValue +
                    " " +
                    valueKey.toLowerCase() +
                    " enregistrés"}
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
        <text
          x={12}
          y={top + chartHeight / 2}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="var(--ui-text-secondary)"
          transform={"rotate(-90 12 " + (top + chartHeight / 2) + ")"}
        >
          {"Y → Nombre de " + valueKey.toLowerCase() + " enregistrés"}
        </text>
      </svg>
    </div>
  );
}
