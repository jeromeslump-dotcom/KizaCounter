// src/engine/engineSettings.ts

export interface EngineSettings {
  teamA: {
    specificHistoryWeight: number;
    core4Weight: number;
    generalWinRateWeight: number;
    statsWeight: number;
  };
  teamB: {
    specificHistoryWeight: number;
    core4Weight: number;
    generalWinRateWeight: number;
    statsWeight: number;
  };
  advanced: {
    heroUsageExperiencePerBattle: number;
    heroUsageExperienceCap: number;
    heroUsageScoreCap: number;

    teamACounterWinRateMultiplier: number;
    teamACounterExperiencePerBattle: number;
    teamACounterExperienceCap: number;

    teamBCounterWinRateMultiplier: number;
    teamBCounterExperiencePerBattle: number;
    teamBCounterExperienceCap: number;

    teamAHistoricalReliabilityMin: number;
    teamAHistoricalConfidenceBattles: number;
    teamAHistoricalReliabilityBase: number;
    teamAHistoricalReliabilityConfidenceWeight: number;

    core4MinBattles: number;
    core4MinReplacementBattles: number;
    core4ConfidenceBattles: number;

    teamAClassPenaltyFirst: number;
    teamAClassPenaltySecond: number;
    teamAClassPenaltyThird: number;
  };
}

// Valeurs exactement issues des coefficients actuellement utilisés
// par le moteur avant leur passage dans l'interface de réglages.
export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  teamA: {
    specificHistoryWeight: 1,
    core4Weight: 1,
    generalWinRateWeight: 0.25,
    statsWeight: 0.15,
  },
  teamB: {
    specificHistoryWeight: 0.85,
    core4Weight: 0.35,
    generalWinRateWeight: 1.15,
    statsWeight: 2.5,
  },
  advanced: {
    heroUsageExperiencePerBattle: 2,
    heroUsageExperienceCap: 20,
    heroUsageScoreCap: 120,

    teamACounterWinRateMultiplier: 2,
    teamACounterExperiencePerBattle: 3,
    teamACounterExperienceCap: 15,

    teamBCounterWinRateMultiplier: 1.2,
    teamBCounterExperiencePerBattle: 2,
    teamBCounterExperienceCap: 10,

    teamAHistoricalReliabilityMin: 60,
    teamAHistoricalConfidenceBattles: 10,
    teamAHistoricalReliabilityBase: 0.35,
    teamAHistoricalReliabilityConfidenceWeight: 0.65,

    core4MinBattles: 2,
    core4MinReplacementBattles: 1,
    core4ConfidenceBattles: 4,

    teamAClassPenaltyFirst: 8,
    teamAClassPenaltySecond: 20,
    teamAClassPenaltyThird: 40,
  },
};

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
  experiencePerBattle: {
    min: 0,
    max: 5,
    step: 0.5,
    unit: "pt/combat",
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
  classPenalty: {
    min: 0,
    max: 100,
    step: 1,
    unit: "pt",
  },
} as const;
