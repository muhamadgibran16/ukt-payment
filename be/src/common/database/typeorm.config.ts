import { join } from 'path';
import { DataSourceOptions } from 'typeorm';
import { AppConfig } from '../../config/configuration';

/**
 * Opsi TypeORM yang dipakai bersama oleh aplikasi (DatabaseModule) dan
 * TypeORM CLI (data-source.ts), sehingga keduanya selalu konsisten.
 */
export const buildTypeOrmOptions = (
  db: AppConfig['database'],
): DataSourceOptions => ({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.user,
  password: db.password,
  database: db.name,
  // Path relatif terhadap file ini sehingga bekerja baik di src (ts-node) maupun dist (js).
  entities: [join(__dirname, '..', '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
  synchronize: db.synchronize,
  logging: db.logging ? 'all' : ['error', 'warn'],
});
