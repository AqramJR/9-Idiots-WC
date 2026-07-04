import type { Match, PenaltyWinner, Prediction } from '@/types';

export const POINTS_EXACT = 3;
export const POINTS_CORRECT_OUTCOME = 1;
export const POINTS_WRONG = 0;

export type Outcome = 'home' | 'away' | 'draw';

export function getOutcome(home: number, away: number): Outcome {
  if (home > away) return 'home';
  if (home < away) return 'away';
  return 'draw';
}

/**
 * A knockout match (no `group`) can't officially end in a draw — a tied
 * scoreline goes to penalties. This resolves the "real" outcome for scoring
 * purposes: for a tie in a knockout match, the penalty winner (if known)
 * IS the outcome; otherwise it falls back to the plain score-based outcome
 * (used for group-stage matches, where a draw is a legitimate final result).
 */
export function effectiveOutcome(
  home: number,
  away: number,
  isKnockout: boolean,
  penaltyWinner: PenaltyWinner | null | undefined
): Outcome {
  const scoreOutcome = getOutcome(home, away);
  if (scoreOutcome === 'draw' && isKnockout && penaltyWinner) {
    return penaltyWinner;
  }
  return scoreOutcome;
}

/**
 * Scores a single prediction against a finished match.
 * Returns null if the match doesn't have a final score yet.
 */
export function scorePrediction(
  prediction: Pick<Prediction, 'predictedHome' | 'predictedAway' | 'predictedPenaltyWinner'>,
  match: Pick<Match, 'finalHome' | 'finalAway' | 'finalPenaltyWinner' | 'group'>
): { points: number; outcome: 'exact' | 'correct' | 'wrong' } | null {
  if (match.finalHome === null || match.finalAway === null) return null;

  const exact =
    prediction.predictedHome === match.finalHome &&
    prediction.predictedAway === match.finalAway;

  if (exact) {
    return { points: POINTS_EXACT, outcome: 'exact' };
  }

  const isKnockout = !match.group;
  const predictedOutcome = effectiveOutcome(
    prediction.predictedHome,
    prediction.predictedAway,
    isKnockout,
    prediction.predictedPenaltyWinner
  );
  const actualOutcome = effectiveOutcome(match.finalHome, match.finalAway, isKnockout, match.finalPenaltyWinner);

  if (predictedOutcome === actualOutcome) {
    return { points: POINTS_CORRECT_OUTCOME, outcome: 'correct' };
  }

  return { points: POINTS_WRONG, outcome: 'wrong' };
}

/**
 * Aggregates a user's totals from a list of their scored predictions.
 */
export function aggregateUserStats(predictions: Prediction[]) {
  let points = 0;
  let exactPredictions = 0;
  let correctOutcomes = 0;
  let wrongPredictions = 0;
  let totalPredictions = 0;

  for (const p of predictions) {
    if (p.points === null) continue; // not scored yet (match not finished)
    totalPredictions += 1;
    points += p.points;
    if (p.outcome === 'exact') exactPredictions += 1;
    else if (p.outcome === 'correct') correctOutcomes += 1;
    else if (p.outcome === 'wrong') wrongPredictions += 1;
  }

  return { points, exactPredictions, correctOutcomes, wrongPredictions, totalPredictions };
}

export function accuracyPercentage(exact: number, correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((exact + correct) / total) * 1000) / 10; // one decimal place
}
