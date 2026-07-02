import { useEffect, useState, useCallback } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Prediction } from '@/types';

export function usePredictions(userId: string | undefined) {
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPredictions({});
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'predictions'), where('userId', '==', userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<string, Prediction> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as Omit<Prediction, 'id'>;
          map[data.matchId] = { id: d.id, ...data };
        });
        setPredictions(map);
        setLoading(false);
      },
      (err) => {
        console.error('usePredictions error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  const savePrediction = useCallback(
    async (userId: string, matchId: string, home: number, away: number) => {
      const predictionId = `${userId}_${matchId}`;
      const existing = predictions[matchId];
      const now = Date.now();
      await setDoc(
        doc(db, 'predictions', predictionId),
        {
          userId,
          matchId,
          predictedHome: home,
          predictedAway: away,
          points: existing?.points ?? null,
          outcome: existing?.outcome ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      );
    },
    [predictions]
  );

  return { predictions, loading, savePrediction };
}
