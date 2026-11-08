import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { Alert } from './alert';
import { PageSpinner } from './spinner';

interface QueryContentProps<T> {
  query: UseQueryResult<T>;
  errorTitle?: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  /** Beri padding pada pesan error (dipakai saat berada di dalam Card). */
  padded?: boolean;
  children: (data: T) => ReactNode;
}

export function QueryContent<T>({
  query,
  errorTitle,
  isEmpty,
  empty,
  padded = false,
  children,
}: QueryContentProps<T>) {
  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <div className={cn(padded && 'p-4')}>
        <Alert title={errorTitle}>{getErrorMessage(query.error)}</Alert>
      </div>
    );
  }
  if (isEmpty?.(query.data)) return <>{empty}</>;
  return <>{children(query.data)}</>;
}
