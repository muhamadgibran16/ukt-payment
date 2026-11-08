# AI Notes: Refleksi Pairing dengan AI

Asisten yang dipakai: **Claude Code** (CLI), dengan `CLAUDE.md` sebagai konteks proyek dan skill
kustom `.claude/skills/tenant-scoped-endpoint`.

## Bagian yang dikerjakan bersama AI

Peran saya sebagai driver: menentukan stack, ORM, batas cakupan, dan arah UI, lalu mereview dan
menguji hasilnya. AI sebagai navigator/eksekutor: mengusulkan opsi, menulis kode, dan menjalankan
test.

- **Diskusi stack sebelum menulis kode.** Membandingkan Node.js vs Go, Node vs Bun, serta
  TypeORM / Prisma / Drizzle / Sequelize untuk kebutuhan spesifik soal ini (row lock, idempotensi,
  isolasi tenant).
- **Adaptasi boilerplate NestJS** milik saya: mengganti modul users/registrasi publik menjadi model
  multi-institusi (institutions, users ber-`institution_id`, role `finance_admin`/`student`), JWT
  yang membawa `institutionId`, dan decorator `@InstitutionId()`.
- **Skema & migration**: composite FK antar tabel tenant, unique/check constraint, partial index;
  diverifikasi dengan `migration:generate --dryrun` sampai tidak ada drift.
- **Alur webhook**: raw body + HMAC timing-safe, audit log sebelum validasi, transaksi dengan
  `SELECT ... FOR UPDATE`, idempotensi `event_id`, dan state machine sebagai pure function.
- **Kebijakan untuk kasus ambigu** (pembayaran setelah kedaluwarsa tetap lunas, nominal tidak cocok
  tidak melunasi, nomor tagihan tidak dikenal dijawab `200 ignored`, institusi tidak dikenal dijawab
  `401` dengan pesan yang sama seperti signature salah) diusulkan AI. Saya mereview alasannya di
  `DECISIONS.md` dan menerimanya karena konsisten dengan aturan "status harus mencerminkan kondisi
  pembayaran yang sebenarnya".
- **Test**: unit test state machine & signature; e2e test webhook (termasuk 8 request duplikat
  paralel) dan isolasi antar-institusi terhadap Postgres sungguhan.
- **Frontend** React + Tailwind dengan struktur feature-based, **mock gateway** dengan skenario
  dunia nyata, Docker Compose, dan draf dokumentasi.
- **Iterasi UI dan kualitas kode** berdasarkan review saya: refactor clean code, komponen dropdown,
  date picker, dan pagination custom, sidebar + menu profil, form tagihan sebagai modal, serta
  pembersihan komentar dan nilai konfigurasi yang ter-hardcode.

**Cara saya memverifikasi output AI:**

- **Menjalankan aplikasi dan mencobanya sendiri di browser**, bukan hanya membaca kode. Saya membuat
  tagihan lewat form dan mengirim webhook dari mock gateway, termasuk dengan nomor tagihan asal-asalan,
  untuk melihat apakah sistem menolaknya dengan benar dan tetap mencatatnya di audit log. Hasilnya
  tercatat sebagai "Diabaikan" tanpa mengubah tagihan apa pun.
- **Mengecek ulang terhadap soal.** Saat ragu apakah mahasiswa perlu bisa membayar lewat FE, saya
  menanyakannya dan kami merujuk ke bagian "Di luar cakupan" di soal: halaman pembayaran mahasiswa
  memang tidak diminta, sehingga simulasi pembayaran tetap lewat mock gateway sebagai pihak ketiga.
- **Mempertanyakan hal yang terlihat janggal.** Contohnya, saya menanyakan kenapa compose berisi teks
  seperti "Set POSTGRES_DB di .env". Setelah dijelaskan bahwa itu pesan error sintaks `${VAR:?}`,
  pesan kustomnya dibuang agar compose lebih bersih.
- **Meminta audit eksplisit** untuk hal yang mudah terlewat: komentar yang tidak perlu, dan nilai
  konfigurasi yang ter-hardcode di compose, Dockerfile, nginx, dan kode.
- **Memastikan test tetap hijau** (unit + e2e) setiap kali AI melakukan refactor besar.

**Bagian yang saya ubah setelah review** (semuanya dikerjakan ulang oleh AI atas arahan saya):

- **Tampilan:**
  - Dropdown dan input angka di mock gateway tidak lagi memakai tampilan bawaan browser.
  - Keterangan header mock gateway yang tidak perlu dihapus.
  - Menu dibuat jadi sidebar, dan profil diberi avatar + dropdown logout.
  - Topbar hanya berisi profil, dengan nama dan email rata kanan.
  - Padding konten yang terlalu lebar dirapikan.
  - Teks penjelasan yang tidak perlu dihapus.
