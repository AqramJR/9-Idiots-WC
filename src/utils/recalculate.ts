import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Match, Prediction, User } from '@/types';
import { scorePrediction } from './scoring';

/**
 * Recalculates every prediction's points/outcome against final match scores,
 * then rewrites each user's aggregate totals. Admin-only (enforced by rules).
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
    { points: number; exactPredictions: number; correctOutcomes: number; wrongPredictions: number; totalPredictions: number }
  >();
  for (const id of userIds) {
    totals.set(id, { points: 0, exactPredictions: 0, correctOutcomes: 0, wrongPredictions: 0, totalPredictions: 0 });
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
    });
    opCount += 1;
    flushIfNeeded();
  }

  commits.push(batch.commit());
  await Promise.all(commits);

  return { usersUpdated: userIds.length, predictionsScored: scored.filter((p) => p.points !== null).length };
}

export type { User };
