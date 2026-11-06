import type { MetricKey } from "./theoreticalData";
export type { MetricKey } from "./theoreticalData";

export type ZoneRow = {
  zone: number;
  winObservations: number;
  lossObservations: number;
  winFormations: number;
  lossFormations: number;
};

export type TeamLabMode =
  | "combats"
  | "formations"
  | "theoretical"
  | "generator"
  | "customization"
  | "counter";

export type TheoreticalZoneRow = {
  zone: number;
  possibleFormations: number;
};

export type TheoreticalMetric = {
  theoreticalMin: number;
  theoreticalMax: number;
  zones: TheoreticalZoneRow[];
  total: number;
};

export { METRICS, getZoneBounds } from "./theoreticalData";

export function completeZones(rows: ZoneRow[]): ZoneRow[] {
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

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
