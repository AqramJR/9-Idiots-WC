import { useEffect, useState } from 'react';
import type { Match, Prediction, User } from '@/types';
import { formatKickoff, formatCountdown, isLocked, msUntil } from '@/utils/dateHelpers';
import { useAppToast } from '@/context/ToastContext';
import { Flag } from '@/components/common/Flag';
import { usePredictionsForMatch } from '@/hooks/usePredictionsForMatch';

interface MatchCardProps {
  match: Match;
  prediction: Prediction | undefined;
  onSave: (home: number, away: number) => Promise<void>;
  usersMap: Record<string, User>;
  currentUserId?: string;
}

export function MatchCard({ match, prediction, onSave, usersMap, currentUserId }: MatchCardProps) {
  const [home, setHome] = useState<string>(prediction ? String(prediction.predictedHome) : '');
  const [away, setAway] = useState<string>(prediction ? String(prediction.predictedAway) : '');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [locked, setLocked] = useState(isLocked(match.kickoff));
  const [countdown, setCountdown] = useState(formatCountdown(msUntil(match.kickoff)));
  const [showPredictions, setShowPredictions] = useState(false);
  const [viewedOthers, setViewedOthers] = useState(false);
  const [warnedThisView, setWarnedThisView] = useState(false);
  const toast = useAppToast();

  // You unlock everyone else's picks the moment you've submitted your own —
  // no waiting for kickoff. Keeps things friendly and fast-paced.
  const canViewOthers = !!prediction;
  const { predictions: allPredictions, loading: loadingAll } = usePredictionsForMatch(match.id, showPredictions);

  // Keep inputs synced if prediction loads/changes from Firestore (e.g. cross-device).
  useEffect(() => {
    if (!dirty && prediction) {
      setHome(String(prediction.predictedHome));
      setAway(String(prediction.predictedAway));
    }
  }, [prediction, dirty]);

  // Live countdown + auto-lock the instant kickoff passes.
  useEffect(() => {
    const tick = () => {
      const nowLocked = isLocked(match.kickoff);
      setCountdown(formatCountdown(msUntil(match.kickoff)));
      setLocked((prev) => {
        if (!prev && nowLocked) toast.matchLocked();
        return nowLocked;
      });
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.kickoff]);

  const togglePredictions = () => {
    setShowPredictions((v) => {
      const next = !v;
      if (next && canViewOthers) {
        // Fresh peek — arm the "caught you" jab for their next edit.
        setViewedOthers(true);
        setWarnedThisView(false);
      }
      return next;
    });
  };

  const handleScoreChange = (setter: (v: string) => void) => (v: string) => {
    if (!locked && viewedOthers && !warnedThisView) {
      toast.caughtCopying();
      setWarnedThisView(true);
    }
    setter(v);
    setDirty(true);
  };

  const handleSave = async () => {
    if (locked) return;
    const h = Number(home);
    const a = Number(away);
    if (home === '' || away === '' || Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) {
      toast.error('Enter a valid score for both teams');
      return;
    }
    setSaving(true);
    try {
      await onSave(h, a);
      setDirty(false);
      toast.predictionSaved();
    } catch (err) {
      console.error(err);
      toast.error('Could not save prediction');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    dirty &&
    !(prediction && String(prediction.predictedHome) === home && String(prediction.predictedAway) === away);

  const isFinished = match.status === 'finished' && match.finalHome !== null && match.finalAway !== null;

  return (
    <div className="glass-card animate-fade-up p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="rounded-full bg-white/5 px-2.5 py-1 font-medium uppercase tracking-wider text-chalk-500">
          {match.group ?? match.stage ?? 'Match'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-chalk-500">{formatKickoff(match.kickoff)}</span>
          {!locked && (
            <span className="rounded-full bg-turf-500/15 px-2 py-0.5 font-mono text-turf-400">
              ⏱ {countdown}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TeamBlock flag={match.homeFlag} name={match.homeTeam} align="right" />

        <div className="flex flex-shrink-0 items-center gap-2">
          {isFinished ? (
            <div className="flex items-center gap-2 font-mono text-2xl font-bold text-chalk-100">
              <span>{match.finalHome}</span>
              <span className="text-chalk-500">–</span>
              <span>{match.finalAway}</span>
            </div>
          ) : (
            <>
              <ScoreInput value={home} disabled={locked} onChange={handleScoreChange(setHome)} />
              <span className="text-chalk-500">–</span>
              <ScoreInput value={away} disabled={locked} onChange={handleScoreChange(setAway)} />
            </>
          )}
        </div>

        <TeamBlock flag={match.awayFlag} name={match.awayTeam} align="left" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {locked ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-chalk-500">
            🔒 Predictions closed
          </span>
        ) : (
          <span className="text-sm text-chalk-500">
            {prediction ? 'Prediction saved' : 'No prediction yet — submit to see everyone else\u2019s 👀'}
          </span>
        )}

        {!locked && !isFinished && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}

        {isFinished && prediction && prediction.points !== null && (
          <PointsBadge outcome={prediction.outcome} points={prediction.points} />
        )}
      </div>

      {canViewOthers && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <button
            onClick={togglePredictions}
            className="text-xs font-semibold text-turf-400 hover:text-turf-300"
          >
            {showPredictions ? '▲ Hide everyone\u2019s predictions' : '▼ See everyone\u2019s predictions'}
          </button>

          {showPredictions && (
            <div className="mt-3 flex flex-col gap-1.5">
              {loadingAll && <p className="text-xs text-chalk-500">Loading…</p>}
              {!loadingAll && allPredictions.length === 0 && (
                <p className="text-xs text-chalk-500">No one predicted this match.</p>
              )}
              {!loadingAll &&
                allPredictions
                  .slice()
                  .sort((a, b) => (usersMap[a.userId]?.name ?? '').localeCompare(usersMap[b.userId]?.name ?? ''))
                  .map((p) => {
                    const user = usersMap[p.userId];
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${
                          p.userId === currentUserId ? 'bg-turf-500/10' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2 text-chalk-200">
                          <span>{user?.avatar || '⚽'}</span>
                          <span className="truncate">
                            {user?.name ?? 'Player'}
                            {p.userId === currentUserId && <span className="text-turf-400"> (you)</span>}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-chalk-300">
                            {p.predictedHome}–{p.predictedAway}
                          </span>
                          {isFinished && p.points !== null && (
                            <span className="text-xs font-semibold text-chalk-500">+{p.points}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamBlock({ flag, name, align }: { flag: string; name: string; align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-1 flex-col items-center gap-1.5 ${align === 'right' ? 'sm:items-end' : 'sm:items-start'}`}>
      <Flag value={flag} size="lg" />
      <span className="text-center text-sm font-semibold text-chalk-100 sm:text-right">{name}</span>
    </div>
  );
}

function ScoreInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      className="input-field h-12 w-14 disabled:opacity-40"
      placeholder="-"
    />
  );
}

function PointsBadge({ outcome, points }: { outcome: Prediction['outcome']; points: number }) {
  const styles =
    outcome === 'exact'
      ? 'bg-turf-500/15 text-turf-400'
      : outcome === 'correct'
        ? 'bg-gold-500/15 text-gold-400'
        : 'bg-white/5 text-chalk-500';
  const label = outcome === 'exact' ? 'Exact score!' : outcome === 'correct' ? 'Correct result' : 'No points';
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {label} · +{points}
    </span>
  );
}
