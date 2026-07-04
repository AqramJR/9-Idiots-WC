import { Navigate } from 'react-router-dom';
import { Hero } from '@/components/landing/Hero';
import { useAuth } from '@/context/AuthContext';

export function LandingPage() {
  const { firebaseUser, authReady } = useAuth();

  // Returning visitor with an active session (e.g. "keep me logged in")
  // should never see the landing/join flow again — straight to the matches.
  if (authReady && firebaseUser) {
    return <Navigate to="/matches" replace />;
  }

  return (
    <div className="min-h-screen bg-pitch-950">
      <Hero />
    </div>
  );
}
