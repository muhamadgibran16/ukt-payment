import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatRupiah, formatSemester } from '@/lib/format';
import type { Invoice } from '../types';

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

export function InvoiceOverview({ invoice }: { invoice: Invoice }) {
  return (
    <Card className="p-5">
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Item label="Mahasiswa">
          {invoice.student?.name}
          <span className="block text-xs text-slate-500">NIM {invoice.student?.nim}</span>
        </Item>
        <Item label="Semester">{formatSemester(invoice.semester)}</Item>
        <Item label="Nominal">{formatRupiah(invoice.amount)}</Item>
        <Item label="Jatuh tempo">{formatDateTime(invoice.expiresAt)}</Item>
        <Item label="Dibayar pada">{formatDateTime(invoice.paidAt)}</Item>
        <Item label="Nominal dibayar">{formatRupiah(invoice.paidAmount)}</Item>
        <Item label="Dibuat">{formatDateTime(invoice.createdAt)}</Item>
        <Item label="Diperbarui">{formatDateTime(invoice.updatedAt)}</Item>
      </dl>
    </Card>
  );
}
