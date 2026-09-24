import { formatNumber, getZoneBounds, type TheoreticalMetric, type ZoneRow } from "./teamLabData";

interface TheoreticalChartProps {
  xLabel: string;
  theoretical: TheoreticalMetric;
  observedRows: ZoneRow[];
}

export default function TheoreticalChart({ xLabel, theoretical, observedRows }: TheoreticalChartProps) {
  const width = 980;
  const height = 390;
  const left = 52;
  const right = 18;
  const top = 22;
  const bottom = 105;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const maxObserved = Math.max(
    1,
    ...observedRows.flatMap((row) => [row.winFormations, row.lossFormations]),
  );
  const maxTheoretical = Math.max(
    1,
    ...theoretical.zones.map((row) => row.possibleFormations),
  );

  const slotWidth = chartWidth / theoretical.zones.length;
  const zone1 = getZoneBounds(theoretical.theoreticalMin, theoretical.theoreticalMax, 1);
  const zone20 = getZoneBounds(theoretical.theoreticalMin, theoretical.theoreticalMax, 20);
  const middleValue = (theoretical.theoreticalMin + theoretical.theoreticalMax) / 2;

  const points = theoretical.zones.map((row, index) => {
    const center = left + index * slotWidth + slotWidth / 2;
    const normalizedValue = (row.possibleFormations / maxTheoretical) * maxObserved;
    const y = top + chartHeight - (normalizedValue / maxObserved) * chartHeight;
    return { row, center, y, normalizedValue };
  });

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.center} ${point.y}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={"0 0 " + width + " " + height}
        className="min-w-[760px] w-full"
        role="img"
        aria-label={"Distribution théorique des formations possibles selon la " + xLabel + ", zones Z1 à Z20"}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + chartHeight * (1 - ratio);
          const value = Math.round(maxObserved * ratio);
          return (
            <g key={ratio}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--ui-border)" strokeWidth="1" opacity="0.55" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--ui-text-secondary)">
                {formatNumber(value)}
              </text>
            </g>
          );
        })}

        <path d={path} fill="none" stroke="var(--ui-theme-primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

        {points.map(({ row, center, y, normalizedValue }) => (
          <g key={row.zone}>
            <circle cx={center} cy={y} r="4" fill="var(--ui-theme-primary)">
              <title>
                {"Z" + row.zone + " — " + formatNumber(row.possibleFormations) + " formations possibles"}
              </title>
            </circle>
            <text x={center} y={top + chartHeight + 22} textAnchor="middle" fontSize="10" fill="var(--ui-text-secondary)">
              {"Z" + row.zone}
            </text>
          </g>
        ))}

        <line x1={left} x2={width - right} y1={top + chartHeight} y2={top + chartHeight} stroke="var(--ui-border)" strokeWidth="1" />

        <text x={left} y={top + chartHeight + 42} textAnchor="start" fontSize="11" fontWeight="700" fill="var(--ui-text-primary)">
          Z1
        </text>
        <text x={left} y={top + chartHeight + 58} textAnchor="start" fontSize="10" fill="var(--ui-text-secondary)">
          {formatNumber(zone1.min)}–{formatNumber(zone1.max)}
        </text>

        <text x={width / 2} y={top + chartHeight + 42} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--ui-text-primary)">
          Milieu
        </text>
        <text x={width / 2} y={top + chartHeight + 58} textAnchor="middle" fontSize="10" fill="var(--ui-text-secondary)">
          {formatNumber(middleValue)}
        </text>

        <text x={width - right} y={top + chartHeight + 42} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--ui-text-primary)">
          Z20
        </text>
        <text x={width - right} y={top + chartHeight + 58} textAnchor="end" fontSize="10" fill="var(--ui-text-secondary)">
          {formatNumber(zone20.min)}–{formatNumber(zone20.max)}
        </text>

        <text x={width / 2} y={height - 18} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ui-text-primary)">
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
          {"Y → échelle relative (max observé : " + formatNumber(maxObserved) + ")"}
        </text>

        <text x={width - right} y={top + 10} textAnchor="end" fontSize="10" fill="var(--ui-text-muted)">
          Max théorique : {formatNumber(maxTheoretical)}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="ui-text-secondary">
          Courbe = distribution relative des formations théoriques possibles.
        </span>
        <span className="ui-text-muted">
          Échelle Y calée sur le maximum WIN/LOSS observé : {formatNumber(maxObserved)}
        </span>
      </div>
    </div>
  );
}
