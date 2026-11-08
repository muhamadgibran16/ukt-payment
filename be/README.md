<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# NestJS Boilerplate

REST API starter: **NestJS 11 · PostgreSQL + Drizzle ORM · JWT · Role-based access · Swagger · Docker**

## Mulai

Butuh Node.js ≥ 20.19, Docker, dan pnpm (aktifkan sekali dengan `corepack enable`).

```bash
pnpm install
cp .env.example .env            # isi JWT_SECRET (min. 32 karakter)
docker compose up -d postgres
pnpm db:migrate                 # terapkan migration
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=ganti-password pnpm seed:admin
pnpm start:dev
```

API berjalan di `http://localhost:3000/api/v1`, Swagger di `http://localhost:3000/docs`.

## Auth

| Endpoint                          | Akses      |
| --------------------------------- | ---------- |
| `POST /auth/register`, `/login`   | publik     |
| `GET /auth/me`                    | user login |
| `GET/POST/PATCH/DELETE /users`    | admin      |
| `GET /health`                     | publik     |

Kirim token lewat header `Authorization: Bearer <token>`. Semua route wajib login secara default. Atur aksesnya dengan decorator:

```ts
@Public()             // tanpa login
@Roles(Role.ADMIN)    // khusus admin
@CurrentUser() user   // payload JWT { sub, email, role }
```

## Format response

```jsonc
// Sukses ("meta" hanya muncul jika service mengembalikan new Paginated(...))
{ "success": true, "statusCode": 200, "message": "OK", "data": {}, "meta": {} }

// Error
{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": [], "path": "...", "timestamp": "..." }
```

Isi `message` bisa diatur dengan `@ResponseMessage('...')`.

## Database

Tabel didefinisikan per modul di file `*.schema.ts`, misalnya `src/users/users.schema.ts`. Konfigurasi drizzle-kit ada di `drizzle.config.ts`, dan file migration SQL tersimpan di folder `drizzle/`.

```bash
pnpm db:generate --name tambah_tabel_x   # buat migration SQL dari perubahan *.schema.ts
pnpm db:migrate                          # terapkan migration yang belum jalan
pnpm db:check                            # cek konsistensi file migration
pnpm db:studio                           # GUI untuk melihat isi database
```

Tabel baru cukup memakai `...baseColumns` dari `src/database/columns.ts` (sudah termasuk UUID, timestamp, dan soft delete), lalu daftarkan di `src/database/schema.ts`. Soft delete dilakukan manual: repository selalu memfilter `isNull(deletedAt)`.

Koneksi database memakai modul resmi [`@nestjs/drizzle`](https://docs.nestjs.com/data/drizzle). Akses database di repository:

```ts
constructor(@InjectDrizzle() private readonly db: Database) {}
```

## Struktur

```
src/
├── auth/              # register/login, JwtAuthGuard & RolesGuard (global)
├── users/             # schema, repository, service, controller (admin)
├── database/          # DatabaseModule (@nestjs/drizzle), tipe Database, baseColumns, migrator, health check
├── health/            # endpoint health check (terminus)
├── config/            # validasi & struktur environment variable
├── common/
│   ├── decorators/    # @Public, @Roles, @CurrentUser, @ResponseMessage
│   ├── dto/           # PaginationQueryDto
│   ├── filters/       # AllExceptionsFilter
│   ├── interceptors/  # TransformInterceptor
│   ├── middleware/    # RequestLoggerMiddleware
│   ├── pagination/    # Paginated<T>
│   └── transformers/  # trim, normalizeEmail
├── cli/               # create-admin (seed)
├── bootstrap.ts       # setup global (dipakai main.ts & test e2e)
└── main.ts

drizzle/               # file migration SQL (hasil db:generate)
drizzle.config.ts      # konfigurasi drizzle-kit
```

**Menambah modul baru** (misalnya `products`): ikuti pola `users/`, yaitu module, controller, service, repository, `products.schema.ts`, dan dto. Daftarkan schema-nya di `src/database/schema.ts` dan module-nya di `app.module.ts`, lalu jalankan `pnpm db:generate --name add_products`.

## Test

```bash
pnpm test        # unit test
pnpm test:e2e    # butuh database app_test, isinya akan DIHAPUS
```

## Docker

Satu image (±318 MB) dipakai untuk aplikasi sekaligus migration:

```bash
docker compose --profile app up -d --build   # postgres → migrate → app
```

Deploy manual: jalankan migration dulu, baru aplikasi.

```bash
docker build -t app .
docker run --rm -e DATABASE_URL=... app node dist/database/migrate.js
docker run -d --env-file .env -p 3000:3000 app
```

## Catatan

- Environment variable divalidasi saat startup. Daftarnya ada di `.env.example`. Kalau menambah variabel, update juga `src/config/`.
- Selalu commit `pnpm-lock.yaml`. Lint dan format berjalan otomatis saat commit (husky).

## Author

**Muhamad Gibran** — [@muhamadgibran16](https://github.com/muhamadgibran16)

Issues and pull requests are welcome at
[github.com/muhamadgibran16/nestjs-boilerplate](https://github.com/muhamadgibran16/nestjs-boilerplate).