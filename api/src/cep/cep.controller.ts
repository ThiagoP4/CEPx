import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { CepService } from './cep.service';

const RAIO_MAXIMO_KM = 50;

@Controller('cep')
export class CepController {
    constructor(private readonly cepService: CepService) {}

    @Get('busca')
    async buscarPorRaio(
        @Query('origem') origem: string,
        @Query('raio') raio: string,
        @Query('limit') limit = '50',
        @Query('offset') offset = '0',
    ) {
        if (!origem) {
            throw new BadRequestException('O parâmetro "origem" é obrigatório.');
        }

        const cepLimpo = origem.replace(/\D/g, '');
        if (cepLimpo.length !== 8) {
            throw new BadRequestException('O CEP de origem deve conter exatamente 8 dígitos.');
        }

        if (!raio) {
            throw new BadRequestException('O parâmetro "raio" é obrigatório.');
        }

        const raioNum = Number(raio);
        if (isNaN(raioNum) || raioNum <= 0) {
            throw new BadRequestException('O parâmetro "raio" deve ser um número positivo.');
        }

        if (raioNum > RAIO_MAXIMO_KM) {
            throw new BadRequestException(`O raio máximo permitido é ${RAIO_MAXIMO_KM} km.`);
        }

        const limitNum = Math.max(1, Math.min(200, Number(limit) || 50));
        const offsetNum = Math.max(0, Number(offset) || 0);

        return this.cepService.buscarCepsProximos(origem, raioNum, limitNum, offsetNum);
    }
}