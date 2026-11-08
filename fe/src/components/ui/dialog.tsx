import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useLockBodyScroll } from '@/lib/use-lock-body-scroll';
import { XIcon } from './icons';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modal dialog: latar gelap + blur, Esc / klik di luar / tombol × untuk menutup,
 * fokus terkunci di dalam dialog, dan fokus kembali ke pemicu saat ditutup.
 * Isi di-unmount saat tertutup, sehingga form selalu mulai bersih.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => trigger?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: KeyboardEvent) => {
    // Komponen di dalam (Select, DatePicker, …) memanggil preventDefault saat Esc
    // menutup popover-nya sendiri; dialog hanya menutup jika belum ditangani.
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'Tab') trapFocus(e, panelRef.current);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" onKeyDown={onKeyDown}>
      <div aria-hidden="true" className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        // Klik di area gelap (di luar panel) menutup dialog.
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        className="relative flex min-h-full items-start justify-center p-4 sm:items-center sm:p-6"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'relative w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-900/20 focus:outline-none',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-slate-500">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="-mr-2 flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <XIcon className="size-5" />
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
  const focusables = [...(container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === container)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}
