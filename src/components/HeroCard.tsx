// src/components/HeroCard.tsx

import type { Hero } from "../types";

import SelectionOrderBadge from "./SelectionOrderBadge";

// ============================================================
// PAPIER PEINT DES CARTES SELON LA CLASSE
// ============================================================

const CLASS_GRADIENT: Record<Hero["cls"], string> = {
  STR: "from-rose-900/60 via-red-950/30 to-slate-950/90",
  AGI: "from-emerald-900/60 via-green-950/30 to-slate-950/90",
  INT: "from-sky-900/60 via-blue-950/30 to-slate-950/90",
};

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

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative w-full overflow-hidden rounded-xl border",
        "bg-slate-900/90 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800",
        selected
          ? "border-amber-400 ring-2 ring-amber-400/40"
          : "border-slate-700",
      ].join(" ")}
    >
      {/* ====================================================
          PAPIER PEINT — COULEUR SELON LA CLASSE
          STR = ROUGE / AGI = VERT / INT = BLEU
          ==================================================== */}
      <div
        className={[
          "pointer-events-none absolute inset-0",
          "bg-gradient-to-br",
          CLASS_GRADIENT[hero.cls],
        ].join(" ")}
      />

      <div className="relative z-10 flex min-h-[180px] flex-col">
        {/* ====================================================
            NOM + PSEUDO + CLASSE + ORDRE
            ==================================================== */}
        <div className="flex items-start justify-between gap-2 px-3 pt-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-white sm:text-lg">
              {hero.name}
            </h3>

            {hero.alias && (
              <div className="mt-0.5 truncate text-xs text-slate-400 sm:text-sm">
                {hero.alias}
              </div>
            )}
          </div>

          {/* CLASSE + ORDRE */}
          <div className="flex shrink-0 items-center gap-2">
            {selected && selectionOrder !== undefined && (
              <SelectionOrderBadge order={selectionOrder} />
            )}

            <span
              className={[
                "rounded-md border px-1.5 py-0.5",
                "text-[10px] font-bold tracking-wide",
                hero.cls === "STR"
                  ? "border-rose-400/40 bg-rose-500/10 text-rose-300"
                  : hero.cls === "AGI"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                    : "border-sky-400/40 bg-sky-500/10 text-sky-300",
              ].join(" ")}
            >
              {hero.cls}
            </span>
          </div>
        </div>

        {/* ====================================================
            IMAGE + STATISTIQUES
            ==================================================== */}
        <div className="flex flex-1 items-center px-2 pb-2 pt-2">
          {/* IMAGE */}
          <div className="flex w-[42%] shrink-0 items-center justify-center">
            <img
              src={hero.img}
              alt={hero.name}
              className="h-auto max-h-[125px] w-full object-contain"
              loading="lazy"
            />
          </div>

          {/* STATISTIQUES */}
          <div className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 p-2">
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

// ============================================================
// LIGNE D'UNE STATISTIQUE
// ============================================================

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-semibold tracking-wide text-slate-400">
        {label}
      </span>

      <span className="text-xs font-bold tabular-nums text-slate-100">
        {value.toLocaleString("fr-FR")}
      </span>
    </div>
  );
}