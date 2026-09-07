import type { Hero } from "../types";

interface CombatFormationPreviewProps {
  heroes: Hero[];
  onBack: () => void;
  onConfirm: () => void;
  saving: boolean;
}

function FormationHero({ hero, position }: { hero: Hero; position: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="ui-text-soft text-[10px] font-black">{position}</span>
      <img
        src={hero.img}
        alt={hero.name}
        title={hero.name}
        className="h-16 w-16 rounded-xl border ui-divider object-cover shadow-md sm:h-20 sm:w-20"
      />
      <span className="ui-text-secondary max-w-24 truncate text-center text-[10px] font-bold">
        {hero.name}
      </span>
    </div>
  );
}

export default function CombatFormationPreview({
  heroes,
  onBack,
  onConfirm,
  saving,
}: CombatFormationPreviewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b ui-divider p-5 sm:p-6">
        <h2 className="ui-text-primary text-xl font-black">
          ⚔️ Vérifier la formation
        </h2>
        <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
          Vérifie que l'ordre correspond bien à la formation affichée dans le jeu.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-5 sm:p-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 rounded-2xl border ui-divider p-6 sm:p-8">
          <FormationHero hero={heroes[0]} position={1} />
          <div className="grid w-full grid-cols-2 justify-items-center gap-6">
            <FormationHero hero={heroes[1]} position={2} />
            <FormationHero hero={heroes[2]} position={3} />
          </div>
          <div className="grid w-full grid-cols-2 justify-items-center gap-6">
            <FormationHero hero={heroes[3]} position={4} />
            <FormationHero hero={heroes[4]} position={5} />
          </div>
        </div>
      </div>

      <footer className="flex justify-between gap-3 border-t ui-divider px-4 py-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="ui-action rounded-lg border px-4 py-2 text-xs font-bold transition disabled:opacity-50"
        >
          ← Modifier
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="rounded-lg border border-emerald-400/30 px-4 py-2 text-xs font-black text-emerald-400 transition hover:bg-emerald-400/10 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "✓ Valider l'ordre"}
        </button>
      </footer>
    </div>
  );
}
