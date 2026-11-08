export const paths = {
  home: '/',
  login: '/login',
  admin: {
    invoices: '/admin/invoices',
    invoiceDetail: (id: string) => `/admin/invoices/${id}`,
    webhookLogs: '/admin/webhook-logs',
  },
  student: {
    invoices: '/student/invoices',
  },
} as const;
