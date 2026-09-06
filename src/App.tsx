// src/App.tsx

import { useEffect, useMemo, useState } from "react";

import { HEROES } from "./data/heroes";
import type { Combat, HeroClassFilter, HeroSort } from "./types";
import HeroGrid from "./components/HeroGrid";
import EnemyPanel from "./components/EnemyPanel";
import CounterModal from "./components/CounterModal";
import AuthPanel from "./auth/AuthPanel";
import useAuthSession from "./auth/useAuthSession";
import useCombatSelection from "./hooks/useCombatSelection";
import { addCombat, loadCombats } from "./storage/combatStorage";
import HeroManager from "./heroManager/HeroManager";
import useHeroManager from "./heroManager/useHeroManager";
import { calculateHeroUsage } from "./engine/historicalScoring";

const TEAM_SIZE = 5;
const BUILD_VERSION = __BUILD_VERSION__;

export default function App() {
  const [combats, setCombats] = useState<Combat[]>([]);
  const [showHeroManager, setShowHeroManager] = useState(false);
  const { session, profile } = useAuthSession();
  const isAuthenticated = Boolean(session);

  const {
    enabledHeroIds,
    activeCount,
    totalCount,
    toggleHero,
    enableAll,
    disableAll,
  } = useHeroManager();

  const {
    enemyIds,
    teamIds,
    showCounterModal,
    enemies,
    team,
    recommendedTeam,
    alternativeTeam,
    recommendationSource,
    selectRecommendedTeam,
    toggleEnemy,
    selectCounterHero,
    clearEnemies,
    resetCombat,
  } = useCombatSelection({ heroes: HEROES, combats, enabledHeroIds });

  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<HeroSort>("played");

  useEffect(() => {
    if (!session) {
      setCombats([]);
      return;
    }

    let mounted = true;

    async function loadHistory() {
      try {
        const history = await loadCombats();
        if (mounted) setCombats(history);
      } catch (error) {
        console.error(
          "Impossible de charger l'historique des combats :",
          error
        );
      }
    }

    void loadHistory();

    return () => {
      mounted = false;
    };
  }, [session]);

  const heroUsage = useMemo(() => {
    const usage = calculateHeroUsage(combats, HEROES);
    return Object.fromEntries(
      Object.entries(usage).map(([heroId, stats]) => [heroId, stats.total])
    );
  }, [combats]);

  async function handleSaveCombat(combat: Combat) {
    if (!isAuthenticated) {
      throw new Error("Vous devez être connecté pour enregistrer un combat.");
    }

    try {
      const savedCombat = await addCombat(combat);
      setCombats((current) => [savedCombat, ...current]);
      resetCombat();
    } catch (error) {
      console.error("Impossible d'enregistrer le combat :", error);
      throw error;
    }
  }

  const canManageHeroes =
    isAuthenticated &&
    Boolean(profile?.active) &&
    (profile?.role === "user" ||
      profile?.role === "contributor" ||
      profile?.role === "admin");

  const canViewDetailedHistory = profile?.role === "admin";

  return (
    <main className="app-shell min-h-screen">
      <HeroManager
        open={showHeroManager}
        enabledHeroIds={enabledHeroIds}
        activeCount={activeCount}
        totalCount={totalCount}
        onToggleHero={toggleHero}
        onEnableAll={enableAll}
        onDisableAll={disableAll}
        onClose={() => setShowHeroManager(false)}
      />

      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="ui-text-primary text-xl font-black tracking-tight sm:text-2xl">
                Lords Mobile Counter
              </h1>
              <div className="ui-text-muted mt-0.5 text-[11px] font-normal">
                by kikoine
                <span className="ml-2 bg-gradient-to-r from-rose-300 via-rose-500 to-rose-700 bg-clip-text font-normal text-transparent">
                  BUILD {BUILD_VERSION}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManageHeroes && (
                <button
                  type="button"
                  onClick={() => setShowHeroManager(true)}
                  className="ui-action rounded-lg border px-3 py-2 text-xs font-bold transition"
                >
                  ⚙️ Gérer les héros
                </button>
              )}
              <AuthPanel />
            </div>
          </div>
        </header>

        <div className="mb-6">
          <EnemyPanel
            heroes={enemies}
            maxHeroes={TEAM_SIZE}
            onHeroClick={toggleEnemy}
            onClear={clearEnemies}
            compact
          />
        </div>

        <div className="mb-6">
          <HeroGrid
            heroes={HEROES}
            enabledHeroIds={enabledHeroIds}
            enabledOnly={false}
            activeClass={activeClass}
            query={query}
            sortBy={sortBy}
            usage={heroUsage}
            selectedIds={enemyIds}
            onQueryChange={setQuery}
            onClassChange={setActiveClass}
            onSortChange={setSortBy}
            onHeroClick={toggleEnemy}
          />
        </div>
      </div>

      <CounterModal
        open={showCounterModal}
        enemies={enemies}
        team={team}
        recommendedTeam={recommendedTeam}
        alternativeTeam={alternativeTeam}
        recommendationSource={recommendationSource}
        onSelectRecommendedTeam={selectRecommendedTeam}
        teamIds={teamIds}
        heroes={HEROES}
        enabledHeroIds={enabledHeroIds}
        activeClass={activeClass}
        query={query}
        sortBy={sortBy}
        usage={heroUsage}
        combats={combats}
        canViewDetailedHistory={canViewDetailedHistory}
        onClose={resetCombat}
        onHeroClick={selectCounterHero}
        onQueryChange={setQuery}
        onClassChange={setActiveClass}
        onSortChange={setSortBy}
        onSave={handleSaveCombat}
      />
    </main>
  );
}
