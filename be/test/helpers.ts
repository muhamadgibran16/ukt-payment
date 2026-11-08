import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { Institution } from '../src/institutions/entities/institution.entity';
import { Invoice } from '../src/invoices/entities/invoice.entity';
import { InvoiceStatus } from '../src/invoices/enums/invoice-status.enum';
import { User } from '../src/users/entities/user.entity';
import { Role } from '../src/users/enums/role.enum';
import { computeSignature } from '../src/webhooks/domain/signature';

export const PASSWORD = 'Password123!';
export const WEBHOOK_URL = '/api/v1/webhooks/payment-gateway';

export interface TenantFixture {
  institution: Institution;
  secret: string;
  admin: User;
  student: User;
  otherStudent: User;
  /** Tagihan unpaid milik `student`, nomor sama persis di setiap institusi. */
  invoice: Invoice;
}

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await dataSource.dropDatabase();
  await dataSource.runMigrations();

  return { app, dataSource, http: request(app.getHttpServer()) };
}

const passwordHash = bcrypt.hashSync(PASSWORD, 4);

export async function createTenant(
  ds: DataSource,
  code: string,
  opts: { invoiceNumber?: string; amount?: number } = {},
): Promise<TenantFixture> {
  const secret = `secret-${code}-${Math.random().toString(36).slice(2)}`;
  const institution = await ds.getRepository(Institution).save({
    code,
    name: `Institusi ${code}`,
    webhookSecret: secret,
  });
  const users = ds.getRepository(User);
  const mk = (name: string, role: Role, nim: string | null) =>
    users.save(
      users.create({
        institutionId: institution.id,
        name,
        email: `${name.toLowerCase()}@${code.toLowerCase()}.test`,
        role,
        nim,
        password: passwordHash,
      }),
    );
  const admin = await mk('keuangan', Role.FINANCE_ADMIN, null);
  const student = await mk('andi', Role.STUDENT, '2023001');
  const otherStudent = await mk('budi', Role.STUDENT, '2023002');

  const invoice = await ds.getRepository(Invoice).save({
    institutionId: institution.id,
    studentId: student.id,
    invoiceNumber: opts.invoiceNumber ?? 'UKT-20261-0001',
    semester: '20261',
    amount: opts.amount ?? 4_500_000,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    status: InvoiceStatus.UNPAID,
  });
  return { institution, secret, admin, student, otherStudent, invoice };
}

export async function login(
  http: ReturnType<typeof request>,
  email: string,
): Promise<string> {
  const res = await http
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

let seq = 0;
export function webhookPayload(
  tenant: Pick<TenantFixture, 'institution' | 'invoice'>,
  overrides: Record<string, unknown> = {},
) {
  seq++;
  return {
    event_id: `evt_test_${Date.now()}_${seq}`,
    event_type: 'payment.success',
    institution_code: tenant.institution.code,
    invoice_number: tenant.invoice.invoiceNumber,
    transaction_id: `trx_${seq}`,
    amount: tenant.invoice.amount,
    payment_method: 'VA_BNI',
    occurred_at: new Date().toISOString(),
    ...overrides,
  };
}

/** Kirim webhook dengan body mentah persis seperti yang ditandatangani. */
export function sendWebhook(
  http: ReturnType<typeof request>,
  payload: unknown,
  secret: string | null,
) {
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const req = http.post(WEBHOOK_URL).set('Content-Type', 'application/json');
  if (secret !== null) req.set('X-Signature', computeSignature(secret, raw));
  return req.send(raw);
}
