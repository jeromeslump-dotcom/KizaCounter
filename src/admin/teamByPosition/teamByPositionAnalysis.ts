import type { Combat } from "../../types";

export interface OrderedFormationStats {
  heroIds: string[];
  wins: number;
  losses: number;
  point: -1 | 0 | 1;
}

export interface PositionHeroRanking {
  heroId: string;
  score: number;
  wins: number;
  losses: number;
  comparisons: number;
}

export interface TeamByPositionAnalysis {
  formations: number;
  comparisons: number;
  rankings: PositionHeroRanking[][];
}

const FORMATION_SIZE = 5;

function formationKey(heroIds: string[]): string {
  return heroIds.join("|");
}

function getFormationPoint(wins: number, losses: number): -1 | 0 | 1 {
  if (wins > losses) return 1;
  if (wins < losses) return -1;
  return 0;
}

export function aggregateOrderedFormations(
  combats: Combat[]
): Map<string, OrderedFormationStats> {
  const formations = new Map<string, OrderedFormationStats>();

  for (const combat of combats) {
    if (combat.my_heroes.length !== FORMATION_SIZE) continue;

    const key = formationKey(combat.my_heroes);
    const current = formations.get(key);

    if (current) {
      if (combat.won) current.wins += 1;
      else current.losses += 1;
      current.point = getFormationPoint(current.wins, current.losses);
      continue;
    }

    const wins = combat.won ? 1 : 0;
    const losses = combat.won ? 0 : 1;

    formations.set(key, {
      heroIds: [...combat.my_heroes],
      wins,
      losses,
      point: getFormationPoint(wins, losses),
    });
  }

  return formations;
}

function contextKey(heroIds: string[], position: number): string {
  return heroIds
    .map((heroId, index) => (index === position ? "__TARGET__" : heroId))
    .join("|");
}



export function applyKnownTeamOrders(
  combats: Combat[],
  teamOrders: Map<string, string[]>
): Combat[] {
  return combats.flatMap((combat) => {
    if (combat.my_heroes.length !== FORMATION_SIZE) return [];

    const orderedHeroIds = teamOrders.get(formationTeamKey(combat.my_heroes));
    if (!orderedHeroIds || orderedHeroIds.length !== FORMATION_SIZE) return [];

    return [{ ...combat, my_heroes: [...orderedHeroIds] }];
  });
}

function formationTeamKey(heroIds: string[]): string {
  return [...new Set(heroIds)].sort().join("|");
}

export interface NeverTestedTeamCandidate {
  teamIds: string[];
  position: number;
  baseHeroId: string;
  baseWon: boolean;
  candidateHeroId: string;
  candidateRank: number;
  candidateScore: number;
}

export function buildNeverTestedTeamCandidates(
  matchingCombats: Combat[],
  rankings: PositionHeroRanking[][]
): NeverTestedTeamCandidate[] {
  const testedTeams = new Set(
    matchingCombats
      .filter((combat) => combat.my_heroes.length === FORMATION_SIZE)
      .map((combat) => formationTeamKey(combat.my_heroes))
  );
  const candidates = new Map<string, NeverTestedTeamCandidate>();

  for (const combat of matchingCombats) {
    if (combat.my_heroes.length !== FORMATION_SIZE) continue;

    for (let position = 0; position < FORMATION_SIZE; position += 1) {
      const baseHeroId = combat.my_heroes[position];
      const baseRank = rankings[position].findIndex(
        (ranking) => ranking.heroId === baseHeroId
      );

      if (baseRank <= 0) continue;

      const teamIds = [...combat.my_heroes];

      for (let candidateRank = 0; candidateRank < baseRank; candidateRank += 1) {
        const ranking = rankings[position][candidateRank];
        if (!ranking || teamIds.includes(ranking.heroId)) continue;

        const proposedTeam = [...teamIds];
        proposedTeam[position] = ranking.heroId;

        if (new Set(proposedTeam).size !== FORMATION_SIZE) continue;

        const candidateKey = formationTeamKey(proposedTeam);
        if (testedTeams.has(candidateKey)) continue;

        const orderedKey = proposedTeam.join("|");
        if (!candidates.has(orderedKey)) {
          candidates.set(orderedKey, {
            teamIds: proposedTeam,
            position,
            baseHeroId,
            baseWon: combat.won,
            candidateHeroId: ranking.heroId,
            candidateRank: candidateRank + 1,
            candidateScore: ranking.score,
          });
        }
      }
    }
  }

  return [...candidates.values()].sort(
    (a, b) =>
      a.candidateRank - b.candidateRank ||
      b.candidateScore - a.candidateScore ||
      a.position - b.position
  );
}

export function analyzeTeamByPosition(
  combats: Combat[]
): TeamByPositionAnalysis {
  const formations = aggregateOrderedFormations(combats);
  const rankings: PositionHeroRanking[][] = Array.from(
    { length: FORMATION_SIZE },
    () => []
  );

  let comparisons = 0;

  for (let position = 0; position < FORMATION_SIZE; position += 1) {
    const contexts = new Map<string, OrderedFormationStats[]>();

    for (const formation of formations.values()) {
      const key = contextKey(formation.heroIds, position);
      const group = contexts.get(key);

      if (group) group.push(formation);
      else contexts.set(key, [formation]);
    }

    const byHero = new Map<string, PositionHeroRanking>();

    for (const group of contexts.values()) {
      if (group.length < 2) continue;

      for (let left = 0; left < group.length - 1; left += 1) {
        for (let right = left + 1; right < group.length; right += 1) {
          const a = group[left];
          const b = group[right];

          if (a.point === b.point) continue;

          comparisons += 1;

          const aHeroId = a.heroIds[position];
          const bHeroId = b.heroIds[position];

          const aRanking = byHero.get(aHeroId) ?? {
            heroId: aHeroId,
            score: 0,
            wins: 0,
            losses: 0,
            comparisons: 0,
          };

          const bRanking = byHero.get(bHeroId) ?? {
            heroId: bHeroId,
            score: 0,
            wins: 0,
            losses: 0,
            comparisons: 0,
          };

          if (a.point > b.point) {
            aRanking.score += 1;
            aRanking.wins += 1;
            bRanking.score -= 1;
            bRanking.losses += 1;
          } else {
            aRanking.score -= 1;
            aRanking.losses += 1;
            bRanking.score += 1;
            bRanking.wins += 1;
          }

          aRanking.comparisons += 1;
          bRanking.comparisons += 1;

          byHero.set(aHeroId, aRanking);
          byHero.set(bHeroId, bRanking);
        }
      }
    }

    rankings[position] = Array.from(byHero.values()).sort(
      (a, b) =>
        b.score - a.score ||
        b.wins - a.wins ||
        b.comparisons - a.comparisons ||
        a.heroId.localeCompare(b.heroId)
    );
  }

  return {
    formations: formations.size,
    comparisons,
    rankings,
  };
}
