import { Link } from 'react-router';
import { paths } from '@/config/paths';

export default function NotFoundRoute() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Halaman tidak ditemukan</h1>
      <Link to={paths.home} className="mt-6 text-sm font-medium text-brand-700 hover:underline">
        Kembali ke beranda
      </Link>
    </div>
  );
}
