// src/engine/engineSettings.ts

export type EngineTeam = "A" | "B";

export type EngineModuleKey =
  | "specificHistory"
  | "core4"
  | "generalWinRate";

export interface EnginePointBudget {
  specificHistory: number;
  core4: number;
  generalWinRate: number;
}

export interface EngineSettings {
  teamA: {
    specificHistoryWeight: number;
    core4Weight: number;
    generalWinRateWeight: number;
    specificHistoryPoints: number;
    core4Points: number;
    generalWinRatePoints: number;
  };
  teamB: {
    specificHistoryWeight: number;
    core4Weight: number;
    generalWinRateWeight: number;
    specificHistoryPoints: number;
    core4Points: number;
    generalWinRatePoints: number;
  };
advanced: {
  teamACounterWinRateMultiplier: number;


  teamBCounterWinRateMultiplier: number;
  
  

  teamAHistoricalReliabilityMin: number;
  teamAHistoricalConfidenceBattles: number;
  teamAHistoricalReliabilityBase: number;
  teamAHistoricalReliabilityConfidenceWeight: number;

  core4MinBattles: number;
  core4MinReplacementBattles: number;
  core4ConfidenceBattles: number;
};
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  teamA: {
    specificHistoryWeight: 1,
    core4Weight: 1,
    generalWinRateWeight: 0.25,
    specificHistoryPoints: 50,
    core4Points: 30,
    generalWinRatePoints: 20,
  },
  teamB: {
    specificHistoryWeight: 0.85,
    core4Weight: 0.35,
    generalWinRateWeight: 1.15,
    specificHistoryPoints: 25,
    core4Points: 25,
    generalWinRatePoints: 50,
  },
  advanced: {


    teamACounterWinRateMultiplier: 2,


    teamBCounterWinRateMultiplier: 1.2,
    
    

    teamAHistoricalReliabilityMin: 60,
    teamAHistoricalConfidenceBattles: 10,
    teamAHistoricalReliabilityBase: 0.35,
    teamAHistoricalReliabilityConfidenceWeight: 0.65,

    core4MinBattles: 2,
    core4MinReplacementBattles: 1,
    core4ConfidenceBattles: 4,
  },
};

export function getPointBudgets(settings: EngineSettings, team: EngineTeam): EnginePointBudget {
  const source = team === "A" ? settings.teamA : settings.teamB;

  return {
    specificHistory: source.specificHistoryPoints,
    core4: source.core4Points,
    generalWinRate: source.generalWinRatePoints,
  };
}

export function getPointBudgetTotal(
  settings: EngineSettings,
  team: EngineTeam
): number {
  const points = getPointBudgets(settings, team);
  return points.specificHistory + points.core4 + points.generalWinRate;
}

export function normalizeModulePoints(rawScore: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0;
  return Math.max(0, Math.min(maxPoints, rawScore * maxPoints));
}

const STORAGE_KEY = "lords-mobile-counter-engine-settings";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeSettings(
  saved: Partial<EngineSettings> | null | undefined
): EngineSettings {
  return {
    ...DEFAULT_ENGINE_SETTINGS,
    ...saved,
    teamA: {
      ...DEFAULT_ENGINE_SETTINGS.teamA,
      ...(saved?.teamA ?? {}),
    },
    teamB: {
      ...DEFAULT_ENGINE_SETTINGS.teamB,
      ...(saved?.teamB ?? {}),
    },
    advanced: {
      ...DEFAULT_ENGINE_SETTINGS.advanced,
      ...(saved?.advanced ?? {}),
    },
  };
}

export function getEngineSettings(): EngineSettings {
  if (!isBrowser()) return DEFAULT_ENGINE_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ENGINE_SETTINGS;

    return mergeSettings(JSON.parse(raw) as Partial<EngineSettings>);
  } catch {
    return DEFAULT_ENGINE_SETTINGS;
  }
}

export function saveEngineSettings(settings: EngineSettings): void {
  if (!isBrowser()) return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event("engine-settings-changed"));
}

export function resetEngineSettings(): void {
  if (!isBrowser()) return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("engine-settings-changed"));
}

export const ENGINE_SETTING_LIMITS = {
  weight: {
    min: 0,
    max: 2.5,
    step: 0.05,
    unit: "%",
    multiplier: 100,
  },
  points: {
    min: 0,
    max: 100,
    step: 1,
    unit: "pt",
  },

  scoreCap: {
    min: 0,
    max: 200,
    step: 5,
    unit: "pt",
  },
  battles: {
    min: 1,
    max: 20,
    step: 1,
    unit: "combats",
  },
  percentage: {
    min: 0,
    max: 100,
    step: 5,
    unit: "%",
  },
  confidenceWeight: {
    min: 0,
    max: 1,
    step: 0.05,
    unit: "%",
    multiplier: 100,
  },
} as const;
