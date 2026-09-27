import type { Combat } from "../../types";
import { HEROES, type Hero } from "../../data/heroes";
import { getTeamZones, type GeneratorTargets } from "./teamGeneratorEngine";

export type CounterReference = {
  winningZones: GeneratorTargets;
  beatenZones: GeneratorTargets;
  combats: number;
};

function zoneKey(zones: GeneratorTargets): string {
  return [zones.atk, zones.matk, zones.def, zones.mdef, zones.hp].join(",");
}

function validTeam(heroIds: string[]): boolean {
  return heroIds.length === 5 && new Set(heroIds).size === 5;
}

export function buildCounterReferences(combats: Combat[]): CounterReference[] {
  const heroesById = new Map<string, Hero>(
    HEROES.map((hero) => [hero.id, hero])
  );
  const references = new Map<string, CounterReference>();

  for (const combat of combats) {
    const myIds = combat.my_heroes ?? [];
    const enemyIds = combat.enemy_heroes ?? [];

    if (!validTeam(myIds) || !validTeam(enemyIds)) continue;

    const myHeroes = myIds
      .map((heroId) => heroesById.get(heroId))
      .filter((hero): hero is Hero => Boolean(hero));
    const enemyHeroes = enemyIds
      .map((heroId) => heroesById.get(heroId))
      .filter((hero): hero is Hero => Boolean(hero));

    if (myHeroes.length !== 5 || enemyHeroes.length !== 5) continue;

    const myZones = getTeamZones(myHeroes);
    const enemyZones = getTeamZones(enemyHeroes);

    const winningZones = combat.won ? myZones : enemyZones;
    const beatenZones = combat.won ? enemyZones : myZones;

    const key = `${zoneKey(winningZones)}|${zoneKey(beatenZones)}`;
    const current = references.get(key);

    if (current) {
      current.combats++;
    } else {
      references.set(key, {
        winningZones,
        beatenZones,
        combats: 1,
      });
    }
  }

  return [...references.values()].sort(
    (a, b) =>
      b.combats - a.combats ||
      zoneKey(a.winningZones).localeCompare(zoneKey(b.winningZones))
  );
}

export function findCounterReferences(
  combats: Combat[],
  enemyZones: GeneratorTargets
): CounterReference[] {
  const enemyKey = zoneKey(enemyZones);

  return buildCounterReferences(combats)
    .filter((reference) => zoneKey(reference.beatenZones) === enemyKey)
    .sort((a, b) => b.combats - a.combats);
}

export function formatZoneReference(zones: GeneratorTargets): string {
  return [
    `Z${zones.atk}`,
    `Z${zones.matk}`,
    `Z${zones.def}`,
    `Z${zones.mdef}`,
    `Z${zones.hp}`,
  ].join(" ");
}
