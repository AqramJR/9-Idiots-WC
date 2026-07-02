import { useState } from 'react';
import type { Match } from '@/types';

interface MatchFormProps {
  initial?: Match;
  onSubmit: (data: Omit<Match, 'id' | 'finalHome' | 'finalAway' | 'status'>) => Promise<void>;
  onCancel: () => void;
}

function toLocalDatetimeInput(ms: number): string {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function MatchForm({ initial, onSubmit, onCancel }: MatchFormProps) {
  const [homeTeam, setHomeTeam] = useState(initial?.homeTeam ?? '');
  const [awayTeam, setAwayTeam] = useState(initial?.awayTeam ?? '');
  const [homeFlag, setHomeFlag] = useState(initial?.homeFlag ?? '🏳️');
  const [awayFlag, setAwayFlag] = useState(initial?.awayFlag ?? '🏳️');
  const [group, setGroup] = useState(initial?.group ?? '');
  const [stage, setStage] = useState(initial?.stage ?? 'Group Stage');
  const [kickoff, setKickoff] = useState(
    initial ? toLocalDatetimeInput(initial.kickoff) : toLocalDatetimeInput(Date.now() + 3600000)
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        homeTeam,
        awayTeam,
        homeFlag,
        awayFlag,
        group: group || undefined,
        stage,
        kickoff: new Date(kickoff).getTime(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card animate-fade-up space-y-4 p-6">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Home team">
          <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} required className="text-input" />
        </Field>
        <Field label="Home flag emoji">
          <input value={homeFlag} onChange={(e) => setHomeFlag(e.target.value)} className="text-input" />
        </Field>
        <Field label="Away team">
          <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} required className="text-input" />
        </Field>
        <Field label="Away flag emoji">
          <input value={awayFlag} onChange={(e) => setAwayFlag(e.target.value)} className="text-input" />
        </Field>
        <Field label="Group (optional)">
          <input value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Group A" className="text-input" />
        </Field>
        <Field label="Stage">
          <select value={stage} onChange={(e) => setStage(e.target.value)} className="text-input">
            <option>Group Stage</option>
            <option>Round of 16</option>
            <option>Quarter-Final</option>
            <option>Semi-Final</option>
            <option>Third Place</option>
            <option>Final</option>
          </select>
        </Field>
        <Field label="Kickoff" full>
          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            required
            className="text-input"
          />
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2 text-sm">
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="btn-primary px-4 py-2 text-sm">
          {submitting ? 'Saving…' : initial ? 'Update match' : 'Create match'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-xs font-semibold uppercase tracking-wider text-chalk-500 ${full ? 'col-span-2' : ''}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
