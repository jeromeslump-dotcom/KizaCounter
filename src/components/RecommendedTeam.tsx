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
    <section className="ui-panel w-full rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="ui-text-primary text-base font-bold">Équipe recommandée</h2>
          <p className="ui-text-muted mt-0.5 text-xs">{heroes.length}/5</p>
        </div>

        {score !== undefined && (
          <div className="ui-score rounded-lg border px-3 py-1.5 text-xs font-bold">
            Score : {score.toFixed(1)}
          </div>
        )}
      </div>

      {heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">
            Aucune équipe recommandée pour le moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {heroes.map((hero, index) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              selected
              selectionOrder={index + 1}
              onClick={onHeroClick ? () => onHeroClick(hero) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
