import type { Combat, Hero } from "../types";
import { recommendTeam, type RecommendationSource as ScoringRecommendationSource } from "./scoring";
import { getEngineSettings } from "./engineSettings";

export type RecommendationSource = ScoringRecommendationSource | "similar-history";

export interface TeamRecommendation {
  team: Hero[];
  source: RecommendationSource;
}

const TEAM_SIZE = 5;
const MIN_SIMILARITY = 3;

function uniqueIds(ids: string[]): string[] { return [...new Set(ids)]; }
function teamKey(ids: string[]): string { return uniqueIds(ids).sort().join("|"); }

function getClassKey(ids: string[], heroes: Hero[]): string | null {
  const classes = ids.map((id) => heroes.find((hero) => hero.id === id)?.cls).filter((cls): cls is Hero["cls"] => cls === "STR" || cls === "AGI" || cls === "INT");
  if (classes.length !== TEAM_SIZE) return null;
  return [...classes].sort().join("|");
}

function historicalReliability(wins: number, losses: number): number {
  const settings = getEngineSettings();
  const battles = wins + losses;
  if (battles <= 0) return 0;
  const confidenceBattles = Math.max(1, settings.advanced.teamAHistoricalConfidenceBattles);
  const confidence = battles / (battles + confidenceBattles);
  return (wins / battles) * (settings.advanced.teamAHistoricalReliabilityBase + settings.advanced.teamAHistoricalReliabilityConfidenceWeight * confidence);
}

function orderHistoricalCandidates(candidates: Map<string, { heroIds: string[]; wins: number; losses: number }>) {
  return [...candidates.values()].filter((candidate) => candidate.wins > 0).sort((a, b) => historicalReliability(b.wins, b.losses) - historicalReliability(a.wins, a.losses) || b.wins + b.losses - (a.wins + a.losses) || b.wins - a.wins || teamKey(a.heroIds).localeCompare(teamKey(b.heroIds)));
}

function resolveCandidateTeam(heroIds: string[], candidateHeroes: Hero[]): Hero[] | null {
  const team = heroIds.map((id) => candidateHeroes.find((hero) => hero.id === id)).filter((hero): hero is Hero => Boolean(hero));
  return team.length === TEAM_SIZE ? team : null;
}

function findBestEnabledClassHistoryTeam(enemyIds: string[], heroes: Hero[], candidateHeroes: Hero[], combats: Combat[], excludedTeamKey?: string): Hero[] | null {
  const targetClassKey = getClassKey(enemyIds, heroes);
  if (!targetClassKey) return null;
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();
  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE || getClassKey(historicalEnemy, heroes) !== targetClassKey) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE || !heroIds.every((id) => enabledIds.has(id))) continue;
    const key = teamKey(heroIds);
    if (key === excludedTeamKey) continue;
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }
  for (const candidate of orderHistoricalCandidates(candidates)) {
    const team = resolveCandidateTeam(candidate.heroIds, candidateHeroes);
    if (team) return team;
  }
  return null;
}

function findBestEnabledExactHistoryTeam(enemyIds: string[], candidateHeroes: Hero[], combats: Combat[], excludedTeamKey?: string): Hero[] | null {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const targetKey = teamKey(enemyIds);
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number }>();
  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE || teamKey(historicalEnemy) !== targetKey) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE || !heroIds.every((id) => enabledIds.has(id))) continue;
    const key = teamKey(heroIds);
    if (key === excludedTeamKey) continue;
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0 };
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }
  for (const candidate of orderHistoricalCandidates(candidates)) {
    const team = resolveCandidateTeam(candidate.heroIds, candidateHeroes);
    if (team) return team;
  }
  return null;
}

