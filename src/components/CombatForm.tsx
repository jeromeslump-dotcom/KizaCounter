import { useState } from "react";

import type { Hero, Combat } from "../types";

interface CombatFormProps {
  enemies: Hero[];
  myHeroes: Hero[];
  onSave: (combat: Combat) => Promise<void> | void;
  onClose?: () => void;
}

export default function CombatForm({
  enemies,
  myHeroes,
  onSave,
  onClose,
}: CombatFormProps) {
  const [saving, setSaving] = useState(false);

  async function handleResult(won: boolean) {
    if (saving) return;
    if (enemies.length === 0 || myHeroes.length === 0) return;

    setSaving(true);

    try {
      await onSave({
        enemy_heroes: enemies.map((hero) => hero.id),
        my_heroes: myHeroes.map((hero) => hero.id),
        won,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ui-panel w-full rounded-xl border p-4">
      <div className="mb-3">
        <h2 className="ui-text-primary text-sm font-bold sm:text-base">
          Résultat du combat
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleResult(true)}
          className="ui-success rounded-lg border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          👍 Victoire
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleResult(false)}
          className="ui-danger rounded-lg border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          👎 Défaite
        </button>
      </div>

      {onClose && (
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="ui-action mt-2 w-full rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
        >
          Annuler
        </button>
      )}

      {saving && (
        <p className="ui-text-muted mt-2 text-center text-[10px]">
          Enregistrement...
        </p>
      )}
    </section>
  );
}
