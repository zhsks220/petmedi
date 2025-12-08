import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
  }

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const contextName = this.context || 'Application';

    if (this.isProduction) {
      // 프로덕션: JSON 형식 (로그 분석 도구와 호환)
      return JSON.stringify({
        timestamp,
        level,
        context: contextName,
        message,
        ...context,
        error: context?.error
          ? {
              name: context.error.name,
              message: context.error.message,
              stack: context.error.stack,
            }
          : undefined,
      });
    }

    // 개발: 사람이 읽기 쉬운 형식
    let formattedMessage = `[${timestamp}] [${level}] [${contextName}] ${message}`;

    if (context) {
      const contextParts: string[] = [];
      if (context.requestId) contextParts.push(`requestId=${context.requestId}`);
      if (context.userId) contextParts.push(`userId=${context.userId}`);
      if (context.method) contextParts.push(`method=${context.method}`);
      if (context.path) contextParts.push(`path=${context.path}`);
      if (context.statusCode) contextParts.push(`status=${context.statusCode}`);
      if (context.duration) contextParts.push(`duration=${context.duration}ms`);

      if (contextParts.length > 0) {
        formattedMessage += ` | ${contextParts.join(' ')}`;
      }
    }

    return formattedMessage;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  log(message: string, context?: LogContext | string): void {
    const ctx = typeof context === 'string' ? { metadata: { context } } : context;
    console.log(this.formatMessage(LogLevel.INFO, message, ctx));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext | string): void {
    const ctx = typeof context === 'string' ? { metadata: { context } } : context;
    console.warn(this.formatMessage(LogLevel.WARN, message, ctx));
  }

  error(message: string, trace?: string, context?: string): void;
  error(message: string, context?: LogContext): void;
  error(
    message: string,
    traceOrContext?: string | LogContext,
    context?: string,
  ): void {
    let ctx: LogContext | undefined;

    if (typeof traceOrContext === 'string') {
      ctx = {
        error: new Error(traceOrContext),
        metadata: context ? { context } : undefined,
      };
    } else {
      ctx = traceOrContext;
    }

    console.error(this.formatMessage(LogLevel.ERROR, message, ctx));
  }

  // HTTP 요청 로깅
  logRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestId?: string,
    userId?: string,
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message = `${method} ${path} - ${statusCode}`;

    const logFn = level === LogLevel.ERROR ? this.error.bind(this) : level === LogLevel.WARN ? this.warn.bind(this) : this.info.bind(this);

    logFn(message, {
      method,
      path,
      statusCode,
      duration,
      requestId,
      userId,
    });
  }

  // 에러 로깅 (스택 트레이스 포함)
  logError(error: Error, context?: Omit<LogContext, 'error'>): void {
    this.error(error.message, {
      ...context,
      error,
    });
  }
}
