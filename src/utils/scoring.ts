import type { Match, Prediction } from '@/types';

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
 * Scores a single prediction against a finished match.
 * Returns null if the match doesn't have a final score yet.
 */
export function scorePrediction(
  prediction: Pick<Prediction, 'predictedHome' | 'predictedAway'>,
  match: Pick<Match, 'finalHome' | 'finalAway'>
): { points: number; outcome: 'exact' | 'correct' | 'wrong' } | null {
  if (match.finalHome === null || match.finalAway === null) return null;

  const exact =
    prediction.predictedHome === match.finalHome &&
    prediction.predictedAway === match.finalAway;

  if (exact) {
    return { points: POINTS_EXACT, outcome: 'exact' };
  }

  const predictedOutcome = getOutcome(prediction.predictedHome, prediction.predictedAway);
  const actualOutcome = getOutcome(match.finalHome, match.finalAway);

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
