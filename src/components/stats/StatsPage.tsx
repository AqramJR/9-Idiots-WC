import { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useAllPredictions } from '@/hooks/useAllPredictions';
import { useMatches } from '@/hooks/useMatches';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { getOutcome } from '@/utils/scoring';
import { EmptyState } from '@/components/common/EmptyState';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const CHART_GREEN = '#4ade80';
const CHART_GOLD = '#eab308';
const CHART_GRID = 'rgba(255,255,255,0.06)';
const CHART_TEXT = '#c9d4cd';

export function StatsPage() {
  const { predictions, loading: predictionsLoading } = useAllPredictions();
  const { matches, loading: matchesLoading } = useMatches();
  const { leaderboard } = useLeaderboard(false);

  const loading = predictionsLoading || matchesLoading;

  const stats = useMemo(() => {
    const matchesById = new Map(matches.map((m) => [m.id, m]));

    // Most predicted winner (team name predicted to win most often across all matches)
    const teamWinVotes = new Map<string, number>();
    // Most predicted scoreline, e.g. "2-1"
    const scorelineVotes = new Map<string, number>();
    // Outcome distribution per match: home win / draw / away win
    let homeVotes = 0;
    let drawVotes = 0;
    let awayVotes = 0;

    for (const p of predictions) {
      const match = matchesById.get(p.matchId);
      if (!match) continue;

      const outcome = getOutcome(p.predictedHome, p.predictedAway);
      if (outcome === 'home') {
        homeVotes += 1;
        teamWinVotes.set(match.homeTeam, (teamWinVotes.get(match.homeTeam) ?? 0) + 1);
      } else if (outcome === 'away') {
        awayVotes += 1;
        teamWinVotes.set(match.awayTeam, (teamWinVotes.get(match.awayTeam) ?? 0) + 1);
      } else {
        drawVotes += 1;
      }

      const key = `${p.predictedHome}-${p.predictedAway}`;
      scorelineVotes.set(key, (scorelineVotes.get(key) ?? 0) + 1);
    }

    const topTeams = [...teamWinVotes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topScorelines = [...scorelineVotes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const totalOutcomeVotes = homeVotes + drawVotes + awayVotes;

    return {
      topTeams,
      topScorelines,
      homeVotes,
      drawVotes,
      awayVotes,
      totalOutcomeVotes,
      totalParticipants: leaderboard.length,
      totalPredictions: predictions.length,
    };
  }, [predictions, matches, leaderboard]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton glass-card h-64" />
        ))}
      </div>
    );
  }

  if (stats.totalPredictions === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No stats yet"
        message="Once your friends start predicting, patterns and trends will show up here."
      />
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-chalk-100">Statistics</h1>
        <p className="text-sm text-chalk-500">How everyone is predicting the tournament.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Participants" value={stats.totalParticipants} icon="👥" />
        <SummaryCard label="Predictions made" value={stats.totalPredictions} icon="📝" />
        <SummaryCard
          label="Most predicted winner"
          value={stats.topTeams[0]?.[0] ?? '—'}
          icon="🥅"
          small
        />
        <SummaryCard
          label="Most predicted score"
          value={stats.topScorelines[0]?.[0].replace('-', '–') ?? '—'}
          icon="🔢"
          small
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-chalk-100">Most predicted winners</h2>
          <Bar
            data={{
              labels: stats.topTeams.map(([team]) => team),
              datasets: [
                {
                  label: 'Predictions',
                  data: stats.topTeams.map(([, count]) => count),
                  backgroundColor: CHART_GREEN,
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              indexAxis: 'y' as const,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID } },
                y: { ticks: { color: CHART_TEXT }, grid: { display: false } },
              },
            }}
          />
        </div>

        <div className="glass-card p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-chalk-100">Outcome split</h2>
          <div className="mx-auto max-w-[280px]">
            <Doughnut
              data={{
                labels: ['Home win', 'Draw', 'Away win'],
                datasets: [
                  {
                    data: [stats.homeVotes, stats.drawVotes, stats.awayVotes],
                    backgroundColor: [CHART_GREEN, CHART_GOLD, '#38bdf8'],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                plugins: { legend: { position: 'bottom', labels: { color: CHART_TEXT } } },
              }}
            />
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-semibold text-chalk-100">Most predicted scorelines</h2>
          <Bar
            data={{
              labels: stats.topScorelines.map(([s]) => s.replace('-', '–')),
              datasets: [
                {
                  label: 'Times predicted',
                  data: stats.topScorelines.map(([, count]) => count),
                  backgroundColor: CHART_GOLD,
                  borderRadius: 6,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: CHART_TEXT }, grid: { display: false } },
                y: { ticks: { color: CHART_TEXT }, grid: { color: CHART_GRID } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  small,
}: {
  label: string;
  value: string | number;
  icon: string;
  small?: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="mb-1 text-xl">{icon}</div>
      <div className={`truncate font-display font-bold text-chalk-100 ${small ? 'text-base' : 'text-2xl'}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-chalk-500">{label}</div>
    </div>
  );
}
