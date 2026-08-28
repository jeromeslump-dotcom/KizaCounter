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
  created_by?: string | null;
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
// STATISTIQUES D'UNE COMBINAISON
// ============================================================

export interface TeamStats {
  team: string[];
  total: number;
  wins: number;
  losses: number;
  winRate: number;
}

// ============================================================
// ÉQUIPE RECOMMANDÉE
// ============================================================

export interface RecommendedTeam {
  team: Hero[];
  score: number;
}

// ============================================================
// COUVERTURE
// ============================================================

export interface CoverageReport {
  covered: number;
  total: number;
  percentage: number;
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
  usageScore: number;
  statScore: number;
}

// ============================================================
// FILTRE / TRI
// ============================================================

export type HeroClassFilter = "ALL" | HeroClass;

export type HeroSort =
  "played" | "hp" | "atk" | "matk" | "totalAtk" | "def" | "mdef" | "totalDef";

export interface HeroFilterState {
  search: string;
  cls: HeroClassFilter;
  sort: HeroSort;
}

// ============================================================
// ÉQUIPES
// ============================================================

export type HeroId = string;

export type HeroTeam = HeroId[];

export interface HeroSelection {
  ids: HeroId[];
}

// ============================================================
// SCORES
// ============================================================

export interface HeroScore {
  heroId: HeroId;
  score: number;
}

export interface TeamScore {
  heroIds: HeroId[];
  score: number;
}

// ============================================================
// PRÉFÉRENCES
// ============================================================

export interface HeroPreferences {
  [heroId: string]: boolean;
}
