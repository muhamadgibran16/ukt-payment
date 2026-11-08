# Project: Tagihan UKT — Integrasi Pembayaran via Webhook (SEVIMA M2)

## Deskripsi singkat

Aplikasi multi-institusi (banyak kampus, satu database) untuk mengelola tagihan UKT per mahasiswa
per semester. Status tagihan (`unpaid` / `paid` / `expired`) diperbarui oleh notifikasi webhook
payment gateway yang diverifikasi HMAC-SHA256 per institusi. Status menentukan apakah mahasiswa
boleh mengisi KRS, jadi **akurasi status lebih penting daripada apa pun**.

Role: `finance_admin` (admin keuangan satu institusi) dan `student` (mahasiswa).

## Stack dan cara menjalankan

- `be/`: NestJS 11 + TypeORM 0.3 + PostgreSQL 17, pnpm. Jest untuk unit & e2e.
- `fe/`: React 19 + Vite + Tailwind 4 + React Router 7 + TanStack Query 5 + RHF/Zod, pnpm.
- `mock-gateway/`: Node 24 murni (tanpa dependency).

```bash
./scripts/setup-env.sh && docker compose up -d --build     # semua service
docker compose up -d postgres                              # hanya DB (localhost:5433)
cd be && pnpm start:dev | pnpm test | pnpm test:e2e | pnpm lint
cd be && pnpm migration:generate src/common/database/migrations/<Nama>   # setelah ubah entity
cd fe && pnpm dev | pnpm build | pnpm lint
```

Setelah mengubah backend, **jalankan `pnpm test` dan `pnpm test:e2e`**. E2E memakai Postgres
sungguhan (DB `ukt_test`, dibuat otomatis).

## Arsitektur singkat

```
Gateway ──HMAC──> POST /api/v1/webhooks/payment-gateway (WebhooksService)
                     1. simpan raw body ke webhook_logs (selalu, sebelum validasi)
                     2. institution_code -> secret -> verifySignature (timing-safe)
                     3. validasi DTO
                     4. InvoicePaymentService.applyEvent()  ── transaksi:
                          SELECT invoice FOR UPDATE -> cek event_id (idempotensi)
                          -> decideTransition() (pure) -> insert invoice_transactions -> update invoice
                     5. update webhook_logs
InvoiceExpiryService (interval) ──> applyEvent(system.expired)   // jalur yang sama
FE (React) ──JWT──> /invoices, /students, /webhook-logs (finance_admin) · /me/invoices (student)
```

File kunci:
- `be/src/invoices/domain/invoice-state-machine.ts`: SATU-SATUNYA tempat aturan transisi status.
- `be/src/invoices/invoice-payment.service.ts`: transaksi + lock + idempotensi.
- `be/src/webhooks/webhooks.service.ts`: alur webhook (parse → authenticate → validate → apply) &
  pencatatan audit log di satu tempat (`handle`). Penolakan wajar dilempar sebagai `WebhookRejection`.
- `be/src/webhooks/webhook.mapper.ts`: pemetaan payload ↔ input domain ↔ respons gateway (pure).
- `be/src/common/decorators/institution-id.decorator.ts`: sumber `institutionId`.
- `be/src/common/database/migrations/`: skema (composite FK, unique, check constraint).
- Kontrak webhook: `docs/WEBHOOK.md`. Alasan desain: `DECISIONS.md`.

## Aturan bisnis penting (termasuk multi-institusi)

**Isolasi data antar-institusi (wajib, tanpa pengecualian kecuali yang tertulis):**
1. Setiap tabel milik tenant punya `institution_id NOT NULL`. Setiap query data tenant **wajib**
   memfilter `institution_id`.
2. `institutionId` **hanya** diambil dari JWT lewat `@InstitutionId()`. **Jangan pernah** menerima
   `institutionId` dari body, query, params, atau header.
3. Repository tenant menyimpan `Repository<T>` secara `private`, dan setiap method publik menerima
   `institutionId` sebagai parameter pertama. Jangan menambah method tanpa scope, dan jangan
   meng-inject `Repository<Entity>` mentah ke service/controller.
4. Mengakses data institusi lain menghasilkan **404** (bukan 403).
5. Relasi antar-tabel tenant memakai **composite FK** `(institution_id, x_id)`. Entitas baru wajib
   mengikuti pola ini.
6. Pengecualian lintas institusi yang disengaja **hanya**:
   `InstitutionsRepository.findByCodeWithSecret` (webhook, institusi belum diketahui) dan
   `InvoiceExpiryService.sweep` (job sistem; tetap memanggil `applyEvent` dengan `institution_id`
   masing-masing tagihan). Menambah pengecualian baru harus didiskusikan dulu.
