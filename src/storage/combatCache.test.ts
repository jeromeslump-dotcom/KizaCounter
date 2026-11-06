import { describe, expect, it } from "vitest";
import {
  COMBAT_FULL_SYNC_INTERVAL_MS,
  isFullCombatSyncDue,
  sortCombats,
} from "./combatCache";
import type { Combat } from "../types";

function makeCombat(id: string, created_at: string): Combat {
  return {
    id,
    created_at,
    enemy_heroes: [],
    my_heroes: [],
    won: true,
  };
}

describe("combat history cache helpers", () => {
  it("requires a full sync when no previous full sync exists", () => {
    expect(isFullCombatSyncDue(null, 1_000_000)).toBe(true);
  });

  it("waits until 24 hours have elapsed before a full sync", () => {
    const lastSync = "2026-11-05T12:00:00.000Z";
    const lastSyncTime = Date.parse(lastSync);

    expect(
      isFullCombatSyncDue(
        lastSync,
        lastSyncTime + COMBAT_FULL_SYNC_INTERVAL_MS - 1
      )
    ).toBe(false);
    expect(
      isFullCombatSyncDue(lastSync, lastSyncTime + COMBAT_FULL_SYNC_INTERVAL_MS)
    ).toBe(true);
  });

  it("retries a full sync when the saved date is invalid or in the future", () => {
    expect(isFullCombatSyncDue("not-a-date", 1_000_000)).toBe(true);
    expect(
      isFullCombatSyncDue(
        "2026-11-07T12:00:00.000Z",
        Date.parse("2026-11-06T12:00:00.000Z")
      )
    ).toBe(true);
  });

  it("sorts combats by newest date, then newest id", () => {
    const combats = [
      makeCombat("a", "2026-11-05T10:00:00.000Z"),
      makeCombat("c", "2026-11-06T10:00:00.000Z"),
      makeCombat("b", "2026-11-06T10:00:00.000Z"),
    ];

    expect(sortCombats(combats).map((combat) => combat.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
  });
});
