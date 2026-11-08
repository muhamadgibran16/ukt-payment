import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { map, Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { Paginated, PaginationMeta } from '../pagination/paginated';

export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T | unknown[]>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponse<T | unknown[]>> {
    const message =
      this.reflector.getAllAndOverride<string | undefined>(
        RESPONSE_MESSAGE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? 'OK';

    return next.handle().pipe(
      map((data) => {
        const { statusCode } = context.switchToHttp().getResponse<Response>();
        if (data instanceof Paginated) {
          return {
            success: true as const,
            statusCode,
            message,
            data: data.items as unknown[],
            meta: data.meta,
          };
        }
        return {
          success: true as const,
          statusCode,
          message,
          data: data ?? null,
        } as SuccessResponse<T>;
      }),
    );
  }
}
