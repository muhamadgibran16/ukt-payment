import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum AppEnv {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  TEST = 'test',
  LOCAL = 'local',
}

const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

/**
 * Skema environment variable. Aplikasi akan gagal start jika ada nilai yang
 * tidak valid, sehingga salah konfigurasi ketahuan sejak awal.
 * Jangan lupa update file ini dan `.env.example` jika menambah variabel baru.
 */
export class EnvironmentVariables {
  @IsEnum(AppEnv)
  NODE_ENV: AppEnv = AppEnv.DEVELOPMENT;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  @Max(65535)
  PORT: number = 3000;

  /** Daftar origin dipisah koma, atau `*` untuk mengizinkan semua. */
  @IsString()
  CORS_ORIGIN: string = '*';

  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  DB_PORT: number = 5432;

  @IsString()
  @IsNotEmpty()
  DB_NAME!: string;

  @IsString()
  @IsNotEmpty()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  /** Hanya untuk eksperimen lokal. Gunakan migration untuk perubahan skema. */
  @Transform(toBoolean)
  @IsBoolean()
  DB_SYNCHRONIZE: boolean = false;

  @Transform(toBoolean)
  @IsBoolean()
  DB_LOGGING: boolean = false;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET minimal 32 karakter' })
  JWT_SECRET!: string;

  /** Format: angka (detik) atau string seperti `15m`, `1h`, `7d`. */
  @Matches(/^\d+(ms|s|m|h|d|w|y)?$/, {
    message:
      'JWT_EXPIRES_IN harus berupa angka (detik) atau seperti 15m, 1h, 7d',
  })
  JWT_EXPIRES_IN: string = '1h';

  /** Jendela rate limit dalam milidetik. */
  @Transform(({ value }) => Number(value))
  @IsInt()
  THROTTLE_TTL: number = 60_000;

  @Transform(({ value }) => Number(value))
  @IsInt()
  THROTTLE_LIMIT: number = 100;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED?: boolean;

  /**
   * Interval job yang menandai tagihan lewat jatuh tempo sebagai kedaluwarsa.
   * 0 = nonaktif (dipakai di test).
   */
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  EXPIRY_SWEEP_INTERVAL_MS: number = 60_000;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  // Buang string kosong agar nilai default di class tetap dipakai.
  const cleaned = Object.fromEntries(
    Object.entries(config).filter(([, v]) => v !== ''),
  );
  const validated = plainToInstance(EnvironmentVariables, cleaned, {
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n');
    throw new Error(`Environment variable tidak valid:\n${details}`);
  }
  return validated;
}
