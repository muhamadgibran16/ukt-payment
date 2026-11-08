export function defaultInvoiceNumber(semester: string, nim: string): string {
  return `UKT-${semester}-${nim}`.toUpperCase();
}
