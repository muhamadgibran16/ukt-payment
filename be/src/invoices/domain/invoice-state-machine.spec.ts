import { InvoiceStatus } from '../enums/invoice-status.enum';
import { PaymentEventType } from '../enums/payment-event-type.enum';
import { TransactionOutcome } from '../enums/transaction-outcome.enum';
import { decideTransition, InvoiceState } from './invoice-state-machine';

const EXPIRES = new Date('2026-12-31T23:59:59+07:00');
const BEFORE = new Date('2026-12-01T10:00:00+07:00');
const AFTER = new Date('2027-01-05T10:00:00+07:00');

const invoice = (status: InvoiceStatus): InvoiceState => ({
  status,
  amount: 4_500_000,
  expiresAt: EXPIRES,
  paidAt: status === InvoiceStatus.PAID ? BEFORE : null,
  paidAmount: status === InvoiceStatus.PAID ? 4_500_000 : null,
});

const success = (amount = 4_500_000, occurredAt = BEFORE) => ({
  type: PaymentEventType.PAYMENT_SUCCESS,
  amount,
  occurredAt,
});
const expired = (type = PaymentEventType.PAYMENT_EXPIRED) => ({
  type,
  amount: null,
  occurredAt: AFTER,
});

describe('decideTransition', () => {
  describe('payment.success', () => {
    it('unpaid + exact amount -> paid (applied), records paid_at from event time', () => {
      expect(
        decideTransition(invoice(InvoiceStatus.UNPAID), success()),
      ).toEqual({
        nextStatus: InvoiceStatus.PAID,
        outcome: TransactionOutcome.APPLIED,
        note: null,
        paidAt: BEFORE,
        paidAmount: 4_500_000,
      });
    });

    it('expired + exact amount -> paid (applied_late): money received wins', () => {
      const d = decideTransition(invoice(InvoiceStatus.EXPIRED), success());
      expect(d.nextStatus).toBe(InvoiceStatus.PAID);
      expect(d.outcome).toBe(TransactionOutcome.APPLIED_LATE);
    });

    it('unpaid but paid after expires_at (sweeper not yet run) -> paid, applied_late', () => {
      const d = decideTransition(
        invoice(InvoiceStatus.UNPAID),
        success(4_500_000, AFTER),
      );
      expect(d).toMatchObject({
        nextStatus: InvoiceStatus.PAID,
        outcome: TransactionOutcome.APPLIED_LATE,
      });
    });

    it.each([4_000_000, 5_000_000])(
      'amount mismatch (%d) does NOT change status',
      (amount) => {
        const d = decideTransition(
          invoice(InvoiceStatus.UNPAID),
          success(amount),
        );
        expect(d.nextStatus).toBe(InvoiceStatus.UNPAID);
        expect(d.outcome).toBe(TransactionOutcome.AMOUNT_MISMATCH);
        expect(d.paidAt).toBeUndefined();
      },
    );

    it('amount mismatch on expired invoice keeps it expired', () => {
      const d = decideTransition(invoice(InvoiceStatus.EXPIRED), success(1));
      expect(d.nextStatus).toBe(InvoiceStatus.EXPIRED);
      expect(d.outcome).toBe(TransactionOutcome.AMOUNT_MISMATCH);
    });

    it('second payment on a paid invoice -> double_payment, stays paid', () => {
      const d = decideTransition(invoice(InvoiceStatus.PAID), success());
      expect(d.nextStatus).toBe(InvoiceStatus.PAID);
      expect(d.outcome).toBe(TransactionOutcome.DOUBLE_PAYMENT);
      expect(d.paidAt).toBeUndefined(); // paid_at pertama tidak ditimpa
    });

    it('missing amount is ignored defensively', () => {
      const d = decideTransition(invoice(InvoiceStatus.UNPAID), {
        type: PaymentEventType.PAYMENT_SUCCESS,
        amount: null,
        occurredAt: BEFORE,
      });
      expect(d.nextStatus).toBe(InvoiceStatus.UNPAID);
      expect(d.outcome).toBe(TransactionOutcome.IGNORED);
    });
  });

  describe.each([
    PaymentEventType.PAYMENT_EXPIRED,
    PaymentEventType.SYSTEM_EXPIRED,
  ])('%s', (type) => {
    it('unpaid -> expired', () => {
      const d = decideTransition(invoice(InvoiceStatus.UNPAID), expired(type));
      expect(d.nextStatus).toBe(InvoiceStatus.EXPIRED);
      expect(d.outcome).toBe(TransactionOutcome.APPLIED);
    });

    it('paid stays paid: status never goes backwards', () => {
      const d = decideTransition(invoice(InvoiceStatus.PAID), expired(type));
      expect(d.nextStatus).toBe(InvoiceStatus.PAID);
      expect(d.outcome).toBe(TransactionOutcome.IGNORED);
    });

    it('expired stays expired (no-op)', () => {
      const d = decideTransition(invoice(InvoiceStatus.EXPIRED), expired(type));
      expect(d.nextStatus).toBe(InvoiceStatus.EXPIRED);
      expect(d.outcome).toBe(TransactionOutcome.IGNORED);
    });
  });

  it('out-of-order: expired then success ends as paid', () => {
    let state = invoice(InvoiceStatus.UNPAID);
    for (const event of [expired(), success()]) {
      const d = decideTransition(state, event);
      state = { ...state, status: d.nextStatus };
    }
    expect(state.status).toBe(InvoiceStatus.PAID);
  });

  it('out-of-order: success then expired ends as paid', () => {
    let state = invoice(InvoiceStatus.UNPAID);
    for (const event of [success(), expired()]) {
      const d = decideTransition(state, event);
      state = { ...state, status: d.nextStatus };
    }
    expect(state.status).toBe(InvoiceStatus.PAID);
  });
});
