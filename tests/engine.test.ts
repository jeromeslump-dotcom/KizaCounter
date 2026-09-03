import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import {
  calculateWinRate,
  evaluateEnemyClassHistory,
  evaluateExactTeamHistory,
  evaluateTeam,
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

function combat(myHeroes: string[], won: boolean, enemyHeroes: string[] = enemy): Combat {
  return { enemy_heroes: enemyHeroes, my_heroes: myHeroes, won };
}

function hero(id: string, cls: Hero["cls"]): Hero {
  return { id, name: id, alias: id, cls, img: "", stats: { hp: 0, atk: 0, matk: 0, def: 0, mdef: 0 } };
}

function withTeamAScoringSettings(
  overrides: Partial<typeof DEFAULT_ENGINE_SETTINGS.teamA>,
  callback: () => void
): void {
  const original = { ...DEFAULT_ENGINE_SETTINGS.teamA };

  Object.assign(DEFAULT_ENGINE_SETTINGS.teamA, overrides);

  try {
    callback();
  } finally {
    Object.assign(DEFAULT_ENGINE_SETTINGS.teamA, original);
  }
}

describe("recommendation engine history", () => {
  it("calculates win rates correctly", () => {
    const result = evaluateExactTeamHistory(teamA, enemy, [combat(teamA, true), combat(teamA, true), combat(teamA, false), combat(teamB, true)]);
    expect(result?.wins).toBe(2);
    expect(result?.losses).toBe(1);
    expect(result?.battles).toBe(3);
    expect(result?.winRate).toBeCloseTo(66.6666667, 5);
  });

  it("keeps a single historical win eligible for exact history", () => {
    const result = evaluateExactTeamHistory(teamA, enemy, [combat(teamA, true)]);
    expect(result).toBeDefined();
    expect(result?.wins).toBe(1);
    expect(result?.battles).toBe(1);
  });

  it("matches historical teams by enemy class composition", () => {
    const targetEnemy = ["enemy-str-1", "enemy-str-2", "enemy-agi", "enemy-int-1", "enemy-int-2"];
    const historicalEnemy = ["other-str-1", "other-str-2", "other-agi", "other-int-1", "other-int-2"];
    const classes: Hero["cls"][] = ["STR", "STR", "AGI", "INT", "INT"];
    const heroes = [
      ...targetEnemy.map((id, index) => hero(id, classes[index])),
      ...historicalEnemy.map((id, index) => hero(id, classes[index])),
      ...teamA.map((id) => hero(id, "INT")),
    ];
    const result = evaluateEnemyClassHistory(teamA, targetEnemy, [combat(teamA, true, historicalEnemy)], heroes);
    expect(result).toBeDefined();
    expect(result?.wins).toBe(1);
    expect(result?.battles).toBe(1);
  });
});

describe("evaluateTeam scoring modules", () => {
  const teamHeroes = teamA.map((id) => hero(id, "STR"));

  it("uses the configured specific-history and general-win-rate budgets", () => {
    const combats = [combat(teamA, true)];

    withTeamAScoringSettings(
      {
        specificHistoryWeight: 1,
        core4Weight: 0,
        generalWinRateWeight: 0,
        specificHistoryPoints: 50,
        core4Points: 30,
        generalWinRatePoints: 20,
      },
      () => {
        const specificOnly = evaluateTeam(teamHeroes, combats, undefined, enemy);
        expect(specificOnly.score).toBeCloseTo(12.5, 10);
      }
    );

    withTeamAScoringSettings(
      {
        specificHistoryWeight: 0,
        core4Weight: 0,
        generalWinRateWeight: 1,
        specificHistoryPoints: 50,
        core4Points: 30,
        generalWinRatePoints: 20,
      },
      () => {
        const generalOnly = evaluateTeam(teamHeroes, combats, undefined, enemy);
        expect(generalOnly.score).toBeCloseTo(20, 10);
      }
    );
  });

  it("changes evaluateTeam when the Team A Core4 budget changes", () => {
    const combats = [combat(teamA, true), combat(teamA, true)];

    let scoreWith30Points = 0;
    let scoreWith60Points = 0;

    withTeamAScoringSettings(
      {
        specificHistoryWeight: 0,
        core4Weight: 1,
        generalWinRateWeight: 0,
        specificHistoryPoints: 50,
        core4Points: 30,
        generalWinRatePoints: 20,
      },
      () => {
        scoreWith30Points = evaluateTeam(teamHeroes, combats, undefined, enemy).score;
      }
    );

    withTeamAScoringSettings(
      {
        specificHistoryWeight: 0,
        core4Weight: 1,
        generalWinRateWeight: 0,
        specificHistoryPoints: 50,
        core4Points: 60,
        generalWinRatePoints: 20,
      },
      () => {
        scoreWith60Points = evaluateTeam(teamHeroes, combats, undefined, enemy).score;
      }
    );

    expect(scoreWith30Points).toBeCloseTo(15, 10);
    expect(scoreWith60Points).toBeCloseTo(30, 10);
    expect(scoreWith60Points).toBeGreaterThan(scoreWith30Points);
  });
});

describe("recommendTeam priority", () => {
  it("prefers an exact historical winning team before other recommendation sources", () => {
    const heroes = [...teamA.map((id) => hero(id, "STR")), ...teamB.map((id) => hero(id, "INT")), ...enemy.map((id) => hero(id, "AGI"))];
    let source: string | undefined;
    const result = recommendTeam(enemy, heroes, [combat(teamA, true)], (value) => { source = value; });
    expect(source).toBe("exact-history");
    expect(result.map((hero) => hero.id).sort()).toEqual([...teamA].sort());
  });

  it("identifies the best complete Core4 plus fifth hero from the historical Core4 analyses", () => {
    const coreATeam = ["a", "b", "c", "d", "x"];
    const coreBWinningTeam = ["a", "b", "c", "e", "y"];
    const coreBLosingTeam = ["a", "b", "c", "e", "z"];
    const combats: Combat[] = [
      ...Array.from({ length: 8 }, () => combat(coreATeam, true)),
      ...Array.from({ length: 12 }, () => combat(coreATeam, false)),
      ...Array.from({ length: 6 }, () => combat(coreBWinningTeam, true)),
      ...Array.from({ length: 14 }, () => combat(coreBLosingTeam, false)),
    ];
    const analyses = analyzeCore4Plus1(enemy, combats);
    expect(analyses.length).toBeGreaterThan(0);
    const coreA = analyses.find((analysis) => analysis.coreIds.includes("d"));
    const coreB = analyses.find((analysis) => analysis.coreIds.includes("e"));
    expect(coreA).toBeDefined();
    expect(coreB).toBeDefined();
    const coreAConfidence = Math.min(coreA!.battles / 4, 1);
    const coreBConfidence = Math.min(coreB!.battles / 4, 1);
    const coreAScore = coreA!.winRate * coreAConfidence;
    const coreBScore = coreB!.winRate * coreBConfidence;
    const replacementB = coreB!.replacements.find((replacement) => replacement.heroId === "y");
    expect(replacementB).toBeDefined();
    expect(coreAScore).toBeGreaterThan(coreBScore);
    const completeBScore = coreBScore + replacementB!.score * 0.3;
    expect(completeBScore).toBeGreaterThan(coreAScore);
  });

  it("uses enemy class history when no exact or Core4 history is available", () => {
    const targetEnemy = ["enemy-str-1", "enemy-str-2", "enemy-agi", "enemy-int-1", "enemy-int-2"];
    const historicalEnemy = ["other-str-1", "other-str-2", "other-agi", "other-int-1", "other-int-2"];
    const historicalTeam = ["class-a", "class-b", "class-c", "class-d", "class-e"];
    const targetClasses: Hero["cls"][] = ["STR", "STR", "AGI", "INT", "INT"];
    const heroes = [
      ...targetEnemy.map((id, index) => hero(id, targetClasses[index])),
      ...historicalEnemy.map((id, index) => hero(id, targetClasses[index])),
      ...historicalTeam.map((id) => hero(id, "INT")),
      hero("fallback-a", "AGI"),
    ];
    let source: string | undefined;
    const result = recommendTeam(targetEnemy, heroes, [combat(historicalTeam, true, historicalEnemy)], (value) => { source = value; });
    expect(source).toBe("class-history");
    expect(result.map((hero) => hero.id).sort()).toEqual([...historicalTeam].sort());
  });
});

describe("Core4 historical engine", () => {
  it("uses the shared rational confidence curve", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, advanced: { ...DEFAULT_ENGINE_SETTINGS.advanced, core4MinBattles: 1, core4MinReplacementBattles: 1, core4ConfidenceBattles: 4 } };
    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true)], settings);
    expect(analyses).toHaveLength(5);
    expect(analyses[0].replacements[0].confidence).toBeCloseTo(1 / 5, 10);
  });

  it("does not accept a Core4 below its minimum battle threshold", () => {
    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true)]);
    expect(analyses).toHaveLength(0);
  });

  it("does not accept a replacement below its minimum battle threshold", () => {
    const alternateTeam = ["hero-a", "hero-b", "hero-c", "hero-d", "hero-f"];
    const settings = { ...DEFAULT_ENGINE_SETTINGS, advanced: { ...DEFAULT_ENGINE_SETTINGS.advanced, core4MinBattles: 1, core4MinReplacementBattles: 2 } };
    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true), combat(alternateTeam, false)], settings);
    expect(analyses).toHaveLength(9);
    expect(analyses.every((analysis) => analysis.replacements.length === 0)).toBe(true);
  });

  it("calculates replacement score from delta and confidence", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, advanced: { ...DEFAULT_ENGINE_SETTINGS.advanced, core4MinBattles: 1, core4MinReplacementBattles: 1, core4ConfidenceBattles: 4 } };
    const analyses = analyzeCore4Plus1(enemy, [combat(teamA, true), combat(teamA, false)], settings);
    const replacement = analyses[0].replacements[0];
    expect(replacement.delta).toBe(0);
    expect(replacement.confidence).toBeCloseTo(2 / 6, 10);
    expect(replacement.score).toBeCloseTo(replacement.delta * replacement.confidence, 10);
  });

  it("finds the best Core4 using the same confidence curve", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, advanced: { ...DEFAULT_ENGINE_SETTINGS.advanced, core4MinBattles: 1, core4MinReplacementBattles: 1, core4ConfidenceBattles: 4 } };
    const result = findBestCore4(enemy, [combat(teamA, true), combat(teamA, false)], settings);
    expect(result).toBeDefined();
    const confidence = result!.battles / (result!.battles + settings.advanced.core4ConfidenceBattles);
    expect(confidence).toBeCloseTo(2 / 6, 10);
  });

  it("returns zero for an unavailable Core4 replacement", () => {
    const settings = { ...DEFAULT_ENGINE_SETTINGS, advanced: { ...DEFAULT_ENGINE_SETTINGS.advanced, core4MinBattles: 1, core4MinReplacementBattles: 2 } };
    const result = core4ReplacementScore(enemy, ["missing-a", "missing-b", "missing-c", "missing-d"], "missing-e", [combat(teamA, true)], settings);
    expect(result).toBe(0);
  });
});
