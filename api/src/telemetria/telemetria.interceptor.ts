import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { performance } from 'perf_hooks';
import * as winston from 'winston';

@Injectable()
export class TelemetriaInterceptor implements NestInterceptor {
  // Configuração do Winston para gravar em arquivo JSON
  private readonly fileLogger = winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'logs/api-telemetria.log' }) // Salva na pasta /logs
    ],
  });

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const inicio = performance.now();
    const cpuInicio = process.cpuUsage();

    return next.handle().pipe(
      tap(() => {
        const cpuFim = process.cpuUsage(cpuInicio);
        const mem = process.memoryUsage();

        const logEstruturado = {
          request: { method: req.method, url: req.url },
          metrics: {
            executionTimeMs: Number((performance.now() - inicio).toFixed(2)),
            cpuUsageMs: Number(((cpuFim.user + cpuFim.system) / 1000).toFixed(2)),
            ramHeapMB: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
            ramTotalMB: Number((mem.rss / 1024 / 1024).toFixed(2))
          }
        };

        // Grava no arquivo de forma assíncrona
        this.fileLogger.info('Telemetria de busca', logEstruturado);
      }),
    );
  }
}