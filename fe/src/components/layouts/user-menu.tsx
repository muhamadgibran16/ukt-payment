import { useEffect, useId, useRef, useState } from 'react';
import { LogoutIcon, UserIcon } from '@/components/ui/icons';
import type { User } from '@/features/auth/types';
import { cn } from '@/lib/cn';
import { useClickOutside } from '@/lib/use-click-outside';
import { ROLE_LABEL } from './nav-items';

function Avatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 ring-2 ring-white',
        className,
      )}
    >
      <UserIcon className="size-[60%]" />
    </span>
  );
}

export function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = (refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };
  useClickOutside(rootRef, () => close(), open);

  // Fokus ke item pertama saat menu terbuka (pola menu button).
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Menu akun ${user.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-3 rounded-full p-1 transition-colors hover:bg-slate-100',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none sm:rounded-lg sm:pl-3',
          open && 'bg-slate-100',
        )}
      >
        <span className="hidden text-right leading-tight sm:block">
          <span className="block max-w-56 truncate text-sm font-medium text-slate-800">
            {user.name}
          </span>
          <span className="block max-w-56 truncate text-xs text-slate-500">{user.email}</span>
        </span>
        <Avatar className="size-9" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Menu akun"
          onKeyDown={(e) => e.key === 'Escape' && close(true)}
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <Avatar className="size-10" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <dl className="space-y-1.5 border-b border-slate-100 px-4 py-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Peran</dt>
              <dd className="font-medium text-slate-700">{ROLE_LABEL[user.role]}</dd>
            </div>
            {user.nim && (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">NIM</dt>
                <dd className="font-medium text-slate-700">{user.nim}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Institusi</dt>
              <dd className="truncate text-right font-medium text-slate-700">
                {user.institution?.name ?? '-'}
              </dd>
            </div>
          </dl>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
            >
              <LogoutIcon className="size-4" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
