export type PageItem = number | 'gap';

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan sekitar halaman aktif. */
export function pageItems(current: number, total: number, siblings = 1): PageItem[] {
  const pages = new Set([1, total]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((page, i) => {
    const prev = sorted[i - 1];
    if (prev === undefined || page - prev === 1) return [page];
    // Celah 1 halaman lebih baik ditampilkan angkanya daripada "…".
    return page - prev === 2 ? [prev + 1, page] : ['gap' as const, page];
  });
}

/** Pilihan jumlah baris per halaman (maks. 100 = batas `limit` di backend). */
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 5;

export const parsePageSize = (value: string | null): number => {
  const n = Number(value);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
};
