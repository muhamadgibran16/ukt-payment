import { env } from '@/config/env';

const TZ = env.APP_TIMEZONE;

/** Tanggal hari ini di zona waktu aplikasi, format YYYY-MM-DD. */
export const todayInAppTimezone = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/** Offset UTC zona waktu aplikasi pada tanggal tertentu, mis. "+07:00" (aman untuk DST). */
export function utcOffset(isoDate: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${isoDate}T12:00:00Z`))
    .find((p) => p.type === 'timeZoneName')?.value;
  const match = name?.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return match ? `${match[1]}:${match[2] ?? '00'}` : '+00:00';
}

/** Akhir hari (23:59:59) pada tanggal tsb di zona waktu aplikasi, sebagai ISO 8601. */
export const endOfDayInAppTimezone = (isoDate: string) =>
  `${isoDate}T23:59:59${utcOffset(isoDate)}`;

/** Singkatan zona waktu untuk ditampilkan, mis. "WIB". */
export const timezoneLabel = () =>
  new Intl.DateTimeFormat('id-ID', { timeZone: TZ, timeZoneName: 'short' })
    .formatToParts(new Date())
    .find((p) => p.type === 'timeZoneName')?.value ?? TZ;

export { TZ as APP_TIMEZONE };
