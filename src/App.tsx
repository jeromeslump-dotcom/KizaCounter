// src/App.tsx

import { useEffect, useMemo, useState } from "react";

import { HEROES } from "./data/heroes";
import type { Combat, HeroClassFilter, HeroSort } from "./types";
import HeroGrid from "./components/HeroGrid";
import EnemyPanel from "./components/EnemyPanel";
import CounterModal from "./components/CounterModal";
import AuthPanel from "./auth/AuthPanel";
import useCombatSelection from "./hooks/useCombatSelection";
import { addCombat, loadCombats } from "./storage/combatStorage";
import { getSession, onAuthStateChange } from "./auth/auth";

const TEAM_SIZE = 5;

export default function App() {
  const [combats, setCombats] = useState<Combat[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const {
    enemyIds,
    teamIds,
    showCounterModal,
    enemies,
    team,
    recommendedTeam,
	alternativeTeam,
	selectRecommendedTeam,
    toggleEnemy,
    selectCounterHero,
    clearEnemies,
    resetCombat,
  } = useCombatSelection({ heroes: HEROES, combats });

  const [activeClass, setActiveClass] =
    useState<HeroClassFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] =
    useState<HeroSort>("played");

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const session = await getSession();

        if (!mounted) return;

        const authenticated = Boolean(session);
        setIsAuthenticated(authenticated);

        if (!authenticated) {
          setCombats([]);
          return;
        }

        try {
          const history = await loadCombats();

          if (mounted) {
            setCombats(history);
          }
        } catch (error) {
          console.error(
            "Impossible de charger l'historique des combats :",
            error
          );
        }
      } catch (error) {
        console.error(
          "Impossible de récupérer la session :",
          error
        );

        if (mounted) {
          setIsAuthenticated(false);
          setCombats([]);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = onAuthStateChange((session) => {
      if (!mounted) return;

      const authenticated = Boolean(session);
      setIsAuthenticated(authenticated);

      if (!authenticated) {
        setCombats([]);
        return;
      }

      loadCombats()
        .then((history) => {
          if (mounted) {
            setCombats(history);
          }
        })
        .catch((error) => {
          console.error(
            "Impossible de charger l'historique des combats :",
            error
          );
        });
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

  const enabledHeroIds = useMemo(
    () => new Set(HEROES.map((hero) => hero.id)),
    []
  );

  async function handleSaveCombat(combat: Combat) {
    if (!isAuthenticated) {
      throw new Error(
        "Vous devez être connecté pour enregistrer un combat."
      );
    }

    try {
      const savedCombat = await addCombat(combat);

      setCombats((current) => [
        savedCombat,
        ...current,
      ]);

      resetCombat();
    } catch (error) {
      console.error(
        "Impossible d'enregistrer le combat :",
        error
      );

      throw error;
    }
  }

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="ui-text-primary text-xl font-black tracking-tight sm:text-2xl">
                Lords Mobile Counter
              </h1>

              <p className="ui-text-muted mt-0.5 text-[11px] font-semibold sm:hidden">
                By Kikoine
              </p>

              <p className="ui-text-secondary mt-1 hidden text-sm sm:block">
                Sélectionnez les héros ennemis pour trouver la meilleure
                contre-équipe.
              </p>
            </div>

            <AuthPanel />
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
		onSelectRecommendedTeam={selectRecommendedTeam}
        teamIds={teamIds}
        heroes={HEROES}
        enabledHeroIds={enabledHeroIds}
        activeClass={activeClass}
        query={query}
        sortBy={sortBy}
        usage={heroUsage}
        combats={combats}
        isAuthenticated={isAuthenticated}
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