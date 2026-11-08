import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '@/lib/api-client';
import { tokenStorage } from '@/lib/storage';
import { authApi, type LoginInput } from '../api/auth-api';
import type { User } from '../types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthContextValue['status']>(() =>
    tokenStorage.get() ? 'loading' : 'anonymous',
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
    // Buang cache agar data institusi/user sebelumnya tidak terlihat oleh user berikutnya.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Pulihkan sesi dari token tersimpan.
  useEffect(() => {
    if (status !== 'loading') return;
    authApi
      .me()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(logout);
  }, [status, logout]);

  const login = useCallback(
    async (input: LoginInput) => {
      const res = await authApi.login(input);
      queryClient.clear();
      tokenStorage.set(res.accessToken);
      setUser(res.user);
      setStatus('authenticated');
      return res.user;
    },
    [queryClient],
  );

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
