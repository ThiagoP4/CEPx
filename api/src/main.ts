import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TelemetriaInterceptor } from './telemetria/telemetria.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Habilita CORS para permitir requisições do frontend
  app.useGlobalInterceptors(new TelemetriaInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
