import { describe, expect, it } from "vitest";

import { findHistoricalAlternativeTeam, recommendTeamWithSource } from "../src/engine/recommendationSource";
import type { Combat, Hero } from "../src/types";

function combat(
  myHeroes: string[],
  enemyHeroes: string[],
  won: boolean
): Combat {
  return { my_heroes: myHeroes, enemy_heroes: enemyHeroes, won };
}

function heroesFor(
  ids: string[],
  classes: Hero["cls"][] = ["STR", "AGI", "INT", "STR", "AGI"]
): Hero[] {
  return ids.map((id, index) => ({
    id,
    name: id,
    alias: id,
    cls: classes[index % classes.length],
    img: "",
    stats: { hp: 0, atk: 0, matk: 0, def: 0, mdef: 0 },
  }));
}

function uniqueHeroes(...groups: Hero[][]): Hero[] {
  return [...new Map(groups.flat().map((hero) => [hero.id, hero])).values()];
}

describe("historical recommendation sources", () => {
  const target = ["enemy-1", "enemy-2", "enemy-3", "enemy-4", "enemy-5"];
  const recommended = ["hero-1", "hero-2", "hero-3", "hero-4", "hero-5"];

  it("keeps exact history as the first priority", () => {
    const heroes = uniqueHeroes(heroesFor(target), heroesFor(recommended));

    const result = recommendTeamWithSource(
      target,
      heroes,
      [combat(recommended, target, true)]
    );

    expect(result.source).toBe("exact-history");
    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...recommended].sort()
    );
  });

  it("keeps similar history ahead of the later sources", () => {
    const similarEnemy = [...target.slice(0, 4), "other-enemy"];
    const heroes = uniqueHeroes(
      heroesFor(target),
      heroesFor(similarEnemy),
      heroesFor(recommended)
    );

    const result = recommendTeamWithSource(
      target,
      heroes,
      [combat(recommended, similarEnemy, true)]
    );

    expect(result.source).toBe("core4");
    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...recommended].sort()
    );
  });

  it("uses class history when exact and similar histories are unavailable", () => {
    const classMatchedEnemy = ["class-1", "class-2", "class-3", "class-4", "class-5"];
    const classes: Hero["cls"][] = ["STR", "AGI", "INT", "STR", "AGI"];
    const heroes = uniqueHeroes(
      heroesFor(target, classes),
      heroesFor(classMatchedEnemy, classes),
      heroesFor(recommended)
    );

    const result = recommendTeamWithSource(
      target,
      heroes,
      [combat(recommended, classMatchedEnemy, true)]
    );

    expect(result.source).toBe("class-history");
    expect(result.team.map((hero) => hero.id).sort()).toEqual(
      [...recommended].sort()
    );
  });

  it("skips A in defeat history before falling back to class history for B", () => {
    const classMatchedEnemy = [
      "class-1",
      "class-2",
      "class-3",
      "class-4",
      "class-5",
    ];
    const alternative = [
      "alternative-1",
      "alternative-2",
      "alternative-3",
      "alternative-4",
      "alternative-5",
    ];
    const classes: Hero["cls"][] = ["STR", "AGI", "INT", "STR", "AGI"];
    const heroes = uniqueHeroes(
      heroesFor(target, classes),
      heroesFor(classMatchedEnemy, classes),
      heroesFor(recommended, ["INT"]),
      heroesFor(alternative)
    );

    const result = findHistoricalAlternativeTeam(
      target,
      heroes,
      heroes,
      [
        combat(target, recommended, false),
        combat(alternative, classMatchedEnemy, true),
      ],
      recommended
    );

    expect(result?.map((hero) => hero.id).sort()).toEqual(
      [...alternative].sort()
    );
  });

  it("never proposes a team with a recorded 0% win rate", () => {
    const badTeam = ["bad-1", "bad-2", "bad-3", "bad-4", "bad-5"];
    const heroes = uniqueHeroes(heroesFor(target), heroesFor(badTeam));

    const result = recommendTeamWithSource(
      target,
      heroes,
      [combat(badTeam, target, false)]
    );

    expect(result.team).toEqual([]);
  });

  it("never proposes a 0% team for B when A is excluded", () => {
    const primary = ["primary-1", "primary-2", "primary-3", "primary-4", "primary-5"];
    const badAlternative = [
      "bad-1",
      "bad-2",
      "bad-3",
      "bad-4",
      "bad-5",
    ];
    const heroes = uniqueHeroes(
      heroesFor(target),
      heroesFor(primary),
      heroesFor(badAlternative)
    );

    const result = findHistoricalAlternativeTeam(
      target,
      heroes,
      heroes,
      [
        combat(primary, target, true),
        combat(badAlternative, target, false),
      ],
      primary
    );

    expect(result).toBeNull();
  });
});
