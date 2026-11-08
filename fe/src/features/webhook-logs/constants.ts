import type { BadgeTone } from '@/components/ui/badge';
import type { WebhookLogStatus } from './types';

export const LOG_STATUS: Record<WebhookLogStatus, { label: string; tone: BadgeTone }> = {
  received: { label: 'Diterima', tone: 'slate' },
  processed: { label: 'Diproses', tone: 'green' },
  duplicate: { label: 'Duplikat', tone: 'blue' },
  ignored: { label: 'Diabaikan', tone: 'amber' },
  rejected: { label: 'Ditolak', tone: 'red' },
  failed: { label: 'Gagal', tone: 'red' },
};
