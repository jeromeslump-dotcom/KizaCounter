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
  my_str?: number;
  my_agi?: number;
  my_int?: number;
  enemy_str?: number;
  enemy_agi?: number;
  enemy_int?: number;
  my_hp?: number;
  my_atk?: number;
  my_matk?: number;
  my_def?: number;
  my_mdef?: number;
  my_atk_total?: number;
  my_def_total?: number;
  enemy_hp?: number;
  enemy_atk?: number;
  enemy_matk?: number;
  enemy_def?: number;
  enemy_mdef?: number;
  enemy_atk_total?: number;
  enemy_def_total?: number;
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
// FILTRES / TRI DES HÉROS
// ============================================================

export type HeroClassFilter = "ALL" | HeroClass;

export type HeroSort =
  "played" | "hp" | "atk" | "matk" | "totalAtk" | "def" | "mdef" | "totalDef";