7. Setiap fitur yang membaca data tenant wajib punya e2e test isolasi di
   `be/test/tenant-isolation.e2e-spec.ts`.

**Tagihan & pembayaran:**
- Nomor tagihan unik per institusi (`UQ_invoices_institution_number`), boleh sama antar-institusi.
- Satu tagihan per mahasiswa per semester. Semester berformat `YYYYS` (`1` ganjil, `2` genap).
- Nominal: integer rupiah (`BIGINT`).
- Aturan status (lihat `decideTransition`): `paid` tidak pernah mundur; `payment.success` dengan
  nominal cocok selalu melunasi (termasuk dari `expired`, sebagai `applied_late`); nominal tidak
  cocok tidak mengubah status (`amount_mismatch`); pembayaran kedua = `double_payment`.
- Setiap event yang menyentuh tagihan dicatat di `invoice_transactions` (append-only), termasuk yang
  tidak mengubah status.
- Seluruh notifikasi webhook dicatat di `webhook_logs` **sebelum** validasi, termasuk yang ditolak.
- Idempotensi webhook: `(institution_id, event_id)` unik.

## Konvensi kode

- Bahasa: kode & identifier dalam bahasa Inggris; komentar, pesan error untuk pengguna, dan
  dokumentasi dalam bahasa Indonesia.
- Backend: pola modul NestJS `module / controller / service / repository / entity / dto`.
  Guard global: JWT (`@Public()` untuk pengecualian) + `@Roles(...)`.
- Response API dibungkus `TransformInterceptor` (`{ success, statusCode, message, data, meta? }`).
  Pagination: kembalikan `new Paginated(items, total, page, limit)`.
- Skema DB hanya berubah lewat migration. `synchronize` selalu `false`. Setelah mengubah entity,
  jalankan `migration:generate --dryrun` dan pastikan tidak ada drift.
- TypeORM: pakai `update()` eksplisit untuk perubahan status; hindari `save()` pada entity yang
  dimuat dengan relasi, `cascade`, dan `eager`.
- Logika bisnis yang bisa dibuat pure function ditaruh di `domain/` dan dites unit.
- Fungsi pendek dengan nama yang menjelaskan langkahnya (lihat `InvoicePaymentService.applyInTransaction`);
  controller tipis → service → repository. Controller tidak memakai repository langsung.
- Frontend: struktur feature-based. `features/<nama>/{api,components,hooks,types.ts,constants.ts}`,
  halaman di `app/routes/` (tipis: hanya komposisi), komponen dasar di `components/ui/`.
  State loading/error/kosong dari query memakai `<QueryContent>`; jangan menulis ulang ternary-nya.
  Hindari `eslint-disable`; untuk callback di dalam effect pakai `useEffectEvent`. Data server lewat TanStack Query
  (query key di file api). Form memakai React Hook Form + Zod. Path route dari `config/paths.ts`.
- Format: Prettier (single quote, trailing comma). Lint wajib bersih.

## Hal yang tidak boleh dilakukan AI

- **Jangan** menulis secret (HMAC, JWT, password non-demo) ke file yang di-commit, termasuk test
  fixture, seed, atau contoh. Secret hanya ada di `.env` (gitignored).
- **Jangan** mengambil `institutionId` dari input request, membuat query tenant tanpa filter
  `institution_id`, atau menambah jalur lintas institusi baru tanpa persetujuan.
- **Jangan** mengubah aturan transisi status di luar `decideTransition`, atau mengubah aturannya
  tanpa memperbarui test, `docs/WEBHOOK.md`, dan `DECISIONS.md`.
- **Jangan** mem-parse lalu men-stringify ulang body webhook sebelum verifikasi signature, dan jangan
  memindahkan pencatatan `webhook_logs` ke setelah validasi.
- **Jangan** membandingkan signature dengan `===`; gunakan `verifySignature` (timing-safe).
- **Jangan** mengaktifkan `synchronize`, mengedit migration yang sudah dijalankan, atau menghapus
  constraint/index yang menjaga integritas (unique, composite FK, check).
- **Jangan** menghapus/menimpa baris `invoice_transactions` atau `webhook_logs`; keduanya append-only
  (kecuali update hasil proses pada log yang sama).
- **Jangan** melemahkan atau menghapus test yang gagal agar lolos; perbaiki penyebabnya.
- **Jangan** menanam nilai konfigurasi lingkungan (URL, host, port, kredensial, zona waktu, flag) di
  kode, Dockerfile, atau `docker-compose.yml`. Tambahkan variabel ke `.env.example` (root, `be/`, atau
  `fe/`), validasi di `be/src/config/env.validation.ts` / `fe/src/config/env.ts`, lalu baca dari sana.
- **Jangan** commit, push, atau menjalankan perintah destruktif (drop database selain `*_test`,
  `docker compose down -v`) tanpa diminta.
