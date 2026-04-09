import { Controller, Get, Query } from '@nestjs/common';
import { CepService } from './cep.service';

@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  @Get('busca')
  async buscarPorRaio(
    @Query('origem') origem: string,
    @Query('raio') raio: string,
  ) {
    // Converte o raio para número e repassa para a regra de negócio
    return this.cepService.buscarCepsProximos(origem, Number(raio));
  }
}