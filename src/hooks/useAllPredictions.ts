import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Prediction } from '@/types';

export function useAllPredictions() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'predictions'),
      (snap) => {
        setPredictions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prediction, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error('useAllPredictions error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { predictions, loading };
}
