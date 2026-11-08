import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, getPaginated, post } from '@/lib/api-client';
import type { CreateInvoiceInput, Invoice, InvoiceListParams, InvoiceSummary } from '../types';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (params: InvoiceListParams) => [...invoiceKeys.all, 'list', params] as const,
  summary: () => [...invoiceKeys.all, 'summary'] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
  mine: () => [...invoiceKeys.all, 'mine'] as const,
};

/** Status bisa berubah kapan saja lewat webhook, jadi data di-refresh berkala. */
const LIVE_REFRESH_MS = 10_000;

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoiceKeys.list(params),
    queryFn: () => getPaginated<Invoice>('/invoices', params),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useInvoiceSummary() {
  return useQuery({
    queryKey: invoiceKeys.summary(),
    queryFn: () => get<InvoiceSummary>('/invoices/summary'),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => get<Invoice>(`/invoices/${id}`),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useMyInvoices() {
  return useQuery({
    queryKey: invoiceKeys.mine(),
    queryFn: () => get<Invoice[]>('/me/invoices'),
    refetchInterval: LIVE_REFRESH_MS,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => post<Invoice>('/invoices', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}
