import type { Combat, Hero } from "../types";
import { getEngineSettings } from "./engineSettings";
import { calculateHistoricalReliability } from "./historicalScoring";
import { isUsableRecommendationTeam } from "./recommendationGuards";
import { teamKey, uniqueIds } from "./teamUtils";

const TEAM_SIZE = 5;
const CORE_SIZE = 4;

function resolveCandidateTeam(
  heroIds: string[],
  candidateHeroesById: Map<string, Hero>
): Hero[] | null {
  const team = heroIds
    .map((id) => candidateHeroesById.get(id))
    .filter((hero): hero is Hero => Boolean(hero));
  return team.length === TEAM_SIZE ? team : null;
}

/**
 * Recommendation-specific Core4 history.
 *
 * This is intentionally kept separate from historicalCore4.ts: it uses the
 * recommendation-layer rules (4 shared enemy heroes, enabled candidates,
 * excluded team, and recommendation usability checks) and therefore must not
 * be replaced by the generic Core4 analysis.
 */
export function findBestEnabledCore4HistoryTeam(
  enemyIds: string[],
  candidateHeroes: Hero[],
  candidateHeroesById: Map<string, Hero>,
  combats: Combat[],
  excludedTeamKey?: string
): Hero[] | null {
  const targetIds = uniqueIds(enemyIds);
  if (targetIds.length !== TEAM_SIZE) return null;

  const targetSet = new Set(targetIds);
  const enabledIds = new Set(candidateHeroes.map((hero) => hero.id));
  const coreCandidates = new Map<
    string,
    {
      coreIds: string[];
      wins: number;
      losses: number;
      replacements: Map<string, { wins: number; losses: number }>;
    }
  >();
  const coreVariantsByTeamKey = new Map<
    string,
    Array<{ coreIds: string[]; replacement: string; key: string }>
  >();

  for (const combat of combats) {
    const historicalEnemy = uniqueIds(combat.enemy_heroes ?? []);
    if (historicalEnemy.length !== TEAM_SIZE) continue;

    const sharedHeroes = historicalEnemy.filter((id) =>
      targetSet.has(id)
    ).length;
    if (sharedHeroes !== CORE_SIZE) continue;

    const historicalTeam = uniqueIds(combat.my_heroes ?? []);
    if (
      historicalTeam.length !== TEAM_SIZE ||
      !historicalTeam.every((id) => enabledIds.has(id))
    ) {
      continue;
    }

    const historicalTeamKey = teamKey(historicalTeam);
    if (historicalTeamKey === excludedTeamKey) continue;

    let variants = coreVariantsByTeamKey.get(historicalTeamKey);
    if (!variants) {
      variants = [];
      for (let index = 0; index < historicalTeam.length; index++) {
        const coreIds = historicalTeam.filter(
          (_, currentIndex) => currentIndex !== index
        );
        variants.push({
          coreIds,
          replacement: historicalTeam[index],
          key: teamKey(coreIds),
        });
      }
      coreVariantsByTeamKey.set(historicalTeamKey, variants);
    }

    for (const variant of variants) {
      const accumulator = coreCandidates.get(variant.key) ?? {
        coreIds: variant.coreIds,
        wins: 0,
        losses: 0,
        replacements: new Map<string, { wins: number; losses: number }>(),
      };

      if (combat.won) accumulator.wins++;
      else accumulator.losses++;

      const replacementStats = accumulator.replacements.get(
        variant.replacement
      ) ?? {
        wins: 0,
        losses: 0,
      };
      if (combat.won) replacementStats.wins++;
      else replacementStats.losses++;
      accumulator.replacements.set(variant.replacement, replacementStats);
      coreCandidates.set(variant.key, accumulator);
    }
  }

  const settings = getEngineSettings();
  const confidenceBattles = Math.max(
    1,
    settings.advanced.core4ConfidenceBattles
  );

  const rankedCores = [...coreCandidates.values()]
    .filter((core) => core.wins > 0 && core.wins >= core.losses)
    .map((core) => {
      const battles = core.wins + core.losses;
      return {
        core,
        score: calculateHistoricalReliability(
          core.wins,
          core.losses,
          confidenceBattles,
          0,
          1
        ),
        battles,
        key: teamKey(core.coreIds),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.battles - a.battles ||
        b.core.wins - a.core.wins ||
        a.key.localeCompare(b.key)
    );

  for (const rankedCore of rankedCores) {
    const replacements = [...rankedCore.core.replacements.entries()]
      .filter(([, stats]) => stats.wins > 0 && stats.wins >= stats.losses)
      .map(([heroId, stats]) => {
        const battles = stats.wins + stats.losses;
        return {
          heroId,
          score: calculateHistoricalReliability(
            stats.wins,
            stats.losses,
            confidenceBattles,
            0,
            1
          ),
          battles,
          wins: stats.wins,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.battles - a.battles ||
          b.wins - a.wins ||
          a.heroId.localeCompare(b.heroId)
      );

    for (const replacement of replacements) {
      const teamIds = [...rankedCore.core.coreIds, replacement.heroId];
      if (teamIds.length !== TEAM_SIZE) continue;
      if (teamKey(teamIds) === excludedTeamKey) continue;

      const team = resolveCandidateTeam(teamIds, candidateHeroesById);
      if (team && isUsableRecommendationTeam(team, combats, enemyIds))
        return team;
    }
  }

  return null;
}
