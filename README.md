# Tagihan UKT: Integrasi Pembayaran via Webhook

Aplikasi web fullstack untuk mengelola tagihan **Uang Kuliah Tunggal (UKT)** banyak kampus dalam satu
platform. Status pembayaran diperbarui dari notifikasi **webhook payment gateway** yang diverifikasi
dengan **HMAC-SHA256 per institusi**.

- **Admin keuangan:** daftar tagihan institusinya (filter status/semester, pencarian), ringkasan,
  form pembuatan tagihan, detail beserta riwayat transaksi, dan audit log webhook.
- **Mahasiswa:** status tagihan dan riwayat transaksi miliknya.
- **Mock payment gateway:** UI + CLI untuk memicu `payment.success` / `payment.expired`, termasuk
  skenario dunia nyata (duplikat, bersamaan, urutan tertukar, signature salah).

| Dokumen | Isi |
| --- | --- |
| [docs/WEBHOOK.md](docs/WEBHOOK.md) | Kontrak webhook: payload, signature, respons, transisi status, cara memicu |
| [DECISIONS.md](DECISIONS.md) | Keputusan teknis penting & alasannya |
| [CLAUDE.md](CLAUDE.md) | Konteks & aturan untuk AI coding assistant |
| [AI_NOTES.md](AI_NOTES.md) | Refleksi bekerja bersama AI |

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Backend | NestJS 11 (TypeScript), TypeORM 0.3, class-validator, JWT |
| Database | PostgreSQL 17 |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router 7, TanStack Query 5, React Hook Form + Zod |
| Mock gateway | Node.js 24 tanpa dependency (`node:http`, `node:crypto`) |
| Test | Jest + Supertest (unit + e2e terhadap Postgres sungguhan) |
| Infrastruktur | Docker Compose (postgres, backend, frontend via nginx, mock-gateway) |

## Menjalankan (Docker Compose, disarankan)

Prasyarat: Docker + Docker Compose v2, dan `openssl` (untuk generate secret).

```bash
./scripts/setup-env.sh        # sekali: membuat .env berisi JWT & HMAC secret acak (tidak di-commit)
docker compose up -d --build
```

Saat start, backend otomatis menjalankan migration lalu **seed data demo** (idempoten).

### Konfigurasi

Semua konfigurasi berasal dari `.env` (template: [`.env.example`](.env.example)); tidak ada nilai
lingkungan yang ditanam di `docker-compose.yml`, Dockerfile, atau kode. Variabel wajib yang kosong
membuat `docker compose` berhenti dengan pesan yang jelas. Menjalankan ulang
`./scripts/setup-env.sh` menambahkan variabel baru ke `.env` lama tanpa mengubah nilai yang ada.

| Variabel | Keterangan |
| --- | --- |
| `APP_TIMEZONE` | Zona waktu institusi (Postgres, backend, dan tampilan/batas bayar di frontend) |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Kredensial database |
| `BACKEND_PORT`, `GATEWAY_PORT` | Port di dalam container (nginx & mock gateway mengikuti otomatis) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Token login |
| `CORS_ORIGIN`, `SWAGGER_ENABLED` | Akses API & dokumentasi |
| `SEED_ON_START`, `SEED_DEMO_PASSWORD` | Seed data demo & password akun demo |
| `EXPIRY_SWEEP_INTERVAL_MS` | Interval job kedaluwarsa otomatis (0 = nonaktif) |
| `HMAC_SECRET_<KODE>` | Secret webhook per institusi |
| `FRONTEND_DEMO_PASSWORD` | Jika diisi, halaman login menampilkan tombol akun demo |
| `GATEWAY_MAX_RETRIES`, `GATEWAY_RETRY_BASE_MS` | Perilaku retry mock gateway |
| `*_HOST_PORT` | Port di host |

| Layanan | URL |
| --- | --- |
| **Aplikasi (frontend)** | http://localhost:8080 |
| Backend API | http://localhost:3000/api/v1 |
| Swagger / OpenAPI | http://localhost:3000/docs |
| **Mock payment gateway** | http://localhost:4000 |
| PostgreSQL | `localhost:5433` (user `postgres`, db `ukt`) |

