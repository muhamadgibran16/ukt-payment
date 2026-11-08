# Keputusan Teknis

Lima keputusan yang paling menentukan benar-tidaknya status pembayaran. Sebagian besar berangkat
dari satu kenyataan: **perilaku payment gateway di dunia nyata tidak ideal**. Notifikasi bisa
dikirim lebih dari sekali, datang bersamaan, tiba dengan urutan tertukar, membawa nominal yang tidak
cocok, atau tidak datang sama sekali.

---

## 1. Idempotensi & konkurensi webhook: row lock + kunci idempotensi di database

**Konteks:**
Gateway me-retry notifikasi jika tidak mendapat 2xx (timeout, deploy, jaringan), sehingga event
yang sama bisa tiba dua kali atau lebih, bahkan **bersamaan** di dua instance backend. Tanpa
perlindungan, dua request bisa sama-sama membaca `unpaid`, lalu sama-sama mencatat pembayaran.

**Opsi:**
1. Cek `event_id` di aplikasi lalu insert (check-then-act). Rentan race condition.
2. Lock terdistribusi (Redis). Menambah komponen infrastruktur hanya untuk satu kebutuhan.
3. Optimistic locking (kolom `version`, retry saat konflik). Logika retry jadi rumit di handler webhook.
4. **Transaksi Postgres + `SELECT ... FOR UPDATE` pada baris tagihan + unique index `(institution_id, event_id)`.**

**Keputusan:**
Opsi 4. Di dalam satu transaksi: kunci baris tagihan, cek apakah `event_id` sudah tercatat, ambil
keputusan dari status **terkini**, tulis riwayat, lalu update tagihan. Unique index (partial,
`WHERE event_id IS NOT NULL`) menjadi pengaman terakhir; pelanggarannya diterjemahkan menjadi respons
`duplicate`, bukan error 500. Dengan TypeORM: `findOne({ lock: { mode: 'pessimistic_write' } })`,
dan `update()` eksplisit, bukan `save()`, agar tidak ada dirty-check/cascade tersembunyi.

**Konsekuensi:**
- (+) Benar tanpa komponen tambahan. Event untuk tagihan yang sama diproses bergantian, sedangkan
  tagihan berbeda tetap paralel. Terbukti oleh test 8 request identik paralel → tepat 1 diproses.
- (+) Event duplikat menjawab `200 duplicate`, sehingga gateway berhenti me-retry.
- (−) Lock dipegang selama transaksi. Transaksinya pendek (beberapa query), jadi kontensi hanya
  terjadi untuk tagihan yang sama, dan itu memang yang diinginkan.
- (−) `event_id` dianggap unik per institusi. Jika gateway memakai ulang `event_id`, event kedua
  akan dianggap duplikat.

---

## 2. Aturan status: "uang masuk adalah fakta", lunas tidak pernah mundur

**Konteks:**
Soal meminta status "mencerminkan kondisi pembayaran yang sebenarnya", sementara event bisa
datang dengan urutan tertukar. Contohnya: `payment.success` terjadi 10:00, tetapi `payment.expired`
(10:05) tiba lebih dulu. Ada juga kasus nominal tidak cocok dan pembayaran ganda.

**Opsi:**
1. Terapkan event apa adanya sesuai urutan tiba. Status bisa salah (lunas → kedaluwarsa).
2. Urutkan berdasarkan `occurred_at` dan proses ulang seluruh riwayat. Mahal dan rumit; jam gateway
   juga belum tentu konsisten.
3. **State machine eksplisit dengan aturan dominasi:** lunas adalah status terminal, dan
   `payment.success` dengan nominal cocok selalu menang.

**Keputusan:**
Opsi 3, dalam bentuk **pure function** `decideTransition(invoice, event)`:
- `payment.success` + nominal cocok → `paid`, **termasuk dari `expired`** (`applied_late`), karena
  dana sudah benar-benar diterima gateway. Membiarkannya "kedaluwarsa" berarti mahasiswa yang sudah
  membayar tidak bisa mengisi KRS.
- `payment.expired` setelah `paid` → diabaikan.
- Nominal tidak cocok → **status tidak berubah**, tercatat `amount_mismatch` untuk rekonsiliasi.
  UKT dibayar penuh; menganggap kurang bayar sebagai lunas sama-sama salah dengan menolaknya diam-diam.
- Pembayaran sukses kedua pada tagihan lunas → `double_payment` (kandidat refund); `paid_at` pertama
  tidak ditimpa.
- **Setiap** event dicatat di `invoice_transactions` beserta `status_before`, `status_after`,
  `outcome`, dan catatan, termasuk event yang tidak mengubah status.

