import { doc, increment, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Atomically adjusts a user's bonusPoints by `delta` (can be negative).
 * bonusPoints is never touched by the recalculation logic (client or
 * scripted), so this is safe to call as many times as you like without
 * losing previous adjustments. Used by the troll-penalty mechanic.
 */
export async function adjustBonusPoints(userId: string, delta: number): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { bonusPoints: increment(delta) });
}

/**
 * Sets a user's manual "bonus" stats to exact values (used by the admin
 * panel, where the admin types the totals they want rather than a delta).
 * These fields are never touched by recalculation — they're the right
 * place for one-off corrections or importing pre-existing history (e.g.
 * a WhatsApp-group tally from before this site existed) as a baseline
 * that ongoing site predictions then add on top of.
 */
export async function setBonusStats(
  userId: string,
  values: { points: number; exact: number; correct: number; totalPredictions: number; doubles: number; triples: number }
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    bonusPoints: values.points,
    bonusExact: values.exact,
    bonusCorrect: values.correct,
    bonusTotalPredictions: values.totalPredictions,
    bonusDoubles: values.doubles,
    bonusTriples: values.triples,
  });
}