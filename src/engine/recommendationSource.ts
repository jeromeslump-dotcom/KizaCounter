import type { Combat, Hero } from "../types";
import { recommendTeam, type RecommendationSource } from "./scoring";
import { getEngineSettings } from "./engineSettings";

export type { RecommendationSource } from "./scoring";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function teamKey(ids: string[]): string {
  return uniqueIds(ids).sort().join("|");
}

function getClassKey(ids: string[], heroes: Hero[]): string | null {
  const classes = ids
    .map((id) => heroes.find((hero) => hero.id === id)?.cls)
    .filter(
      (cls): cls is Hero["cls"] =>
        cls === "STR" || cls === "AGI" || cls === "INT"
    );

  if (classes.length !== TEAM_SIZE) return null;

  return [...classes].sort().join("|");
}

function findBestEnabledClassHistoryTeam(
  enemyIds: string[],
  heroes: Hero[],
  candidateHeroes: Hero[],
  combats: Combat[]
): Hero[] | null {
  const targetClassKey = getClassKey(enemyIds, heroes);

  if (!targetClassKey) return null;

  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<
    string,
    { heroIds: string[]; wins: number; losses: number }
  >();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);

    if (historicalEnemy.length !== TEAM_SIZE) continue;
    if (getClassKey(historicalEnemy, heroes) !== targetClassKey) continue;

    const heroIds = uniqueIds(combat.my_heroes ?? []);

    if (heroIds.length !== TEAM_SIZE) continue;
    if (!heroIds.every((id) => enabledIds.has(id))) continue;

    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? {
      heroIds,
      wins: 0,
      losses: 0,
    };

    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.teamAHistoricalConfidenceBattles
  );

  const ordered = [...candidates.values()]
    .filter((candidate) => candidate.wins > 0)
    .sort((a, b) => {
      const aBattles = a.wins + a.losses;
      const bBattles = b.wins + b.losses;

      const aReliability =
        aBattles > 0
          ? (a.wins / aBattles) *
            (settings.advanced.teamAHistoricalReliabilityBase +
              settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
                (aBattles / (aBattles + confidenceBattles)))
          : 0;

      const bReliability =
        bBattles > 0
          ? (b.wins / bBattles) *
            (settings.advanced.teamAHistoricalReliabilityBase +
              settings.advanced.teamAHistoricalReliabilityConfidenceWeight *
                (bBattles / (bBattles + confidenceBattles)))
          : 0;

      return (
        bReliability - aReliability ||
        bBattles - aBattles ||
        b.wins - a.wins ||
        teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))
      );
    });

  for (const candidate of ordered) {
    const team = candidate.heroIds
      .map((id) => candidateHeroes.find((hero) => hero.id === id))
      .filter((hero): hero is Hero => Boolean(hero));

    if (team.length === TEAM_SIZE) return team;
  }

  return null;
}

export function recommendTeamWithSource(
  enemyIds: string[],
  heroes: Hero[],
  combats: Combat[],
  candidateHeroes: Hero[] = heroes
): TeamRecommendation {
  let source: RecommendationSource = "fallback";

  // IMPORTANT : heroes = catalogue complet pour résoudre les classes
  // des ennemis et des historiques. candidateHeroes = seuls héros
  // autorisés dans l'équipe recommandée.
  const team = recommendTeam(
    enemyIds,
    candidateHeroes,
    combats,
    (detectedSource) => {
      source = detectedSource;
    }
  );

  // Le callback est exécuté par le moteur pendant l'appel ci-dessus.
  // Cette assertion évite que TypeScript considère "source" comme
  // définitivement égal à sa valeur d'initialisation.
  const detectedSource = source as RecommendationSource;

  // Le moteur principal reçoit le pool activé. Si aucun candidat exact,
  // Core4 ou usage n'a produit une équipe, on réévalue ici l'historique
  // de classes avec le catalogue complet pour résoudre les classes des
  // ennemis, tout en exigeant que les 5 héros proposés soient activés.
  if (detectedSource !== "exact-history" && detectedSource !== "core4") {
    const historicalClassTeam = findBestEnabledClassHistoryTeam(
      enemyIds,
      heroes,
      candidateHeroes,
      combats
    );

    if (historicalClassTeam && historicalClassTeam.length === TEAM_SIZE) {
      return {
        team: historicalClassTeam,
        source: "class-history",
      };
    }
  }

  // Sécurité finale : aucune recommandation ne doit contenir un héros
  // désactivé et aucune équipe partielle ne doit être renvoyée.
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const validTeam = team.filter((hero) => enabledIds.has(hero.id));

  return {
    team: validTeam.length === TEAM_SIZE ? validTeam : [],
    source: validTeam.length === TEAM_SIZE ? detectedSource : "fallback",
  };
}

export function recommendationSourceLabel(
  source: RecommendationSource
): string {
  switch (source) {
    case "exact-history":
      return "Historique exact";

    case "class-history":
      return "Historique classes";

    case "core4":
      return "Core4 historique";

    case "counter-usage":
      return "Counter usage / score";

    case "fallback":
      return "Fallback";
  }
}
