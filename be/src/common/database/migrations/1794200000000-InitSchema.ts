import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Skema awal aplikasi tagihan UKT multi-institusi.
 *
 * Catatan desain isolasi data:
 * - Setiap tabel milik tenant punya kolom institution_id NOT NULL.
 * - Composite FK (institution_id, x_id) memastikan di level DATABASE bahwa
 *   tagihan hanya bisa menunjuk mahasiswa dari institusi yang sama, dan
 *   transaksi hanya bisa menunjuk tagihan dari institusi yang sama.
 */
export class InitSchema1794200000000 implements MigrationInterface {
  name = 'InitSchema1794200000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(
      `CREATE TYPE "user_role" AS ENUM('finance_admin', 'student')`,
    );
    await q.query(
      `CREATE TYPE "invoice_status" AS ENUM('unpaid', 'paid', 'expired')`,
    );
    await q.query(
      `CREATE TYPE "transaction_source" AS ENUM('gateway', 'system')`,
    );
    await q.query(
      `CREATE TYPE "transaction_outcome" AS ENUM('applied', 'applied_late', 'amount_mismatch', 'double_payment', 'ignored')`,
    );
    await q.query(
      `CREATE TYPE "webhook_log_status" AS ENUM('received', 'processed', 'duplicate', 'ignored', 'rejected', 'failed')`,
    );

    // ---- institutions ----
    await q.query(`
      CREATE TABLE "institutions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "code" character varying(20) NOT NULL,
        "name" character varying(150) NOT NULL,
        "webhook_secret" character varying(255) NOT NULL,
        CONSTRAINT "PK_institutions" PRIMARY KEY ("id")
      )`);
    await q.query(
      `CREATE UNIQUE INDEX "UQ_institutions_code" ON "institutions" ("code")`,
    );

    // ---- users ----
    await q.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "institution_id" uuid NOT NULL,
        "name" character varying(100) NOT NULL,
        "email" character varying(255) NOT NULL,
        "nim" character varying(30),
        "password" character varying NOT NULL,
        "role" "user_role" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_institution_id_id" UNIQUE ("institution_id", "id"),
        CONSTRAINT "UQ_users_institution_nim" UNIQUE ("institution_id", "nim"),
        CONSTRAINT "CHK_users_student_nim" CHECK ("role" <> 'student' OR "nim" IS NOT NULL),
        CONSTRAINT "FK_users_institution" FOREIGN KEY ("institution_id")
          REFERENCES "institutions"("id") ON DELETE RESTRICT
      )`);
    await q.query(`CREATE UNIQUE INDEX "UQ_users_email" ON "users" ("email")`);
    await q.query(
      `CREATE INDEX "IDX_users_institution_id" ON "users" ("institution_id")`,
    );

    // ---- invoices ----
    await q.query(`
      CREATE TABLE "invoices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "institution_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "invoice_number" character varying(50) NOT NULL,
        "semester" character varying(5) NOT NULL,
        "amount" bigint NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "status" "invoice_status" NOT NULL DEFAULT 'unpaid',
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "paid_amount" bigint,
        CONSTRAINT "PK_invoices" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_invoices_institution_number" UNIQUE ("institution_id", "invoice_number"),
        CONSTRAINT "UQ_invoices_institution_student_semester" UNIQUE ("institution_id", "student_id", "semester"),
        CONSTRAINT "UQ_invoices_institution_id_id" UNIQUE ("institution_id", "id"),
        CONSTRAINT "CHK_invoices_amount_positive" CHECK ("amount" > 0),
        CONSTRAINT "CHK_invoices_paid_consistency" CHECK (("status" = 'paid') = ("paid_at" IS NOT NULL)),
        CONSTRAINT "FK_invoices_institution" FOREIGN KEY ("institution_id")
          REFERENCES "institutions"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invoices_student_same_institution" FOREIGN KEY ("institution_id", "student_id")
          REFERENCES "users"("institution_id", "id") ON DELETE RESTRICT
      )`);
    await q.query(
      `CREATE INDEX "IDX_invoices_institution_status" ON "invoices" ("institution_id", "status", "created_at")`,
    );
    await q.query(
      `CREATE INDEX "IDX_invoices_unpaid_expiry" ON "invoices" ("expires_at") WHERE "status" = 'unpaid'`,
    );

    // ---- webhook_logs (audit seluruh notifikasi) ----
    await q.query(`
      CREATE TABLE "webhook_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "institution_code" character varying(50),
        "institution_id" uuid,
        "event_id" character varying(100),
        "event_type" character varying(40),
        "invoice_number" character varying(50),
        "signature" character varying(200),
        "signature_valid" boolean NOT NULL DEFAULT false,
        "raw_body" text NOT NULL,
        "source_ip" character varying(64),
        "processing_status" "webhook_log_status" NOT NULL DEFAULT 'received',
        "response_code" integer,
        "message" text,
        "processed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_webhook_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_webhook_logs_institution" FOREIGN KEY ("institution_id")
          REFERENCES "institutions"("id") ON DELETE RESTRICT
      )`);
    await q.query(
      `CREATE INDEX "IDX_webhook_logs_institution" ON "webhook_logs" ("institution_id", "received_at")`,
    );
    await q.query(
      `CREATE INDEX "IDX_webhook_logs_event" ON "webhook_logs" ("institution_code", "event_id")`,
    );

    // ---- invoice_transactions (riwayat, append-only) ----
    await q.query(`
      CREATE TABLE "invoice_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "institution_id" uuid NOT NULL,
        "invoice_id" uuid NOT NULL,
        "source" "transaction_source" NOT NULL,
        "event_id" character varying(100),
        "event_type" character varying(40) NOT NULL,
        "gateway_transaction_id" character varying(100),
        "amount" bigint,
        "payment_method" character varying(50),
        "status_before" "invoice_status" NOT NULL,
        "status_after" "invoice_status" NOT NULL,
        "outcome" "transaction_outcome" NOT NULL,
        "note" text,
        "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "webhook_log_id" uuid,
        CONSTRAINT "PK_invoice_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_invoice_transactions_invoice_same_institution" FOREIGN KEY ("institution_id", "invoice_id")
          REFERENCES "invoices"("institution_id", "id") ON DELETE RESTRICT,
        CONSTRAINT "FK_invoice_transactions_webhook_log" FOREIGN KEY ("webhook_log_id")
          REFERENCES "webhook_logs"("id") ON DELETE SET NULL
      )`);
    await q.query(
      `CREATE INDEX "IDX_invoice_transactions_invoice" ON "invoice_transactions" ("institution_id", "invoice_id", "created_at")`,
    );
    await q.query(
      `CREATE UNIQUE INDEX "UQ_invoice_transactions_event" ON "invoice_transactions" ("institution_id", "event_id") WHERE "event_id" IS NOT NULL`,
    );
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "invoice_transactions"`);
    await q.query(`DROP TABLE "webhook_logs"`);
    await q.query(`DROP TABLE "invoices"`);
    await q.query(`DROP TABLE "users"`);
    await q.query(`DROP TABLE "institutions"`);
    await q.query(`DROP TYPE "webhook_log_status"`);
    await q.query(`DROP TYPE "transaction_outcome"`);
    await q.query(`DROP TYPE "transaction_source"`);
    await q.query(`DROP TYPE "invoice_status"`);
    await q.query(`DROP TYPE "user_role"`);
  }
}
