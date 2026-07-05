import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standard error envelope returned for every error response.
 * Keeps clients from having to handle NestJS' default mismatched shapes.
 */
export interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  /** Present only when the exception was a class-validator BadRequest. */
  details?: Array<{ property: string; constraints: Record<string, string> }>;
}

/**
 * Global exception filter — converts thrown HttpExceptions into the
 * {@link ErrorEnvelope} shape. Any non-HTTP error is reported as 500
 * with the message scrubbed in production.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload: ErrorEnvelope = {
      statusCode: status,
      error: HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    if (isHttp) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        payload.message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        payload.message = (obj.message as string | string[] | undefined)
          ? Array.isArray(obj.message)
            ? obj.message.join('; ')
            : (obj.message as string)
          : exception.message;
        if (Array.isArray(obj.message)) {
          payload.details = (obj.message as Array<Record<string, unknown>>).map(
            (m) => ({
              property: String(m.property ?? ''),
              constraints: (m.constraints as Record<string, string>) ?? {},
            }),
          );
        }
      }
    } else {
      // Don't leak internal errors in production
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
        payload.message = exception.message;
      }
    }

    response.status(status).json(payload);
  }
}
