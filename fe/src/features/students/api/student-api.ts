import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { User } from '@/features/auth/types';
import { getPaginated } from '@/lib/api-client';

export function useStudents(search: string) {
  return useQuery({
    queryKey: ['students', { search }],
    queryFn: () => getPaginated<User>('/students', { search: search || undefined, limit: 50 }),
    placeholderData: keepPreviousData,
  });
}
