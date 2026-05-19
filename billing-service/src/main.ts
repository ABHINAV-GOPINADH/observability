import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeTracing } from '@myapp/observability/tracing';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  initializeTracing('billing-service');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`Billing Service running on port ${port}`);
}
bootstrap();
