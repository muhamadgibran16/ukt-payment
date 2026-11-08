import { cn } from '@/lib/cn';
import type { PaginationMeta } from '@/types/api';
import { PAGE_SIZE_OPTIONS, pageItems } from '@/lib/pagination';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { Select } from './select';

const PAGE_SIZE_SELECT_OPTIONS = PAGE_SIZE_OPTIONS.map((n) => ({
  value: String(n),
  label: String(n),
}));

const pageButton =
  'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-40';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({ meta, onPageChange, onPageSizeChange }: PaginationProps) {
  if (meta.totalItems === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = from + meta.itemCount - 1;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-slate-200 px-4 py-3 sm:justify-end">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-600">
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            Tampilkan
            <Select
              aria-label="Jumlah baris per halaman"
              value={String(meta.limit)}
              onChange={(value) => onPageSizeChange(Number(value))}
              options={PAGE_SIZE_SELECT_OPTIONS}
              placement="top"
              className="w-20 [&>button]:h-8"
            />
            baris
          </label>
        )}
        <p>
          <span className="font-medium text-slate-900">{from}</span>–
          <span className="font-medium text-slate-900">{to}</span> dari{' '}
          <span className="font-medium text-slate-900">{meta.totalItems}</span> data
        </p>
      </div>

      {meta.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Halaman sebelumnya"
            disabled={meta.page <= 1}
            onClick={() => onPageChange(meta.page - 1)}
            className={cn(pageButton, 'text-slate-600 hover:bg-slate-100')}
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          {pageItems(meta.page, meta.totalPages).map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Halaman ${item}`}
                aria-current={item === meta.page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={cn(
                  pageButton,
                  item === meta.page
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            aria-label="Halaman berikutnya"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onPageChange(meta.page + 1)}
            className={cn(pageButton, 'text-slate-600 hover:bg-slate-100')}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
