import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { RequireAuth } from '@/components/guards/require-auth';
import { AppLayout } from '@/components/layouts/app-layout';
import { PageSpinner } from '@/components/ui/spinner';
import { paths } from '@/config/paths';
import { useAuth } from '@/features/auth/lib/auth-context';
import { homePathFor } from '@/features/auth/lib/home-path';

const page = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({
  Component: (await load()).default,
});

function HomeRedirect() {
  const { user, status } = useAuth();
  if (status === 'loading') return <PageSpinner />;
  return <Navigate to={user ? homePathFor(user.role) : paths.login} replace />;
}

const router = createBrowserRouter([
  { path: paths.home, element: <HomeRedirect /> },
  { path: paths.login, lazy: page(() => import('./routes/login')) },
  {
    element: <RequireAuth role="finance_admin" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: paths.admin.invoices, lazy: page(() => import('./routes/admin/invoices')) },
          {
            path: '/admin/invoices/:id',
            lazy: page(() => import('./routes/admin/invoice-detail')),
          },
          {
            path: paths.admin.webhookLogs,
            lazy: page(() => import('./routes/admin/webhook-logs')),
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth role="student" />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: paths.student.invoices,
            lazy: page(() => import('./routes/student/my-invoices')),
          },
        ],
      },
    ],
  },
  { path: '*', lazy: page(() => import('./routes/not-found')) },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
