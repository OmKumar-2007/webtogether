import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Logs every HTTP request with method, path, status, and latency.
 * Useful for debugging and for spotting slow endpoints in dev.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { method, url } = req;
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
          this.logger.log(`${method} ${url} ${res.statusCode} ${ms.toFixed(1)}ms`);
        },
        error: () => {
          const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
          this.logger.warn(`${method} ${url} 5xx ${ms.toFixed(1)}ms`);
        },
      }),
    );
  }
}
