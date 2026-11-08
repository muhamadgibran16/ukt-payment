import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: true,
      // Jangan retry error 4xx (mis. 404 tagihan institusi lain).
      retry: (count, error) =>
        !(axios.isAxiosError(error) && error.response && error.response.status < 500) && count < 2,
    },
  },
});
