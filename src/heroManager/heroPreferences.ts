import { HEROES } from "../data/heroes";
import { supabase } from "../storage/supabase";

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

export async function loadHeroPreferences(
  userId: string | null
): Promise<Set<string>> {
  if (!userId) {
    return new Set(allHeroIds());
  }

  const { data, error } = await supabase
    .from("hero_settings")
    .select("excluded_hero_ids")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Impossible de charger les préférences héros : ${error.message}`
    );
  }

  if (!data) {
    return new Set(allHeroIds());
  }

  const disabledIds = normalizeIds(data.excluded_hero_ids);
  const disabled = new Set(disabledIds);
  const enabled = allHeroIds().filter((id) => !disabled.has(id));

  return new Set(enabled);
}

export async function saveHeroPreferences(
  userId: string,
  enabledIds: Set<string>
): Promise<void> {
  const enabled = normalizeIds([...enabledIds]);
  const disabled = allHeroIds().filter((id) => !enabled.includes(id));

  const { error } = await supabase.from("hero_settings").upsert(
    {
      user_id: userId,
      excluded_hero_ids: disabled,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(
      `Impossible de sauvegarder les préférences héros : ${error.message}`
    );
  }
}
