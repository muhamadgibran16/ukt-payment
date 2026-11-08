import { ValueTransformer } from 'typeorm';

/**
 * Postgres BIGINT dikembalikan driver `pg` sebagai string.
 * Nominal UKT (rupiah, tanpa desimal) jauh di bawah Number.MAX_SAFE_INTEGER,
 * jadi aman dikonversi ke number.
 */
export const bigintTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
