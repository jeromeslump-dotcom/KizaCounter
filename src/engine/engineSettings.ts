import { supabase } from "../storage/supabase";

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
    historicalTeamMinBattles: 3,
    historicalTeamMinWinRate: 75,
    core4ConfidenceBattles: 4,
  },
};

const STORAGE_KEY = "lords-mobile-counter-engine-settings";

interface SharedSettingsRow {
  historical_team_min_battles: number;
  historical_team_min_win_rate: number;
}

interface UserSettingsRow {
  historical_team_min_battles: number | null;
  historical_team_min_win_rate: number | null;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function mergeSettings(saved: Partial<EngineSettings> | null | undefined): EngineSettings {
  return {
    advanced: {
      ...DEFAULT_ENGINE_SETTINGS.advanced,
      ...saved?.advanced,
    },
  };
}

function applyRecommendationSettings(
  base: EngineSettings,
  battles: number,
  winRate: number
): EngineSettings {
  return {
    ...base,
    advanced: {
      ...base.advanced,
      historicalTeamMinBattles: battles,
      historicalTeamMinWinRate: winRate,
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

async function fetchSharedSettings(): Promise<SharedSettingsRow> {
  const { data, error } = await supabase
    .from("engine_settings")
    .select("historical_team_min_battles, historical_team_min_win_rate")
    .eq("id", "default")
    .single();

  if (error) throw error;
  return data as SharedSettingsRow;
}

export async function loadSharedEngineSettings(): Promise<EngineSettings> {
  const shared = await fetchSharedSettings();
  return applyRecommendationSettings(
    getEngineSettings(),
    shared.historical_team_min_battles,
    shared.historical_team_min_win_rate
  );
}

export async function loadUserEngineSettings(
  userId: string
): Promise<{ settings: EngineSettings; hasPersonalOverrides: boolean }> {
  const [shared, userResult] = await Promise.all([
    fetchSharedSettings(),
    supabase
      .from("user_engine_settings")
      .select("historical_team_min_battles, historical_team_min_win_rate")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (userResult.error) throw userResult.error;

  const personal = userResult.data as UserSettingsRow | null;
  const hasPersonalOverrides = Boolean(
    personal &&
      (personal.historical_team_min_battles !== null ||
        personal.historical_team_min_win_rate !== null)
  );

  return {
    settings: applyRecommendationSettings(
      getEngineSettings(),
      personal?.historical_team_min_battles ??
        shared.historical_team_min_battles,
      personal?.historical_team_min_win_rate ??
        shared.historical_team_min_win_rate
    ),
    hasPersonalOverrides,
  };
}

export async function refreshUserEngineSettings(userId: string): Promise<void> {
  const { settings } = await loadUserEngineSettings(userId);
  saveEngineSettings(settings);
}

export async function saveSharedEngineSettings(
  settings: EngineSettings,
  adminUserId: string
): Promise<void> {
  const { error } = await supabase.from("engine_settings").upsert({
    id: "default",
    historical_team_min_battles: settings.advanced.historicalTeamMinBattles,
    historical_team_min_win_rate: settings.advanced.historicalTeamMinWinRate,
    updated_by: adminUserId,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  await refreshUserEngineSettings(adminUserId);
}

export async function saveUserEngineSettings(
  settings: EngineSettings,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("user_engine_settings").upsert({
    user_id: userId,
    historical_team_min_battles: settings.advanced.historicalTeamMinBattles,
    historical_team_min_win_rate: settings.advanced.historicalTeamMinWinRate,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  saveEngineSettings(settings);
}

export async function resetUserEngineSettings(userId: string): Promise<EngineSettings> {
  const { error } = await supabase
    .from("user_engine_settings")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;

  const { settings } = await loadUserEngineSettings(userId);
  saveEngineSettings(settings);
  return settings;
}
