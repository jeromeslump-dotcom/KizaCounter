import { useMemo, useState } from "react";
import { HEROES } from "../../data/heroes";
import type { Combat } from "../../types";
import {
  analyzeTeamByPosition,
  type PositionHeroRanking,
} from "./teamByPositionAnalysis";

interface TeamByPositionProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  combats: Combat[];
}

const POSITION_LABELS = [
  "Position 1",
  "Position 2",
  "Position 3",
  "Position 4",
  "Position 5",
];

export default function TeamByPosition({
  open,
  onClose,
  onBack,
  combats,
}: TeamByPositionProps) {
  const [position, setPosition] = useState(0);

  const analysis = useMemo(
    () => analyzeTeamByPosition(combats),
    [combats]
  );

  if (!open) return null;

  const rankings = analysis.rankings[position];

  const heroName = (heroId: string) =>
    HEROES.find((hero) => hero.id === heroId)?.name ?? heroId;

  const formatScore = (ranking: PositionHeroRanking) =>
    ranking.score > 0 ? `+${ranking.score}` : String(ranking.score);

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="ui-modal flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-by-position-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-modal-header shrink-0 p-5 sm:p-6">
          <div className="ui-modal-header-inner">
            <div>
              <h2
                id="team-by-position-title"
                className="ui-text-primary text-xl font-black"
              >
                🧪 Team par position
              </h2>
              <p className="ui-text-secondary mt-1 text-xs sm:text-sm">
                Classement indépendant des héros selon leur performance dans
                chaque position historique
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ui-button-icon"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="ui-card rounded-2xl border p-4">
              <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                Combats analysés
              </div>
              <div className="ui-text-primary mt-1 text-xl font-black">
                {combats.length}
              </div>
            </div>
            <div className="ui-card rounded-2xl border p-4">
              <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                Formations ordonnées
              </div>
              <div className="ui-text-primary mt-1 text-xl font-black">
                {analysis.formations}
              </div>
            </div>
            <div className="ui-card rounded-2xl border p-4">
              <div className="ui-text-muted text-[10px] font-black uppercase tracking-wide">
                Comparaisons strictes
              </div>
              <div className="ui-text-primary mt-1 text-xl font-black">
                {analysis.comparisons}
              </div>
            </div>
          </div>

          <div className="ui-card mb-4 rounded-2xl border p-2">
            <div className="grid grid-cols-5 gap-1">
              {POSITION_LABELS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setPosition(index)}
                  className={
                    position === index
                      ? "ui-button-sm ui-button-primary"
                      : "ui-button-sm"
                  }
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="ui-card rounded-2xl border p-4">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="ui-text-primary text-base font-black">
                  {POSITION_LABELS[position]}
                </h3>
                <p className="ui-text-secondary mt-1 text-xs">
                  Les quatre autres héros doivent être identiques et dans les
                  mêmes positions.
                </p>
              </div>
              <span className="ui-text-muted text-[10px]">
                Score : victoire +1 · défaite -1 · égalité 0
              </span>
            </div>

            {!rankings.length ? (
              <div className="ui-text-soft rounded-xl border border-dashed p-8 text-center text-sm">
                Aucune comparaison stricte disponible pour cette position.
              </div>
            ) : (
              <div className="space-y-2">
                {rankings.map((ranking, index) => (
                  <div
                    key={ranking.heroId}
                    className="ui-card flex items-center gap-3 rounded-xl border p-3"
                  >
                    <div className="ui-text-muted w-7 text-center text-sm font-black">
                      #{index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="ui-text-primary truncate text-sm font-black">
                        {heroName(ranking.heroId)}
                      </div>
                      <div className="ui-text-muted mt-0.5 text-[10px]">
                        {ranking.comparisons} comparaison
                        {ranking.comparisons > 1 ? "s" : ""} ·{" "}
                        {ranking.wins} victoire
                        {ranking.wins > 1 ? "s" : ""} · {ranking.losses} défaite
                        {ranking.losses > 1 ? "s" : ""}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="ui-text-primary text-lg font-black">
                        {formatScore(ranking)}
                      </div>
                      <div className="ui-text-muted text-[9px] uppercase">
                        score
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="ui-modal-footer flex shrink-0 justify-between gap-2 px-4 py-3 sm:px-5 sm:py-4">
          <button type="button" onClick={onBack} className="ui-button">
            ← Retour
          </button>
          <button type="button" onClick={onClose} className="ui-button">
            Fermer
          </button>
        </footer>
      </section>
    </div>
  );
}
