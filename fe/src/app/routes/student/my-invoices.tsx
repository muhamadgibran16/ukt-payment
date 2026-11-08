import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { QueryContent } from '@/components/ui/query-content';
import { useMyInvoices } from '@/features/invoices/api/invoice-api';
import { StudentInvoiceCard } from '@/features/invoices/components/student-invoice-card';

export default function StudentInvoicesRoute() {
  const invoices = useMyInvoices();

  return (
    <>
      <PageHeader title="Tagihan Saya" />
      <QueryContent
        query={invoices}
        errorTitle="Gagal memuat tagihan"
        isEmpty={(data) => data.length === 0}
        empty={
          <Card>
            <EmptyState title="Belum ada tagihan" />
          </Card>
        }
      >
        {(data) => (
          <div className="space-y-6">
            {data.map((invoice) => (
              <StudentInvoiceCard key={invoice.id} invoice={invoice} />
            ))}
          </div>
        )}
      </QueryContent>
    </>
  );
}
