import { useAuth } from '@/context/AuthContext';
import { AdminLogin } from '@/components/admin/AdminLogin';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export function AdminPage() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <AdminLogin />;
}
