import { Fragment, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TBody, Td, Th, THead } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { LOG_STATUS } from '../constants';
import type { WebhookLog } from '../types';

const pretty = (raw: string) => {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

export function WebhookLogsTable({ logs }: { logs: WebhookLog[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Table>
      <THead>
        <tr>
          <Th>Diterima</Th>
          <Th>Event</Th>
          <Th>Tagihan</Th>
          <Th>Signature</Th>
          <Th>Status</Th>
          <Th>Keterangan</Th>
        </tr>
      </THead>
      <TBody>
        {logs.map((log) => (
          <Fragment key={log.id}>
            <tr
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => setOpen(open === log.id ? null : log.id)}
              aria-expanded={open === log.id}
            >
              <Td className="whitespace-nowrap">{formatDateTime(log.receivedAt)}</Td>
              <Td>
                <div className="font-medium">{log.eventType ?? '-'}</div>
                <div className="font-mono text-[11px] text-slate-400">{log.eventId}</div>
              </Td>
              <Td className="font-mono text-[13px]">{log.invoiceNumber ?? '-'}</Td>
              <Td>
                <Badge tone={log.signatureValid ? 'green' : 'red'}>
                  {log.signatureValid ? 'Valid' : 'Tidak valid'}
                </Badge>
              </Td>
              <Td className="whitespace-nowrap">
                <Badge tone={LOG_STATUS[log.processingStatus].tone}>
                  {LOG_STATUS[log.processingStatus].label}
                </Badge>
                <span className="ml-1.5 text-xs text-slate-400">{log.responseCode}</span>
              </Td>
              <Td className="max-w-xs text-xs text-slate-600">{log.message}</Td>
            </tr>
            {open === log.id && (
              <tr>
                <td colSpan={6} className="bg-slate-50 px-4 pb-4">
                  <p className="pt-3 pb-1 text-xs font-medium text-slate-500">
                    Raw body · IP {log.sourceIp ?? '-'}
                  </p>
                  <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {pretty(log.rawBody)}
                  </pre>
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </TBody>
    </Table>
  );
}
