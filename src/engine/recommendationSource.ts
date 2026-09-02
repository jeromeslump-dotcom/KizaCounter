import type { Combat, Hero } from "../types";
import { analyzeCore4Plus1, findBestCore4 } from "./historicalCore4";
import { findBestHistoricalTeam, recommendTeam } from "./scoring";
import { getEngineSettings } from "./engineSettings";

export type RecommendationSource = "exact-history" | "class-history" | "core4" | "counter-usage" | "fallback";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

function teamKey(ids: string[]): string {
  return [...new Set(ids)].sort().join("|");
}

function sameTeam(first: Hero[], second: Hero[]): boolean {
  return teamKey(first.map((hero) => hero.id)) === teamKey(second.map((hero) => hero.id));
}

function enemyClassKey(enemyIds: string[], heroes: Hero[]): string | null {
  const classes = enemyIds.map((id) => heroes.find((hero) => hero.id === id)?.cls);
  if (classes.length !== 5 || classes.some((cls) => !cls)) return null;
  return [...classes].sort().join("|");
}

// Reproduit exactement le classement de findBestHistoricalClassTeam
// pour identifier la vraie source sans modifier le moteur existant.
function findBestHistoricalClassTeam(enemyIds: string[], combats: Combat[], heroes: Hero[]): Hero[] | null {
  const target = enemyClassKey(enemyIds, heroes);
  if (!target) return null;

  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();

  for (const combat of combats) {
    const historicalEnemy = [...new Set(combat.enemy_heroes ?? [])];
    if (historicalEnemy.length !== 5 || enemyClassKey(historicalEnemy, heroes) !== target) continue;

    const heroIds = [...new Set(combat.my_heroes ?? [])];
    if (heroIds.length !== 5) continue;

    const key = teamKey(heroIds);
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }

  const ordered = [...candidates.values()]
    .filter((candidate) => candidate.wins > 0)
    .sort((a, b) => {
      const ar = a.wins / (a.wins + a.losses);
      const br = b.wins / (b.wins + b.losses);
      return br - ar || (b.wins + b.losses) - (a.wins + a.losses) || b.wins - a.wins || teamKey(a.heroIds).localeCompare(teamKey(b.heroIds));
    });

  for (const candidate of ordered) {
    const team = candidate.heroIds.map((id) => heroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero));
    if (team.length === 5) return team;
  }

  return null;
}

export function recommendTeamWithSource(enemyIds: string[], heroes: Hero[], combats: Combat[]): TeamRecommendation {
  const team = recommendTeam(enemyIds, heroes, combats);
  if (team.length !== 5) return { team, source: "fallback" };

  const exact = findBestHistoricalTeam(enemyIds, combats, heroes);
  if (exact && exact.length === 5 && sameTeam(team, exact)) return { team, source: "exact-history" };

  const classTeam = findBestHistoricalClassTeam(enemyIds, combats, heroes);
  const enemySet = new Set(enemyIds);
  if (classTeam && classTeam.length === 5 && classTeam.every((hero) => !enemySet.has(hero.id)) && sameTeam(team, classTeam)) {
    return { team, source: "class-history" };
  }

  const settings = getEngineSettings();
  const bestCore4 = findBestCore4(enemyIds, combats, settings);
  if (bestCore4 && bestCore4.coreIds.length === 4 && bestCore4.coreIds.every((id) => team.some((hero) => hero.id === id))) {
    return { team, source: "core4" };
  }

  const core4Analyses = analyzeCore4Plus1(enemyIds, combats, settings);
  if (core4Analyses.some((core) => core.coreIds.length === 4 && core.battles > 0 && core.coreIds.every((id) => team.some((hero) => hero.id === id)))) {
    return { team, source: "core4" };
  }

  return { team, source: "counter-usage" };
}

export function recommendationSourceLabel(source: RecommendationSource): string {
  switch (source) {
    case "exact-history": return "Historique exact";
    case "class-history": return "Historique classes";
    case "core4": return "Core4 historique";
    case "counter-usage": return "Counter usage / score";
    case "fallback": return "Fallback";
  }
}
