import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { initializeTracing } from '@myapp/observability/tracing';

async function bootstrap() {
  initializeTracing('gateway-service');

  const app = await NestFactory.create(AppModule);
  
  // Use Winston logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  
  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`Gateway Service running on port ${port}`);
}

bootstrap();
