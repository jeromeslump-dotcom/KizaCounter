// src/App.tsx

import { useEffect, useMemo, useState } from "react";

import packageJson from "../package.json";
import { HEROES } from "./data/heroes";
import type { Combat, HeroClassFilter, HeroSort } from "./types";
import HeroGrid from "./components/HeroGrid";
import EnemyPanel from "./components/EnemyPanel";
import CounterModal from "./components/CounterModal";
import AuthPanel from "./auth/AuthPanel";
import useCombatSelection from "./hooks/useCombatSelection";
import { addCombat, loadCombats } from "./storage/combatStorage";
import { getSession, onAuthStateChange } from "./auth/auth";
import { getCurrentUserProfile, type UserProfile } from "./admin/adminAccess";
import HeroManager from "./heroManager/HeroManager";
import useHeroManager from "./heroManager/useHeroManager";

const TEAM_SIZE = 5;
const BUILD_VERSION = packageJson.version;

export default function App() {
  const [combats, setCombats] = useState<Combat[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showHeroManager, setShowHeroManager] = useState(false);

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
    let mounted = true;

    async function applySession(session: Awaited<ReturnType<typeof getSession>>) {
      if (!mounted) return;

      const authenticated = Boolean(session);
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        setUserProfile(null);
        setCombats([]);
        return;
      }

      const profile = await getCurrentUserProfile(session);
      if (!mounted) return;

      setUserProfile(profile);

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

    async function initialize() {
      try {
        const session = await getSession();
        await applySession(session);
      } catch (error) {
        console.error("Impossible de récupérer la session :", error);
        if (mounted) {
          setIsAuthenticated(false);
          setUserProfile(null);
          setCombats([]);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = onAuthStateChange((session) => {
      void applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const heroUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const combat of combats) {
      for (const heroId of combat.my_heroes ?? []) {
        usage[heroId] = (usage[heroId] ?? 0) + 1;
      }
    }
    return usage;
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
    Boolean(userProfile?.active) &&
    (userProfile?.role === "user" ||
      userProfile?.role === "contributor" ||
      userProfile?.role === "admin");

  const canViewCombatCounts = userProfile?.role === "admin";

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
                <span className="ui-text-muted ml-1 text-[11px] font-semibold sm:ml-2">
                  by kikoine
                </span>
                <span className="ml-1 text-[11px] font-semibold text-rose-500 sm:ml-2">
                  BUILD {BUILD_VERSION}
                </span>
              </h1>
              <p className="ui-text-secondary mt-1 hidden text-sm sm:block">
                Sélectionnez les héros ennemis pour trouver la meilleure
                contre-équipe.
              </p>
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
        isAuthenticated={canViewCombatCounts}
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
