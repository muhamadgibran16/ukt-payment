import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Ambil institution_id milik user yang sedang login (dari JWT terverifikasi).
 * Semua query data tenant WAJIB memakai nilai ini.
 */
export const InstitutionId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const institutionId = ctx.switchToHttp().getRequest<Request>()
      .user?.institutionId;
    if (!institutionId) {
      throw new UnauthorizedException('Missing institution context');
    }
    return institutionId;
  },
);
