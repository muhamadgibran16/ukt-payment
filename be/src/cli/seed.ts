/**
 * Seed data demo: 3 institusi, 1 admin keuangan + 3 mahasiswa per institusi,
 * dan tagihan dengan status berbeda. Idempoten (aman dijalankan ulang).
 *
 *   pnpm seed            # dev (ts-node)
 *   pnpm seed:prod       # dari dist (dipakai container)
 *
 * Password akun demo dari env SEED_DEMO_PASSWORD (wajib).
 * Secret HMAC per institusi dibaca dari env HMAC_SECRET_<KODE>. Jika tidak ada
 * dan institusi baru dibuat, secret acak digenerate lalu DICETAK ke stdout
 * (tidak pernah ditulis ke repositori).
 */
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import dataSource from '../common/database/data-source';
import { Institution } from '../institutions/entities/institution.entity';
import { defaultInvoiceNumber } from '../invoices/domain/invoice-number';
import { InvoiceTransaction } from '../invoices/entities/invoice-transaction.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceStatus } from '../invoices/enums/invoice-status.enum';
import { PaymentEventType } from '../invoices/enums/payment-event-type.enum';
import { TransactionOutcome } from '../invoices/enums/transaction-outcome.enum';
import { TransactionSource } from '../invoices/enums/transaction-source.enum';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';

