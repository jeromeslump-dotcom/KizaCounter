import type { Hero } from "../types";

interface HeroFullBodyProps {
  hero: Hero;
  showName?: boolean;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
}

export default function HeroFullBody({
  hero,
  showName = true,
  className = "",
  imageClassName = "",
  loading = "lazy",
}: HeroFullBodyProps) {
  return (
    <div className={["hero-render hero-render-full-body min-w-0", className].join(" ")}>
      <img
        src={`/heroes/${hero.id}.png`}
        alt={hero.name}
        loading={loading}
        className={[
          "hero-render-image hero-render-image-full-body h-auto w-full object-contain",
          imageClassName,
        ].join(" ")}
      />

      {showName && (
        <span className="hero-render-name ui-text-primary block w-full min-w-0 truncate text-center text-xs font-bold">
          {hero.name}
        </span>
      )}
    </div>
  );
}
