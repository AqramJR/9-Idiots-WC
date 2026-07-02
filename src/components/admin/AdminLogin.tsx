import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAppToast } from '@/context/ToastContext';

export function AdminLogin() {
  const [email, setEmail] = useState(import.meta.env.VITE_ADMIN_EMAIL ?? '');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { adminSignIn } = useAuth();
  const toast = useAppToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminSignIn(email, password);
      toast.info('Welcome back, admin');
    } catch (err) {
      console.error(err);
      toast.error('Invalid admin credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="glass-card w-full max-w-sm animate-fade-up p-8">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 text-2xl">
            🔐
          </div>
          <h1 className="font-display text-xl font-bold text-chalk-100">Admin access</h1>
          <p className="mt-1 text-sm text-chalk-500">Sign in to manage matches and results.</p>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Admin email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-lg border border-white/10 bg-pitch-900/60 px-4 py-2.5 text-chalk-100 outline-none focus:border-turf-400"
          required
        />

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-chalk-500">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-6 w-full rounded-lg border border-white/10 bg-pitch-900/60 px-4 py-2.5 text-chalk-100 outline-none focus:border-turf-400"
          required
        />

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
