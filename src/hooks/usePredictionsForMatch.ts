import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Prediction } from '@/types';

/**
 * Live predictions for one match, across ALL users. Only subscribes while
 * `enabled` is true, so it's cheap to call from a card that's collapsed
 * by default (e.g. "See everyone's predictions" toggle).
 */
export function usePredictionsForMatch(matchId: string, enabled: boolean) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    const q = query(collection(db, 'predictions'), where('matchId', '==', matchId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPredictions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prediction, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error('usePredictionsForMatch error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [matchId, enabled]);

  return { predictions, loading };
}
