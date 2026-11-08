# Dokumentasi Webhook Payment Gateway

Endpoint ini menerima notifikasi pembayaran UKT dari payment gateway pihak ketiga.
Autentikasinya memakai **HMAC-SHA256 per institusi**, bukan JWT.

## Endpoint

```
POST /api/v1/webhooks/payment-gateway
Content-Type: application/json
X-Signature: <hex HMAC-SHA256>
```

| Lingkungan | URL |
| --- | --- |
| Docker Compose (dari host) | `http://localhost:3000/api/v1/webhooks/payment-gateway` |
| Dari container mock-gateway | `http://backend:3000/api/v1/webhooks/payment-gateway` |

## Payload

```json
{
  "event_id": "evt_5f1f493e-8c2d-4d27-80da-b2d03f5e448e",
  "event_type": "payment.success",
  "institution_code": "UCN",
  "invoice_number": "UKT-20252-2023001",
  "transaction_id": "trx_86516480-8a0",
  "amount": 4500000,
  "payment_method": "VA_BNI",
  "occurred_at": "2026-11-09T10:15:00+07:00"
}
```

| Field | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `event_id` | string (1–100) | ya | ID unik event dari gateway. **Kunci idempotensi**: event yang sama hanya diproses sekali per institusi. |
| `event_type` | `payment.success` \| `payment.expired` | ya | Jenis event. |
| `institution_code` | string (1–20) | ya | Kode institusi pemilik tagihan. Menentukan secret HMAC yang dipakai. |
| `invoice_number` | string (1–50) | ya | Nomor tagihan (unik di dalam institusi). |
| `transaction_id` | string (1–100) | tidak | ID transaksi di sisi gateway (disimpan untuk rekonsiliasi). |
| `amount` | integer ≥ 1 | ya untuk `payment.success` | Nominal dibayar dalam rupiah, tanpa desimal. |
| `payment_method` | string (1–50) | tidak | Mis. `VA_BNI`, `QRIS`. |
| `occurred_at` | ISO 8601 | ya | Waktu kejadian di sisi gateway (bukan waktu kirim). Untuk `payment.success`, nilai ini menjadi `paid_at`. |

Field tambahan yang tidak dikenal akan diabaikan, tidak ditolak. Ini disengaja agar gateway bisa menambah field tanpa memutus integrasi.

### Jenis event

| Event | Arti |
| --- | --- |
| `payment.success` | Dana sudah diterima gateway untuk tagihan tersebut. |
| `payment.expired` | VA/kode bayar di gateway kedaluwarsa, tidak bisa dibayar lagi. |

Selain dua event gateway di atas, sistem juga punya event internal `system.expired`, yang dibuat oleh job kedaluwarsa otomatis. Event ini tidak dikirim lewat webhook.

## Signature

```
X-Signature = hex( HMAC-SHA256( secret_institusi, raw_request_body ) )
```

- Dihitung dari **byte body mentah persis seperti dikirim**. Jangan parse lalu stringify ulang, karena perbedaan spasi atau urutan key akan menghasilkan signature berbeda.
- Secret diambil berdasarkan `institution_code` di body. Signature yang dibuat dengan secret institusi lain **ditolak**.
- Format header yang diterima: `<hex>` atau `sha256=<hex>`, tidak peka huruf besar/kecil.
- Perbandingan dilakukan secara constant-time (`crypto.timingSafeEqual`).

Contoh membuat signature:

```bash
BODY='{"event_id":"evt_1","event_type":"payment.success","institution_code":"UCN","invoice_number":"UKT-20252-2023001","amount":4500000,"occurred_at":"2026-11-09T10:15:00+07:00"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$HMAC_SECRET_UCN" -hex | awk '{print $2}')

curl -X POST http://localhost:3000/api/v1/webhooks/payment-gateway \
  -H 'Content-Type: application/json' \
  -H "X-Signature: $SIG" \
  -d "$BODY"
```

```js
import { createHmac } from 'node:crypto';
const raw = JSON.stringify(payload);
const signature = createHmac('sha256', secret).update(raw).digest('hex');
// kirim `raw` sebagai body, bukan objek yang di-serialize ulang
```

## Respons

Semua respons memakai envelope standar API. Gateway cukup melihat **HTTP status code**.

| HTTP | `data.status` | Kapan | Perlu retry? |
| --- | --- | --- | --- |
| `200` | `processed` | Event dicatat ke riwayat transaksi. Status tagihan bisa berubah atau tidak, lihat `outcome`. | Tidak |
| `200` | `duplicate` | `event_id` ini sudah pernah diproses untuk institusi tersebut. | Tidak |
| `200` | `ignored` | Signature valid, tetapi `invoice_number` tidak ditemukan di institusi itu. Dicatat untuk rekonsiliasi manual. | Tidak |
| `400` | – | Body bukan JSON, atau payload tidak valid (mis. `payment.success` tanpa `amount`). | Tidak (perbaiki payload) |
| `401` | – | Signature salah/tidak ada, **atau** `institution_code` tidak dikenal. Pesannya sengaja sama, `Invalid signature`, agar kode institusi tidak bisa ditebak. | Tidak |
| `5xx` | – | Error tak terduga. Transaksi database di-rollback, jadi **aman di-retry** dengan payload yang sama. | Ya |

Contoh `200 processed`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Webhook received",
  "data": {
    "status": "processed",
    "webhook_log_id": "0f23e225-b4a3-4141-9953-42e513b967cb",
    "invoice_status": "paid",
    "outcome": "applied"
  }
}
```

Contoh `200 duplicate`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Webhook received",
  "data": {
    "status": "duplicate",
    "webhook_log_id": "6b15cc8f-3d6b-4914-bb83-3c964a59b8d5",
    "message": "Event evt_f552... sudah pernah diproses"
  }
}
```

