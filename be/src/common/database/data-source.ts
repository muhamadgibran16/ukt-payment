/**
 * DataSource khusus untuk TypeORM CLI (migration:generate/run/revert).
 * Aplikasi sendiri memakai DatabaseModule, bukan file ini.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { buildConfig, ENV_FILE_PATHS } from '../../config/configuration';
import { validateEnv } from '../../config/env.validation';
import { buildTypeOrmOptions } from './typeorm.config';

dotenv.config({ path: ENV_FILE_PATHS, quiet: true });

const config = buildConfig(validateEnv(process.env));

export default new DataSource({
  ...buildTypeOrmOptions(config.database),
  // CLI tidak boleh pernah melakukan synchronize otomatis.
  synchronize: false,
});
