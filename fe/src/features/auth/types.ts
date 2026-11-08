export type Role = 'finance_admin' | 'student';

export interface Institution {
  id: string;
  code: string;
  name: string;
}

export interface User {
  id: string;
  institutionId: string;
  institution?: Institution;
  name: string;
  email: string;
  nim: string | null;
  role: Role;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
}
