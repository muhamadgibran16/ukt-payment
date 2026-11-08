import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { QueryContent } from '@/components/ui/query-content';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';
import { useWebhookLogs } from '@/features/webhook-logs/api/webhook-log-api';
import { WebhookLogsTable } from '@/features/webhook-logs/components/webhook-logs-table';
import { LOG_STATUS } from '@/features/webhook-logs/constants';
import type { WebhookLogStatus } from '@/features/webhook-logs/types';

const LOG_STATUSES = Object.keys(LOG_STATUS) as WebhookLogStatus[];
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Semua status' },
  ...LOG_STATUSES.map((s) => ({ value: s, label: LOG_STATUS[s].label })),
];

export default function AdminWebhookLogsRoute() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [status, setStatus] = useState<WebhookLogStatus | undefined>();
  const logs = useWebhookLogs({ page, limit: pageSize, status });

  const changeStatus = (value: string) => {
    setStatus(LOG_STATUSES.find((s) => s === value));
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Log Webhook"
        description="Klik baris untuk melihat payload."
        actions={
          <Select
            aria-label="Filter status log"
            value={status ?? ''}
            onChange={changeStatus}
            options={STATUS_FILTER_OPTIONS}
            className="w-48"
          />
        }
      />
      <Card>
        <QueryContent
          query={logs}
          padded
          isEmpty={(data) => data.items.length === 0}
          empty={<EmptyState title="Belum ada notifikasi" />}
        >
          {(data) => (
            <>
              <WebhookLogsTable logs={data.items} />
              <Pagination
                meta={data.meta}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </QueryContent>
      </Card>
    </>
  );
}
