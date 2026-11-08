import { cn } from '@/lib/cn';
import { formatRupiah } from '@/lib/format';
import type { InvoiceStatus, InvoiceSummary } from '../types';
import { INVOICE_STATUS } from '../constants';

const ACCENT: Record<InvoiceStatus, string> = {
  unpaid: 'border-l-amber-400',
  paid: 'border-l-emerald-500',
  expired: 'border-l-red-400',
};

export function InvoiceSummaryCards({ summary }: { summary?: InvoiceSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {(Object.keys(INVOICE_STATUS) as InvoiceStatus[]).map((status) => (
        <div
          key={status}
          className={cn(
            'rounded-xl border border-l-4 border-slate-200 bg-white px-5 py-4 shadow-sm',
            ACCENT[status],
          )}
        >
          <p className="text-sm text-slate-500">{INVOICE_STATUS[status].label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary ? summary[status].count : '–'}
            <span className="ml-1 text-sm font-normal text-slate-500">tagihan</span>
          </p>
          <p className="text-sm text-slate-500">
            {summary ? formatRupiah(summary[status].amount) : ' '}
          </p>
        </div>
      ))}
    </div>
  );
}
