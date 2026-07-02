import { useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useMatches } from '@/hooks/useMatches';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/context/ToastContext';
import { MatchForm } from './MatchForm';
import { formatKickoff } from '@/utils/dateHelpers';
import { recalculateStandings } from '@/utils/recalculate';
import { EmptyState } from '@/components/common/EmptyState';
import { Flag } from '@/components/common/Flag';
import type { Match, User } from '@/types';

type Tab = 'matches' | 'players';

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('matches');
  const { adminSignOut } = useAuth();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-chalk-100">Admin dashboard</h1>
          <p className="text-sm text-chalk-500">Manage matches, results, players, and standings.</p>
        </div>
        <button onClick={adminSignOut} className="btn-secondary text-sm">
          Sign out
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

function MatchesTab() {
  const { matches, loading } = useMatches();
  const toast = useAppToast();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { home: string; away: string }>>({});
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
    try {
      await updateDoc(doc(db, 'matches', match.id), {
        finalHome: Number(draft.home),
        finalAway: Number(draft.away),
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
      // Firestore batches cap at 500 ops — chunk if needed.
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
        {matches.map((match) => (
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
                  onClick={() => handleDelete(match.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayersTab() {
  const { leaderboard, loading } = useLeaderboard(false);
  const toast = useAppToast();
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<keyof User, string>>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fieldValue = (user: User, field: 'points' | 'exactPredictions' | 'correctOutcomes') =>
    drafts[user.id]?.[field] ?? String(user[field]);

  const setField = (userId: string, field: 'points' | 'exactPredictions' | 'correctOutcomes', value: string) => {
    setDrafts((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));
  };

  const handleSave = async (user: User) => {
    const draft = drafts[user.id];
    if (!draft) return;
    setSaving(user.id);
    try {
      const patch: Record<string, number> = {};
      if (draft.points !== undefined) patch.points = Number(draft.points);
      if (draft.exactPredictions !== undefined) patch.exactPredictions = Number(draft.exactPredictions);
      if (draft.correctOutcomes !== undefined) patch.correctOutcomes = Number(draft.correctOutcomes);
      await updateDoc(doc(db, 'users', user.id), patch);
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
      // Clean up their predictions first so nothing orphaned is left behind.
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
    <div className="flex flex-col gap-3">
      {leaderboard.map((user) => {
        const hasChanges = !!drafts[user.id];
        return (
          <div key={user.id} className="glass-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-[10rem] items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-lg">
                  {user.avatar || '⚽'}
                </div>
                <div>
                  <div className="font-semibold text-chalk-100">{user.name}</div>
                  <div className="text-xs text-chalk-500">#{user.rank} on leaderboard</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <NumberField
                  label="Points"
                  value={fieldValue(user, 'points')}
                  onChange={(v) => setField(user.id, 'points', v)}
                />
                <NumberField
                  label="Exact"
                  value={fieldValue(user, 'exactPredictions')}
                  onChange={(v) => setField(user.id, 'exactPredictions', v)}
                />
                <NumberField
                  label="Correct"
                  value={fieldValue(user, 'correctOutcomes')}
                  onChange={(v) => setField(user.id, 'correctOutcomes', v)}
                />

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
          </div>
        );
      })}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-chalk-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field h-9 w-16 text-sm"
      />
    </label>
  );
}
