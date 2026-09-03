import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import {
  calculateWinRate,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  recommendTeam,
} from "../src/engine/scoring";
import {
  analyzeCore4Plus1,
  core4ReplacementScore,
  findBestCore4,
} from "../src/engine/historicalCore4";
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
    stats: { hp: 0, atk: 0, matk: 0, def: 0, mdef: 0 },
  };
}

describe("recommendation engine history", () => {
  it("calculates win rates correctly", () => {
    expect(calculateWinRate(3, 4)).toBe(75);
    expect(calculateWinRate(0, 0)).toBe(0);
  });

  it("keeps a single historical win eligible for exact history", () => {
    const result = evaluateExactTeamHistory(
      teamA,
      enemy,
      [combat(teamA, true)]
    );

    expect(result).toEqual({
      wins: 1,
      losses: 0,
      battles: 1,
      winRate: 100,
    });
  });

  it("matches historical teams by enemy class composition", () => {
    const heroes = [
      hero("enemy-a", "STR"),
      hero("enemy-b", "STR"),
      hero("enemy-c", "AGI"),
      hero("enemy-d", "INT"),
      hero("enemy-e", "INT"),
      hero("other-a", "STR"),
      hero("other-b", "STR"),
      hero("other-c", "AGI"),
      hero("other-d", "INT"),
      hero("other-e", "INT"),
    ];

    const result = evaluateEnemyClassHistory(
      teamA,
      enemy,
      [
        combat(teamA, true, [
          "other-a",
          "other-b",
          "other-c",
          "other-d",
          "other-e",
        ]),
      ],
      heroes
    );

    expect(result.battles).toBe(1);
    expect(result.wins).toBe(1);
    expect(result.winRate).toBe(100);
    expect(result.classKey).toBe("AGI|INT|INT|STR|STR");
  });
});

describe("recommendTeam priority", () => {
  it("prefers an exact historical winning team before other recommendation sources", () => {
    const heroes = [
      ...teamA.map((id) => hero(id, "STR")),
      ...teamB.map((id) => hero(id, "INT")),
      ...enemy.map((id) => hero(id, "AGI")),
    ];

    let source: string | undefined;

    const result = recommendTeam(
      enemy,
      heroes,
      [combat(teamA, true)],
      (value) => {
        source = value;
      }
    );

    expect(source).toBe("exact-history");
    expect(result.map((hero) => hero.id).sort()).toEqual([...teamA].sort());
  });

  it("chooses the best complete Core4 plus fifth hero, not simply the best Core4", () => {
    const coreATeam = ["a", "b", "c", "d", "x"];
    const coreBWinningTeam = ["a", "b", "c", "e", "y"];
    const coreBLosingTeam = ["a", "b", "c", "e", "z"];

    const combats: Combat[] = [
      ...Array.from({ length: 17 }, () => combat(coreATeam, true)),
      ...Array.from({ length: 3 }, () => combat(coreATeam, false)),
      ...Array.from({ length: 16 }, () => combat(coreBWinningTeam, true)),
      ...Array.from({ length: 4 }, () => combat(coreBLosingTeam, false)),
    ];

    const heroes = [
      ...["a", "b", "c", "d", "e", "x", "y", "z"].map((id) =>
        hero(id, "STR")
      ),
      ...enemy.map((id) => hero(id, "AGI")),
    ];

    let source: string | undefined;

    const result = recommendTeam(
      enemy,
      heroes,
      combats,
      (value) => {
        source = value;
      }
    );

    expect(source).toBe("core4");
    expect(result.map((hero) => hero.id).sort()).toEqual(
      [...coreBWinningTeam].sort()
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
    const historicalTeam = ["class-a", "class-b", "class-c", "class-d", "class-e"];

    const heroes = [
      ...targetEnemy.map((id) => hero(id, "STR")),
      ...historicalEnemy.map((id, index) =>
        hero(id, ["STR", "STR", "AGI", "INT", "INT"][index] as Hero["cls"])
      ),
      ...historicalTeam.map((id) => hero(id, "INT")),
      hero("fallback-a", "AGI"),
    ];

    let source: string | undefined;

    const result = recommendTeam(
      targetEnemy,
      heroes,
      [combat(historicalTeam, true, historicalEnemy)],
      (value) => {
        source = value;
      }
    );

    expect(source).toBe("class-history");
    expect(result.map((hero) => hero.id).sort()).toEqual(
      [...historicalTeam].sort()
    );
  });
});

describe("Core4 historical engine", () => {
  it("uses the shared rational confidence curve", () => {
    const settings = {
      ...DEFAULT_ENGINE_SETTINGS,
      advanced: {
        ...DEFAULT_ENGINE_SETTINGS.advanced,
        core4MinBattles: 1,
        core4MinReplacementBattles: 1,
        core4ConfidenceBattles: 4,
      },
    };

    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true)], settings);

    expect(analyses).toHaveLength(5);
    expect(analyses[0].replacements[0].confidence).toBeCloseTo(1 / 5, 10);
  });

  it("does not accept a Core4 below its minimum battle threshold", () => {
    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true)]);
    expect(analyses).toHaveLength(0);
  });

  it("does not accept a replacement below its minimum battle threshold", () => {
    const combats = [combat(teamA, true), combat(teamA, true)];
    const analyses = analyzeCore4Plus1(enemy, combats);

    expect(analyses).toHaveLength(5);
    expect(analyses.every((analysis) => analysis.replacements.length === 0)).toBe(
      true
    );
  });

  it("calculates replacement score from delta and confidence", () => {
    const combats = [
      combat(teamA, true),
      combat(teamA, true),
      combat(teamA, true),
      combat(["hero-a", "hero-b", "hero-c", "hero-d", "hero-f"], false),
    ];

    const analyses = analyzeCore4Plus1(enemy, combats);
    expect(analyses).toHaveLength(5);

    const replacement = analyses.find((analysis) =>
      analysis.coreIds.includes("hero-e")
    );
    expect(replacement).toBeDefined();

    const expectedConfidence = 3 / 7;
    expect(replacement?.replacements[0]?.confidence).toBeCloseTo(
      expectedConfidence,
      10
    );
  });

  it("finds the best Core4 using the same confidence curve", () => {
    const combats = [
      combat(teamA, true),
      combat(teamA, true),
      combat(teamA, false),
      combat(teamB, true),
      combat(teamB, true),
    ];

    const best = findBestCore4(enemy, combats);
    expect(best).not.toBeNull();
    expect(best?.battles).toBeGreaterThanOrEqual(2);
  });

  it("returns zero for an unavailable Core4 replacement", () => {
    expect(
      core4ReplacementScore(
        enemy,
        teamA.slice(0, 4),
        "hero-z",
        [combat(teamA, true)]
      )
    ).toBe(0);
  });
});
