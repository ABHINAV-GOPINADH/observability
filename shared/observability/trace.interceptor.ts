import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<any> {
    const tracer = trace.getTracer('nestjs-app');
    const request = executionContext.switchToHttp().getRequest();
    const { method, url, headers } = request;

    // Start a new span
    return tracer.startActiveSpan(
      `${method} ${url}`,
      {
        attributes: {
          'http.method': method,
          'http.url': url,
          'http.user_agent': headers['user-agent'],
        },
      },
      (span: Span) => {
        const startTime = Date.now();

        return next.handle().pipe(
          tap((data) => {
            const duration = Date.now() - startTime;
            
            span.setAttributes({
              'http.status_code': executionContext.switchToHttp().getResponse().statusCode,
              'http.response_time_ms': duration,
            });
            
            span.setStatus({ code: SpanStatusCode.OK });

            this.logger.info('Request completed', {
              method,
              url,
              duration,
              statusCode: executionContext.switchToHttp().getResponse().statusCode,
            });
            
            span.end();
          }),
          catchError((error) => {
            const duration = Date.now() - startTime;
            
            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error.message,
            });

            this.logger.error('Request failed', {
              method,
              url,
              duration,
              error: error.message,
              stack: error.stack,
            });

            span.end();
            return throwError(() => error);
          }),
        );
      },
    );
  }
}