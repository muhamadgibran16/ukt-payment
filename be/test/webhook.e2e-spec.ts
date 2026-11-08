import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { InvoiceTransaction } from '../src/invoices/entities/invoice-transaction.entity';
import { Invoice } from '../src/invoices/entities/invoice.entity';
import { InvoiceStatus } from '../src/invoices/enums/invoice-status.enum';
import { TransactionOutcome } from '../src/invoices/enums/transaction-outcome.enum';
import { InvoiceExpiryService } from '../src/invoices/invoice-expiry.service';
import { WebhookLogStatus } from '../src/webhooks/domain/webhook-log-status.enum';
import { WebhookLog } from '../src/webhooks/entities/webhook-log.entity';
import {
  createTenant,
  createTestApp,
  sendWebhook,
  TenantFixture,
  webhookPayload,
} from './helpers';

describe('Payment gateway webhook (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let http: ReturnType<typeof request>;
  let a: TenantFixture;
  let b: TenantFixture;
  let n = 0;

  beforeAll(async () => {
    ({ app, dataSource: ds, http } = await createTestApp());
    b = await createTenant(ds, 'INSTB');
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    a = await createTenant(ds, `INSTA${++n}`);
  });

  const reload = (inv: Invoice) =>
    ds.getRepository(Invoice).findOneByOrFail({ id: inv.id });
  const txs = (inv: Invoice) =>
    ds
      .getRepository(InvoiceTransaction)
      .find({ where: { invoiceId: inv.id }, order: { createdAt: 'ASC' } });
  const lastLog = () =>
    ds
      .getRepository(WebhookLog)
      .find({ order: { receivedAt: 'DESC' }, take: 1 })
      .then((r) => r[0]);

  it('payment.success with valid signature marks the invoice paid and records history + audit', async () => {
    const payload = webhookPayload(a);
    const res = await sendWebhook(http, payload, a.secret).expect(200);
    expect(res.body.data).toMatchObject({
      status: 'processed',
      invoice_status: 'paid',
      outcome: 'applied',
    });

    const inv = await reload(a.invoice);
    expect(inv.status).toBe(InvoiceStatus.PAID);
    expect(inv.paidAmount).toBe(a.invoice.amount);
    expect(inv.paidAt?.toISOString()).toBe(payload.occurred_at);

    const history = await txs(a.invoice);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      eventId: payload.event_id,
      statusBefore: 'unpaid',
      statusAfter: 'paid',
      outcome: 'applied',
    });

    const log = await ds
      .getRepository(WebhookLog)
      .findOneByOrFail({ id: res.body.data.webhook_log_id });
    expect(log).toMatchObject({
      institutionId: a.institution.id,
      signatureValid: true,
      processingStatus: WebhookLogStatus.PROCESSED,
      responseCode: 200,
    });
    expect(history[0].webhookLogId).toBe(log.id);
  });

  it('is idempotent: the same event_id twice is processed once', async () => {
    const payload = webhookPayload(a);
    await sendWebhook(http, payload, a.secret).expect(200);
    const res = await sendWebhook(http, payload, a.secret).expect(200);
    expect(res.body.data.status).toBe('duplicate');
    expect(await txs(a.invoice)).toHaveLength(1);
    expect((await lastLog()).processingStatus).toBe(WebhookLogStatus.DUPLICATE);
  });

  it('handles concurrent duplicate deliveries: exactly one is processed', async () => {
    const payload = webhookPayload(a);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => sendWebhook(http, payload, a.secret)),
    );
    const statuses = results.map((r) => r.body.data?.status);
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(statuses.filter((s) => s === 'processed')).toHaveLength(1);
    expect(statuses.filter((s) => s === 'duplicate')).toHaveLength(7);
    expect(await txs(a.invoice)).toHaveLength(1);
  });

  it('concurrent success + expired for the same invoice always ends paid', async () => {
    await Promise.all([
      sendWebhook(
        http,
        webhookPayload(a, { event_type: 'payment.expired' }),
        a.secret,
      ),
      sendWebhook(http, webhookPayload(a), a.secret),
    ]);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.PAID);
    expect(await txs(a.invoice)).toHaveLength(2);
  });

  it('out of order: expired then success -> paid (applied_late)', async () => {
    await sendWebhook(
      http,
      webhookPayload(a, { event_type: 'payment.expired' }),
      a.secret,
    ).expect(200);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.EXPIRED);

    const res = await sendWebhook(http, webhookPayload(a), a.secret).expect(
      200,
    );
    expect(res.body.data.outcome).toBe(TransactionOutcome.APPLIED_LATE);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.PAID);
  });

  it('expired after paid is ignored: paid never goes back', async () => {
    await sendWebhook(http, webhookPayload(a), a.secret).expect(200);
    const res = await sendWebhook(
      http,
      webhookPayload(a, { event_type: 'payment.expired' }),
      a.secret,
    ).expect(200);
    expect(res.body.data).toMatchObject({
      invoice_status: 'paid',
      outcome: 'ignored',
    });
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.PAID);
  });

  it('amount mismatch keeps the invoice unpaid and records it for reconciliation', async () => {
    const res = await sendWebhook(
      http,
      webhookPayload(a, { amount: a.invoice.amount - 1000 }),
      a.secret,
    ).expect(200);
    expect(res.body.data.outcome).toBe(TransactionOutcome.AMOUNT_MISMATCH);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.UNPAID);
    expect((await txs(a.invoice))[0].outcome).toBe(
      TransactionOutcome.AMOUNT_MISMATCH,
    );
  });

  it('a second, different payment on a paid invoice is flagged as double payment', async () => {
    await sendWebhook(http, webhookPayload(a), a.secret).expect(200);
    const res = await sendWebhook(http, webhookPayload(a), a.secret).expect(
      200,
    );
    expect(res.body.data.outcome).toBe(TransactionOutcome.DOUBLE_PAYMENT);
  });

  describe('rejections are rejected AND audited', () => {
    it('invalid signature -> 401, invoice untouched, log rejected', async () => {
      const res = await sendWebhook(
        http,
        webhookPayload(a),
        'wrong-secret',
      ).expect(401);
      expect(res.body.message).toBe('Invalid signature');
      expect((await reload(a.invoice)).status).toBe(InvoiceStatus.UNPAID);
      expect(await lastLog()).toMatchObject({
        processingStatus: WebhookLogStatus.REJECTED,
        signatureValid: false,
        responseCode: 401,
        institutionId: a.institution.id,
      });
    });

    it('missing signature header -> 401', () =>
      sendWebhook(http, webhookPayload(a), null).expect(401));

    it("another institution's secret cannot sign for this institution", async () => {
      await sendWebhook(http, webhookPayload(a), b.secret).expect(401);
      expect((await reload(a.invoice)).status).toBe(InvoiceStatus.UNPAID);
    });

    it('tampered body (amount changed after signing) -> 401', async () => {
      const raw = JSON.stringify(webhookPayload(a));
      const { computeSignature } =
        await import('../src/webhooks/domain/signature');
      await http
        .post('/api/v1/webhooks/payment-gateway')
        .set('Content-Type', 'application/json')
        .set('X-Signature', computeSignature(a.secret, raw))
        .send(raw.replace(String(a.invoice.amount), '1'))
        .expect(401);
    });

    it('unknown institution -> 401 with the same message, logged', async () => {
      const res = await sendWebhook(
        http,
        webhookPayload(a, { institution_code: 'NOPE' }),
        a.secret,
      ).expect(401);
      expect(res.body.message).toBe('Invalid signature');
      expect(await lastLog()).toMatchObject({
        institutionCode: 'NOPE',
        institutionId: null,
        processingStatus: WebhookLogStatus.REJECTED,
      });
    });

    it('malformed JSON -> 400 and the raw body is still stored', async () => {
      await http
        .post('/api/v1/webhooks/payment-gateway')
        .set('Content-Type', 'application/json')
        .send('{"event_id": oops')
        .expect(400);
      expect(await lastLog()).toMatchObject({
        rawBody: '{"event_id": oops',
        processingStatus: WebhookLogStatus.REJECTED,
        responseCode: 400,
      });
    });

    it('valid signature but invalid payload (success without amount) -> 400', async () => {
      const { amount: _omit, ...payload } = webhookPayload(a);
      const res = await sendWebhook(http, payload, a.secret).expect(400);
      expect(res.body.errors.join(' ')).toMatch(/amount/);
      expect((await lastLog()).signatureValid).toBe(true);
    });

    it('unknown event type -> 400', () =>
      sendWebhook(
        http,
        webhookPayload(a, { event_type: 'payment.refund' }),
        a.secret,
      ).expect(400));
  });

  it('unknown invoice number -> 200 ignored (logged for reconciliation)', async () => {
    const res = await sendWebhook(
      http,
      webhookPayload(a, { invoice_number: 'UKT-TIDAK-ADA' }),
      a.secret,
    ).expect(200);
    expect(res.body.data.status).toBe('ignored');
    expect((await lastLog()).processingStatus).toBe(WebhookLogStatus.IGNORED);
  });

  it('same invoice number in two institutions: only the signing institution is updated', async () => {
    expect(a.invoice.invoiceNumber).toBe(b.invoice.invoiceNumber);
    await sendWebhook(http, webhookPayload(a), a.secret).expect(200);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.PAID);
    expect((await reload(b.invoice)).status).toBe(InvoiceStatus.UNPAID);
  });

  it('same event_id from two different institutions is processed independently', async () => {
    const shared = 'evt_shared_between_tenants';
    const c = await createTenant(ds, `INSTC${n}`);
    await sendWebhook(
      http,
      webhookPayload(a, { event_id: shared }),
      a.secret,
    ).expect(200);
    const res = await sendWebhook(
      http,
      webhookPayload(c, { event_id: shared }),
      c.secret,
    ).expect(200);
    expect(res.body.data.status).toBe('processed');
  });

  it('expiry job marks overdue unpaid invoices as expired, with a system history entry', async () => {
    await ds
      .getRepository(Invoice)
      .update({ id: a.invoice.id }, { expiresAt: new Date(Date.now() - 1000) });
    const count = await app.get(InvoiceExpiryService).sweep();
    expect(count).toBeGreaterThanOrEqual(1);
    expect((await reload(a.invoice)).status).toBe(InvoiceStatus.EXPIRED);
    const [entry] = await txs(a.invoice);
    expect(entry).toMatchObject({
      source: 'system',
      eventType: 'system.expired',
    });
  });
});
