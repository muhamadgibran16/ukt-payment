import type { ComponentType, SVGProps } from 'react';
import { DocumentIcon, InboxIcon } from '@/components/ui/icons';
import { paths } from '@/config/paths';
import type { Role } from '@/features/auth/types';

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** true = aktif hanya jika path sama persis. */
  end: boolean;
}

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  finance_admin: [
    { to: paths.admin.invoices, label: 'Tagihan', icon: DocumentIcon, end: false },
    { to: paths.admin.webhookLogs, label: 'Log Webhook', icon: InboxIcon, end: true },
  ],
  student: [{ to: paths.student.invoices, label: 'Tagihan Saya', icon: DocumentIcon, end: true }],
};

export const ROLE_LABEL: Record<Role, string> = {
  finance_admin: 'Admin Keuangan',
  student: 'Mahasiswa',
};
