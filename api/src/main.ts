import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelemetriaInterceptor } from './telemetria/telemetria.interceptor';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: allowedOrigin });

  app.useGlobalInterceptors(new TelemetriaInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
