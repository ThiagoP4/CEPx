import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelemetriaInterceptor } from './telemetria/telemetria.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Em produção, defina ALLOWED_ORIGIN com o domínio do frontend (ex: https://cepx.vercel.app)
  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
  app.enableCors({ origin: allowedOrigin });

  app.useGlobalInterceptors(new TelemetriaInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
