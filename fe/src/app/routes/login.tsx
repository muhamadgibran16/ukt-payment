import { Navigate } from 'react-router';
import { LoginForm } from '@/features/auth/components/login-form';
import { useAuth } from '@/features/auth/lib/auth-context';
import { homePathFor } from '@/features/auth/lib/home-path';

export default function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-700/20">
            <svg
              className="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Tagihan UKT</h1>
          <p className="mt-1 text-sm text-slate-500">Masuk sebagai admin keuangan atau mahasiswa</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
