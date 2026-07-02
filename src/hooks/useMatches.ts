import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { Match } from '@/types';

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMatches(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) })));
        setLoading(false);
      },
      (err) => {
        console.error('useMatches error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { matches, loading };
}
