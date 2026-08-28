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

    if (enemies.length === 0 || myHeroes.length === 0) {
      return;
    }

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
    <section className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      {/* ======================================================
          TITRE
          ====================================================== */}

      <div className="mb-3">
        <h2 className="text-sm font-bold text-white sm:text-base">
          Résultat du combat
        </h2>
      </div>

      {/* ======================================================
          RÉSULTAT
          ====================================================== */}

      <div className="grid grid-cols-2 gap-2">
        {/* VICTOIRE */}

        <button
          type="button"
          disabled={saving}
          onClick={() => handleResult(true)}
          className="
            rounded-lg
            border border-emerald-400/50
            bg-emerald-500/15
            px-3 py-3
            text-sm font-bold
            text-emerald-300
            transition
            hover:border-emerald-400
            hover:bg-emerald-500/25
            hover:text-emerald-200
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          👍 Victoire
        </button>

        {/* DÉFAITE */}

        <button
          type="button"
          disabled={saving}
          onClick={() => handleResult(false)}
          className="
            rounded-lg
            border border-red-400/50
            bg-red-500/15
            px-3 py-3
            text-sm font-bold
            text-red-300
            transition
            hover:border-red-400
            hover:bg-red-500/25
            hover:text-red-200
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          👎 Défaite
        </button>
      </div>

      {/* ======================================================
          ANNULER
          ====================================================== */}

      {onClose && (
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white disabled:opacity-50"
        >
          Annuler
        </button>
      )}

      {/* ======================================================
          ENREGISTREMENT
          ====================================================== */}

      {saving && (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Enregistrement...
        </p>
      )}
    </section>
  );
}
