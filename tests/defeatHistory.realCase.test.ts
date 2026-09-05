import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import { findBestHistoricalDefeatTeam } from "../src/engine/defeatHistory";
import {
  recommendTeamWithSource,
  recommendationSourceLabel,
} from "../src/engine/recommendationSource";

const targetTeam = [
  "wandering_alchemist",
  "songstress_of_the_sea",
  "prince_of_thieves",
  "flower_maiden",
  "steambot",
];

const defeatingTeam = [
  "shield_maiden",
  "snail_princess",
  "songstress_of_the_sea",
  "wandering_alchemist",
  "prince_of_thieves",
];

function hero(id: string): Hero {
  return {
    id,
    name: id,
    alias: id,
    cls: "INT",
    img: "",
    stats: { hp: 0, atk: 0, matk: 0, def: 0, mdef: 0 },
  };
}

function combat(myHeroes: string[], enemyHeroes: string[], won: boolean): Combat {
  return {
    my_heroes: myHeroes,
    enemy_heroes: enemyHeroes,
    won,
  };
}

describe("real inverse defeat case", () => {
  it("returns the exact team that defeated the recorded team", () => {
    const heroes = [...new Set([...targetTeam, ...defeatingTeam])].map(hero);
    const combats = [combat(targetTeam, defeatingTeam, false)];

    const team = findBestHistoricalDefeatTeam(targetTeam, combats, heroes);

    expect(team?.map((hero) => hero.id).sort()).toEqual(
      [...defeatingTeam].sort()
    );
  });

  it("uses defeat history instead of class history for the real case", () => {
    const heroes = [...new Set([...targetTeam, ...defeatingTeam])].map(hero);
    const combats = [combat(targetTeam, defeatingTeam, false)];

    const result = recommendTeamWithSource(targetTeam, heroes, combats);

    expect(result.source).toBe("defeat-history");
    expect(recommendationSourceLabel(result.source)).toBe(
      "Historique des défaites"
    );
    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...defeatingTeam].sort()
    );
  });
});
