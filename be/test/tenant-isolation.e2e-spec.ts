import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTenant,
  createTestApp,
  login,
  sendWebhook,
  TenantFixture,
  webhookPayload,
} from './helpers';

/**
 * Aturan bisnis: pengguna hanya boleh mengakses data institusinya sendiri.
 * Akses ke data institusi lain menghasilkan 404 (bukan 403) agar keberadaan
 * data tidak bocor.
 */
describe('Multi-institution data isolation (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let http: ReturnType<typeof request>;
  let a: TenantFixture;
  let b: TenantFixture;
  let adminA: string;
  let adminB: string;
  let studentA: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const future = () =>
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  beforeAll(async () => {
    ({ app, dataSource: ds, http } = await createTestApp());
    a = await createTenant(ds, 'UCN');
    b = await createTenant(ds, 'ITSB');
    adminA = await login(http, a.admin.email);
    adminB = await login(http, b.admin.email);
    studentA = await login(http, a.student.email);
    // Satu webhook di B agar B punya audit log & riwayat.
    await sendWebhook(http, webhookPayload(b), b.secret).expect(200);
  });

  afterAll(() => app.close());

  describe('admin keuangan', () => {
    it('lists only invoices of their own institution', async () => {
      const res = await http
        .get('/api/v1/invoices')
        .set(auth(adminA))
        .expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((i: any) => i.institutionId === a.institution.id),
      ).toBe(true);
      expect(res.body.data.map((i: any) => i.id)).not.toContain(b.invoice.id);
    });

    it('filters by status within their institution', async () => {
      const paidA = await http
        .get('/api/v1/invoices?status=paid')
        .set(auth(adminA))
        .expect(200);
      expect(paidA.body.data).toHaveLength(0); // yang lunas milik B
      const paidB = await http
        .get('/api/v1/invoices?status=paid')
        .set(auth(adminB))
        .expect(200);
      expect(paidB.body.data.map((i: any) => i.id)).toEqual([b.invoice.id]);
    });

    it('cannot read an invoice of another institution (404)', async () => {
      await http
        .get(`/api/v1/invoices/${b.invoice.id}`)
        .set(auth(adminA))
        .expect(404);
      await http
        .get(`/api/v1/invoices/${a.invoice.id}`)
        .set(auth(adminA))
        .expect(200);
    });

    it("cannot view another institution's student invoices (404)", () =>
      http
        .get(`/api/v1/students/${b.student.id}/invoices`)
        .set(auth(adminA))
        .expect(404));

    it('student list contains only own institution students', async () => {
      const res = await http
        .get('/api/v1/students')
        .set(auth(adminA))
        .expect(200);
      const ids = res.body.data.map((s: any) => s.id);
      expect(ids).toEqual(
        expect.arrayContaining([a.student.id, a.otherStudent.id]),
      );
      expect(ids).not.toContain(b.student.id);
    });

    it('cannot create an invoice for a student of another institution (404)', async () => {
      await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send({
          studentId: b.otherStudent.id,
          semester: '20262',
          amount: 1_000_000,
          expiresAt: future(),
        })
        .expect(404);
    });

    it('cannot smuggle an institutionId through the request body (400)', async () => {
      const res = await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send({
          institutionId: b.institution.id,
          studentId: a.otherStudent.id,
          semester: '20262',
          amount: 1_000_000,
          expiresAt: future(),
        })
        .expect(400);
      expect(res.body.errors).toContain(
        'property institutionId should not exist',
      );
    });

    it('sees only webhook logs of their own institution', async () => {
      const resA = await http
        .get('/api/v1/webhook-logs')
        .set(auth(adminA))
        .expect(200);
      expect(resA.body.data).toHaveLength(0);
      const resB = await http
        .get('/api/v1/webhook-logs')
        .set(auth(adminB))
        .expect(200);
      expect(resB.body.data.length).toBeGreaterThan(0);
      expect(resB.body.data[0]).not.toHaveProperty('webhookSecret');
    });

    it('summary only counts own institution', async () => {
      const res = await http
        .get('/api/v1/invoices/summary')
        .set(auth(adminA))
        .expect(200);
      expect(res.body.data.paid.count).toBe(0);
      expect(res.body.data.unpaid.count).toBe(1);
    });
  });

  describe('invoice number uniqueness', () => {
    const body = (
      studentId: string,
      invoiceNumber: string,
      semester = '20262',
    ) => ({
      studentId,
      semester,
      invoiceNumber,
      amount: 3_000_000,
      expiresAt: future(),
    });

    it('creates an invoice, normalizing the invoice number', async () => {
      const res = await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send(body(a.otherStudent.id, ' ukt-20262-x1 '))
        .expect(201);
      expect(res.body.data).toMatchObject({
        invoiceNumber: 'UKT-20262-X1',
        status: 'unpaid',
        institutionId: a.institution.id,
      });
    });

    it('rejects a duplicate invoice number within the same institution (409)', async () => {
      const res = await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send(body(a.student.id, 'UKT-20262-X1'))
        .expect(409);
      expect(res.body.message).toMatch(/Nomor tagihan/);
    });

    it('allows the same invoice number in a different institution', () =>
      http
        .post('/api/v1/invoices')
        .set(auth(adminB))
        .send(body(b.otherStudent.id, 'UKT-20262-X1'))
        .expect(201));

    it('rejects a second invoice for the same student and semester (409)', async () => {
      const res = await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send(body(a.otherStudent.id, 'UKT-20262-X2'))
        .expect(409);
      expect(res.body.message).toMatch(/semester/);
    });

    it('generates an invoice number when omitted', async () => {
      const res = await http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send({
          studentId: a.student.id,
          semester: '20271',
          amount: 1,
          expiresAt: future(),
        })
        .expect(201);
      expect(res.body.data.invoiceNumber).toBe('UKT-20271-2023001');
    });

    it('rejects an expiry date in the past (400)', () =>
      http
        .post('/api/v1/invoices')
        .set(auth(adminA))
        .send({
          studentId: a.student.id,
          semester: '20272',
          amount: 1,
          expiresAt: '2020-01-01T00:00:00Z',
        })
        .expect(400));
  });

  describe('mahasiswa', () => {
    it('sees only their own invoices with transaction history', async () => {
      const res = await http
        .get('/api/v1/me/invoices')
        .set(auth(studentA))
        .expect(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.every((i: any) => i.studentId === a.student.id),
      ).toBe(true);
      expect(res.body.data[0]).toHaveProperty('transactions');
    });

    it('cannot access finance admin endpoints (403)', async () => {
      await http.get('/api/v1/invoices').set(auth(studentA)).expect(403);
      await http
        .get(`/api/v1/invoices/${a.invoice.id}`)
        .set(auth(studentA))
        .expect(403);
      await http.get('/api/v1/students').set(auth(studentA)).expect(403);
    });

    it('a finance admin cannot use the student portal endpoint (403)', () =>
      http.get('/api/v1/me/invoices').set(auth(adminA)).expect(403));
  });

  it('requires authentication (401)', () =>
    http.get('/api/v1/invoices').expect(401));

  it('auth/me returns the institution, never the HMAC secret', async () => {
    const res = await http.get('/api/v1/auth/me').set(auth(adminA)).expect(200);
    expect(res.body.data.institution).toMatchObject({ code: 'UCN' });
    expect(res.body.data.institution.webhookSecret).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });
});
