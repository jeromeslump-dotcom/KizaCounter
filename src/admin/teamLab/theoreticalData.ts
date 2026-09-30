import theoreticalZones from "../../../data/theoretical-zones.json";

export type MetricKey = "atk" | "matk" | "def" | "mdef" | "hp";

export type TheoreticalZone = {
  zone: number;
  min: number;
  max: number;
};

type TheoreticalStat = {
  theoreticalMin: number;
  theoreticalMax: number;
  zones: TheoreticalZone[];
};

const METRIC_LABELS: Record<
  MetricKey,
  { label: string; xLabel: string }
> = {
  atk: {
    label: "ATK",
    xLabel: "ATK totale de l'équipe",
  },
  matk: {
    label: "MATK",
    xLabel: "MATK totale de l'équipe",
  },
  def: {
    label: "DEF",
    xLabel: "DEF totale de l'équipe",
  },
  mdef: {
    label: "MDEF",
    xLabel: "MDEF totale de l'équipe",
  },
  hp: {
    label: "PV",
    xLabel: "PV totaux de l'équipe",
  },
};

const theoreticalStats = theoreticalZones.stats as Record<
  MetricKey,
  TheoreticalStat
>;

export const ZONE_COUNT = theoreticalZones.zoneCount;

export const METRICS = (
  Object.keys(METRIC_LABELS) as MetricKey[]
).map((key) => ({
  key,
  ...METRIC_LABELS[key],
  theoreticalMin: theoreticalStats[key].theoreticalMin,
  theoreticalMax: theoreticalStats[key].theoreticalMax,
}));

export function getZoneBounds(
  metric: MetricKey,
  zone: number
): { min: number; max: number } {
  const definition = theoreticalStats[metric];
  const found = definition.zones.find((item) => item.zone === zone);

  if (!found) {
    throw new Error(`Zone invalide : ${metric} / Z${zone}`);
  }

  return {
    min: found.min,
    max: found.max,
  };
}

export function getZone(value: number, metric: MetricKey): number {
  const definition = theoreticalStats[metric];

  const found = definition.zones.find(
    (zone) => value >= zone.min && value <= zone.max
  );

  if (!found) {
    throw new Error(
      `Valeur hors zones : ${metric}=${value} (${definition.theoreticalMin} → ${definition.theoreticalMax})`
    );
  }

  return found.zone;
}
