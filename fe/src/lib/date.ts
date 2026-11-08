/**
 * Utilitas tanggal kalender (tanpa jam & zona waktu) dalam format ISO "YYYY-MM-DD".
 * Objek Date dibuat dari komponen lokal (y, m, d) sehingga aman dari pergeseran zona waktu.
 */

export const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function parseISODate(value: string | undefined | null): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d: Date, days: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** Tambah bulan; tanggal dipotong ke akhir bulan jika perlu (31 Jan + 1 bulan = 28/29 Feb). */
export function addMonths(d: Date, months: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay));
}

export const isSameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && toISODate(a) === toISODate(b);

export const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** 42 tanggal (6 minggu, mulai Senin) yang menutupi bulan dari `month`. */
export function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offsetFromMonday = (first.getDay() + 6) % 7;
  const start = addDays(first, -offsetFromMonday);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const monthYearFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const shortFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const longFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatMonthYear = (d: Date) => monthYearFormatter.format(d);
export const formatShortDate = (d: Date) => shortFormatter.format(d);
export const formatLongDate = (d: Date) => longFormatter.format(d);
