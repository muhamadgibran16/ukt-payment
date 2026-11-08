import * as dotenv from 'dotenv';
import { resolve } from 'path';

// .env.test menimpa nilai dari .env agar test tidak pernah menyentuh database development.
dotenv.config({
  path: resolve(__dirname, '..', '.env.test'),
  override: true,
  quiet: true,
});
// Override opsional untuk CI / container (mis. DB_HOST_OVERRIDE=postgres).
if (process.env.DB_HOST_OVERRIDE)
  process.env.DB_HOST = process.env.DB_HOST_OVERRIDE;
if (process.env.DB_PORT_OVERRIDE)
  process.env.DB_PORT = process.env.DB_PORT_OVERRIDE;

if (
  process.env.NODE_ENV !== 'test' ||
  !process.env.DB_NAME?.endsWith('_test')
) {
  throw new Error(
    'Test e2e hanya boleh jalan dengan NODE_ENV=test dan DB_NAME berakhiran _test',
  );
}
