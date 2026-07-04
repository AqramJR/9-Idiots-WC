import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Prediction } from '@/types';

/**
 * Live predictions for one PLAYER, across ALL matches — the reverse axis of
 * usePredictionsForMatch (which is one match, across all players). Used by
 * the admin "view/edit this player's predictions" panel. Only subscribes
 * while `enabled` is true.
 */
export function usePredictionsForUser(userId: string | undefined, enabled: boolean) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'predictions'), where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPredictions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prediction, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error('usePredictionsForUser error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId, enabled]);

  return { predictions, loading };
}
