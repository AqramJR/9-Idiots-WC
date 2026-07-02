import { createContext, useContext, type ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextValue {
  predictionSaved: () => void;
  matchLocked: () => void;
  scoresUpdated: () => void;
  leaderboardChanged: () => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toastStyle = {
  background: 'rgba(12, 40, 24, 0.95)',
  color: '#f4f7f5',
  border: '1px solid rgba(74, 222, 128, 0.25)',
  backdropFilter: 'blur(8px)',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const value: ToastContextValue = {
    predictionSaved: () =>
      toast.success('Prediction saved', { icon: '⚽', style: toastStyle }),
    matchLocked: () =>
      toast('Predictions closed for this match', { icon: '🔒', style: toastStyle }),
    scoresUpdated: () =>
      toast.success('Scores updated', { icon: '📊', style: toastStyle }),
    leaderboardChanged: () =>
      toast('Leaderboard changed', { icon: '🏆', style: toastStyle }),
    error: (message: string) => toast.error(message, { style: toastStyle }),
    info: (message: string) => toast(message, { icon: 'ℹ️', style: toastStyle }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </ToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useAppToast must be used within ToastProvider');
  return ctx;
}
