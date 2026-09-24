import winningPatterns from "../../../data/winning-patterns.json";

export type ZoneRow = {
  zone: number;
  winObservations: number;
  lossObservations: number;
  winFormations: number;
  lossFormations: number;
};

export type MetricKey = "atk" | "matk" | "def" | "mdef" | "hp";
export type TeamLabMode = "combats" | "formations";

export const METRICS = [
  { key: "atk" as MetricKey, label: "ATK", xLabel: "ATK totale de l'équipe", theoreticalMin: 1417, theoreticalMax: 14178 },
  { key: "matk" as MetricKey, label: "MATK", xLabel: "MATK totale de l'équipe", theoreticalMin: 1287, theoreticalMax: 14004 },
  { key: "def" as MetricKey, label: "DEF", xLabel: "DEF totale de l'équipe", theoreticalMin: 409, theoreticalMax: 3885 },
  { key: "mdef" as MetricKey, label: "MDEF", xLabel: "MDEF totale de l'équipe", theoreticalMin: 714, theoreticalMax: 3534 },
  { key: "hp" as MetricKey, label: "PV", xLabel: "PV totaux de l'équipe", theoreticalMin: 53401, theoreticalMax: 177892 },
];

export const zoneSummary = winningPatterns.zoneSummary as Record<MetricKey, ZoneRow[]>;

export function completeZones(rows: ZoneRow[]): ZoneRow[] {
  const byZone = new Map(rows.map((row) => [row.zone, row]));
  return Array.from({ length: 20 }, (_, index) => {
    const zone = index + 1;
    return byZone.get(zone) ?? { zone, winObservations: 0, lossObservations: 0, winFormations: 0, lossFormations: 0 };
  });
}

export function getZoneBounds(theoreticalMin: number, theoreticalMax: number, zone: number): { min: number; max: number } {
  const zoneWidth = Math.ceil((theoreticalMax - theoreticalMin) / 20);
  const min = theoreticalMin + (zone - 1) * zoneWidth;
  const max = zone === 20 ? theoreticalMax : min + zoneWidth - 1;
  return { min, max };
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}
