import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { LeaderboardEntry, User } from '@/types';
import { useAppToast } from '@/context/ToastContext';

function sortUsers(users: User[]): LeaderboardEntry[] {
  const sorted = [...users].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactPredictions !== a.exactPredictions) return b.exactPredictions - a.exactPredictions;
    return b.correctOutcomes - a.correctOutcomes;
  });
  return sorted.map((u, i) => ({ ...u, rank: i + 1 }));
}

export function useLeaderboard(notifyOnChange = false) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const toast = useAppToast();

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const users = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<User, 'id'>) }));
        setLeaderboard(sortUsers(users));
        setLoading(false);
        if (notifyOnChange) {
          if (isFirstLoad.current) {
            isFirstLoad.current = false;
          } else {
            toast.leaderboardChanged();
          }
        }
      },
      (err) => {
        console.error('useLeaderboard error', err);
        setLoading(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyOnChange]);

  return { leaderboard, loading };
}
