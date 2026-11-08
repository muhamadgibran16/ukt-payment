import { EmptyState } from '@/components/ui/empty-state';
import { Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { eventLabel, transactionChannel } from '../constants';
import type { InvoiceTransaction } from '../types';
import { InvoiceStatusBadge, OutcomeBadge } from './status-badges';

interface TransactionHistoryProps {
  transactions: InvoiceTransaction[];
  /** Tampilkan event_id & ID transaksi gateway (untuk admin). */
  showTechnical?: boolean;
}

export function TransactionHistory({
  transactions,
  showTechnical = false,
}: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return <EmptyState title="Belum ada transaksi" />;
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 sm:hidden">
        {transactions.map((t) => (
          <TransactionListItem key={t.id} transaction={t} />
        ))}
      </ul>
      <div className="hidden sm:block">
        <TransactionTable transactions={transactions} showTechnical={showTechnical} />
      </div>
    </>
  );
}

function StatusTransition({ transaction: t }: { transaction: InvoiceTransaction }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <InvoiceStatusBadge status={t.statusBefore} />
      <span className="text-slate-400">→</span>
      <InvoiceStatusBadge status={t.statusAfter} />
    </span>
  );
}

function TransactionListItem({ transaction: t }: { transaction: InvoiceTransaction }) {
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800">{eventLabel(t.eventType)}</p>
          <p className="text-xs text-slate-500">
            {formatDateTime(t.occurredAt)} · {transactionChannel(t)}
          </p>
        </div>
        <p className="text-sm font-medium whitespace-nowrap">{formatRupiah(t.amount)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusTransition transaction={t} />
        <OutcomeBadge outcome={t.outcome} />
      </div>
      {t.note && <p className="text-xs text-slate-600">{t.note}</p>}
    </li>
  );
}

function TransactionTable({ transactions, showTechnical }: Required<TransactionHistoryProps>) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Waktu kejadian</Th>
          <Th>Event</Th>
          <Th className="text-right">Nominal</Th>
          <Th>Status</Th>
          <Th>Hasil</Th>
        </tr>
      </THead>
      <TBody>
        {transactions.map((t) => (
          <tr key={t.id} className="align-top">
            <Td className="whitespace-nowrap">
              {formatDateTime(t.occurredAt)}
              <div className="text-xs text-slate-400">diterima {formatDateTime(t.createdAt)}</div>
            </Td>
            <Td>
              <div className="font-medium text-slate-800">{eventLabel(t.eventType)}</div>
              <div className="text-xs text-slate-500">{transactionChannel(t)}</div>
              {showTechnical && t.eventId && (
                <div className="mt-1 font-mono text-[11px] text-slate-400">
                  {[t.eventId, t.gatewayTransactionId].filter(Boolean).join(' · ')}
                </div>
              )}
              {t.note && <p className="mt-1 max-w-md text-xs text-slate-600">{t.note}</p>}
            </Td>
            <Td className="text-right whitespace-nowrap">{formatRupiah(t.amount)}</Td>
            <Td className="whitespace-nowrap">
              <StatusTransition transaction={t} />
            </Td>
            <Td>
              <OutcomeBadge outcome={t.outcome} />
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
