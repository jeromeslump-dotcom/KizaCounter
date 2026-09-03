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
// COUVERTURE HISTORIQUE
// ============================================================

export interface CoverageHeroStats {
  heroId: string;
  wins: number;
  losses: number;
  battles: number;
  winRate: number;
  confidence: number;
  score: number;
}

export interface CoverageReport {
  /** Composition ennemie complète analysée. */
  enemyIds: string[];

  /** Nombre de héros candidats disposant d'un historique gagnant. */
  covered: number;

  /** Nombre total de héros candidats analysés. */
  total: number;

  /** Pourcentage de héros candidats couverts. */
  percentage: number;

  /** Héros classés par efficacité historique contre cette composition. */
  heroes: CoverageHeroStats[];
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
// FILTRE / TRI
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
