---
name: tenant-scoped-endpoint
description: Checklist & pola untuk menambah endpoint/fitur backend yang membaca atau menulis data milik institusi (tenant) di proyek Tagihan UKT. Gunakan setiap kali menambah controller, repository, entity, atau query baru di be/.
---

# Menambah endpoint ber-scope institusi

Ikuti urutan ini. Jangan lewati langkah test isolasi.

## 1. Entity & migration
- Tambah kolom `institutionId` (`institution_id uuid NOT NULL`) + index.
- Relasi ke tabel tenant lain: **composite FK** lewat `@ForeignKey(() => Target, ['institutionId', 'xId'], ['institutionId', 'id'], { name: 'FK_..._same_institution' })`, dan pastikan target punya `@Unique([...'institutionId', 'id'])`.
- Relasi `@ManyToOne` untuk join: `createForeignKeyConstraints: false` (FK sudah dideklarasikan di atas).
- `pnpm migration:generate src/common/database/migrations/<Nama>`, review SQL-nya, lalu `pnpm typeorm migration:generate -d src/common/database/data-source.ts --dryrun x` → harus "No changes".

## 2. Repository
```ts
@Injectable()
export class FooRepository {
  private readonly repo: Repository<Foo>;          // private: tidak ada find() tanpa scope
  constructor(ds: DataSource) { this.repo = ds.getRepository(Foo); }

  findById(institutionId: string, id: string) {   // institutionId SELALU parameter pertama
    return this.repo.findOneBy({ institutionId, id });
  }
}
```

## 3. Controller
```ts
@Roles(Role.FINANCE_ADMIN)
@Get(':id')
findOne(@InstitutionId() institutionId: string, @Param('id', ParseUUIDPipe) id: string) {
  return this.service.findOne(institutionId, id);   // service melempar NotFoundException jika null
}
```
- `institutionId` hanya dari `@InstitutionId()`. DTO **tidak boleh** punya field `institutionId`.
- Data milik institusi lain → `NotFoundException` (404), bukan 403.

## 4. Test isolasi (wajib)
Tambahkan ke `be/test/tenant-isolation.e2e-spec.ts` (fixture `createTenant` dari `test/helpers.ts`):
- admin A tidak melihat data B di list,
- admin A mendapat 404 untuk id milik B,
- admin A tidak bisa membuat/mengubah data yang menunjuk entitas B,
- role yang salah mendapat 403.

Jalankan `pnpm test && pnpm test:e2e && pnpm lint`.
