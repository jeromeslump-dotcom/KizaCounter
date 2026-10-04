import type { ReactNode } from "react";
import type { Hero } from "../types";
import HeroPortrait from "./HeroPortrait";

interface HeroGridItemProps {
  hero: Hero;
  selected?: boolean;
  disabled?: boolean;
  enabled?: boolean;
  showAlias?: boolean;
  status?: ReactNode;
  onClick?: (hero: Hero) => void;
  layout?: "square" | "showcase";
}

export default function HeroGridItem({
  hero,
  selected = false,
  disabled = false,
  enabled = true,
  showAlias = false,
  status,
  onClick,
  layout = "square",
}: HeroGridItemProps) {
  const interactive = Boolean(onClick) && !disabled;

  return (
    <button
      type="button"
      onClick={() => onClick?.(hero)}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        "ui-card relative w-full overflow-hidden rounded-2xl border text-left transition-all",
        interactive ? "hover:scale-[1.02]" : "",
        !enabled ? "opacity-45" : "",
        selected ? "ring-2 ring-[var(--ui-theme)]" : "",
      ].join(" ")}
    >
      <div className="relative p-2.5">
        <div
          className={[
            "relative overflow-hidden rounded-xl bg-[var(--ui-bg)]/20",
            layout === "showcase"
              ? "flex min-h-[150px] items-center justify-center"
              : "aspect-square",
            enabled ? `hero-card-wallpaper-${hero.cls.toLowerCase()}` : "",
          ].join(" ")}
        >
          <HeroPortrait
            hero={hero}
            showName={false}
            imageClassName={[
              layout === "showcase"
                ? "h-auto max-h-[125px] w-full object-contain"
                : "absolute inset-0 h-full w-full object-cover",
              enabled ? "" : "grayscale",
            ].join(" ")}
          />

          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--ui-bg)]/90 to-transparent" />

          <span className="absolute bottom-2 left-2 right-2 line-clamp-1 text-center text-xs font-bold ui-text-primary drop-shadow-lg">
            {hero.name}
          </span>

          {status && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-[var(--ui-bg)]/75 text-xs">
              {status}
            </span>
          )}
        </div>

        {showAlias && (
          <div className="ui-text-soft mt-2 truncate text-center text-[10px] font-semibold sm:text-xs">
            {hero.alias}
          </div>
        )}
      </div>
    </button>
  );
}
