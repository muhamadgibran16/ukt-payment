import { Link, useParams } from 'react-router';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { QueryContent } from '@/components/ui/query-content';
import { paths } from '@/config/paths';
import { useInvoice } from '@/features/invoices/api/invoice-api';
import { InvoiceOverview } from '@/features/invoices/components/invoice-overview';
import { InvoiceStatusBadge } from '@/features/invoices/components/status-badges';
import { TransactionHistory } from '@/features/invoices/components/transaction-history';

export default function AdminInvoiceDetailRoute() {
  const { id = '' } = useParams();
  const invoice = useInvoice(id);

  return (
    <>
      <Link to={paths.admin.invoices} className="text-sm text-slate-500 hover:text-slate-800">
        ← Kembali ke daftar tagihan
      </Link>

      <div className="mt-3">
        <QueryContent query={invoice} errorTitle="Tagihan tidak dapat ditampilkan">
          {(data) => (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold text-slate-900">
                  {data.invoiceNumber}
                </h1>
                <InvoiceStatusBadge status={data.status} />
              </div>

              <InvoiceOverview invoice={data} />

              <Card>
                <CardHeader>
                  <CardTitle>Riwayat transaksi</CardTitle>
                </CardHeader>
                <TransactionHistory transactions={data.transactions ?? []} showTechnical />
              </Card>
            </div>
          )}
        </QueryContent>
      </div>
    </>
  );
}
