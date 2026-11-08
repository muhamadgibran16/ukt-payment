export enum WebhookLogStatus {
  /** Baru diterima, belum selesai diproses (kalau tertinggal = proses crash). */
  RECEIVED = 'received',
  PROCESSED = 'processed',
  DUPLICATE = 'duplicate',
  /** Valid, tapi tidak bisa dikaitkan ke tagihan (mis. nomor tagihan tidak ada). */
  IGNORED = 'ignored',
  /** Ditolak: signature salah, institusi tidak dikenal, atau payload tidak valid. */
  REJECTED = 'rejected',
  /** Error tak terduga saat memproses; gateway akan retry. */
  FAILED = 'failed',
}
