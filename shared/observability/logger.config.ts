import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import * as fs from 'fs';
import { trace, context } from '@opentelemetry/api';

// Custom format to inject trace context
const traceFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.traceId = spanContext.traceId;
    info.spanId = spanContext.spanId;
    info.traceFlags = spanContext.traceFlags;
  }
  return info;
});

export const createLoggerConfig = (serviceName: string): WinstonModuleOptions => {
  const logDir = process.env.LOG_DIR || `../logs/${serviceName}`;
  fs.mkdirSync(logDir, { recursive: true });

  return {
    transports: [
      // Console output for Fluent Bit to capture
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          traceFormat(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
      }),
      // File output as backup
      new winston.transports.File({
        filename: `${logDir}/error.log`,
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          traceFormat(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: `${logDir}/combined.log`,
        format: winston.format.combine(
          winston.format.timestamp(),
          traceFormat(),
          winston.format.json(),
        ),
      }),
    ],
  };
};