Jika ada port yang bentrok, ubah `*_HOST_PORT` di `.env`.

### Akun demo

Password semua akun: nilai `SEED_DEMO_PASSWORD` di `.env` (default **`Password123!`**). Di halaman
login juga ada tombol isi-cepat (jika `FRONTEND_DEMO_PASSWORD` diisi).

| Institusi | Admin keuangan | Mahasiswa |
| --- | --- | --- |
| UCN · Universitas Cendekia Nusantara | `keuangan@ucn.test` | `andi@ucn.test`, `bunga@ucn.test`, `citra@ucn.test` |
| ITSB · Institut Teknologi Samudra Biru | `keuangan@itsb.test` | `eka@itsb.test`, `fajar@itsb.test`, `gita@itsb.test` |
| PHB · Politeknik Harapan Bangsa | `keuangan@phb.test` | `indra@phb.test`, `joko@phb.test`, `kartika@phb.test` |

Setiap mahasiswa punya tagihan semester `20251` (lunas) dan `20252` (belum bayar / lunas /
kedaluwarsa). Nomor tagihan yang siap dipakai untuk webhook ada di
[docs/WEBHOOK.md](docs/WEBHOOK.md#nomor-tagihan-dari-seed).

### Secret HMAC

Secret per institusi **tidak ada di repositori**. `scripts/setup-env.sh` men-generate-nya ke `.env`
(dipakai backend saat seed dan oleh mock gateway). Secret untuk reviewer dikirim terpisah melalui
email. Untuk memakai secret tersebut, isi `HMAC_SECRET_UCN`, `HMAC_SECRET_ITSB`, dan `HMAC_SECRET_PHB`
di `.env`, lalu `docker compose up -d`. Seed akan memperbarui secret di database.

### Coba alur pembayaran (± 1 menit)

1. Login sebagai `andi@ucn.test`: tagihan `2025/2026 Genap` berstatus **Belum bayar**.
2. Buka mock gateway http://localhost:4000, pilih `UCN`, nomor tagihan `UKT-20252-2023001`, event
   `payment.success`, nominal `4500000`, skenario `concurrent_duplicate`, lalu kirim.
3. Kembali ke halaman mahasiswa (refresh otomatis tiap 10 detik): status menjadi **Lunas**, dengan
   satu entri riwayat walaupun webhook dikirim 5x bersamaan.
4. Login sebagai `keuangan@ucn.test` → **Log Webhook**: kelima notifikasi tercatat (1 diproses,
   4 duplikat), payload bisa dilihat.
5. Login sebagai `eka@itsb.test`: tagihan dengan nomor yang **sama** di ITSB tetap belum bayar.

## Menjalankan untuk development

Prasyarat: Node.js ≥ 22.9, pnpm (`corepack enable`), Docker (untuk Postgres).

`./scripts/setup-env.sh` juga membuat `be/.env`, `fe/.env`, dan `mock-gateway/.env` (template:
`.env.example` di folder masing-masing). Nilai bersama (kredensial DB, JWT, secret HMAC, zona
waktu, port, password demo) disinkronkan dari `.env` root, sehingga semua service konsisten.

```bash
./scripts/setup-env.sh                          # sekali, atau setelah mengubah .env root
docker compose up -d postgres                   # Postgres di localhost:5433

# Backend
cd be && pnpm install
pnpm migration:run && pnpm seed
pnpm start:dev                                  # http://localhost:3000/api/v1

# Frontend (terminal lain)
cd fe && pnpm install
pnpm dev                                        # http://localhost:5173 (proxy /api → backend)

# Mock gateway (terminal lain)
cd mock-gateway
pnpm start                                      # http://localhost:4000
```

## Test

Test e2e berjalan terhadap **PostgreSQL sungguhan** (database `ukt_test` dibuat otomatis; isinya
dihapus setiap run). Test e2e butuh Postgres di `localhost:5433`, misalnya dari
`docker compose up -d postgres`.

```bash
cd be
pnpm test          # unit: state machine status tagihan, verifikasi signature, auth (34 test)
pnpm test:e2e      # e2e: webhook + isolasi antar-institusi (40 test)
pnpm lint
```

Cakupan inti:

- **State machine** (`invoice-state-machine.spec.ts`): semua kombinasi status × event, termasuk urutan
  tertukar, nominal tidak cocok, dan pembayaran ganda.
- **Webhook** (`webhook.e2e-spec.ts`): signature valid/salah/milik institusi lain/body diubah,
  idempotensi, **8 request duplikat paralel → tepat 1 diproses**, success + expired bersamaan →
  tetap lunas, payload rusak tetap tercatat di audit log, job kedaluwarsa otomatis.
- **Isolasi data** (`tenant-isolation.e2e-spec.ts`): admin tidak bisa membaca/membuat tagihan, melihat
  mahasiswa, atau melihat log institusi lain (404); `institutionId` di body ditolak; nomor tagihan
  unik per institusi tetapi boleh sama di institusi lain; mahasiswa hanya melihat tagihannya sendiri;
  secret HMAC tidak pernah keluar di response.

## Struktur proyek

```
.
├── be/                         NestJS API
│   ├── src/
│   │   ├── auth/               login JWT (payload membawa institutionId), guard global
│   │   ├── institutions/       entity + lookup by code (khusus webhook)
│   │   ├── users/              entity user (admin keuangan / mahasiswa), repository ber-scope
│   │   ├── students/           endpoint daftar mahasiswa & tagihan per mahasiswa (admin)
│   │   ├── invoices/
│   │   │   ├── domain/         invoice-state-machine.ts (pure function + test)
│   │   │   ├── invoice-payment.service.ts   terapkan event: transaksi + row lock + idempotensi
│   │   │   ├── invoice-expiry.service.ts    job kedaluwarsa otomatis
│   │   │   └── invoices.repository.ts       semua query wajib institutionId
│   │   ├── webhooks/           endpoint webhook, verifikasi HMAC, audit log
│   │   ├── common/             database (migration), decorators (@InstitutionId), filters, dll.
│   │   └── cli/seed.ts         seed 3 institusi
│   └── test/                   e2e: webhook & isolasi institusi
├── fe/                         React + Vite + Tailwind
│   └── src/
│       ├── app/                provider, router, routes/ (halaman per role)
│       ├── components/         ui/ (komponen dasar), layouts/, guards/
│       ├── features/           auth, invoices, students, webhook-logs (api/ + components/)
│       ├── lib/                api-client (axios), query-client, format, storage
│       └── config/ types/
├── mock-gateway/               mock payment gateway (UI + CLI)
├── docs/WEBHOOK.md
├── scripts/setup-env.sh
└── docker-compose.yml
```

## Asumsi

- **Satu tagihan per mahasiswa per semester**, dibayar penuh (tidak ada cicilan/parsial). Pembayaran
  dengan nominal berbeda tidak melunasi tagihan dan ditandai untuk rekonsiliasi.
- **Kode semester** mengikuti format umum SIAKAD: `YYYYS`, dengan `S=1` ganjil dan `S=2` genap
  (mis. `20261` = 2026/2027 Ganjil).
- **Nominal** dalam rupiah bulat (`BIGINT`), tanpa desimal.
- **Akun dibuat oleh institusi** (di sini lewat seed). Tidak ada registrasi publik dan tidak ada
  manajemen user lewat UI, karena di luar cakupan.
- **Email unik global** karena dipakai untuk login; NIM unik per institusi.
- `institution_code` di payload webhook adalah kode institusi di platform ini (kode merchant di sisi
  gateway dipetakan 1:1).
- Gateway mengirim ulang (retry) notifikasi jika respons bukan 2xx. Karena itu 4xx hanya dipakai
  untuk kasus yang tidak akan berhasil walau di-retry.
- Batas waktu bayar di form diset ke pukul 23:59 pada tanggal yang dipilih, di zona waktu
  `APP_TIMEZONE` (default Asia/Jakarta / WIB).
- Halaman pembayaran untuk mahasiswa dan integrasi gateway sungguhan di luar cakupan (sesuai soal).
- Token JWT disimpan di `localStorage` demi kesederhanaan demo. Untuk produksi sebaiknya cookie
  `httpOnly` (lihat DECISIONS.md).
