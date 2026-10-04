import type { Hero } from "../types";
import HeroPortrait from "./HeroPortrait";

interface HeroListItemProps {
  hero: Hero;
  size?: "compact" | "standard" | "large" | "history";
  onClick?: (hero: Hero) => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  layout?: "stacked" | "inline";
}

const SIZE_CLASSES = {
  compact: "h-9 w-9 rounded-md border border-white/10 object-cover",
  standard: "h-12 w-12 rounded-lg border ui-divider object-cover sm:h-16 sm:w-16",
  large:
    "h-14 w-14 rounded-lg border ui-divider object-cover sm:h-20 sm:w-20 sm:rounded-xl",
  history:
    "h-7 w-7 shrink-0 rounded-md border ui-divider object-cover shadow-sm sm:h-[72px] sm:w-[72px] sm:rounded-lg",
} as const;

export default function HeroListItem({
  hero,
  size = "standard",
  onClick,
  selected = false,
  disabled = false,
  className = "",
  layout = "stacked",
}: HeroListItemProps) {
  const content = (
    <>
      <HeroPortrait
        hero={hero}
        showName={false}
        imageClassName={SIZE_CLASSES[size]}
      />
      <span
        className={[
          "ui-text-primary min-w-0 truncate text-[10px] font-bold sm:text-xs",
          layout === "stacked" ? "text-center" : "flex-1",
        ].join(" ")}
      >
        {hero.name}
      </span>
    </>
  );

  const classes = [
    layout === "stacked"
      ? "flex min-w-0 flex-col items-center gap-1"
      : "flex min-w-0 items-center gap-3",
    selected ? "hero-card-selected rounded-lg p-1" : "",
    disabled ? "opacity-45" : "",
    className,
  ].join(" ");

  if (!onClick) {
    return <div className={classes}>{content}</div>;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(hero)}
      className={classes}
    >
      {content}
    </button>
  );
}