Contoh `401`:

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Invalid signature",
  "path": "/api/v1/webhooks/payment-gateway",
  "timestamp": "2026-11-09T03:15:00.000Z"
}
```

### `outcome` (hasil penerapan event)

| `outcome` | Arti |
| --- | --- |
| `applied` | Event diterapkan, status berubah. |
| `applied_late` | Pembayaran diterapkan meski tagihan sudah kedaluwarsa atau dibayar lewat batas waktu. Tagihan menjadi **lunas** karena dana sudah masuk. |
| `amount_mismatch` | Nominal ≠ nominal tagihan. **Status tidak berubah**, perlu rekonsiliasi. |
| `double_payment` | Pembayaran sukses kedua untuk tagihan yang sudah lunas. Status tetap lunas, perlu refund. |
| `ignored` | Event tidak boleh mengubah status, mis. `payment.expired` setelah lunas. |

## Aturan transisi status

| Status sekarang \ Event | `payment.success` (nominal cocok) | `payment.success` (nominal beda) | `payment.expired` / `system.expired` |
| --- | --- | --- | --- |
| `unpaid` | → `paid` (`applied`, atau `applied_late` jika `occurred_at` > `expires_at`) | tetap (`amount_mismatch`) | → `expired` (`applied`) |
| `expired` | → `paid` (`applied_late`) | tetap (`amount_mismatch`) | tetap (`ignored`) |
| `paid` | tetap (`double_payment`) | tetap (`double_payment`) | tetap (`ignored`) |

Prinsipnya: **lunas tidak pernah mundur**, dan uang yang benar-benar masuk selalu menang. Alasannya ada di [DECISIONS.md](../DECISIONS.md).

## Jaminan keandalan

- **Idempoten:** unique index `(institution_id, event_id)` ditambah pengecekan di dalam transaksi.
- **Aman terhadap request bersamaan:** baris tagihan dikunci `SELECT ... FOR UPDATE`, sehingga event untuk tagihan yang sama diproses bergantian. Diuji dengan 8 request identik paralel: hasilnya tepat 1 `processed` dan 7 `duplicate`.
- **Aman terhadap urutan acak:** keputusan selalu diambil dari status terkini setelah lock.
- **Audit lengkap:** setiap request dicatat di tabel `webhook_logs` **sebelum** validasi apa pun, termasuk body mentah, signature, IP, hasil, dan kode respons. Request yang ditolak (JSON rusak, signature salah, institusi tidak dikenal) juga tercatat. Admin keuangan bisa melihat log institusinya di menu **Log Webhook**.

## Memicu webhook (mock gateway)

Mock gateway ada di folder [`mock-gateway/`](../mock-gateway). Saat jalan lewat Docker Compose, gateway ini membaca secret yang sama dari `.env`.

**Lewat UI:** buka `http://localhost:4000`, pilih institusi, isi nomor tagihan, event, nominal, dan skenario, lalu klik **Kirim webhook**.

**Lewat CLI:**

```bash
# Dari container (secret sudah tersedia di env)
docker compose exec mock-gateway node src/cli.mjs payment.success UCN UKT-20252-2023001 4500000
docker compose exec mock-gateway node src/cli.mjs payment.expired ITSB UKT-20252-2023002
docker compose exec mock-gateway node src/cli.mjs payment.success UCN UKT-20252-2023001 4500000 --scenario=concurrent_duplicate
```

**Lewat API:**

```bash
curl -X POST http://localhost:4000/api/events -H 'Content-Type: application/json' -d '{
  "institution_code": "PHB",
  "invoice_number": "UKT-20252-2223001",
  "event_type": "payment.success",
  "amount": 3000000,
  "scenario": "normal"
}'
```

### Skenario yang tersedia

| Skenario | Yang dikirim | Hasil yang diharapkan |
| --- | --- | --- |
| `normal` | 1 event | `processed` |
| `duplicate` | event yang sama 2x berurutan (meniru retry gateway) | `processed`, lalu `duplicate` |
| `concurrent_duplicate` | event yang sama 5x bersamaan | tepat 1 `processed`, 4 `duplicate` |
| `out_of_order` | `payment.expired` tiba lebih dulu, lalu `payment.success` yang terjadi lebih awal | tagihan berakhir `paid` (`applied_late`) |
| `invalid_signature` | ditandatangani dengan secret salah | `401` |
| `tampered` | nominal diubah setelah ditandatangani | `401` |

Mock gateway me-retry dengan exponential backoff (default 3x: 1 s, 2 s, 4 s) untuk error jaringan dan respons `5xx`. Respons `4xx` dianggap final.

### Nomor tagihan dari seed

Format: `UKT-<semester>-<NIM>`. Semester `20251` = 2025/2026 Ganjil (selalu lunas), `20252` = 2025/2026 Genap.

| Institusi | Tagihan `unpaid` (20252) | Nominal |
| --- | --- | --- |
| UCN | `UKT-20252-2023001` (Andi) | 4.500.000 |
| ITSB | `UKT-20252-2023001` (Eka), `UKT-20252-2023002` (Fajar) | 7.500.000, 5.000.000 |
| PHB | `UKT-20252-2223001` (Indra), `UKT-20252-2324005` (Kartika) | 3.000.000, 3.500.000 |

`UKT-20252-2023001` sengaja ada di UCN **dan** ITSB, untuk membuktikan nomor tagihan boleh sama di institusi berbeda dan webhook hanya mengubah tagihan milik institusi yang menandatangani.
