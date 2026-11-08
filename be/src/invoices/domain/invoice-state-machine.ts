import { InvoiceStatus } from '../enums/invoice-status.enum';
import { PaymentEventType } from '../enums/payment-event-type.enum';
import { TransactionOutcome } from '../enums/transaction-outcome.enum';

export interface InvoiceState {
  status: InvoiceStatus;
  amount: number;
  expiresAt: Date;
  paidAt: Date | null;
  paidAmount: number | null;
}

export interface InvoiceEvent {
  type: PaymentEventType;
  /** Wajib untuk payment.success. */
  amount: number | null;
  occurredAt: Date;
}

export interface TransitionDecision {
  nextStatus: InvoiceStatus;
  outcome: TransactionOutcome;
  /** Catatan untuk riwayat transaksi (bahasa Indonesia, tampil di UI admin). */
  note: string | null;
  /** Diisi hanya jika tagihan menjadi lunas. */
  paidAt?: Date;
  paidAmount?: number;
}

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/**
 * Aturan transisi status tagihan. Pure function: tidak menyentuh database,
 * sehingga seluruh kombinasi status x event bisa dites unit.
 *
 * Prinsip:
 * 1. "Uang masuk adalah fakta": payment.success yang nominalnya cocok selalu
 *    membuat tagihan lunas, termasuk jika datang setelah kedaluwarsa
 *    (event bisa datang terlambat / tidak berurutan).
 * 2. Status LUNAS tidak pernah mundur. Event expired setelah lunas diabaikan.
 * 3. Nominal yang tidak cocok TIDAK mengubah status; dicatat untuk rekonsiliasi.
 * 4. Pembayaran kedua pada tagihan lunas dicatat sebagai double payment (refund).
 */
export function decideTransition(
  invoice: InvoiceState,
  event: InvoiceEvent,
): TransitionDecision {
  const current = invoice.status;
  const unchanged = (outcome: TransactionOutcome, note: string) => ({
    nextStatus: current,
    outcome,
    note,
  });

  switch (event.type) {
    case PaymentEventType.PAYMENT_SUCCESS: {
      const paid = event.amount;
      if (paid === null || !Number.isFinite(paid)) {
        // Seharusnya sudah ditolak validasi DTO; dijaga lagi agar fungsi ini total.
        return unchanged(
          TransactionOutcome.IGNORED,
          'Event pembayaran tanpa nominal diabaikan.',
        );
      }

      if (current === InvoiceStatus.PAID) {
        return unchanged(
          TransactionOutcome.DOUBLE_PAYMENT,
          `Pembayaran ${rupiah(paid)} diterima untuk tagihan yang sudah lunas. Perlu proses refund.`,
        );
      }

      if (paid !== invoice.amount) {
        return unchanged(
          TransactionOutcome.AMOUNT_MISMATCH,
          `Nominal dibayar ${rupiah(paid)} tidak sama dengan nominal tagihan ${rupiah(invoice.amount)}. Status tidak diubah, perlu rekonsiliasi.`,
        );
      }

      const paidAfterDeadline =
        event.occurredAt.getTime() > invoice.expiresAt.getTime();
      const late = current === InvoiceStatus.EXPIRED || paidAfterDeadline;
      let note: string | null = null;
      if (paidAfterDeadline) {
        note =
          'Pembayaran terjadi setelah batas waktu; tetap dicatat lunas karena dana sudah diterima gateway.';
      } else if (current === InvoiceStatus.EXPIRED) {
        note =
          'Notifikasi pembayaran tiba setelah status kedaluwarsa (urutan event tertukar), padahal pembayaran terjadi sebelum batas waktu.';
      }
      return {
        nextStatus: InvoiceStatus.PAID,
        outcome: late
          ? TransactionOutcome.APPLIED_LATE
          : TransactionOutcome.APPLIED,
        note,
        paidAt: event.occurredAt,
        paidAmount: paid,
      };
    }

    case PaymentEventType.PAYMENT_EXPIRED:
    case PaymentEventType.SYSTEM_EXPIRED: {
      if (current === InvoiceStatus.PAID) {
        return unchanged(
          TransactionOutcome.IGNORED,
          'Notifikasi kedaluwarsa diabaikan karena tagihan sudah lunas.',
        );
      }
      if (current === InvoiceStatus.EXPIRED) {
        return unchanged(
          TransactionOutcome.IGNORED,
          'Tagihan sudah berstatus kedaluwarsa.',
        );
      }
      return {
        nextStatus: InvoiceStatus.EXPIRED,
        outcome: TransactionOutcome.APPLIED,
        note:
          event.type === PaymentEventType.SYSTEM_EXPIRED
            ? 'Kedaluwarsa otomatis oleh sistem (melewati batas waktu pembayaran).'
            : null,
      };
    }

    default: {
      const exhaustive: never = event.type;
      throw new Error(`Event tidak dikenal: ${String(exhaustive)}`);
    }
  }
}
