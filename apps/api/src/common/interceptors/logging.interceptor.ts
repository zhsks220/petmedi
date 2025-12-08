import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithUser extends Request {
  user?: { id: string };
  requestId?: string;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const response = ctx.getResponse<Response>();

    // 요청 ID 생성 (추적용)
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    const { method, url } = request;
    const userId = request.user?.id;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.logRequest(
            method,
            url,
            response.statusCode,
            duration,
            requestId,
            userId,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          this.logger.logRequest(
            method,
            url,
            statusCode,
            duration,
            requestId,
            userId,
          );
        },
      }),
    );
  }
}
