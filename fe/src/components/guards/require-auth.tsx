import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSpinner } from '@/components/ui/spinner';
import { paths } from '@/config/paths';
import { useAuth } from '@/features/auth/lib/auth-context';
import { homePathFor } from '@/features/auth/lib/home-path';
import type { Role } from '@/features/auth/types';

/**
 * Guard route: wajib login, dan (opsional) role tertentu.
 * Ini hanya UX; otorisasi sebenarnya tetap di backend.
 */
export function RequireAuth({ role }: { role?: Role }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <PageSpinner />;
  if (!user) return <Navigate to={paths.login} replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={homePathFor(user.role)} replace />;
  return <Outlet />;
}
