import { createHmac, timingSafeEqual } from 'crypto';

export function computeSignature(
  secret: string,
  rawBody: Buffer | string,
): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;

/**
 * Verifikasi header X-Signature terhadap body MENTAH.
 * - Menerima format `<hex>` atau `sha256=<hex>`.
 * - Perbandingan constant-time agar tidak bocor lewat timing attack.
 */
export function verifySignature(
  secret: string,
  rawBody: Buffer | string,
  header: string | undefined | null,
): boolean {
  if (!header) return false;
  const provided = header
    .trim()
    .toLowerCase()
    .replace(/^sha256=/, '');
  if (!HEX_SHA256.test(provided)) return false;

  const expected = Buffer.from(computeSignature(secret, rawBody), 'hex');
  const actual = Buffer.from(provided, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
