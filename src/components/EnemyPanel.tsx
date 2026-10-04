import type { Hero } from "../types";
import HeroCard from "./HeroCard";
import HeroTeamItem from "./HeroTeamItem";

interface EnemyPanelProps {
  heroes: Hero[];
  onHeroClick?: (hero: Hero) => void;
  onClear?: () => void;
  compact?: boolean;
}

export default function EnemyPanel({
  heroes,
  onHeroClick,
  onClear,
  compact = false,
}: EnemyPanelProps) {
  return (
    <section className="ui-panel is-active w-full rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="ui-text-primary text-base font-bold">
          Ennemis ({heroes.length}/5)
        </h2>

        {onClear && heroes.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="ui-button-sm ui-button-danger"
          >
            Effacer tout
          </button>
        )}
      </div>

      {compact ? (
        heroes.length === 0 ? (
          <div className="ui-panel-empty rounded-lg border border-dashed p-4 text-center">
            <p className="ui-text-muted text-sm">
              Sélectionnez exactement 5 héros ennemis.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-5 justify-center gap-2 sm:flex sm:justify-center sm:gap-3">
            {heroes.map((hero, index) => (
              <HeroTeamItem
                key={hero.id}
                hero={hero}
                order={index + 1}
                onClick={onHeroClick}
                title={`Retirer ${hero.name}`}
              />
            ))}
          </div>
        )
      ) : heroes.length === 0 ? (
        <div className="ui-panel-empty rounded-lg border border-dashed p-6 text-center">
          <p className="ui-text-muted text-sm">
            Sélectionnez exactement 5 héros ennemis.
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
              onClick={onHeroClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
