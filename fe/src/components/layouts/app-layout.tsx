import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { MenuIcon, XIcon } from '@/components/ui/icons';
import { useAuth } from '@/features/auth/lib/auth-context';
import { cn } from '@/lib/cn';
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll';
import { SidebarContent } from './sidebar';
import { UserMenu } from './user-menu';

export function AppLayout() {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useLockBodyScroll(drawerOpen);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <SidebarContent user={user} />
      </aside>

      <div
        className={cn('lg:hidden', !drawerOpen && 'pointer-events-none')}
        // inert: saat tertutup, isi drawer tidak bisa difokus/diklik (bukan sekadar disembunyikan)
        inert={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={cn(
            'fixed inset-0 z-40 bg-slate-900/40 transition-opacity',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi"
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-xl transition-transform duration-200',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup menu"
            className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <XIcon className="size-5" />
          </button>
          <SidebarContent user={user} onNavigate={() => setDrawerOpen(false)} className="pr-12" />
        </aside>
      </div>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:justify-end lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
            aria-expanded={drawerOpen}
            className="-ml-1 flex size-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          <UserMenu user={user} onLogout={logout} />
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
