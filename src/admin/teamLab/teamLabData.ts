import winningPatterns from "../../../data/winning-patterns.json";
import theoreticalFormations from "../../../data/theoretical-formations.json";

export type ZoneRow = {
  zone: number;
  winObservations: number;
  lossObservations: number;
  winFormations: number;
  lossFormations: number;
};

export type MetricKey = "atk" | "matk" | "def" | "mdef" | "hp";
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

export { METRICS } from "./theoreticalData";
export {
  getZoneBounds,
  type MetricKey,
} from "./theoreticalData";

export const zoneSummary = winningPatterns.zoneSummary as Record<
  MetricKey,
  ZoneRow[]
>;

export const heroPlayedCount = new Map<string, number>();

for (const formation of winningPatterns.formations.all) {
  for (const heroId of formation.heroes) {
    heroPlayedCount.set(
      heroId,
      (heroPlayedCount.get(heroId) ?? 0) + formation.observations
    );
  }
}

export const theoreticalSummary = theoreticalFormations.metrics as Record<
  MetricKey,
  TheoreticalMetric
>;

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
