import { useMemo, useState } from "react";
import type { Hero } from "../types";
import { saveTeamOrder } from "../storage/teamOrderStorage";

interface CombatOrderEditorProps {
  heroes: Hero[];
  initialOrder?: string[] | null;
  onBack: () => void;
  onSaved: (orderedHeroIds: string[]) => void;
}

export default function CombatOrderEditor({
  heroes,
  initialOrder,
  onBack,
  onSaved,
}: CombatOrderEditorProps) {
  const initial = useMemo(() => {
    if (initialOrder?.length === 5) return initialOrder;
    return heroes.map((hero) => hero.id);
  }, [heroes, initialOrder]);

  const [order, setOrder] = useState<string[]>(initial);
  const [saving, setSaving] = useState(false);

  const heroesById = useMemo(
    () => new Map(heroes.map((hero) => [hero.id, hero])),
    [heroes]
  );

  const isValid =
    order.length === 5 &&
    new Set(order).size === 5 &&
    order.every((heroId) => heroesById.has(heroId));

  function setPosition(heroId: string, position: number) {
    setOrder((current) => {
      const next = [...current];
      const currentIndex = next.indexOf(heroId);
      const targetIndex = position - 1;
      const targetHero = next[targetIndex];

      if (currentIndex !== -1) next[currentIndex] = targetHero;
      next[targetIndex] = heroId;
      return next;
    });
  }

  function getHeroPosition(heroId: string): number {
    const index = order.indexOf(heroId);
    return index === -1 ? 0 : index + 1;
  }

  async function handleSave() {
    if (!isValid) return;

    try {
      setSaving(true);
      await saveTeamOrder(heroes.map((hero) => hero.id), order);
      onSaved(order);
    } catch (error) {
      console.error("Erreur enregistrement ordre équipe :", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer l'ordre de l'équipe."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b ui-divider p-5 sm:p-6">
        <h2 className="ui-text-primary text-xl font-black">
          ✏️ Éditer l'ordre des héros
        </h2>
        <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
          Attribue à chaque héros sa position réelle dans le jeu.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-5 sm:p-6">
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {heroes.map((hero) => {
            const currentPosition = getHeroPosition(hero.id);

            return (
              <div
                key={hero.id}
                className="ui-action flex min-w-0 flex-col items-center gap-2 rounded-xl border p-2.5 sm:p-3"
              >
                <img
                  src={hero.img}
                  alt={hero.name}
                  className="h-14 w-14 shrink-0 rounded-lg border ui-divider object-cover sm:h-20 sm:w-20 sm:rounded-xl"
                />
                <span className="ui-text-primary w-full min-w-0 truncate text-center text-[10px] font-bold sm:text-xs">
                  {hero.name}
                </span>
                <select
                  value={currentPosition}
                  onChange={(event) =>
                    setPosition(hero.id, Number(event.target.value))
                  }
                  className="ui-input w-full max-w-[72px] rounded-lg border px-2 py-1.5 text-center text-sm font-bold"
                  aria-label={`Position de ${hero.name}`}
                >
                  {[1, 2, 3, 4, 5].map((position) => (
                    <option key={position} value={position}>
                      N° {position}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <p
          className={
            isValid
              ? "mt-4 text-center text-xs font-bold text-emerald-400"
              : "mt-4 text-center text-xs font-bold text-amber-400"
          }
        >
          {isValid
            ? "✓ Les 5 positions sont uniques"
            : "⚠️ Chaque position 1 à 5 doit être utilisée une seule fois"}
        </p>
      </div>

      <footer className="flex justify-between gap-3 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition disabled:opacity-50"
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="rounded-lg border border-emerald-400/30 px-4 py-2 text-xs font-black text-emerald-400 transition hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Enregistrement…" : "✓ Enregistrer"}
        </button>
      </footer>
    </div>
  );
}
