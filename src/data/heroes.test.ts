
import { describe, expect, it } from "vitest";

import { HEROES } from "./heroes";

const REQUIRED_STATS = ["hp", "atk", "matk", "def", "mdef"] as const;

describe("hero data integrity", () => {
  it("contains complete and valid hero sheets", () => {
    expect(HEROES.length).toBeGreaterThan(0);

    for (const hero of HEROES) {
      expect(
        hero.id,
        `${hero.name || "Héros sans nom"}: id manquant`
      ).toBeTruthy();
      expect(hero.name, `${hero.id}: nom manquant`).toBeTruthy();
      expect(hero.img, `${hero.id}: image manquante`).toBeTruthy();
      expect(["STR", "AGI", "INT"], `${hero.id}: classe invalide`).toContain(
        hero.cls
      );
      expect(hero.stats, `${hero.id}: statistiques manquantes`).toBeDefined();

      for (const stat of REQUIRED_STATS) {
        const value = hero.stats?.[stat];

        expect(
          typeof value === "number" && Number.isFinite(value) && value >= 0,
          `${hero.id}: statistique ${stat} invalide (${String(value)})`
        ).toBe(true);
      }
    }
  });

  it("contains unique hero ids", () => {
    const ids = HEROES.map((hero) => hero.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains no zero hero stats", () => {
    for (const hero of HEROES) {
      for (const stat of REQUIRED_STATS) {
        const value = hero.stats?.[stat];

        expect(
          value,
          `${hero.id}: statistique ${stat} ne doit pas être à 0`
        ).toBeGreaterThan(0);
      }
    }
  });
});

