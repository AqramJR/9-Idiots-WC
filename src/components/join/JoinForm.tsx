import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/context/ToastContext';

const AVATARS = ['⚽', '🦁', '🐯', '🦅', '🐺', '🔥', '⭐', '🐉', '🦈', '🐐', '👑', '🎯'];

export function JoinForm() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [submitting, setSubmitting] = useState(false);
  const { join, authReady, authError } = useAuth();
  const toast = useAppToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Please enter your name');
      return;
    }
    if (!authReady) {
      toast.error('Still connecting — please wait a second and try again.');
      return;
    }
    setSubmitting(true);
    try {
      await join(trimmed, avatar);
      navigate('/matches');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Could not join right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="glass-card w-full max-w-md animate-fade-up p-8"
      >
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-chalk-100">
          Join the prediction game
        </h1>
        <p className="mb-6 text-center text-sm text-chalk-500">
          Just your name — no password, no email.
        </p>

        {authError && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            ⚠️ {authError}
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          maxLength={24}
          className="mb-5 w-full rounded-lg border border-white/10 bg-pitch-900/60 px-4 py-3 text-chalk-100 outline-none transition-colors focus:border-turf-400"
          autoFocus
        />

        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Pick an avatar (optional)
        </label>
        <div className="mb-8 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              className={`flex aspect-square items-center justify-center rounded-lg border text-xl transition-all ${
                avatar === a
                  ? 'border-turf-400 bg-turf-500/15 shadow-glow'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <button type="submit" disabled={submitting || !authReady} className="btn-primary w-full">
          {!authReady ? 'Connecting…' : submitting ? 'Joining…' : 'Enter the game'}
        </button>
      </form>
    </div>
  );
}