**Konsekuensi:**
- (+) Hasil akhir tidak bergantung pada urutan tiba event (diuji untuk kedua urutan).
- (+) Seluruh matriks status × event dites unit tanpa database; mudah direview dan dijelaskan.
- (+) Admin melihat *kenapa* status (tidak) berubah, bukan hanya hasilnya.
- (−) Tidak mendukung cicilan/pembayaran parsial. Itu butuh model "saldo terbayar", di luar cakupan.
- (−) Kasus `amount_mismatch` dan `double_payment` butuh tindak lanjut manual. Saat ini hanya
  ditandai di riwayat dan log `warn`; belum ada antrian rekonsiliasi.

---

## 3. Isolasi multi-institusi: scoping wajib di repository + composite foreign key

**Konteks:**
Banyak kampus dalam satu database. Kebocoran data antar-institusi adalah kegagalan paling serius
di sistem ini. Sumber kebocoran yang paling umum adalah satu query yang lupa
`WHERE institution_id = ...`.

**Opsi:**
1. Database/schema per institusi. Isolasi kuat, tetapi migration, seed, dan operasionalnya berlipat;
   berlebihan untuk skala ini.
2. Postgres Row-Level Security (`SET app.institution_id` per transaksi). Kuat, tetapi koneksi app
   tidak boleh owner/superuser, dan webhook (institusi belum diketahui) serta job sistem butuh jalur
   bypass. Lebih rumit di-debug.
3. **Kolom `institution_id` + disiplin di lapisan aplikasi yang dibuat sulit dilanggar, + jaminan
   relasional di database.**

**Keputusan:**
Opsi 3, dengan beberapa lapis:
- `institution_id` **hanya** berasal dari JWT terverifikasi lewat decorator `@InstitutionId()`, tidak
  pernah dari body/query/params. `ValidationPipe` dengan `forbidNonWhitelisted` menolak request yang
  menyelundupkan `institutionId` (diuji).
- Repository tenant **tidak** meng-`extends Repository<T>`; repository TypeORM disimpan `private`, dan
  setiap method publik mewajibkan `institutionId` sebagai parameter pertama. Method tanpa scope
  (`find()`, dll.) tidak bisa dipanggil dari service/controller.
- **Composite FK** `invoices(institution_id, student_id) → users(institution_id, id)` dan
  `invoice_transactions(institution_id, invoice_id) → invoices(institution_id, id)`. Database sendiri
  menolak tagihan yang menunjuk mahasiswa institusi lain, walaupun ada bug di aplikasi.
- Data institusi lain dijawab **404, bukan 403**, agar keberadaannya tidak bocor.
- Pengecualian lintas institusi yang disengaja hanya dua dan didokumentasikan di CLAUDE.md: lookup
  institusi berdasarkan kode di webhook, dan job kedaluwarsa otomatis.

**Konsekuensi:**
- (+) Sederhana, satu skema, mudah di-test (suite `tenant-isolation.e2e-spec.ts`).
- (+) Pelanggaran paling berbahaya (relasi silang) ditolak di level database.
- (−) Isolasi baca tetap bergantung pada disiplin kode. RLS adalah langkah berikutnya yang wajar
  sebagai defense-in-depth jika jumlah developer/endpoint bertambah.

---

## 4. Audit & kebijakan respons webhook: catat dulu, verifikasi kemudian

**Konteks:**
Soal mewajibkan seluruh notifikasi dicatat untuk audit, termasuk yang ditolak. Kode respons juga
menentukan perilaku retry gateway, sehingga respons yang salah bisa menimbulkan retry tanpa akhir
atau notifikasi yang hilang.

**Opsi:**
1. Validasi lewat DTO/`ValidationPipe` Nest lalu log hasilnya. Request dengan JSON rusak ditolak
   body-parser **sebelum** sampai ke handler, sehingga tidak pernah tercatat.
2. Simpan hanya notifikasi yang valid.
3. **Terima body mentah, simpan ke `webhook_logs` sebelum validasi apa pun, lalu update hasilnya.**

**Keputusan:**
Opsi 3. Route webhook memakai `express.raw()` (dipasang sebelum JSON parser) sehingga:
(a) HMAC dihitung dari **byte persis** yang dikirim, dan (b) body tidak valid tetap sampai ke handler
dan tercatat. Kebijakan respons:

