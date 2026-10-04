import type { Hero } from "../types";
import HeroPortrait from "./HeroPortrait";

interface HeroTeamItemProps {
  hero: Hero;
  order?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: (hero: Hero) => void;
  title?: string;
}

export default function HeroTeamItem({
  hero,
  order,
  selected = false,
  disabled = false,
  onClick,
  title,
}: HeroTeamItemProps) {
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={() => onClick?.(hero)}
      title={title}
      className={[
        "ui-card ui-hover-theme group relative w-full max-w-[180px] min-w-0 overflow-hidden rounded-lg border transition",
        selected ? "hero-card-selected" : "",
        onClick ? "cursor-pointer" : "cursor-default",
      ].join(" ")}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <HeroPortrait
          hero={hero}
          showName={false}
          imageClassName="h-full w-full object-contain"
        />

        {order !== undefined && (
          <span className="selection-order-badge absolute left-0 top-0 z-20 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-black leading-none shadow sm:left-2 sm:top-2 sm:h-7 sm:w-7 sm:border-2 sm:text-sm">
            {order}
          </span>
        )}
      </div>

      <div className="ui-divider ui-text-primary relative z-10 truncate border-t px-1 py-1.5 text-center text-[9px] font-bold leading-tight sm:px-2 sm:py-2 sm:text-xs">
        {hero.name}
      </div>
    </button>
  );
}
