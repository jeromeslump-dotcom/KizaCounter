import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import {
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
} from "../src/engine/historicalScoring";
import { recommendTeamWithSource } from "../src/engine/recommendationSource";
import { DEFAULT_ENGINE_SETTINGS } from "../src/engine/engineSettings";

const enemy = ["enemy-a", "enemy-b", "enemy-c", "enemy-d", "enemy-e"];
const teamA = ["hero-a", "hero-b", "hero-c", "hero-d", "hero-e"];
const teamB = ["hero-f", "hero-g", "hero-h", "hero-i", "hero-j"];

function combat(
  myHeroes: string[],
  won: boolean,
  enemyHeroes: string[] = enemy
): Combat {
  return {
    enemy_heroes: enemyHeroes,
    my_heroes: myHeroes,
    won,
  };
}

function hero(id: string, cls: Hero["cls"]): Hero {
  return {
    id,
    name: id,
    alias: id,
    cls,
    img: "",
    stats: {
      hp: 0,
      atk: 0,
      matk: 0,
      def: 0,
      mdef: 0,
    },
  };
}

describe("recommendation engine history", () => {
  it("calculates win rates correctly", () => {
    const result = evaluateExactTeamHistory(teamA, enemy, [
      combat(teamA, true),
      combat(teamA, true),
      combat(teamA, false),
      combat(teamB, true),
    ]);

    expect(result?.wins).toBe(2);
    expect(result?.losses).toBe(1);
    expect(result?.battles).toBe(3);
    expect(result?.winRate).toBeCloseTo(66.6666667, 5);
  });

  it("keeps a single historical win eligible for exact history", () => {
    const result = evaluateExactTeamHistory(teamA, enemy, [
      combat(teamA, true),
    ]);

    expect(result).toBeDefined();
    expect(result?.wins).toBe(1);
    expect(result?.battles).toBe(1);
  });

  it("matches historical teams by enemy class composition", () => {
    const targetEnemy = [
      "enemy-str-1",
      "enemy-str-2",
      "enemy-agi",
      "enemy-int-1",
      "enemy-int-2",
    ];

    const historicalEnemy = [
      "other-str-1",
      "other-str-2",
      "other-agi",
      "other-int-1",
      "other-int-2",
    ];

    const classes: Hero["cls"][] = [
      "STR",
      "STR",
      "AGI",
      "INT",
      "INT",
    ];

    const heroes = [
      ...targetEnemy.map((id, index) => hero(id, classes[index])),
      ...historicalEnemy.map((id, index) => hero(id, classes[index])),
      ...teamA.map((id) => hero(id, "INT")),
    ];

    const result = evaluateEnemyClassHistory(
      teamA,
      targetEnemy,
      [combat(teamA, true, historicalEnemy)],
      heroes
    );

    expect(result).toBeDefined();
    expect(result?.wins).toBe(1);
    expect(result?.battles).toBe(1);
  });

  it("does not let a 100% class-history team on 2 battles beat an 85% team on 15 battles", () => {
    const targetEnemy = [
      "target-str-1",
      "target-str-2",
      "target-agi",
      "target-int-1",
      "target-int-2",
    ];

    const historicalEnemy = [
      "history-str-1",
      "history-str-2",
      "history-agi",
      "history-int-1",
      "history-int-2",
    ];

    const targetClasses: Hero["cls"][] = [
      "STR",
      "STR",
      "AGI",
      "INT",
      "INT",
    ];

    const heroes = [
      ...targetEnemy.map((id, index) =>
        hero(id, targetClasses[index])
      ),
      ...historicalEnemy.map((id, index) =>
        hero(id, targetClasses[index])
      ),
      ...teamA.map((id) => hero(id, "STR")),
      ...teamB.map((id) => hero(id, "AGI")),
    ];

    const combats: Combat[] = [
      combat(teamA, true, historicalEnemy),
      combat(teamA, true, historicalEnemy),
      ...Array.from({ length: 13 }, () =>
        combat(teamB, true, historicalEnemy)
      ),
      ...Array.from({ length: 2 }, () =>
        combat(teamB, false, historicalEnemy)
      ),
    ];

    const originalAdvanced = {
      ...DEFAULT_ENGINE_SETTINGS.advanced,
    };

    try {
      Object.assign(DEFAULT_ENGINE_SETTINGS.advanced, {
        core4MinBattles: 100,
      });

      const result = recommendTeamWithSource(
        targetEnemy,
        heroes,
        combats
      );

      expect(result.team.map((hero) => hero.id).sort()).toEqual(
        [...teamB].sort()
      );
      expect(result.source).toBe("class-history");

      const teamAHistory = evaluateEnemyClassHistory(
        teamA,
        targetEnemy,
        combats,
        heroes
      );

      const teamBHistory = evaluateEnemyClassHistory(
        teamB,
        targetEnemy,
        combats,
        heroes
      );

      const confidenceBattles =
        DEFAULT_ENGINE_SETTINGS.advanced
          .historicalConfidenceBattles;

      const reliability = (
        wins: number,
        battles: number
      ) =>
        (wins / battles) *
        (DEFAULT_ENGINE_SETTINGS.advanced
          .historicalReliabilityBase +
          DEFAULT_ENGINE_SETTINGS.advanced
            .historicalReliabilityConfidenceWeight *
          (battles /
            (battles + confidenceBattles)));

      expect(teamAHistory.winRate).toBe(100);
      expect(teamAHistory.battles).toBe(2);

      expect(teamBHistory.winRate).toBeCloseTo(
        86.6666667,
        5
      );

      expect(teamBHistory.battles).toBe(15);

      expect(
        reliability(
          teamBHistory.wins,
          teamBHistory.battles
        )
      ).toBeGreaterThan(
        reliability(
          teamAHistory.wins,
          teamAHistory.battles
        )
      );
    } finally {
      Object.assign(
        DEFAULT_ENGINE_SETTINGS.advanced,
        originalAdvanced
      );
    }
  });
});

