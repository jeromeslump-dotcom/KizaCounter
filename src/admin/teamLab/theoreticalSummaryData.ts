import theoreticalFormations from "../../../data/theoretical-formations.json";
import type { MetricKey, TheoreticalMetric } from "./teamLabData";

export const theoreticalSummary = theoreticalFormations.metrics as Record<MetricKey, TheoreticalMetric>;
