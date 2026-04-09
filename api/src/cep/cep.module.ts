import { Module } from '@nestjs/common';
import { CepService } from './cep.service';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';

@Module({
  providers: [CepService],
  controllers: [CepController]
})
export class CepModule {}
