import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import {
  findBestHistoricalDefeatTeam,
  findHistoricalDefeatCounters,
} from "../src/engine/defeatHistory";
import {
  recommendTeamWithSource,
  recommendationSourceLabel,
} from "../src/engine/recommendationSource";

const targetTeam = ["lore-weaver", "demon-slayer", "rose-knight", "petite-devil", "black-crow"];
const defeatingTeam = ["lore-weaver", "demon-slayer", "rose-knight", "petite-devil", "tracker"];
const otherDefeatingTeam = ["barbarian", "berserker", "bombin-goblin", "boommeister", "chaos-dragon"];

function combat(myHeroes: string[], enemyHeroes: string[], won: boolean): Combat {
  return {
    my_heroes: myHeroes,
    enemy_heroes: enemyHeroes,
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

function heroesFor(...teams: string[][]): Hero[] {
  const result: Hero[] = [];

  for (const [index, team] of teams.entries()) {
    const cls: Hero["cls"] = index === 0 ? "STR" : index === 1 ? "AGI" : "INT";
    for (const id of team) result.push(hero(id, cls));
  }

  return result;
}

describe("inverse historical defeat engine", () => {
  it("finds the exact opponent team that defeated the current enemy team", () => {
    const combats = [combat(targetTeam, defeatingTeam, false)];
    const candidates = findHistoricalDefeatCounters(
      targetTeam,
      combats,
      heroesFor(targetTeam, defeatingTeam)
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].heroIds.sort()).toEqual([...defeatingTeam].sort());
    expect(candidates[0].losses).toBe(1);
    expect(candidates[0].wins).toBe(0);
    expect(candidates[0].battles).toBe(1);
    expect(candidates[0].lossRate).toBe(1);
    expect(candidates[0].confidence).toBeCloseTo(1 / 5, 10);
  });

  it("uses all exact historical battles against the same opponent team", () => {
    const combats = [
      combat(targetTeam, defeatingTeam, false),
      combat(targetTeam, defeatingTeam, false),
      combat(targetTeam, defeatingTeam, true),
    ];

    const candidates = findHistoricalDefeatCounters(
      targetTeam,
      combats,
      heroesFor(targetTeam, defeatingTeam)
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].losses).toBe(2);
    expect(candidates[0].wins).toBe(1);
    expect(candidates[0].battles).toBe(3);
    expect(candidates[0].lossRate).toBeCloseTo(2 / 3, 10);
    expect(candidates[0].confidence).toBeCloseTo(3 / 7, 10);
  });

  it("ignores incomplete or duplicate historical teams", () => {
    const duplicateTarget = ["lore-weaver", "demon-slayer", "rose-knight", "petite-devil", "lore-weaver"];
    const incompleteOpponent = defeatingTeam.slice(0, 4);
    const combats = [
      combat(duplicateTarget, defeatingTeam, false),
      combat(targetTeam, incompleteOpponent, false),
    ];

    expect(
      findHistoricalDefeatCounters(
        targetTeam,
        combats,
        heroesFor(targetTeam, defeatingTeam)
      )
    ).toEqual([]);
  });

  it("only returns opponent teams whose five heroes are enabled", () => {
    const combats = [combat(targetTeam, otherDefeatingTeam, false)];
    const enabledHeroes = heroesFor(targetTeam, defeatingTeam);

    expect(
      findBestHistoricalDefeatTeam(targetTeam, combats, enabledHeroes)
    ).toBeNull();
  });

  it("integrates the inverse defeat history before class history", () => {
    const heroes = heroesFor(targetTeam, defeatingTeam, otherDefeatingTeam);
    const combats = [combat(targetTeam, defeatingTeam, false)];

    const result = recommendTeamWithSource(targetTeam, heroes, combats);

    expect(result.source).toBe("defeat-history");
    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...defeatingTeam].sort()
    );
    expect(recommendationSourceLabel(result.source)).toBe(
      "Historique des défaites"
    );
  });
});
