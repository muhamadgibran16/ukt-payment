import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPaginated } from '@/lib/api-client';
import type { WebhookLog, WebhookLogStatus } from '../types';

export function useWebhookLogs(params: { page: number; limit: number; status?: WebhookLogStatus }) {
  return useQuery({
    queryKey: ['webhook-logs', params],
    queryFn: () => getPaginated<WebhookLog>('/webhook-logs', params),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });
}
