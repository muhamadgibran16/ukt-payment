import { get, post } from '@/lib/api-client';
import type { AuthResponse, User } from '../types';

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  login: (input: LoginInput) => post<AuthResponse>('/auth/login', input),
  me: () => get<User>('/auth/me'),
};
