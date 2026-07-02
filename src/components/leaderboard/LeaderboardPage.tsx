import { useAuth } from '@/context/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { LeaderboardRow } from './LeaderboardRow';
import { RowSkeleton } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';

export function LeaderboardPage() {
  const { identity } = useAuth();
  const { leaderboard, loading } = useLeaderboard(true);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-chalk-100">Leaderboard</h1>
        <p className="text-sm text-chalk-500">Updates live as scores come in.</p>
      </div>

      <div className="glass-card mb-6 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-chalk-500">How scoring works</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <RuleCard icon="🎯" points="+3" label="Exact score" />
          <RuleCard icon="✅" points="+1" label="Predict the winner" />
          <RuleCard icon="❌" points="0" label="Wrong prediction" />
        </div>
      </div>

      <div className="mb-3 hidden grid-cols-[2rem_2.25rem_1fr_5rem] items-center gap-4 px-4 text-xs uppercase tracking-wider text-chalk-500 sm:grid">
        <span>Rank</span>
        <span />
        <span>Player</span>
        <span className="text-right">Points</span>
      </div>

      {loading && (
        <div>
          {Array.from({ length: 6 }).map((_, i) => (
            <RowSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && leaderboard.length === 0 && (
        <EmptyState
          icon="🏆"
          title="No players yet"
          message="Once friends join and predictions are scored, the leaderboard will appear here."
        />
      )}

      {!loading &&
        leaderboard.map((entry) => (
          <LeaderboardRow key={entry.id} entry={entry} isCurrentUser={entry.id === identity?.userId} />
        ))}
    </div>
  );
}

function RuleCard({ icon, points, label }: { icon: string; points: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-4">
      <div className="mb-1 text-xl">{icon}</div>
      <div className="font-mono text-lg font-bold text-turf-400">{points}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-chalk-500">{label}</div>
    </div>
  );
}
