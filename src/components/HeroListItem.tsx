import type { Hero } from "../types";
import HeroPortrait from "./HeroPortrait";

interface HeroListItemProps {
  hero: Hero;
  size?: "compact" | "standard" | "large";
  onClick?: (hero: Hero) => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  compact:
    "h-9 w-9 rounded-md border border-white/10 object-cover",
  standard:
    "h-12 w-12 rounded-lg border ui-divider object-cover sm:h-16 sm:w-16",
  large:
    "h-14 w-14 rounded-lg border ui-divider object-cover sm:h-20 sm:w-20 sm:rounded-xl",
} as const;

export default function HeroListItem({
  hero,
  size = "standard",
  onClick,
  selected = false,
  disabled = false,
  className = "",
}: HeroListItemProps) {
  const content = (
    <>
      <HeroPortrait
        hero={hero}
        showName={false}
        imageClassName={SIZE_CLASSES[size]}
      />
      <span className="ui-text-primary min-w-0 truncate text-center text-[10px] font-bold sm:text-xs">
        {hero.name}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div
        className={[
          "flex min-w-0 flex-col items-center gap-1",
          selected ? "hero-card-selected rounded-lg p-1" : "",
          disabled ? "opacity-45" : "",
          className,
        ].join(" ")}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(hero)}
      className={[
        "flex min-w-0 flex-col items-center gap-1",
        selected ? "hero-card-selected rounded-lg p-1" : "",
        disabled ? "opacity-45" : "",
        className,
      ].join(" ")}
    >
      {content}
    </button>
  );
}
