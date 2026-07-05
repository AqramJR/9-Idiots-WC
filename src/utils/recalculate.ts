import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Match, Prediction, User } from '@/types';
import { scorePrediction } from './scoring';

/**
 * Back-to-back exact score streak bonus: for each consecutive exact-score
 * prediction beyond the first in a chronological run, award +3. So a run of
 * 2 in a row = +3 total, 3 in a row = +6 total, 4 in a row = +9 total, etc.
 * Any "correct" or "wrong" (or unpredicted) match resets the run to zero.
 *
 * `chronologicalOutcomes` must already be sorted by the match's kickoff time,
 * oldest first, and should include ONLY finished/scored matches.
 */
export function computeStreakBonus(chronologicalOutcomes: Array<Prediction['outcome']>): number {
  let streak = 0;
  let bonus = 0;
  for (const outcome of chronologicalOutcomes) {
    if (outcome === 'exact') {
      streak += 1;
      if (streak >= 2) bonus += 3;
    } else {
      streak = 0;
    }
  }
  return bonus;
}

/**
 * Recalculates every prediction's points/outcome against final match scores,
 * then rewrites each user's aggregate totals (including the back-to-back
 * exact score streak bonus). Admin-only (enforced by rules).
 *
 * Firestore writes are batched in chunks of 400 to stay under the 500-op limit.
 */
export async function recalculateStandings(): Promise<{ usersUpdated: number; predictionsScored: number }> {
  const [matchesSnap, predictionsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'predictions')),
    getDocs(collection(db, 'users')),
  ]);

  const matches = new Map<string, Match>(
    matchesSnap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<Match, 'id'>) }])
  );

  const predictions = predictionsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prediction, 'id'>),
  }));

  const userIds = usersSnap.docs.map((d) => d.id);

  // Compute scored predictions in memory first.
  const scored = predictions.map((p) => {
    const match = matches.get(p.matchId);
    if (!match) return { ...p, points: null, outcome: null as Prediction['outcome'] };
    const result = scorePrediction(p, match);
    if (!result) return { ...p, points: null, outcome: null as Prediction['outcome'] };
    return { ...p, points: result.points, outcome: result.outcome };
  });

  // Aggregate totals per user.
  const totals = new Map<
    string,
    {
      points: number;
      exactPredictions: number;
      correctOutcomes: number;
      wrongPredictions: number;
      totalPredictions: number;
      streakBonusPoints: number;
    }
  >();
  for (const id of userIds) {
    totals.set(id, {
      points: 0,
      exactPredictions: 0,
      correctOutcomes: 0,
      wrongPredictions: 0,
      totalPredictions: 0,
      streakBonusPoints: 0,
    });
  }
  for (const p of scored) {
    if (p.points === null) continue;
    const t = totals.get(p.userId);
    if (!t) continue;
    t.points += p.points;
    t.totalPredictions += 1;
    if (p.outcome === 'exact') t.exactPredictions += 1;
    else if (p.outcome === 'correct') t.correctOutcomes += 1;
    else if (p.outcome === 'wrong') t.wrongPredictions += 1;
  }

  // Streak bonus: group each user's scored predictions, sort by kickoff,
  // and run them through computeStreakBonus.
  const scoredByUser = new Map<string, typeof scored>();
  for (const p of scored) {
    if (p.points === null) continue; // only finished/scored matches count
    const list = scoredByUser.get(p.userId) ?? [];
    list.push(p);
    scoredByUser.set(p.userId, list);
  }
  for (const [userId, userPredictions] of scoredByUser.entries()) {
    const t = totals.get(userId);
    if (!t) continue;
    const chronological = [...userPredictions].sort((a, b) => {
      const ka = matches.get(a.matchId)?.kickoff ?? 0;
      const kb = matches.get(b.matchId)?.kickoff ?? 0;
      return ka - kb;
    });
    t.streakBonusPoints = computeStreakBonus(chronological.map((p) => p.outcome));
  }

  // Batch-write prediction score updates.
  let batch = writeBatch(db);
  let opCount = 0;
  const commits: Promise<void>[] = [];

  const flushIfNeeded = () => {
    if (opCount >= 400) {
      commits.push(batch.commit());
      batch = writeBatch(db);
      opCount = 0;
    }
  };

  for (const p of scored) {
    const original = predictions.find((x) => x.id === p.id);
    if (!original) continue;
    if (original.points === p.points && original.outcome === p.outcome) continue; // no change
    batch.update(doc(db, 'predictions', p.id), { points: p.points, outcome: p.outcome });
    opCount += 1;
    flushIfNeeded();
  }

  for (const [userId, t] of totals.entries()) {
    batch.update(doc(db, 'users', userId), {
      points: t.points,
      exactPredictions: t.exactPredictions,
      correctOutcomes: t.correctOutcomes,
      wrongPredictions: t.wrongPredictions,
      totalPredictions: t.totalPredictions,
      streakBonusPoints: t.streakBonusPoints,
    });
    opCount += 1;
    flushIfNeeded();
  }

  commits.push(batch.commit());
  await Promise.all(commits);

  return { usersUpdated: userIds.length, predictionsScored: scored.filter((p) => p.points !== null).length };
}

export type { User };
