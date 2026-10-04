import type { Hero } from "../types";

interface HeroPortraitProps {
  hero: Hero;
  showName?: boolean;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
}

export default function HeroPortrait({
  hero,
  showName = true,
  className = "",
  imageClassName = "",
  loading = "lazy",
}: HeroPortraitProps) {
  return (
    <div className={["hero-render hero-render-portrait min-w-0", className].join(" ")}>
      <img
        src={`/heroes_portrait/${hero.id}.png`}
        alt={hero.name}
        loading={loading}
        className={[
          "hero-render-image hero-render-image-portrait block aspect-square w-full object-contain",
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
