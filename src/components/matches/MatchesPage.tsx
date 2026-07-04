import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { useUsersMap } from '@/hooks/useUsersMap';
import { MatchCard } from './MatchCard';
import { MatchCardSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';

// Changed 'open' to 'upcoming'
type Filter = 'upcoming' | 'locked' | 'finished';

const DAY = 24 * 60 * 60 * 1000;

export function MatchesPage() {
  const { identity } = useAuth();
  const { matches, loading: matchesLoading } = useMatches();
  const { predictions, loading: predictionsLoading, savePrediction } = usePredictions(identity?.userId);
  const { usersMap } = useUsersMap();
  const [filter, setFilter] = useState<Filter>('upcoming');

  const now = Date.now();

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      // 'upcoming' — shows ALL future matches, regardless of how far away they are. 
      // The MatchCard will handle locking the inputs if it's > 20h away.
      if (filter === 'upcoming') return m.kickoff > now && m.status !== 'finished';
      
      // 'locked' — matches that are currently playing (past kickoff, not finished).
      if (filter === 'locked') return m.kickoff <= now && m.status !== 'finished';
      
      // 'finished' — only matches that finished recently (kicked off within the last 24h).
      return m.status === 'finished' && now - m.kickoff <= DAY;
    });
  }, [matches, filter, now]);

  const loading = matchesLoading || predictionsLoading;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-chalk-100">Matches</h1>
          <p className="text-sm text-chalk-500">Predictions open 20h before kickoff.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {(['upcoming', 'locked', 'finished'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? 'bg-turf-500 text-pitch-950' : 'text-chalk-300 hover:text-chalk-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="📭"
          title="No matches here"
          message={
            filter === 'finished'
              ? 'No matches finished in the last 24 hours.'
              : filter === 'upcoming'
                ? 'There are no upcoming matches left in the tournament.'
                : 'Check back once matches in this category are added by the admin.'
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={predictions[match.id]}
              usersMap={usersMap}
              currentUserId={identity?.userId}
              onSave={async (h, a, penaltyWinner) => {
                if (!identity) return;
                await savePrediction(identity.userId, match.id, h, a, penaltyWinner);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}