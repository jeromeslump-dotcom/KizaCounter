// src/components/HeroCard.tsx

import type { Hero } from "../types";

import SelectionOrderBadge from "./SelectionOrderBadge";

interface HeroCardProps {
  hero: Hero;
  selected?: boolean;
  selectionOrder?: number;
  onClick?: () => void;
}

export default function HeroCard({
  hero,
  selected = false,
  selectionOrder,
  onClick,
}: HeroCardProps) {
  const { stats } = hero;

  // Le roster affiche toujours le full body.
  // Les portraits restent utilisés dans CompactTeam après sélection.
  const rosterImage = `/heroes/${hero.id}.png`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "hero-card-base relative w-full overflow-hidden rounded-xl border text-left transition-all duration-200",
        "hover:-translate-y-0.5 hero-card-hover",
        selected ? "hero-card-selected" : "",
      ].join(" ")}
    >
      <div
        className={`pointer-events-none absolute inset-0 hero-card-wallpaper-${hero.cls.toLowerCase()}`}
      />

      <div className="relative z-10 flex min-h-[180px] flex-col">
        <div className="flex items-start justify-between gap-2 px-3 pt-3">
          <div className="min-w-0">
            <h3 className="ui-text-primary truncate text-sm font-bold sm:text-lg">
              {hero.name}
            </h3>

            {hero.alias && (
              <div className="ui-text-secondary mt-0.5 truncate text-xs sm:text-sm">
                {hero.alias}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {selected && selectionOrder !== undefined && (
              <SelectionOrderBadge order={selectionOrder} />
            )}

            <span
              className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide hero-class-${hero.cls.toLowerCase()}`}
            >
              {hero.cls}
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-center px-2 pb-2 pt-2">
          <div className="flex w-[42%] shrink-0 items-center justify-center">
            <img
              src={rosterImage}
              alt={hero.name}
              className="h-auto max-h-[125px] w-full object-contain"
              loading="lazy"
            />
          </div>

          <div className="ui-card min-w-0 flex-1 rounded-lg border p-2">
            <div className="space-y-1">
              <StatLine label="PV" value={stats.hp} />
              <StatLine label="ATK" value={stats.atk} />
              <StatLine label="MATK" value={stats.matk} />
              <StatLine label="DEF" value={stats.def} />
              <StatLine label="MDEF" value={stats.mdef} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="ui-text-muted text-[10px] font-semibold tracking-wide">
        {label}
      </span>

      <span className="ui-stat-value text-xs font-bold tabular-nums">
        {value.toLocaleString("fr-FR")}
      </span>
    </div>
  );
}
