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
  // ============================================================
  // COMBATS
  // ============================================================

  const [combats, setCombats] = useState<Combat[]>([]);

  // ============================================================
  // AUTH
  // ============================================================

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ============================================================
  // SÉLECTION DU COMBAT
  // ============================================================

  const {
    enemyIds,
    teamIds,
    showCounterModal,
    enemies,
    team,
    recommendedTeam,
    toggleEnemy,
    selectCounterHero,
    clearEnemies,
    resetCombat,
  } = useCombatSelection({
    heroes: HEROES,
    combats,
  });

  // ============================================================
  // FILTRES DU ROSTER
  // ============================================================

  const [activeClass, setActiveClass] = useState<HeroClassFilter>("ALL");

  const [query, setQuery] = useState("");

  const [sortBy, setSortBy] = useState<HeroSort>("played");

  // ============================================================
  // AUTH + CHARGEMENT DES COMBATS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const session = await getSession();

        if (!mounted) {
          return;
        }

        const authenticated = Boolean(session);

        setIsAuthenticated(authenticated);

        // --------------------------------------------------------
        // PAS CONNECTÉ
        // --------------------------------------------------------
        // On ne touche pas à la table combats.
        // Cela évite les erreurs 401 / 42501.
        // --------------------------------------------------------

        if (!authenticated) {
          setCombats([]);
          return;
        }

        // --------------------------------------------------------
        // CONNECTÉ
        // --------------------------------------------------------

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
        console.error("Impossible de récupérer la session :", error);

        if (mounted) {
          setIsAuthenticated(false);
          setCombats([]);
        }
      }
    }

    initialize();

    // ==========================================================
    // CHANGEMENTS DE SESSION
    // ==========================================================

    const {
      data: { subscription },
    } = onAuthStateChange((session) => {
      if (!mounted) {
        return;
      }

      const authenticated = Boolean(session);

      setIsAuthenticated(authenticated);

      // ----------------------------------------------------------
      // DÉCONNEXION
      // ----------------------------------------------------------

      if (!authenticated) {
        setCombats([]);
        return;
      }

      // ----------------------------------------------------------
      // CONNEXION
      // ----------------------------------------------------------

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

  // ============================================================
  // UTILISATION DES HÉROS
  // ============================================================

  const heroUsage = useMemo(() => {
    const usage: Record<string, number> = {};

    for (const combat of combats) {
      for (const heroId of combat.my_heroes ?? []) {
        usage[heroId] = (usage[heroId] ?? 0) + 1;
      }
    }

    return usage;
  }, [combats]);

  // ============================================================
  // HÉROS ACTIVÉS
  // ============================================================

  const enabledHeroIds = useMemo(
    () => new Set(HEROES.map((hero) => hero.id)),
    []
  );

  // ============================================================
  // ENREGISTREMENT WIN / LOSE
  // ============================================================

  async function handleSaveCombat(combat: Combat) {
    // Sécurité côté interface.
    // Supabase/RLS reste la vraie protection.
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

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        {/* ======================================================
            HEADER
            ====================================================== */}

        <header className="mb-4 sm:mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Lords Mobile Counter
              </h1>

              <p className="mt-0.5 text-[11px] font-semibold text-slate-500 sm:hidden">
                By Kikoine
              </p>

              <p className="mt-1 hidden text-sm text-slate-400 sm:block">
                Sélectionnez les héros ennemis pour trouver la meilleure
                contre-équipe.
              </p>
            </div>

            <AuthPanel />
          </div>
        </header>

        {/* ======================================================
            ENNEMIS
            ====================================================== */}

        <div className="mb-6">
          <EnemyPanel
            heroes={enemies}
            maxHeroes={TEAM_SIZE}
            onHeroClick={toggleEnemy}
            onClear={clearEnemies}
            compact
          />
        </div>

        {/* ======================================================
            ROSTER PREMIÈRE PAGE
            ====================================================== */}

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

      {/* ========================================================
          MODALE CONTRE RECOMMANDÉE
          ======================================================== */}

      <CounterModal
        open={showCounterModal}
        enemies={enemies}
        team={team}
        recommendedTeam={recommendedTeam}
        teamIds={teamIds}
        heroes={HEROES}
        enabledHeroIds={enabledHeroIds}
        activeClass={activeClass}
        query={query}
        sortBy={sortBy}
        usage={heroUsage}
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
