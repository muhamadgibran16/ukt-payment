// Inti mock gateway: membangun payload, menandatangani, dan mengirim webhook
// dengan retry (meniru perilaku gateway sungguhan). Tanpa dependency eksternal.
import { createHmac, randomUUID } from 'node:crypto';

export const EVENT_TYPES = ['payment.success', 'payment.expired'];

export const SCENARIOS = {
  normal: 'Kirim satu event sekali',
  duplicate: 'Kirim event yang SAMA dua kali berurutan (retry gateway)',
  concurrent_duplicate: 'Kirim event yang SAMA 5x secara bersamaan',
  out_of_order: 'Kirim payment.expired dulu, lalu payment.success (urutan tertukar)',
  invalid_signature: 'Tanda tangan dengan secret yang salah (harus ditolak 401)',
  tampered: 'Ubah nominal SETELAH ditandatangani (harus ditolak 401)',
};

export function loadConfig(env = process.env) {
  const secrets = {};
  for (const [key, value] of Object.entries(env)) {
    const m = key.match(/^HMAC_SECRET_([A-Z0-9_]+)$/);
    if (m && value) secrets[m[1]] = value.trim();
  }
  if (!env.WEBHOOK_URL) {
    throw new Error('Set env WEBHOOK_URL (URL endpoint webhook backend).');
  }
  return {
    webhookUrl: env.WEBHOOK_URL,
    secrets,
    maxRetries: Number(env.MAX_RETRIES ?? 3),
    retryBaseMs: Number(env.RETRY_BASE_MS ?? 1000),
  };
}

export const sign = (secret, rawBody) =>
  createHmac('sha256', secret).update(rawBody).digest('hex');

export function buildPayload({
  event_type,
  institution_code,
  invoice_number,
  amount,
  payment_method = 'VA_BNI',
  event_id,
  transaction_id,
  occurred_at,
}) {
  const payload = {
    event_id: event_id || `evt_${randomUUID()}`,
    event_type,
    institution_code,
    invoice_number,
    transaction_id: transaction_id || `trx_${randomUUID().slice(0, 12)}`,
    occurred_at: occurred_at || new Date().toISOString(),
  };
  // Nominal & metode bayar hanya relevan untuk pembayaran sukses.
  if (event_type === 'payment.success') {
    payload.payment_method = payment_method;
    if (amount !== undefined && amount !== null && amount !== '') payload.amount = Number(amount);
  }
  return payload;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Kirim satu webhook. Retry dengan exponential backoff untuk error jaringan
 * dan respons 5xx. Respons 4xx dianggap final (payload/signature salah,
 * mengulang tidak akan membantu).
 */
export async function deliver(config, { payload, secret, rawBody, signature }) {
  const body = rawBody ?? JSON.stringify(payload);
  const sig = signature ?? sign(secret, body);
  const attempts = [];

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': sig },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
      attempts.push({ attempt, status: res.status, ms: Date.now() - started, response: json });
      if (res.status < 500) break;
    } catch (err) {
      attempts.push({ attempt, status: null, ms: Date.now() - started, error: String(err.message ?? err) });
    }
    if (attempt <= config.maxRetries) await sleep(config.retryBaseMs * 2 ** (attempt - 1));
  }
  return { payload, signature: sig, body, attempts };
}

export async function runScenario(config, input) {
  const scenario = input.scenario ?? 'normal';
  const code = String(input.institution_code ?? '').toUpperCase();
  const secret = config.secrets[code];
  if (!secret && scenario !== 'invalid_signature') {
    throw new Error(
      `Secret untuk institusi ${code || '(kosong)'} tidak dikonfigurasi. Set env HMAC_SECRET_${code || '<KODE>'}.`,
    );
  }
  const base = { ...input, institution_code: code };

  switch (scenario) {
    case 'normal':
      return [await deliver(config, { payload: buildPayload(base), secret })];

    case 'duplicate': {
      const payload = buildPayload(base);
      return [
        await deliver(config, { payload, secret }),
        await deliver(config, { payload, secret }),
      ];
    }

    case 'concurrent_duplicate': {
      const payload = buildPayload(base);
      return Promise.all(
        Array.from({ length: 5 }, () => deliver(config, { payload, secret })),
      );
    }

    case 'out_of_order': {
      const now = Date.now();
      const success = buildPayload({
        ...base,
        event_type: 'payment.success',
        occurred_at: new Date(now - 60_000).toISOString(),
      });
      const expired = buildPayload({
        ...base,
        event_type: 'payment.expired',
        amount: undefined,
        occurred_at: new Date(now).toISOString(),
      });
      // Expired (terjadi belakangan) tiba DULUAN, success (terjadi lebih dulu) tiba belakangan.
      return [
        await deliver(config, { payload: expired, secret }),
        await deliver(config, { payload: success, secret }),
      ];
    }

    case 'invalid_signature':
      return [
        await deliver(config, {
          payload: buildPayload(base),
          secret: 'secret-yang-salah',
        }),
      ];

    case 'tampered': {
      const payload = buildPayload(base);
      const signed = JSON.stringify(payload);
      const tampered = JSON.stringify({ ...payload, amount: 1 });
      return [
        await deliver(config, {
          payload: { ...payload, amount: 1 },
          rawBody: tampered,
          signature: sign(secret, signed),
        }),
      ];
    }

    default:
      throw new Error(`Skenario tidak dikenal: ${scenario}`);
  }
}