describe("recommendTeamWithSource priority", () => {
  it("prefers an exact historical winning team before other recommendation sources", () => {
    const heroes = [
      ...teamA.map((id) => hero(id, "STR")),
      ...teamB.map((id) => hero(id, "INT")),
      ...enemy.map((id) => hero(id, "AGI")),
    ];

    const result = recommendTeamWithSource(
      enemy,
      heroes,
      [combat(teamA, true)]
    );

    expect(result.source).toBe("exact-history");

    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...teamA].sort()
    );
  });

  it("uses enemy class history when no exact or Core4 history is available", () => {
    const targetEnemy = [
      "enemy-str-1",
      "enemy-str-2",
      "enemy-agi",
      "enemy-int-1",
      "enemy-int-2",
    ];

    const historicalEnemy = [
      "other-str-1",
      "other-str-2",
      "other-agi",
      "other-int-1",
      "other-int-2",
    ];

    const historicalTeam = [
      "class-a",
      "class-b",
      "class-c",
      "class-d",
      "class-e",
    ];

    const targetClasses: Hero["cls"][] = [
      "STR",
      "STR",
      "AGI",
      "INT",
      "INT",
    ];

    const heroes = [
      ...targetEnemy.map((id, index) =>
        hero(id, targetClasses[index])
      ),
      ...historicalEnemy.map((id, index) =>
        hero(id, targetClasses[index])
      ),
      ...historicalTeam.map((id) =>
        hero(id, "INT")
      ),
      hero("fallback-a", "AGI"),
    ];

    const result = recommendTeamWithSource(
      targetEnemy,
      heroes,
      [
        combat(
          historicalTeam,
          true,
          historicalEnemy
        ),
      ]
    );

    expect(result.source).toBe("class-history");

    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...historicalTeam].sort()
    );
  });
});
