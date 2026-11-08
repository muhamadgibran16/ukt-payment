import { AppEnv, validateEnv } from './env.validation';

const base = {
  DB_HOST: 'localhost',
  DB_NAME: 'app',
  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('applies defaults and converts types', () => {
    const env = validateEnv({ ...base, PORT: '4000', DB_SYNCHRONIZE: 'true' });
    expect(env.PORT).toBe(4000);
    expect(env.DB_PORT).toBe(5432);
    expect(env.DB_SYNCHRONIZE).toBe(true);
    expect(env.NODE_ENV).toBe(AppEnv.DEVELOPMENT);
  });

  it('treats empty strings as unset', () => {
    expect(validateEnv({ ...base, PORT: '' }).PORT).toBe(3000);
  });

  it('fails on a short JWT secret', () => {
    expect(() => validateEnv({ ...base, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
  });

  it('fails when a required variable is missing', () => {
    const { DB_HOST: _omit, ...rest } = base;
    expect(() => validateEnv(rest)).toThrow(/DB_HOST/);
  });
});
