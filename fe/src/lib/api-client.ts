import axios, { AxiosError } from 'axios';
import { env } from '@/config/env';
import type { ApiErrorResponse, ApiResponse, Paginated } from '@/types/api';
import { tokenStorage } from './storage';

export const api = axios.create({ baseURL: env.API_URL, timeout: 15_000 });

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Dipanggil saat token ditolak (401); di-set oleh AuthProvider. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, params?: object): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, { params });
  return res.data.data;
}

export async function getPaginated<T>(url: string, params?: object): Promise<Paginated<T>> {
  const res = await api.get<ApiResponse<T[]>>(url, { params });
  return { items: res.data.data, meta: res.data.meta! };
}

export async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const data = error.response?.data;
    if (data?.errors?.length) return data.errors.join(', ');
    if (data?.message) return data.message;
    if (!error.response) return 'Tidak dapat terhubung ke server';
  }
  return error instanceof Error ? error.message : 'Terjadi kesalahan';
}
