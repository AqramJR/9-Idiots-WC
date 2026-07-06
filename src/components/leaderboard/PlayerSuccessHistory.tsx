import { usePredictionsForUser } from '@/hooks/usePredictionsForUser';
import { useMatches } from '@/hooks/useMatches';
import { Flag } from '@/components/common/Flag';

/**
 * Shows exactly where a player earned their points OR where they spent their
 * gamification tokens. Failed predictions without a token are hidden to 
 * keep it as a highlight reel, but failed Double/Triple bets are exposed
 * to the world for public shaming!
 */
export function PlayerSuccessHistory({ userId }: { userId: string }) {
  const { predictions, loading: predsLoading } = usePredictionsForUser(userId, true);
  const { matches, loading: matchesLoading } = useMatches();

  const loading = predsLoading || matchesLoading;
  const matchesById = new Map(matches.map((m) => [m.id, m]));

  const hits = predictions
    .filter((p) => p.outcome === 'exact' || p.outcome === 'correct' || p.multiplier === 'double' || p.multiplier === 'triple')
    .map((p) => ({ prediction: p, match: matchesById.get(p.matchId) }))
    .filter((row) => row.match && row.match.status === 'finished')
    .map((row) => ({ prediction: row.prediction, match: row.match! }))
    .sort((a, b) => b.match.kickoff - a.match.kickoff); // most recent first

  if (loading) {
    return <p className="mt-3 text-xs text-chalk-500">Loading…</p>;
  }

  if (hits.length === 0) {
    return <p className="mt-3 text-xs text-chalk-500">No exact hits or boosts used yet — still waiting for that first highlight 👀</p>;
  }

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
      {hits.map(({ prediction, match }) => {
        const isExact = prediction.outcome === 'exact';
        const isCorrect = prediction.outcome === 'correct';
        const isWrong = prediction.outcome === 'wrong';
        const mult = prediction.multiplier;
        const pts = prediction.points;

        let bgClass = 'border-white/10 bg-white/5';
        let badgeClass = 'bg-white/10 text-chalk-300';
        let label = '❌ Miss';

        if (isExact) {
          bgClass = 'border-turf-500/30 bg-turf-500/10';
          badgeClass = 'bg-turf-500/20 text-turf-300';
          label = '🎯 Exact';
        } else if (isCorrect) {
          bgClass = 'border-gold-500/30 bg-gold-500/10';
          badgeClass = 'bg-gold-500/20 text-gold-300';
          label = '✅ Correct';
        } else if (isWrong) {
          bgClass = 'border-red-500/30 bg-red-500/10';
          badgeClass = 'bg-red-500/20 text-red-300';
          label = '❌ Miss';
        }

        let multPrefix = '';
        if (mult === 'double') multPrefix = '💎 x2 ';
        if (mult === 'triple') multPrefix = '☠️ x3 ';

        const pointsStr = pts !== null ? (pts > 0 ? `+${pts}` : `${pts}`) : '';

        return (
          <div
            key={prediction.id}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${bgClass}`}
          >
            <span className="flex min-w-0 items-center gap-1.5 truncate text-chalk-200">
              <Flag value={match.homeFlag} size="sm" />
              <span className="truncate">
                {match.homeTeam} {match.finalHome}–{match.finalAway} {match.awayTeam}
              </span>
              <Flag value={match.awayFlag} size="sm" />
            </span>
            <span className="flex flex-shrink-0 items-center gap-2">
              <span className="hidden font-mono text-xs text-chalk-400 sm:inline">
                predicted {prediction.predictedHome}–{prediction.predictedAway}
              </span>
              <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                {multPrefix}{label} {pointsStr}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}