function requireEnv(name: string, description: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Set env ${name} (${description}).`);
    process.exit(1);
  }
  return value;
}

const DEMO_PASSWORD = requireEnv(
  'SEED_DEMO_PASSWORD',
  'password untuk semua akun demo',
);
const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIOUS_SEMESTER = '20251';
const CURRENT_SEMESTER = '20252';

const { UNPAID, PAID, EXPIRED } = InvoiceStatus;

interface SeedStudent {
  nim: string;
  name: string;
  amount: number;
  /** Status tagihan semester berjalan; semester sebelumnya selalu lunas. */
  current: InvoiceStatus;
}

interface SeedInstitution {
  code: string;
  name: string;
  adminName: string;
  students: SeedStudent[];
}

const student = (
  nim: string,
  name: string,
  amount: number,
  current: InvoiceStatus,
): SeedStudent => ({ nim, name, amount, current });

// NIM 2023001 sengaja ada di UCN dan ITSB: nomor tagihan "UKT-20252-2023001"
// sama di dua institusi (diperbolehkan oleh aturan bisnis).
const INSTITUTIONS: SeedInstitution[] = [
  {
    code: 'UCN',
    name: 'Universitas Cendekia Nusantara',
    adminName: 'Rina Keuangan UCN',
    students: [
      student('2023001', 'Andi Pratama', 4_500_000, UNPAID),
      student('2023002', 'Bunga Lestari', 6_000_000, PAID),
      student('2024001', 'Citra Maharani', 2_500_000, EXPIRED),
    ],
  },
  {
    code: 'ITSB',
    name: 'Institut Teknologi Samudra Biru',
    adminName: 'Dedi Keuangan ITSB',
    students: [
      student('2023001', 'Eka Saputra', 7_500_000, UNPAID),
      student('2023002', 'Fajar Nugroho', 5_000_000, UNPAID),
      student('2024010', 'Gita Permata', 7_500_000, PAID),
    ],
  },
  {
    code: 'PHB',
    name: 'Politeknik Harapan Bangsa',
    adminName: 'Hana Keuangan PHB',
    students: [
      student('2223001', 'Indra Wijaya', 3_000_000, UNPAID),
      student('2223002', 'Joko Susilo', 3_000_000, EXPIRED),
      student('2324005', 'Kartika Sari', 3_500_000, UNPAID),
    ],
  },
];

const emailDomain = (code: string) => `${code.toLowerCase()}.test`;
const adminEmail = (code: string) => `keuangan@${emailDomain(code)}`;
const studentEmail = (code: string, name: string) =>
  `${name.split(' ')[0].toLowerCase()}@${emailDomain(code)}`;

/** Buat institusi jika belum ada; secret dari env selalu diutamakan. */
async function upsertInstitution(
  m: EntityManager,
  seed: SeedInstitution,
): Promise<{ institution: Institution; generatedSecret: string | null }> {
  const repo = m.getRepository(Institution);
  const envSecret = process.env[`HMAC_SECRET_${seed.code}`]?.trim() || null;
  const existing = await repo.findOneBy({ code: seed.code });

  if (existing) {
    if (envSecret) await repo.update(existing.id, { webhookSecret: envSecret });
    return { institution: existing, generatedSecret: null };
  }

  const secret = envSecret ?? randomBytes(32).toString('hex');
  const institution = await repo.save(
    repo.create({ code: seed.code, name: seed.name, webhookSecret: secret }),
  );
  return { institution, generatedSecret: envSecret ? null : secret };
}

async function upsertUser(
  m: EntityManager,
  data: DeepPartial<User> & { email: string },
  passwordHash: string,
): Promise<User> {
  const repo = m.getRepository(User);
  const existing = await repo.findOneBy({ email: data.email });
  return (
    existing ?? repo.save(repo.create({ ...data, password: passwordHash }))
  );
}

function historyFor(invoice: Invoice): DeepPartial<InvoiceTransaction> | null {
  const base = {
    institutionId: invoice.institutionId,
    invoiceId: invoice.id,
    statusBefore: UNPAID,
    statusAfter: invoice.status,
    outcome: TransactionOutcome.APPLIED,
  };
  switch (invoice.status) {
    case PAID:
      return {
        ...base,
        source: TransactionSource.GATEWAY,
        eventId: `seed-${randomUUID()}`,
        eventType: PaymentEventType.PAYMENT_SUCCESS,
        gatewayTransactionId: `trx_seed_${invoice.id.slice(0, 8)}`,
        amount: invoice.amount,
        paymentMethod: 'VA_BNI',
        occurredAt: invoice.paidAt ?? undefined,
        note: 'Data seed',
      };
    case EXPIRED:
      return {
        ...base,
        source: TransactionSource.SYSTEM,
        eventId: null,
        eventType: PaymentEventType.SYSTEM_EXPIRED,
        occurredAt: invoice.expiresAt,
        note: 'Data seed: kedaluwarsa otomatis',
      };
    case UNPAID:
      return null;
  }
}

async function seedInvoice(
  m: EntityManager,
  owner: User,
  semester: string,
  amount: number,
  status: InvoiceStatus,
): Promise<void> {
  const repo = m.getRepository(Invoice);
  const invoiceNumber = defaultInvoiceNumber(semester, owner.nim!);
  const institutionId = owner.institutionId;
  if (await repo.existsBy({ institutionId, invoiceNumber })) return;

  const now = Date.now();
  const paidAt = status === PAID ? new Date(now - 20 * DAY_MS) : null;
  const invoice = await repo.save(
    repo.create({
      institutionId,
      studentId: owner.id,
      invoiceNumber,
      semester,
      amount,
      status,
      expiresAt: new Date(now + (status === UNPAID ? 30 : -10) * DAY_MS),
      paidAt,
      paidAmount: paidAt ? amount : null,
    }),
  );

  const history = historyFor(invoice);
  if (history) await m.getRepository(InvoiceTransaction).save(history);
}

async function seedInstitution(
  m: EntityManager,
  seed: SeedInstitution,
  passwordHash: string,
): Promise<string | null> {
  const { institution, generatedSecret } = await upsertInstitution(m, seed);

  await upsertUser(
    m,
    {
      institutionId: institution.id,
      name: seed.adminName,
      email: adminEmail(seed.code),
      role: Role.FINANCE_ADMIN,
      nim: null,
    },
    passwordHash,
  );

  for (const s of seed.students) {
    const user = await upsertUser(
      m,
      {
        institutionId: institution.id,
        name: s.name,
        email: studentEmail(seed.code, s.name),
        role: Role.STUDENT,
        nim: s.nim,
      },
      passwordHash,
    );
    await seedInvoice(m, user, PREVIOUS_SEMESTER, s.amount, PAID);
    await seedInvoice(m, user, CURRENT_SEMESTER, s.amount, s.current);
  }
  return generatedSecret;
}

function printSummary(generatedSecrets: Map<string, string>): void {
  console.log('Seed selesai. Password semua akun demo:', DEMO_PASSWORD);
  for (const seed of INSTITUTIONS) {
    const students = seed.students.map((s) => studentEmail(seed.code, s.name));
    console.log(
      `  ${seed.code}: ${adminEmail(seed.code)} | ${students.join(', ')}`,
    );
  }
  if (generatedSecrets.size === 0) return;

  console.log(
    '\nSecret HMAC baru digenerate (simpan di .env sebagai HMAC_SECRET_<KODE>, JANGAN commit):',
  );
  for (const [code, secret] of generatedSecrets) {
    console.log(`  HMAC_SECRET_${code}=${secret}`);
  }
}

async function main(ds: DataSource): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const generatedSecrets = new Map<string, string>();

  await ds.transaction(async (m) => {
    for (const seed of INSTITUTIONS) {
      const secret = await seedInstitution(m, seed, passwordHash);
      if (secret) generatedSecrets.set(seed.code, secret);
    }
  });

  printSummary(generatedSecrets);
}

dataSource
  .initialize()
  .then(async (ds) => {
    try {
      await main(ds);
    } finally {
      await ds.destroy();
    }
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
