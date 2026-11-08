import { useState } from 'react';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { QueryContent } from '@/components/ui/query-content';
import { paths } from '@/config/paths';
import { useInvoices, useInvoiceSummary } from '@/features/invoices/api/invoice-api';
import { CreateInvoiceDialog } from '@/features/invoices/components/create-invoice-dialog';
import { InvoiceFilters } from '@/features/invoices/components/invoice-filters';
import { InvoiceSummaryCards } from '@/features/invoices/components/invoice-summary-cards';
import { InvoicesTable } from '@/features/invoices/components/invoices-table';
import { useInvoiceFilters } from '@/features/invoices/hooks/use-invoice-filters';
import type { Invoice } from '@/features/invoices/types';

export default function AdminInvoicesRoute() {
  const { filters, setFilters, hasActiveFilter } = useInvoiceFilters();
  const invoices = useInvoices(filters);
  const summary = useInvoiceSummary();
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState<Invoice | null>(null);

  const handleCreated = (invoice: Invoice) => {
    setCreateOpen(false);
    setCreated(invoice);
  };

  return (
    <>
      <PageHeader
        title="Tagihan UKT"
        actions={<Button onClick={() => setCreateOpen(true)}>+ Buat tagihan</Button>}
      />

      {created && (
        <div className="mb-6">
          <Alert tone="success" onDismiss={() => setCreated(null)}>
            Tagihan <span className="font-mono font-medium">{created.invoiceNumber}</span> untuk{' '}
            {created.student?.name} berhasil dibuat.{' '}
            <Link
              to={paths.admin.invoiceDetail(created.id)}
              className="font-medium underline underline-offset-2"
            >
              Lihat detail
            </Link>
          </Alert>
        </div>
      )}

      <div className="mb-6">
        <InvoiceSummaryCards summary={summary.data} />
      </div>

      <Card>
        <InvoiceFilters
          status={filters.status}
          semester={filters.semester}
          search={filters.search}
          onChange={setFilters}
        />
        <QueryContent
          query={invoices}
          errorTitle="Gagal memuat tagihan"
          padded
          isEmpty={(data) => data.items.length === 0}
          empty={
            <EmptyState
              title="Tidak ada tagihan"
              description={
                hasActiveFilter
                  ? 'Tidak ada tagihan yang cocok dengan filter.'
                  : 'Belum ada tagihan untuk institusi ini.'
              }
            />
          }
        >
          {(data) => (
            <>
              <InvoicesTable invoices={data.items} />
              <Pagination
                meta={data.meta}
                onPageChange={(page) => setFilters({ page })}
                onPageSizeChange={(limit) => setFilters({ limit })}
              />
            </>
          )}
        </QueryContent>
      </Card>

      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}