function findBestEnabledSimilarHistoryTeam(enemyIds: string[], candidateHeroes: Hero[], combats: Combat[], excludedTeamKey?: string): Hero[] | null {
  const targetIds = uniqueIds(enemyIds);
  if (targetIds.length !== TEAM_SIZE) return null;
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const targetSet = new Set(targetIds);
  const candidates = new Map<string, { heroIds: string[]; wins: number; losses: number; similarity: number }>();
  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;
    const sharedHeroes = historicalEnemy.filter((id) => targetSet.has(id)).length;
    if (sharedHeroes < MIN_SIMILARITY || sharedHeroes === TEAM_SIZE) continue;
    const heroIds = uniqueIds(combat.my_heroes ?? []);
    if (heroIds.length !== TEAM_SIZE || !heroIds.every((id) => enabledIds.has(id))) continue;
    const key = teamKey(heroIds);
    if (key === excludedTeamKey) continue;
    const candidate = candidates.get(key) ?? { heroIds, wins: 0, losses: 0, similarity: 0 };
    candidate.similarity = Math.max(candidate.similarity, sharedHeroes / TEAM_SIZE);
    combat.won ? candidate.wins++ : candidate.losses++;
    candidates.set(key, candidate);
  }
  return [...candidates.values()].filter((candidate) => candidate.wins > 0).sort((a, b) => b.similarity - a.similarity || historicalReliability(b.wins, b.losses) - historicalReliability(a.wins, a.losses) || b.wins + b.losses - (a.wins + a.losses) || b.wins - a.wins || teamKey(a.heroIds).localeCompare(teamKey(b.heroIds))).map((candidate) => resolveCandidateTeam(candidate.heroIds, candidateHeroes)).find((team): team is Hero[] => Boolean(team)) ?? null;
}

export function findHistoricalAlternativeTeam(enemyIds: string[], heroes: Hero[], candidateHeroes: Hero[], combats: Combat[], excludedTeamIds: string[]): Hero[] | null {
  const excludedKey = teamKey(excludedTeamIds);
  return findBestEnabledExactHistoryTeam(enemyIds, candidateHeroes, combats, excludedKey) ?? findBestEnabledSimilarHistoryTeam(enemyIds, candidateHeroes, combats, excludedKey) ?? findBestEnabledClassHistoryTeam(enemyIds, heroes, candidateHeroes, combats, excludedKey);
}

export function recommendTeamWithSource(enemyIds: string[], heroes: Hero[], combats: Combat[], candidateHeroes: Hero[] = heroes): TeamRecommendation {
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const exactHistoryTeam = findBestEnabledExactHistoryTeam(enemyIds, candidateHeroes, combats);
  if (exactHistoryTeam) return { team: exactHistoryTeam, source: "exact-history" };

  // Proven historical wins take priority over score-only Core4 recommendations.
  const similarHistoryTeam = findBestEnabledSimilarHistoryTeam(enemyIds, candidateHeroes, combats);
  if (similarHistoryTeam) return { team: similarHistoryTeam, source: "similar-history" };

  const historicalClassTeam = findBestEnabledClassHistoryTeam(enemyIds, heroes, candidateHeroes, combats);
  if (historicalClassTeam) return { team: historicalClassTeam, source: "class-history" };

  let source: RecommendationSource = "fallback";
  const team = recommendTeam(enemyIds, candidateHeroes, combats, (detectedSource) => { source = detectedSource; });
  const detectedSource = source as ScoringRecommendationSource;
  const validTeam = team.filter((hero) => enabledIds.has(hero.id));
  return { team: validTeam.length === TEAM_SIZE ? validTeam : [], source: validTeam.length === TEAM_SIZE ? detectedSource : "fallback" };
}

export function recommendationSourceLabel(source: RecommendationSource): string {
  switch (source) {
    case "exact-history": return "Historique exact";
    case "class-history": return "Historique classes";
    case "similar-history": return "Historique similaire";
    case "core4": return "Core4 historique";
    case "counter-usage": return "Counter usage / score";
    case "fallback": return "Fallback";
  }
}
