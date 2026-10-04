export interface EngineSettings {
  advanced: {
    historicalConfidenceBattles: number;
    historicalReliabilityBase: number;
    historicalReliabilityConfidenceWeight: number;
    historicalTeamMinBattles: number;
    historicalTeamMinWinRate: number;
    core4ConfidenceBattles: number;
  };
}

export const DEFAULT_ENGINE_SETTINGS: EngineSettings = {
  advanced: {
    historicalConfidenceBattles: 4,
    historicalReliabilityBase: 0.35,
    historicalReliabilityConfidenceWeight: 0.65,
    historicalTeamMinBattles: 40,
    historicalTeamMinWinRate: 50,
    core4ConfidenceBattles: 4,
  },
};

const STORAGE_KEY = "lords-mobile-counter-engine-settings";

function isBrowser(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function mergeSettings(
  saved: Partial<EngineSettings> | null | undefined
): EngineSettings {
  return {
    advanced: {
      ...DEFAULT_ENGINE_SETTINGS.advanced,
      ...saved?.advanced,
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
