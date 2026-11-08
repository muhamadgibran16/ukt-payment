import { Link } from 'react-router';
import { Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { paths } from '@/config/paths';
import { formatDate, formatRupiah, formatSemester } from '@/lib/format';
import type { Invoice } from '../types';
import { InvoiceStatusBadge } from './status-badges';

export function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Nomor tagihan</Th>
          <Th>Mahasiswa</Th>
          <Th>Semester</Th>
          <Th className="text-right">Nominal</Th>
          <Th>Jatuh tempo</Th>
          <Th>Status</Th>
        </tr>
      </THead>
      <TBody>
        {invoices.map((inv) => (
          <tr key={inv.id} className="hover:bg-slate-50">
            <Td>
              <Link
                to={paths.admin.invoiceDetail(inv.id)}
                className="font-mono text-[13px] font-medium text-brand-700 hover:underline"
              >
                {inv.invoiceNumber}
              </Link>
            </Td>
            <Td>
              <div className="font-medium text-slate-800">{inv.student?.name ?? '-'}</div>
              <div className="text-xs text-slate-500">{inv.student?.nim}</div>
            </Td>
            <Td className="whitespace-nowrap">{formatSemester(inv.semester)}</Td>
            <Td className="text-right whitespace-nowrap">{formatRupiah(inv.amount)}</Td>
            <Td className="whitespace-nowrap">{formatDate(inv.expiresAt)}</Td>
            <Td>
              <InvoiceStatusBadge status={inv.status} />
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
