import { Card, CardHeader } from '@/components/ui/card';
import { formatDateTime, formatRupiah, formatSemester } from '@/lib/format';
import type { Invoice } from '../types';
import { InvoiceStatusBadge } from './status-badges';
import { TransactionHistory } from './transaction-history';

/** Status tagihan dijelaskan dalam konteks KRS, karena itu yang dipedulikan mahasiswa. */
function StatusMessage({ invoice }: { invoice: Invoice }) {
  switch (invoice.status) {
    case 'paid':
      return (
        <p className="text-sm text-emerald-700">
          Lunas pada {formatDateTime(invoice.paidAt)}. Anda dapat mengisi KRS semester ini.
        </p>
      );
    case 'unpaid':
      return (
        <p className="text-sm text-amber-700">
          Belum dibayar. Bayar sebelum {formatDateTime(invoice.expiresAt)} agar dapat mengisi KRS.
        </p>
      );
    case 'expired':
      return (
        <p className="text-sm text-red-700">
          Tagihan kedaluwarsa pada {formatDateTime(invoice.expiresAt)}. Hubungi bagian keuangan
          kampus.
        </p>
      );
  }
}

export function StudentInvoiceCard({ invoice }: { invoice: Invoice }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {formatSemester(invoice.semester)}
            </h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{invoice.invoiceNumber}</p>
          <div className="mt-2">
            <StatusMessage invoice={invoice} />
          </div>
        </div>
        <div className="sm:text-right">
          <p className="text-xs tracking-wide text-slate-500 uppercase">Nominal UKT</p>
          <p className="text-xl font-semibold text-slate-900">{formatRupiah(invoice.amount)}</p>
        </div>
      </CardHeader>
      <TransactionHistory transactions={invoice.transactions ?? []} />
    </Card>
  );
}
