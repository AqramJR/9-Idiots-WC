import { usePredictionsForUser } from '@/hooks/usePredictionsForUser';
import { useMatches } from '@/hooks/useMatches';
import { Flag } from '@/components/common/Flag';

/**
 * Shows exactly where a player earned their points — finished matches only,
 * where their outcome was 'exact' or 'correct'. Wrong predictions (and
 * anything not yet scored) are hidden entirely; this is a highlight reel,
 * not a full history. Visible to anyone (predictions are publicly readable),
 * which is the point — it's meant to be seen by other players.
 */
export function PlayerSuccessHistory({ userId }: { userId: string }) {
  const { predictions, loading: predsLoading } = usePredictionsForUser(userId, true);
  const { matches, loading: matchesLoading } = useMatches();

  const loading = predsLoading || matchesLoading;
  const matchesById = new Map(matches.map((m) => [m.id, m]));

  const hits = predictions
    .filter((p) => p.outcome === 'exact' || p.outcome === 'correct')
    .map((p) => ({ prediction: p, match: matchesById.get(p.matchId) }))
    .filter((row) => row.match && row.match.status === 'finished')
    .map((row) => ({ prediction: row.prediction, match: row.match! }))
    .sort((a, b) => b.match.kickoff - a.match.kickoff); // most recent first

  if (loading) {
    return <p className="mt-3 text-xs text-chalk-500">Loading…</p>;
  }

  if (hits.length === 0) {
    return <p className="mt-3 text-xs text-chalk-500">No exact or correct predictions yet — still waiting for that first hit 👀</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
      {hits.map(({ prediction, match }) => {
        const isExact = prediction.outcome === 'exact';
        return (
          <div
            key={prediction.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
              isExact ? 'border-turf-500/30 bg-turf-500/10' : 'border-gold-500/30 bg-gold-500/10'
            }`}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate text-chalk-200">
              <Flag value={match.homeFlag} size="sm" />
              <span className="truncate">
                {match.homeTeam} {match.finalHome}–{match.finalAway} {match.awayTeam}
              </span>
              <Flag value={match.awayFlag} size="sm" />
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <span className="font-mono text-xs text-chalk-400">
                predicted {prediction.predictedHome}–{prediction.predictedAway}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  isExact ? 'bg-turf-500/20 text-turf-300' : 'bg-gold-500/20 text-gold-300'
                }`}
              >
                {isExact ? '🎯 Exact +3' : '✅ Correct +1'}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
