import { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useMatches } from '@/hooks/useMatches';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useUsersMap } from '@/hooks/useUsersMap';
import { usePredictionsForMatch } from '@/hooks/usePredictionsForMatch';
import { usePredictionsForUser } from '@/hooks/usePredictionsForUser';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/context/ToastContext';
import { MatchForm } from './MatchForm';
import { formatKickoff } from '@/utils/dateHelpers';
import { recalculateStandings } from '@/utils/recalculate';
import { setBonusStats } from '@/utils/points';
import { EmptyState } from '@/components/common/EmptyState';
import { Flag } from '@/components/common/Flag';
import type { Match, PenaltyWinner, User } from '@/types';

type Tab = 'matches' | 'players';

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('matches');
  const { logOut } = useAuth();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-chalk-100">Admin dashboard</h1>
          <p className="text-sm text-chalk-500">Manage matches, results, players, and standings.</p>
        </div>
        <button onClick={logOut} className="btn-secondary text-sm">
          Log out
        </button>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-white/10 bg-white/5 p-1 w-fit">
        <button
          onClick={() => setTab('matches')}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'matches' ? 'bg-turf-500 text-pitch-950' : 'text-chalk-300 hover:text-chalk-100'
          }`}
        >
          Matches
        </button>
        <button
          onClick={() => setTab('players')}
          className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === 'players' ? 'bg-turf-500 text-pitch-950' : 'text-chalk-300 hover:text-chalk-100'
          }`}
        >
          Players
        </button>
      </div>

      {tab === 'matches' ? <MatchesTab /> : <PlayersTab />}
    </div>
  );
}

function isKnockout(match: Pick<Match, 'group'>): boolean {
  return !match.group;
}

