import { APP_TIMEZONE } from './timezone';

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const formatRupiah = (n: number | null | undefined) =>
  n == null ? '-' : rupiahFormatter.format(n);

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: APP_TIMEZONE,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeZone: APP_TIMEZONE,
});

export const formatDateTime = (iso: string | null | undefined) =>
  iso ? dateTimeFormatter.format(new Date(iso)) : '-';
export const formatDate = (iso: string | null | undefined) =>
  iso ? dateFormatter.format(new Date(iso)) : '-';

/** "20261" -> "2026/2027 Ganjil" */
export function formatSemester(code: string): string {
  const year = Number(code.slice(0, 4));
  const term = code.slice(4) === '1' ? 'Ganjil' : 'Genap';
  return `${year}/${year + 1} ${term}`;
}

export function semesterOptions(now = new Date()): { value: string; label: string }[] {
  const y = now.getFullYear();
  const codes: string[] = [];
  for (let year = y - 1; year <= y + 1; year++) codes.push(`${year}1`, `${year}2`);
  return codes.map((value) => ({ value, label: `${formatSemester(value)} (${value})` }));
}
