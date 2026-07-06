import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Match, Prediction, User } from '@/types';
import { scorePrediction } from './scoring';

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

export async function recalculateStandings(): Promise<{ usersUpdated: number; predictionsScored: number }> {
  const [matchesSnap, predictionsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, 'matches')),
    getDocs(collection(db, 'predictions')),
    getDocs(collection(db, 'users')),
  ]);

  const matches = new Map<string, Match>(
    matchesSnap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<Match, 'id'>) }])
  );
  
  const users = new Map<string, User>(
    usersSnap.docs.map((d) => [d.id, { id: d.id, ...(d.data() as Omit<User, 'id'>) }])
  );

  const predictions = predictionsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prediction, 'id'>),
  }));

  const userIds = usersSnap.docs.map((d) => d.id);

  // Compute base scored predictions in memory first.
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
      earnedDoubles: number;
      usedDoubles: number;
      usedTriples: number;
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
      earnedDoubles: 0,
      usedDoubles: 0,
      usedTriples: 0,
    });
  }
  
  for (const p of scored) {
    if (p.points === null) continue;
    const t = totals.get(p.userId);
    if (!t) continue;

    // --- APPLY GAMIFICATION MULTIPLIERS ---
    if (p.multiplier === 'double') {
      p.points = p.points * 2; // Exact = 6, Correct = 2, Wrong = 0
    } else if (p.multiplier === 'triple') {
      if (p.outcome === 'exact') p.points = 9;
      else if (p.outcome === 'correct') p.points = 1; // standard per your rules
      else p.points = -3; // punishing penalty for wrong guess!
    }

    t.points += p.points;
    t.totalPredictions += 1;
    if (p.outcome === 'exact') t.exactPredictions += 1;
    else if (p.outcome === 'correct') t.correctOutcomes += 1;
    else if (p.outcome === 'wrong') t.wrongPredictions += 1;

    // Track usage
    if (p.multiplier === 'double') t.usedDoubles += 1;
    if (p.multiplier === 'triple') t.usedTriples += 1;
  }

  // Calculate Earned Doubles (1 earned per 3 Total Exacts, including manual bonus history!)
  for (const [userId, t] of totals.entries()) {
    const userDoc = users.get(userId);
    const absoluteTotalExacts = t.exactPredictions + (userDoc?.bonusExact ?? 0);
    t.earnedDoubles = Math.floor(absoluteTotalExacts / 3);
  }

  // Streak bonus calculation
  const scoredByUser = new Map<string, typeof scored>();
  for (const p of scored) {
    if (p.points === null) continue;
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

  // Batch-write updates.
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
    if (original.points === p.points && original.outcome === p.outcome) continue;
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
      earnedDoubles: t.earnedDoubles,
      usedDoubles: t.usedDoubles,
      usedTriples: t.usedTriples,
    });
    opCount += 1;
    flushIfNeeded();
  }

  commits.push(batch.commit());
  await Promise.all(commits);

  return { usersUpdated: userIds.length, predictionsScored: scored.filter((p) => p.points !== null).length };
}

export type { User };