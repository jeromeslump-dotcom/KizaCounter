import type { Hero, HeroClass } from "./data/heroes";

export type { Hero, HeroClass };

// ============================================================
// COMBAT ENREGISTRÉ
// ============================================================

export interface Combat {
  id?: string;
  enemy_heroes: string[];
  my_heroes: string[];
  won: boolean;
  created_at?: string;
  user_id?: string | null;
  status?: string | null;
}

// ============================================================
// STATISTIQUES D'UTILISATION D'UN HÉROS
// ============================================================

export interface HeroUsage {
  heroId: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

// ============================================================
// ÉVALUATION D'UNE ÉQUIPE
// ============================================================

export interface TeamEvaluation {
  score: number;
  historicalWins: number;
  historicalLosses: number;
  historicalBattles: number;
  historicalWinRate: number;
}

// ============================================================
// FILTRES / TRI DES HÉROS
// ============================================================

export type HeroClassFilter = "ALL" | HeroClass;

export type HeroSort =
  | "played"
  | "hp"
  | "atk"
  | "matk"
  | "totalAtk"
  | "def"
  | "mdef"
  | "totalDef";

// ============================================================
// SCORE D'ÉQUIPE
// ============================================================

export interface TeamScore {
  heroIds: string[];
  score: number;
}