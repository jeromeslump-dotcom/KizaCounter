// src/engine/historicalRatio.ts

/**
 * Score historique basé sur le ratio Win/Lose et le nombre de combats.
 * Le résultat est toujours compris entre 0 et maxPoints.
 *
 * Le nombre de combats intervient dans la confiance :
 * une excellente série sur 1 combat ne doit pas peser autant
 * que la même série répétée sur plusieurs combats.
 */
export interface HistoricalRatioResult {
  wins: number;
  losses: number;
  battles: number;
  ratio: number;
  confidence: number;
  points: number;
}

export function scoreHistoricalWinLossRatio(
  wins: number,
  losses: number,
  maxPoints: number,
  confidenceBattles = 10
): HistoricalRatioResult {
  const safeWins = Math.max(0, wins);
  const safeLosses = Math.max(0, losses);
  const battles = safeWins + safeLosses;

  if (maxPoints <= 0 || battles <= 0) {
    return {
      wins: safeWins,
      losses: safeLosses,
      battles,
      ratio: safeLosses > 0 ? safeWins / safeLosses : safeWins > 0 ? Infinity : 0,
      confidence: 0,
      points: 0,
    };
  }

  // W/L ratio. +1 au dénominateur pour éviter l'infini sur une série
  // sans défaite et garder une progression exploitable par le moteur.
  const ratio = safeWins / (safeLosses + 1);

  // Le ratio est transformé en une performance 0..1.
  // 1:1 = 50 %, 3:1 = 75 %, 9:1 = 90 %, etc.
  const performance = safeWins / (safeWins + safeLosses + 1);

  // La confiance augmente avec le nombre de combats sans rendre
  // les petits échantillons totalement nuls.
  const confidence = Math.min(battles / Math.max(1, confidenceBattles), 1);

  const points = Math.max(
    0,
    Math.min(maxPoints, performance * confidence * maxPoints)
  );

  return {
    wins: safeWins,
    losses: safeLosses,
    battles,
    ratio,
    confidence,
    points,
  };
}
