/**
 * Hasil pemrosesan satu event terhadap tagihan. Disimpan di riwayat transaksi
 * agar admin keuangan bisa melihat KENAPA status berubah (atau tidak berubah).
 */
export enum TransactionOutcome {
  APPLIED = 'applied',
  /** Pembayaran sukses diterima setelah tagihan kedaluwarsa; tetap dianggap lunas. */
  APPLIED_LATE = 'applied_late',
  /** Nominal pembayaran tidak sama dengan nominal tagihan; status tidak berubah. */
  AMOUNT_MISMATCH = 'amount_mismatch',
  /** Pembayaran sukses kedua untuk tagihan yang sudah lunas (perlu refund). */
  DOUBLE_PAYMENT = 'double_payment',
  /** Event diabaikan karena tidak boleh mengubah status (mis. expired setelah lunas). */
  IGNORED = 'ignored',
}
