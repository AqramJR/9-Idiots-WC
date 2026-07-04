import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/context/ToastContext';
import { AVATARS } from '@/utils/avatars';

type Mode = 'signup' | 'login';

export function JoinForm() {
  const [mode, setMode] = useState<Mode>('signup');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { signUp, logIn, authReady, firebaseUser, identity } = useAuth();
  const toast = useAppToast();
  const navigate = useNavigate();

  // Already logged in (e.g. opened this link directly while a session is
  // active) — no need to show the form at all.
  if (authReady && firebaseUser && identity) {
    return <Navigate to="/matches" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      toast.error('Enter a username');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(trimmedUsername, password, avatar, keepLoggedIn);
      } else {
        await logIn(trimmedUsername, password, keepLoggedIn);
      }
      navigate('/matches');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-md animate-fade-up p-8">
        <h1 className="mb-1 text-center font-display text-2xl font-bold text-chalk-100">
          {mode === 'signup' ? 'Join the idiots' : 'Welcome back'}
        </h1>
        <p className="mb-6 text-center text-sm text-chalk-500">
          {mode === 'signup' ? 'Pick a username — works on any device.' : 'Log back in from any device.'}
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Username
        </label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. ahmed99"
          maxLength={24}
          className="mb-4 w-full rounded-lg border border-white/10 bg-pitch-900/60 px-4 py-3 text-chalk-100 outline-none transition-colors focus:border-turf-400"
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          className="mb-5 w-full rounded-lg border border-white/10 bg-pitch-900/60 px-4 py-3 text-chalk-100 outline-none transition-colors focus:border-turf-400"
        />

        {mode === 'signup' && (
          <>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
              Pick an avatar
            </label>
            <div className="mb-5 grid grid-cols-6 gap-2">
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
          </>
        )}

        <label className="mb-6 flex items-center gap-2 text-sm text-chalk-300">
          <input
            type="checkbox"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-pitch-900 accent-turf-500"
          />
          Keep me logged in on this device
        </label>

        <button type="submit" disabled={submitting || !authReady} className="btn-primary w-full">
          {!authReady ? 'Connecting…' : submitting ? 'One sec…' : mode === 'signup' ? 'Enter the game' : 'Log in'}
        </button>

        <button
          type="button"
          onClick={() => setMode((m) => (m === 'signup' ? 'login' : 'signup'))}
          className="mt-4 w-full text-center text-sm text-chalk-500 hover:text-chalk-300"
        >
          {mode === 'signup' ? 'Already playing? Log in' : "New here? Join the idiots"}
        </button>
      </form>
    </div>
  );
}
