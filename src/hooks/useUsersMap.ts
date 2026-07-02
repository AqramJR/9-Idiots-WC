import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { User } from '@/types';

export function useUsersMap() {
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const map: Record<string, User> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...(d.data() as Omit<User, 'id'>) };
        });
        setUsersMap(map);
        setLoading(false);
      },
      (err) => {
        console.error('useUsersMap error', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { usersMap, loading };
}
