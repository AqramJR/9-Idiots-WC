import { createContext, useContext, useRef, type ReactNode } from 'react';
import toast, { Toaster } from 'react-hot-toast';

interface ToastContextValue {
  predictionSaved: () => void;
  matchLocked: () => void;
  scoresUpdated: () => void;
  leaderboardChanged: () => void;
  caughtCopying: () => void;
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

// Shown when a player peeks at everyone else's predictions and then goes
// back to edit their own. Add/remove/edit lines here freely — one is picked
// at random each time (never the same line twice in a row) so repeat
// peekers get a fresh roast instead of seeing the same message on loop.
const COPY_CATCH_MESSAGES: Array<{ text: string; icon: string }> = [
  { text: 'بطل تقليد 👀', icon: '😏' },
  { text: 'يبني شايفك والله 👁️', icon: '🕵️' },
  { text: 'ولما اخصم منك 5 نقط دولقتي', icon: '' },
  { text: 'يبني خلي عندك شخصية 🧠', icon: '🙅' },
  { text: 'طب تمام متجيش تعيط على الجروب', icon: '' },
  { text: 'اتمنى تكون اشبعت فضولك', icon: '' },
];

export function ToastProvider({ children }: { children: ReactNode }) {
  const lastIndex = useRef<number | null>(null);

  const value: ToastContextValue = {
    predictionSaved: () =>
      toast.success('Prediction saved', { icon: '⚽', style: toastStyle }),
    matchLocked: () =>
      toast('Predictions closed for this match', { icon: '🔒', style: toastStyle }),
    scoresUpdated: () =>
      toast.success('Scores updated', { icon: '📊', style: toastStyle }),
    leaderboardChanged: () =>
      toast('Leaderboard changed', { icon: '🏆', style: toastStyle }),
    caughtCopying: () => {
      let index = Math.floor(Math.random() * COPY_CATCH_MESSAGES.length);
      if (COPY_CATCH_MESSAGES.length > 1 && index === lastIndex.current) {
        index = (index + 1) % COPY_CATCH_MESSAGES.length;
      }
      lastIndex.current = index;
      const { text, icon } = COPY_CATCH_MESSAGES[index];
      toast(text, { icon, style: toastStyle, duration: 2500 });
    },
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