function MatchesTab() {
  const { matches, loading } = useMatches();
  const toast = useAppToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [penaltyDrafts, setPenaltyDrafts] = useState<Record<string, PenaltyWinner | undefined>>({});
  const [expandedPredictions, setExpandedPredictions] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [showReset, setShowReset] = useState(false);

  const handleCreate = async (data: Omit<Match, 'id' | 'finalHome' | 'finalAway' | 'status'>) => {
    try {
      await addDoc(collection(db, 'matches'), {
        ...data,
        finalHome: null,
        finalAway: null,
        finalPenaltyWinner: null,
        status: 'scheduled',
      });
      toast.info('Match created');
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Could not create match');
    }
  };

  const handleUpdate = async (id: string, data: Omit<Match, 'id' | 'finalHome' | 'finalAway' | 'status'>) => {
    try {
      await updateDoc(doc(db, 'matches', id), { ...data });
      toast.info('Match updated');
      setEditing(null);
    } catch (err) {
      console.error(err);
      toast.error('Could not update match');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this match? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
      toast.info('Match deleted');
    } catch (err) {
      console.error(err);
      toast.error('Could not delete match');
    }
  };

  const handleSaveScore = async (match: Match) => {
    const draft = scoreDrafts[match.id];
    if (!draft || draft.home === '' || draft.away === '') {
      toast.error('Enter both final scores');
      return;
    }
    const home = Number(draft.home);
    const away = Number(draft.away);
    const tied = home === away;
    const knockout = isKnockout(match);

    if (knockout && tied && !penaltyDrafts[match.id]) {
      toast.error('Tied knockout match — pick who won on penalties first');
      return;
    }

    try {
      await updateDoc(doc(db, 'matches', match.id), {
        finalHome: home,
        finalAway: away,
        finalPenaltyWinner: knockout && tied ? penaltyDrafts[match.id] : null,
        status: 'finished',
      });
      toast.scoresUpdated();
    } catch (err) {
      console.error(err);
      toast.error('Could not save final score');
    }
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const result = await recalculateStandings();
      toast.scoresUpdated();
      toast.info(`Recalculated ${result.predictionsScored} predictions for ${result.usersUpdated} players`);
    } catch (err) {
      console.error(err);
      toast.error('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  const handleResetAll = async () => {
    if (resetConfirm !== 'DELETE') return;
    setResetting(true);
    try {
      const [matchesSnap, predictionsSnap] = await Promise.all([
        getDocs(collection(db, 'matches')),
        getDocs(collection(db, 'predictions')),
      ]);
      const allDocs = [...matchesSnap.docs, ...predictionsSnap.docs];
      for (let i = 0; i < allDocs.length; i += 400) {
        const batch = writeBatch(db);
        allDocs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      toast.info(`Deleted ${matchesSnap.size} matches and ${predictionsSnap.size} predictions`);
      setShowReset(false);
      setResetConfirm('');
    } catch (err) {
      console.error(err);
      toast.error('Reset failed');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + New match
          </button>
        )}
        <button onClick={handleRecalculate} disabled={recalculating} className="btn-secondary text-sm">
          {recalculating ? 'Recalculating…' : '🔄 Recalculate standings'}
        </button>
        <button
          onClick={() => setShowReset((v) => !v)}
          className="ml-auto rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20"
        >
          ⚠️ Reset all matches
        </button>
      </div>

      {showReset && (
        <div className="glass-card mb-6 border-red-500/30 p-5">
          <h3 className="mb-1 font-display font-semibold text-red-300">Danger zone</h3>
          <p className="mb-3 text-sm text-chalk-400">
            This permanently deletes <strong>every match and every prediction</strong> — useful for clearing out
            duplicates from re-running import scripts. Player profiles and points are not touched, but you should
            re-run <span className="font-mono text-xs">Recalculate standings</span> afterward once new matches are
            scored. Type <span className="font-mono text-red-300">DELETE</span> to confirm.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="Type DELETE"
              className="text-input w-40"
            />
            <button
              onClick={handleResetAll}
              disabled={resetConfirm !== 'DELETE' || resetting}
              className="rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {resetting ? 'Deleting…' : 'Delete everything'}
            </button>
            <button onClick={() => setShowReset(false)} className="btn-secondary px-3 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        {showForm && <MatchForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}
        {editing && (
          <MatchForm
            initial={editing}
            onSubmit={(data) => handleUpdate(editing.id, data)}
            onCancel={() => setEditing(null)}
          />
        )}
      </div>

      {loading && <p className="text-chalk-500">Loading matches…</p>}
      {!loading && matches.length === 0 && (
        <EmptyState icon="🗂️" title="No matches yet" message="Create your first match to get started." />
      )}

      <div className="flex flex-col gap-3">
        {matches.map((match) => {
          const draft = scoreDrafts[match.id];
          const draftHome = draft?.home ?? '';
          const draftAway = draft?.away ?? '';
          const showsPenaltyPicker =
            isKnockout(match) && draftHome !== '' && draftAway !== '' && draftHome === draftAway;

          return (
            <div key={match.id} className="glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-chalk-100">
                    <Flag value={match.homeFlag} size="sm" /> {match.homeTeam} vs {match.awayTeam}{' '}
                    <Flag value={match.awayFlag} size="sm" />
                  </div>
                  <div className="text-xs text-chalk-500">
                    {formatKickoff(match.kickoff)} · {match.group ?? match.stage} ·{' '}
                    <span className="capitalize">{match.status}</span>
                    {isKnockout(match) && <span className="ml-1 text-gold-400">(knockout)</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    placeholder="H"
                    className="input-field h-9 w-14 text-sm"
                    defaultValue={match.finalHome ?? ''}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? String(match.finalAway ?? '') },
                      }))
                    }
                  />
                  <span className="text-chalk-500">–</span>
                  <input
                    type="number"
                    placeholder="A"
                    className="input-field h-9 w-14 text-sm"
                    defaultValue={match.finalAway ?? ''}
                    onChange={(e) =>
                      setScoreDrafts((prev) => ({
                        ...prev,
                        [match.id]: { home: prev[match.id]?.home ?? String(match.finalHome ?? ''), away: e.target.value },
                      }))
                    }
                  />
                  <button onClick={() => handleSaveScore(match)} className="btn-secondary px-3 py-2 text-xs">
                    Save result
                  </button>
                  <button onClick={() => setEditing(match)} className="btn-secondary px-3 py-2 text-xs">
                    Edit
                  </button>
                  <button
                    onClick={() => setExpandedPredictions((v) => (v === match.id ? null : match.id))}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    {expandedPredictions === match.id ? 'Hide predictions' : 'Edit predictions'}
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {showsPenaltyPicker && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/5 px-3 py-2 text-sm">
                  <span className="text-gold-400">⚽ Tied — who won on penalties?</span>
                  <button
                    onClick={() => setPenaltyDrafts((prev) => ({ ...prev, [match.id]: 'home' }))}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      penaltyDrafts[match.id] === 'home'
                        ? 'border-turf-400 bg-turf-500/20 text-turf-300'
                        : 'border-white/15 text-chalk-300'
                    }`}
                  >
                    {match.homeTeam}
                  </button>
                  <button
                    onClick={() => setPenaltyDrafts((prev) => ({ ...prev, [match.id]: 'away' }))}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold ${
                      penaltyDrafts[match.id] === 'away'
                        ? 'border-turf-400 bg-turf-500/20 text-turf-300'
                        : 'border-white/15 text-chalk-300'
                    }`}
                  >
                    {match.awayTeam}
                  </button>
                </div>
              )}

              {expandedPredictions === match.id && <AdminMatchPredictions match={match} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminMatchPredictions({ match }: { match: Match }) {
  const { predictions } = usePredictionsForMatch(match.id, true);
  const { usersMap } = useUsersMap();
  const toast = useAppToast();
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const userIds = Object.keys(usersMap);
  const byUser = new Map(predictions.map((p) => [p.userId, p]));

  const handleSave = async (userId: string) => {
    const draft = drafts[userId];
    const existing = byUser.get(userId);
    const home = draft?.home ?? (existing ? String(existing.predictedHome) : '');
    const away = draft?.away ?? (existing ? String(existing.predictedAway) : '');
    if (home === '' || away === '') {
      toast.error('Enter both scores');
      return;
    }
    setSaving(userId);
    try {
      await setDoc(
        doc(db, 'predictions', `${userId}_${match.id}`),
        {
          userId,
          matchId: match.id,
          predictedHome: Number(home),
          predictedAway: Number(away),
          points: existing?.points ?? null,
          outcome: existing?.outcome ?? null,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      toast.scoresUpdated();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not save prediction');
    } finally {
      setSaving(null);
    }
  };

  const handleDeletePrediction = async (userId: string) => {
    if (!confirm('Are you sure you want to completely delete this prediction?')) return;
    setDeleting(userId);
    try {
      await deleteDoc(doc(db, 'predictions', `${userId}_${match.id}`));
      toast.info('Prediction deleted');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not delete prediction');
    } finally {
      setDeleting(null);
    }
  };

  if (userIds.length === 0) return <p className="mt-3 text-xs text-chalk-500">No players yet.</p>;

  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-white/5 pt-3">
      {userIds.map((userId) => {
        const user = usersMap[userId];
        const existing = byUser.get(userId);
        const home = drafts[userId]?.home ?? (existing ? String(existing.predictedHome) : '');
        const away = drafts[userId]?.away ?? (existing ? String(existing.predictedAway) : '');
        return (
          <div key={userId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm">
            <span className="flex items-center gap-2 text-chalk-200">
              <span>{user?.avatar || '⚽'}</span>
              <span className="truncate">{user?.name ?? 'Player'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                value={home}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [userId]: { home: e.target.value, away } }))}
                className="input-field h-8 w-12 text-xs"
              />
              <span className="text-chalk-500">–</span>
              <input
                type="number"
                value={away}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [userId]: { home, away: e.target.value } }))}
                className="input-field h-8 w-12 text-xs"
              />
              <button
                onClick={() => handleSave(userId)}
                disabled={saving === userId || deleting === userId}
                className="btn-secondary px-2 py-1 text-xs"
              >
                {saving === userId ? '…' : 'Save'}
              </button>
              {existing && (
                <button
                  onClick={() => handleDeletePrediction(userId)}
                  disabled={saving === userId || deleting === userId}
                  className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting === userId ? '…' : 'Reset'}
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AdminPlayerPredictions({ userId, userName }: { userId: string; userName: string }) {
  const { matches, loading: matchesLoading } = useMatches();
  const { predictions, loading: predsLoading } = usePredictionsForUser(userId, true);
  const toast = useAppToast();
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [penaltyDrafts, setPenaltyDrafts] = useState<Record<string, PenaltyWinner | undefined>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const byMatch = new Map(predictions.map((p) => [p.matchId, p]));
  const sortedMatches = [...matches].sort((a, b) => a.kickoff - b.kickoff);

  const handleSave = async (match: Match) => {
    const matchId = match.id;
    const draft = drafts[matchId];
    const existing = byMatch.get(matchId);
    const home = draft?.home ?? (existing ? String(existing.predictedHome) : '');
    const away = draft?.away ?? (existing ? String(existing.predictedAway) : '');
    if (home === '' || away === '') {
      toast.error('Enter both scores');
      return;
    }

    const knockout = isKnockout(match);
    const tied = Number(home) === Number(away);
    const penaltyWinner = penaltyDrafts[matchId] ?? existing?.predictedPenaltyWinner ?? undefined;

    if (knockout && tied && !penaltyWinner) {
      toast.error('Tied knockout match — pick who won on penalties first');
      return;
    }

    setSaving(matchId);
    try {
      await setDoc(
        doc(db, 'predictions', `${userId}_${matchId}`),
        {
          userId,
          matchId,
          predictedHome: Number(home),
          predictedAway: Number(away),
          predictedPenaltyWinner: knockout && tied ? penaltyWinner : null,
          points: existing?.points ?? null,
          outcome: existing?.outcome ?? null,
          createdAt: existing?.createdAt ?? Date.now(),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
      toast.scoresUpdated();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
      setPenaltyDrafts((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not save prediction');
    } finally {
      setSaving(null);
    }
  };

  const handleDeletePrediction = async (matchId: string) => {
    if (!confirm('Are you sure you want to completely delete this prediction?')) return;
    setDeleting(matchId);
    try {
      await deleteDoc(doc(db, 'predictions', `${userId}_${matchId}`));
      toast.info('Prediction deleted');
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
      setPenaltyDrafts((prev) => {
        const next = { ...prev };
        delete next[matchId];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not delete prediction');
    } finally {
      setDeleting(null);
    }
  };

  const loading = matchesLoading || predsLoading;

  if (loading) return <p className="mt-3 text-xs text-chalk-500">Loading {userName}'s predictions…</p>;
  if (sortedMatches.length === 0) return <p className="mt-3 text-xs text-chalk-500">No matches yet.</p>;

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3">
      {sortedMatches.map((match) => {
        const existing = byMatch.get(match.id);
        const home = drafts[match.id]?.home ?? (existing ? String(existing.predictedHome) : '');
        const away = drafts[match.id]?.away ?? (existing ? String(existing.predictedAway) : '');
        const knockout = isKnockout(match);
        const showsPenaltyPicker = knockout && home !== '' && away !== '' && Number(home) === Number(away);
        const selectedPenaltyWinner = penaltyDrafts[match.id] ?? existing?.predictedPenaltyWinner ?? undefined;

        return (
          <div key={match.id} className="rounded-lg px-2 py-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1.5 truncate text-chalk-200">
                <Flag value={match.homeFlag} size="sm" />
                <span className="truncate">
                  {match.homeTeam} vs {match.awayTeam}
                </span>
                <Flag value={match.awayFlag} size="sm" />
              </span>
              <span className="flex flex-shrink-0 items-center gap-1.5">
                <input
                  type="number"
                  value={home}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [match.id]: { home: e.target.value, away } }))}
                  className="input-field h-8 w-12 text-xs"
                />
                <span className="text-chalk-500">–</span>
                <input
                  type="number"
                  value={away}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [match.id]: { home, away: e.target.value } }))}
                  className="input-field h-8 w-12 text-xs"
                />
                <button
                  onClick={() => handleSave(match)}
                  disabled={saving === match.id || deleting === match.id}
                  className="btn-secondary px-2 py-1 text-xs"
                >
                  {saving === match.id ? '…' : 'Save'}
                </button>
                {existing && (
                  <button
                    onClick={() => handleDeletePrediction(match.id)}
                    disabled={saving === match.id || deleting === match.id}
                    className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    {deleting === match.id ? '…' : 'Reset'}
                  </button>
                )}
              </span>
            </div>

            {showsPenaltyPicker && (
              <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-gold-500/20 bg-gold-500/5 px-2 py-1.5 text-xs">
                <span className="text-gold-400">⚽ Tied — penalty winner?</span>
                <button
                  onClick={() => setPenaltyDrafts((prev) => ({ ...prev, [match.id]: 'home' }))}
                  className={`rounded-md border px-2 py-1 font-semibold ${
                    selectedPenaltyWinner === 'home'
                      ? 'border-turf-400 bg-turf-500/20 text-turf-300'
                      : 'border-white/15 text-chalk-300'
                  }`}
                >
                  {match.homeTeam}
                </button>
                <button
                  onClick={() => setPenaltyDrafts((prev) => ({ ...prev, [match.id]: 'away' }))}
                  className={`rounded-md border px-2 py-1 font-semibold ${
                    selectedPenaltyWinner === 'away'
                      ? 'border-turf-400 bg-turf-500/20 text-turf-300'
                      : 'border-white/15 text-chalk-300'
                  }`}
                >
                  {match.awayTeam}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayersTab() {
  const { leaderboard, loading } = useLeaderboard(false);
  const toast = useAppToast();
  const [drafts, setDrafts] = useState<
    Record<string, { points?: string; exact?: string; correct?: string; totalPredictions?: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const setField = (
    userId: string,
    field: 'points' | 'exact' | 'correct' | 'totalPredictions',
    value: string
  ) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleSave = async (user: User) => {
    const draft = drafts[user.id];
    if (!draft) return;
    const points = draft.points !== undefined ? Number(draft.points) : (user.bonusPoints ?? 0);
    const exact = draft.exact !== undefined ? Number(draft.exact) : (user.bonusExact ?? 0);
    const correct = draft.correct !== undefined ? Number(draft.correct) : (user.bonusCorrect ?? 0);
    const totalPredictions =
      draft.totalPredictions !== undefined ? Number(draft.totalPredictions) : (user.bonusTotalPredictions ?? 0);

    if ([points, exact, correct, totalPredictions].some((v) => Number.isNaN(v))) {
      toast.error('Bonus values must be numbers');
      return;
    }

    setSaving(user.id);
    try {
      await setBonusStats(user.id, { points, exact, correct, totalPredictions });
      toast.scoresUpdated();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      toast.error('Could not update player');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Remove ${user.name} from the game? This deletes their profile and all their predictions.`)) return;
    setDeleting(user.id);
    try {
      const predsSnap = await getDocs(query(collection(db, 'predictions'), where('userId', '==', user.id)));
      const batch = writeBatch(db);
      predsSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'users', user.id));
      await batch.commit();
      toast.info(`${user.name} removed`);
    } catch (err) {
      console.error(err);
      toast.error('Could not remove player');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) return <p className="text-chalk-500">Loading players…</p>;

  if (leaderboard.length === 0) {
    return <EmptyState icon="👥" title="No players yet" message="Share the join link with your friends to get started." />;
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {leaderboard.map((user) => {
          const draft = drafts[user.id];
          const hasChanges = !!draft;
          const bp = draft?.points ?? String(user.bonusPoints ?? 0);
          const be = draft?.exact ?? String(user.bonusExact ?? 0);
          const bc = draft?.correct ?? String(user.bonusCorrect ?? 0);
          const bt = draft?.totalPredictions ?? String(user.bonusTotalPredictions ?? 0);

          return (
            <div key={user.id} className="glass-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-[9rem] items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-lg">
                    {user.avatar || '⚽'}
                  </div>
                  <div>
                    <div className="font-semibold text-chalk-100">{user.name}</div>
                    <div className="text-xs text-chalk-500">#{user.rank} on leaderboard</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <StatPair label="Points" computed={user.points} bonus={bp} onBonusChange={(v) => setField(user.id, 'points', v)} />
                  <StatPair label="Exact" computed={user.exactPredictions} bonus={be} onBonusChange={(v) => setField(user.id, 'exact', v)} />
                  <StatPair label="Correct" computed={user.correctOutcomes} bonus={bc} onBonusChange={(v) => setField(user.id, 'correct', v)} />
                  <StatPair
                    label="Total preds"
                    computed={user.totalPredictions}
                    bonus={bt}
                    onBonusChange={(v) => setField(user.id, 'totalPredictions', v)}
                  />

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-chalk-500">Streak</span>
                    <span className="font-mono text-sm text-gold-400">+{user.streakBonusPoints ?? 0}</span>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-chalk-500">Total pts</span>
                    <span className="font-mono text-sm font-bold text-turf-400">{user.totalPoints}</span>
                  </div>

                  <button
                    onClick={() => setExpandedPlayer((p) => (p === user.id ? null : user.id))}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    {expandedPlayer === user.id ? 'Hide predictions' : 'View predictions'}
                  </button>
                  <button
                    onClick={() => handleSave(user)}
                    disabled={!hasChanges || saving === user.id}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    {saving === user.id ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deleting === user.id}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                  >
                    {deleting === user.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </div>

              {expandedPlayer === user.id && <AdminPlayerPredictions userId={user.id} userName={user.name} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPair({
  label,
  computed,
  bonus,
  onBonusChange,
}: {
  label: string;
  computed: number;
  bonus: string;
  onBonusChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-chalk-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className="flex h-9 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] font-mono text-xs text-chalk-400">
          {computed}
        </span>
        <span className="text-chalk-600">+</span>
        <input
          type="number"
          value={bonus}
          onChange={(e) => onBonusChange(e.target.value)}
          className="input-field h-9 w-12 border-turf-500/30 text-xs"
        />
      </div>
    </div>
  );
}