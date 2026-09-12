
import { describe, expect, it } from "vitest";
import type { Combat, Hero } from "../src/types";
import { evaluateEnemyClassHistory, evaluateExactTeamHistory } from "../src/engine/historicalScoring";
import { recommendTeam } from "../src/engine/scoring";
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