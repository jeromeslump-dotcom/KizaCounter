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
  const [error, setError] = useState("");

  async function handleResult(won: boolean) {
    if (saving) return;

    setError("");

    if (enemies.length !== 5) {
      setError("Sélectionnez exactement 5 héros ennemis.");
      return;
    }

    if (myHeroes.length !== 5) {
      setError("Sélectionnez exactement 5 héros dans votre équipe.");
      return;
    }

    setSaving(true);

    try {
      await onSave({
        enemy_heroes: enemies.map((hero) => hero.id),
        my_heroes: myHeroes.map((hero) => hero.id),
        won,
      });
    } catch (saveError) {
      // Le combat est terminé côté utilisateur : on ferme la sélection même
      // si l'enregistrement n'est pas autorisé ou échoue.
      console.warn("Résultat du combat non enregistré :", saveError);
    } finally {
      setSaving(false);
      onClose?.();
    }
  }

  return (
    <section className="ui-panel is-active w-full rounded-xl border p-4">
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
          className="ui-button ui-result-success disabled:cursor-not-allowed disabled:opacity-50"
        >
          👍 Victoire
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => handleResult(false)}
          className="ui-button ui-result-danger disabled:cursor-not-allowed disabled:opacity-50"
        >
          👎 Défaite
        </button>
      </div>

      {error && (
        <p role="alert" className="ui-error mt-2 text-center text-xs">
          {error}
        </p>
      )}


      {saving && (
        <p className="ui-text-muted mt-2 text-center text-[10px]">
          Enregistrement...
        </p>
      )}
    </section>
  );
}
