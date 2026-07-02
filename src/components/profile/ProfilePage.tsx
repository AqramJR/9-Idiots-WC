import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMatches } from '@/hooks/useMatches';
import { usePredictions } from '@/hooks/usePredictions';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { accuracyPercentage } from '@/utils/scoring';
import { formatKickoff } from '@/utils/dateHelpers';
import { EmptyState } from '@/components/common/EmptyState';
import { Flag } from '@/components/common/Flag';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { identity, profile } = useAuth();
  const { matches } = useMatches();
  const { predictions } = usePredictions(identity?.userId);
  const { leaderboard } = useLeaderboard(false);
  const navigate = useNavigate();

  const rank = useMemo(
    () => leaderboard.find((e) => e.id === identity?.userId)?.rank ?? null,
    [leaderboard, identity]
  );

  const accuracy = profile
    ? accuracyPercentage(profile.exactPredictions, profile.correctOutcomes, profile.totalPredictions)
    : 0;

  const matchesById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  const rows = Object.values(predictions)
    .map((p) => ({ prediction: p, match: matchesById.get(p.matchId) }))
    .filter((r) => r.match)
    .sort((a, b) => (a.match!.kickoff > b.match!.kickoff ? -1 : 1));

  if (!identity) {
    return (
      <EmptyState
        icon="👤"
        title="You haven't joined yet"
        message="Enter your name to start predicting and build your profile."
        action={
          <button onClick={() => navigate('/join')} className="btn-primary mt-2">
            Join now
          </button>
        }
      />
    );
  }

  return (
    <div>
      <div className="glass-card mb-6 flex flex-col items-center gap-3 p-8 text-center animate-fade-up sm:flex-row sm:text-left">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-3xl">
          {identity.avatar || '⚽'}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-chalk-100">{identity.name}</h1>
          <p className="text-sm text-chalk-500">
            {rank ? `Ranked #${rank} on the leaderboard` : 'Not ranked yet'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 sm:gap-8">
          <Stat value={profile?.points ?? 0} label="Points" />
          <Stat value={profile?.exactPredictions ?? 0} label="Exact" />
          <Stat value={`${accuracy}%`} label="Accuracy" />
        </div>
      </div>

      <h2 className="mb-3 font-display text-xl font-bold text-chalk-100">Your predictions</h2>

      {rows.length === 0 && (
        <EmptyState icon="📝" title="No predictions yet" message="Head to the matches page to make your first pick." />
      )}

      <div className="flex flex-col gap-2">
        {rows.map(({ prediction, match }) => (
          <div key={prediction.id} className="glass-card flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-chalk-100">
                <Flag value={match!.homeFlag} size="sm" /> {match!.homeTeam} vs {match!.awayTeam}{' '}
                <Flag value={match!.awayFlag} size="sm" />
              </div>
              <div className="text-xs text-chalk-500">{formatKickoff(match!.kickoff)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-chalk-300">
                {prediction.predictedHome}–{prediction.predictedAway}
              </span>
              {prediction.points !== null ? (
                <OutcomeBadge outcome={prediction.outcome} points={prediction.points} />
              ) : (
                <span className="text-xs text-chalk-500">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="font-mono text-xl font-bold text-turf-400">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-chalk-500">{label}</div>
    </div>
  );
}

function OutcomeBadge({ outcome, points }: { outcome: string | null; points: number }) {
  const styles =
    outcome === 'exact'
      ? 'bg-turf-500/15 text-turf-400'
      : outcome === 'correct'
        ? 'bg-gold-500/15 text-gold-400'
        : 'bg-white/5 text-chalk-500';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>+{points}</span>;
}