- **Interaksi:**
  - Form buat tagihan dijadikan modal dengan latar belakang blur.
  - Pagination default 5 baris dengan pilihan sampai 100, diletakkan bersebelahan dengan nomor
    halaman.
- **Kode:**
  - Refactor clean code.
  - Komentar yang tidak perlu dihapus.
  - Semua konfigurasi lingkungan dipindah ke `.env`, dan setiap service punya `.env` sendiri yang
    disinkronkan dari `.env` root.

## Satu contoh saran AI yang saya tolak/koreksi, dan alasannya

**AI merekomendasikan Drizzle; saya memilih TypeORM.**

Saat diskusi ORM, AI merekomendasikan Drizzle karena query-nya paling eksplisit (`.for('update')`,
`onConflictDoNothing()`), type-safety-nya kuat, dan "magic"-nya lebih sedikit dibanding TypeORM.
Argumen itu masuk akal, tetapi saya tetap memilih TypeORM karena:

1. Saya lebih fasih memakai TypeORM, dan boilerplate saya sudah memakainya. Tahap 2 tes ini adalah
   live coding dan code review; kefasihan lebih berharga daripada ORM yang "paling ideal" tetapi
   kurang saya kuasai.
2. Integrasi NestJS resmi (`@nestjs/typeorm`), dan semua kebutuhan kritis tetap terpenuhi
   (pessimistic lock, unique komposit, transaksi).

Kelemahan yang ditunjukkan AI tidak saya abaikan; saya jadikan aturan: `synchronize: false` +
migration manual, tanpa cascade/eager, `update()` eksplisit alih-alih `save()` di alur pembayaran,
lock lewat `findOne({ lock })` (bukan QueryBuilder string) agar `where` tetap type-checked, dan
repository tenant tidak meng-`extends Repository<T>`. Aturan ini juga dituliskan di `CLAUDE.md`
agar AI mematuhinya di sesi berikutnya.

**Koreksi lain yang muncul selama pengerjaan:**

- **Nilai konfigurasi ter-hardcode.** Versi pertama dari AI masih menanam nama database, user,
  zona waktu, port internal, alamat backend di nginx, offset `+07:00`, dan password demo langsung di
  compose, Dockerfile, dan kode. Setelah saya minta audit, semuanya dipindah ke `.env`, dan
  konfigurasinya dibuktikan bisa diubah dengan menjalankan stack memakai port internal yang berbeda.
- **Bug yang ditemukan saat pengujian.** JSON parser bawaan Nest semula membuat webhook dengan JSON
  rusak tidak tercatat di audit log, sehingga diganti `express.raw()` khusus route webhook. Batas
  tanggal minimum di form juga semula mengizinkan "hari ini", padahal validasinya mewajibkan tanggal
  setelah hari ini.

## Bagian yang saya kerjakan tanpa AI, dan alasannya

- **Boilerplate NestJS awal** (auth JWT, role guard, validasi env, response envelope, health check,
  Docker) sudah saya buat sebelum tes ini dan menjadi fondasi backend. Alasannya: saya ingin backend
  dibangun di atas struktur yang saya pahami dan biasa saya pakai, sehingga saya bisa menjelaskan dan
  mengubahnya dengan percaya diri saat live coding.
- **Pengujian manual di browser.** Mencoba alur admin, mahasiswa, dan mock gateway secara langsung,
  lalu memberi umpan balik dari apa yang saya lihat (misalnya padding yang terlalu lebar dan teks
  yang tidak perlu). Alasannya: test otomatis tidak menilai apakah tampilan dan alur sudah nyaman
  dipakai.
- **Keputusan cakupan dan arah UX.** Menentukan bahwa pembayaran mahasiswa tetap lewat mock gateway
  (sesuai batas cakupan soal), form tagihan sebagai modal, menu sebagai sidebar, dan default
  pagination 5 baris. Alasannya: ini keputusan produk yang harus saya pertanggungjawabkan sendiri.

## Kalau mengulang dari awal, apa yang akan saya ubah

- **Menulis `CLAUDE.md` sebelum baris kode pertama**, termasuk aturan "jangan hardcode konfigurasi",
  agar setiap kode yang di-generate sudah terikat aturan sejak awal. Di proyek ini audit hardcode baru
  dilakukan di akhir, sehingga perlu satu putaran perbaikan tambahan.
- **Menyepakati kebutuhan UI di awal** (layout sidebar, komponen dropdown/date picker custom, form
  sebagai modal, ukuran pagination). Banyak putaran perbaikan UI sebenarnya bisa dihindari jika
  arahannya ditulis sejak awal.
- **Commit lebih granular per langkah** (skema → state machine + test → webhook → isolasi → FE →
  mock gateway → dokumentasi), sehingga setiap output AI direview dalam potongan kecil.
- **Menambah Postgres Row-Level Security** sebagai lapisan isolasi kedua, dan antrian rekonsiliasi
  untuk kasus `amount_mismatch` / `double_payment`.