| Kasus | Respons | Alasan |
| --- | --- | --- |
| Diproses / duplikat | 200 | Gateway berhenti retry |
| Nomor tagihan tidak ada (signature valid) | **200 `ignored`** + log `warn` | Retry tidak akan membantu; perlu rekonsiliasi manual, bukan banjir retry |
| Signature salah **atau** institusi tidak dikenal | 401 dengan pesan **sama** | Kode institusi tidak bisa di-enumerate |
| Payload tidak valid | 400 | Bug di sisi pengirim |
| Error tak terduga | 500 | Transaksi di-rollback; retry aman |

**Konsekuensi:**
- (+) Audit lengkap: siapa mengirim apa, signature valid atau tidak, hasilnya apa. Baris yang
  tertinggal berstatus `received` berarti proses mati di tengah jalan. Cocok untuk analisis insiden.
- (+) Admin keuangan bisa melihat log institusinya di UI (log tanpa institusi valid hanya ada di DB).
- (−) Endpoint publik menulis ke DB sebelum autentikasi, jadi bisa disalahgunakan untuk mengisi
  tabel. Mitigasi lanjutan: rate limit per IP di reverse proxy dan retensi/partisi `webhook_logs`.
- (−) Tidak ada perlindungan replay berbasis timestamp. Replay event lama tertahan oleh idempotensi
  `event_id`, tetapi event yang belum pernah dikirim tidak bisa dibedakan dari replay. Jika gateway
  mendukung, tambahkan header timestamp yang ikut ditandatangani.

---

## 5. Kedaluwarsa: event gateway + job sistem sebagai jaring pengaman

**Konteks:**
Status `kedaluwarsa` menentukan apakah mahasiswa masih bisa membayar dan mengisi KRS. Gateway
seharusnya mengirim `payment.expired`, tetapi notifikasi bisa hilang. Di sisi lain, menandai
kedaluwarsa terlalu cepat berbahaya jika pembayaran sebenarnya masuk tepat sebelum batas.

**Opsi:**
1. Hanya mengandalkan `payment.expired` dari gateway. Tagihan bisa "belum bayar" selamanya.
2. Menghitung status saat dibaca (`expires_at < now()` dianggap kedaluwarsa). Status di DB dan di
   layar berbeda, dan filter/laporan jadi rumit.
3. **Keduanya sebagai event:** terima `payment.expired`, plus job berkala yang mengirim
   `system.expired` untuk tagihan `unpaid` yang lewat `expires_at`, melalui jalur yang sama.

**Keputusan:**
Opsi 3. Job (`InvoiceExpiryService`, default tiap 60 detik, bisa dimatikan) memanggil
`applyEvent()` yang sama dengan webhook, sehingga lock dan state machine berlaku sama. Jika
pembayaran masuk bersamaan dengan job, hasil akhirnya tetap konsisten, dan pembayaran yang tiba
setelah kedaluwarsa tetap melunasi (keputusan #2). Setiap kedaluwarsa otomatis tercatat di riwayat
dengan `source = system`.

**Konsekuensi:**
- (+) Status di database selalu sesuai kenyataan untuk filter, ringkasan, dan laporan.
- (+) Tidak ada jalur update status kedua yang bisa berbeda perilaku.
- (−) Ada jeda hingga satu interval sebelum status berubah.
- (−) `setInterval` di setiap instance: jika backend di-scale horizontal, beberapa instance
  menjalankan job yang sama. Tetap **benar** (lock + state machine membuat event kedua `ignored`),
  tetapi boros dan menambah baris riwayat `ignored`. Untuk produksi: scheduler tunggal atau
  `pg_try_advisory_lock` / `FOR UPDATE SKIP LOCKED`.

---

### Catatan keputusan lain (ringkas)

- **TypeORM, bukan Drizzle/Prisma.** Saya lebih fasih memakainya dan integrasinya dengan NestJS
  resmi. Jebakannya dihindari secara sadar: `synchronize: false` (migration ditulis manual, lalu dicek
  dengan `migration:generate` agar tidak ada drift), tanpa cascade/eager, `update()` eksplisit, dan
  pessimistic lock untuk alur kritis.
- **Nominal `BIGINT` rupiah**, bukan float/decimal JS. Tidak ada pecahan rupiah di UKT.
- **Tanpa soft delete** untuk data keuangan: tagihan, riwayat, dan audit tidak boleh "menghilang".
- **JWT di `localStorage`**: sederhana untuk demo, tetapi rentan XSS. Untuk produksi, gunakan cookie
  `httpOnly` + `SameSite` dan refresh token.
- **Secret HMAC disimpan plaintext di DB** karena harus bisa dibaca untuk verifikasi (tidak bisa
  di-hash). Kolomnya `select: false` dan tidak pernah diserialisasi. Untuk produksi: enkripsi at-rest
  (KMS/envelope encryption) dan mekanisme rotasi (dua secret aktif sementara).
