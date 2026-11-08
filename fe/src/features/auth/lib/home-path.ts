import { paths } from '@/config/paths';
import type { Role } from '../types';

export const homePathFor = (role: Role) =>
  role === 'finance_admin' ? paths.admin.invoices : paths.student.invoices;
