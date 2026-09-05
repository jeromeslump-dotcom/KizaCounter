import type { Hero } from "../data/heroes";
import type { HeroClassFilter, HeroSort } from "../types";
import HeroGrid from "../components/HeroGrid";
import CompactTeam from "../components/CompactTeam";

interface AnalysisHelpEnemySelectionProps {
  heroes: Hero[];
  selectedEnemies: Hero[];
  enemyIds: string[];
  heroUsage: Record<string, number>;
  activeClass: HeroClassFilter;
  query: string;
  sortBy: HeroSort;
  onQueryChange: (value: string) => void;
  onClassChange: (value: HeroClassFilter) => void;
  onSortChange: (value: HeroSort) => void;
  onHeroClick: (hero: Hero) => void;
  onClear: () => void;
}

export default function AnalysisHelpEnemySelection({
  heroes,
  selectedEnemies,
  enemyIds,
  heroUsage,
  activeClass,
  query,
  sortBy,
  onQueryChange,
  onClassChange,
  onSortChange,
  onHeroClick,
  onClear,
}: AnalysisHelpEnemySelectionProps) {
  return (
    <div className="min-h-0 overflow-y-auto p-3 sm:p-5">
      <div className="ui-panel-alt rounded-2xl border p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="ui-text-primary text-sm font-black">Équipe ennemie à analyser ({enemyIds.length}/5)</div>
          <button type="button" onClick={onClear} className="ui-action rounded-lg border px-3 py-1.5 text-[10px] font-bold transition">Effacer tout</button>
        </div>
        <CompactTeam title="" heroes={selectedEnemies} selectedIds={enemyIds} enemy compactPortrait />
      </div>
      <div className="mt-4">
        <HeroGrid
          heroes={heroes}
          enabledHeroIds={new Set(heroes.map((hero) => hero.id))}
          activeClass={activeClass}
          query={query}
          sortBy={sortBy}
          usage={heroUsage}
          selectedIds={enemyIds}
          onQueryChange={onQueryChange}
          onClassChange={onClassChange}
          onSortChange={onSortChange}
          onHeroClick={onHeroClick}
        />
      </div>
    </div>
  );
}
