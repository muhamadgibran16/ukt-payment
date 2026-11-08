import { createContext, useContext } from 'react';
import type { LoginInput } from '../api/auth-api';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  /** loading = sedang memulihkan sesi dari token tersimpan. */
  status: 'loading' | 'authenticated' | 'anonymous';
  login: (input: LoginInput) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
