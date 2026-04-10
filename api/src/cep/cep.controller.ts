import { Controller, Get, Query } from '@nestjs/common'; 
import { CepService } from './cep.service';

@Controller('cep')
export class CepController {
    constructor(private readonly cepService: CepService) {}

    @Get('busca')
    async buscarPorRaio(
        @Query('origem') origem: string, 
        @Query('raio') raio: number
    ) {
        const resultados = await this.cepService.buscarCepsProximos(origem, Number(raio));
        
        return {
            status: 'success',
            resultados: resultados,
            total: resultados.length
        };
    }
}