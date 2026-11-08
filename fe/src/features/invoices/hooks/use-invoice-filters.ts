import { useSearchParams } from 'react-router';
import { DEFAULT_PAGE_SIZE, parsePageSize } from '@/lib/pagination';
import type { InvoiceStatus } from '../types';

const STATUSES: readonly InvoiceStatus[] = ['unpaid', 'paid', 'expired'];

export interface InvoiceFilters {
  status?: InvoiceStatus;
  semester?: string;
  search?: string;
  page: number;
  limit: number;
}

const parseStatus = (value: string | null): InvoiceStatus | undefined =>
  STATUSES.find((s) => s === value);

/**
 * Filter daftar tagihan disimpan di URL: bisa di-bookmark/dibagikan dan tahan reload.
 * Mengubah filter apa pun (selain `page`), termasuk jumlah baris, mengembalikan ke halaman 1.
 */
export function useInvoiceFilters() {
  const [params, setParams] = useSearchParams();

  const filters: InvoiceFilters = {
    status: parseStatus(params.get('status')),
    semester: params.get('semester') ?? undefined,
    search: params.get('search') ?? undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: parsePageSize(params.get('limit')),
  };

  const setFilters = (changes: Partial<InvoiceFilters>) => {
    const next = { ...filters, page: 1, ...changes };
    const sp = new URLSearchParams();
    if (next.status) sp.set('status', next.status);
    if (next.semester) sp.set('semester', next.semester);
    if (next.search) sp.set('search', next.search);
    if (next.page > 1) sp.set('page', String(next.page));
    if (next.limit !== DEFAULT_PAGE_SIZE) sp.set('limit', String(next.limit));
    setParams(sp, { replace: true });
  };

  const hasActiveFilter = Boolean(filters.status || filters.semester || filters.search);

  return { filters, setFilters, hasActiveFilter };
}
