import { NavLink } from 'react-router';
import type { User } from '@/features/auth/types';
import { cn } from '@/lib/cn';
import { NAV_ITEMS } from './nav-items';

export function SidebarContent({
  user,
  onNavigate,
  className,
}: {
  user: User;
  onNavigate?: () => void;
  /** Kelas tambahan untuk header (mis. ruang untuk tombol tutup di drawer). */
  className?: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-5',
          className,
        )}
      >
        <div className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-brand-700 px-1.5 text-xs font-bold tracking-tight text-white">
          {user.institution?.code ?? 'UKT'}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="line-clamp-2 text-[13px] leading-tight font-semibold text-slate-900">
            {user.institution?.name ?? 'Tagihan UKT'}
          </p>
        </div>
      </div>

      <nav aria-label="Menu utama" className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </p>
        {NAV_ITEMS[user.role].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'size-5 shrink-0',
                    isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-500',
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
