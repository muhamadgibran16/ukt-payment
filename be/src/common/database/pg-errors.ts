import { QueryFailedError } from 'typeorm';

export const PG_UNIQUE_VIOLATION = '23505';

export function uniqueViolationConstraint(error: unknown): string | null {
  if (!(error instanceof QueryFailedError)) return null;
  const driverError = error.driverError as {
    code?: string;
    constraint?: string;
  };
  return driverError?.code === PG_UNIQUE_VIOLATION
    ? (driverError.constraint ?? '')
    : null;
}
