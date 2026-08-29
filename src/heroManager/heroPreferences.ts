import { HEROES } from "../data/heroes";
import { supabase } from "../storage/supabase";

const STORAGE_KEY = "kiza-counter-enabled-hero-ids";

function allHeroIds(): string[] {
  return HEROES.map((hero) => hero.id);
}

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const knownIds = new Set(allHeroIds());

  return [...new Set(value)].filter(
    (id): id is string => typeof id === "string" && knownIds.has(id)
  );
}

function readLocal(): string[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ids = normalizeIds(parsed);

    return ids.length > 0 ? ids : [];
  } catch {
    return null;
  }
}

function writeLocal(enabledIds: string[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(normalizeIds(enabledIds))
    );
  } catch {
    // Le stockage local reste optionnel.
  }
}

export async function loadHeroPreferences(): Promise<Set<string>> {
  const localIds = readLocal();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("hero_settings")
        .select("excluded_hero_ids")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        const disabledIds = normalizeIds(data.excluded_hero_ids);
        const disabled = new Set(disabledIds);
        const enabled = allHeroIds().filter((id) => !disabled.has(id));

        writeLocal(enabled);
        return new Set(enabled);
      }
    }
  } catch (error) {
    console.warn("Préférences héros Supabase indisponibles :", error);
  }

  return new Set(localIds ?? allHeroIds());
}

export async function saveHeroPreferences(
  enabledIds: Set<string>
): Promise<void> {
  const enabled = normalizeIds([...enabledIds]);
  const disabled = allHeroIds().filter((id) => !enabled.includes(id));

  writeLocal(enabled);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("hero_settings").upsert(
      {
        user_id: user.id,
        excluded_hero_ids: disabled,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.warn(
        "Préférences héros non sauvegardées dans Supabase :",
        error
      );
    }
  } catch (error) {
    console.warn("Erreur sauvegarde préférences héros :", error);
  }
}
