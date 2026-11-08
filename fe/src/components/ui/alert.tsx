import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { XIcon } from './icons';

const tones = {
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
} as const;

export function Alert({
  tone = 'error',
  title,
  children,
  onDismiss,
}: {
  tone?: keyof typeof tones;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', tones[tone])}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-1')}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup"
          className="-m-1 rounded p-1 opacity-70 hover:bg-black/5 hover:opacity-100"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
