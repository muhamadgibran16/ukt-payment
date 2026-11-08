import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Client } from 'pg';

/** Membuat database test jika belum ada, agar `pnpm test:e2e` langsung jalan. */
export default async function globalSetup() {
  const env = dotenv.parse(readFileSync(resolve(__dirname, '..', '.env.test')));
  const dbName = process.env.TEST_DB_NAME ?? env.DB_NAME;
  if (!dbName.endsWith('_test'))
    throw new Error('DB test harus berakhiran _test');

  const client = new Client({
    host: process.env.DB_HOST_OVERRIDE ?? env.DB_HOST,
    port: Number(process.env.DB_PORT_OVERRIDE ?? env.DB_PORT),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: 'postgres',
  });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (!rowCount) await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}
