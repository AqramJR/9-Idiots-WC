import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function RequireIdentity({ children }: { children: ReactNode }) {
  const { firebaseUser, identity, authReady, profileLoading } = useAuth();

  if (!authReady || (firebaseUser && profileLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse-slow text-3xl">⚽</div>
      </div>
    );
  }

  if (!firebaseUser || !identity) {
    return <Navigate to="/join" replace />;
  }

  return <>{children}</>;
}
