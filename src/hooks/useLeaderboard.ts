import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import type { LeaderboardEntry, User } from '@/types';
import { useAppToast } from '@/context/ToastContext';

function sortUsers(users: User[]): LeaderboardEntry[] {
  const withTotals = users.map((u) => ({
    ...u,
    totalPoints: u.points + (u.bonusPoints ?? 0),
    totalExact: u.exactPredictions + (u.bonusExact ?? 0),
    totalCorrect: u.correctOutcomes + (u.bonusCorrect ?? 0),
    totalPredictionsCount: u.totalPredictions + (u.bonusTotalPredictions ?? 0),
  }));
  const sorted = withTotals.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalExact !== a.totalExact) return b.totalExact - a.totalExact;
    return b.totalCorrect - a.totalCorrect;
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
