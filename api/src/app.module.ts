import { Module } from '@nestjs/common';
import { CepModule } from './cep/cep.module';

@Module({
  imports: [CepModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
