import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { EmptyState } from '@/components/common/EmptyState';

export function AdminPage() {
  const { firebaseUser, identity, authReady, profileLoading, adminLoading, isAdmin } = useAuth();

  // WAIT for absolutely all Firebase Auth and Firestore data to finish loading.
  if (!authReady || profileLoading || adminLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-3xl">⚽</div>
        <p className="ml-3 text-chalk-500 text-sm">Verifying access...</p>
      </div>
    );
  }

  // Once loading is completely finished, THEN check if they are logged in.
  if (!firebaseUser || !identity) {
    return <Navigate to="/join" replace />;
  }

  // If they are logged in, check the database result.
  if (!isAdmin) {
    return (
      <EmptyState
        icon="🚫"
        title="Not an admin"
        message={`You're logged in as ${identity.name}, but this account doesn't have admin access. (UID: ${firebaseUser.uid})`}
      />
    );
  }

  // If they pass all checks, let them in!
  return <AdminDashboard />;
}