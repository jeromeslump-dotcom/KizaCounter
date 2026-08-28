import type { Hero } from "../types";
import HeroCard from "./HeroCard";

interface RecommendedTeamProps {
  heroes: Hero[];
  score?: number;
  onHeroClick?: (hero: Hero) => void;
}

export default function RecommendedTeam({
  heroes,
  score,
  onHeroClick,
}: RecommendedTeamProps) {
  return (
    <section className="w-full rounded-xl border border-amber-400/20 bg-slate-900/80 p-4">
      {/* ======================================================
          EN-TÊTE
          ====================================================== */}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            Équipe recommandée
          </h2>

          <p className="mt-0.5 text-xs text-slate-500">
            {heroes.length}/5
          </p>
        </div>

        {score !== undefined && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300">
            Score : {score.toFixed(1)}
          </div>
        )}
      </div>

      {/* ======================================================
          AUCUNE RECOMMANDATION
          ====================================================== */}

      {heroes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
          <p className="text-sm text-slate-500">
            Aucune équipe recommandée pour le moment.
          </p>
        </div>
      ) : (
        /* ====================================================
           CARTES DES HÉROS
           ==================================================== */

        <div className="grid grid-cols-1 gap-3">
          {heroes.map((hero, index) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              selected
              selectionOrder={index + 1}
              onClick={
                onHeroClick
                  ? () => onHeroClick(hero)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}