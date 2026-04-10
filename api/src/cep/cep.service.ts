import { Injectable, OnModuleInit, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import KDBush from 'kdbush';
import * as geokdbush from 'geokdbush';

// Interface: um CEP individual carregado na memória
interface CepEntry {
    cep: string;
    logradouro: string;
    bairro: string;
    cidade: string;
    lat: number;
    lon: number;
}

@Injectable()
export class CepService implements OnModuleInit {

    private index: KDBush | null = null;
    private ceps: CepEntry[] = [];
    private totalCarregados = 0;

    async onModuleInit(): Promise<void> {
        const dataDir = path.resolve(__dirname, '..', '..', 'data');

        if (!fs.existsSync(dataDir)) {
            console.warn('Diretório data/ não encontrado.');
            return;
        }

        // TRAVA DE SEGURANÇA: Só carrega os arquivos que já foram enriquecidos
        const arquivosCsv = fs.readdirSync(dataDir).filter(f => f.endsWith('_enriquecido.csv'));

        if (arquivosCsv.length === 0) {
            console.warn('Nenhum arquivo CSV "_enriquecido.csv" encontrado em data/.');
            return;
        }

        console.log(`Carregando ${arquivosCsv.length} arquivo(s) CSV com coordenadas reais...`);

        const promessas = arquivosCsv.map(f => this.lerCsvEnriquecido(path.join(dataDir, f)));
        const resultados = await Promise.all(promessas);

        this.ceps = resultados.flat();
        this.totalCarregados = this.ceps.length;

        if (this.totalCarregados === 0) {
            console.warn('Nenhum CEP válido foi carregado dos arquivos.');
            return;
        }

        // Monta o índice espacial direto com as coordenadas reais
        this.index = new KDBush(this.ceps, (p) => p.lon, (p) => p.lat);

        console.log(`Índice espacial criado com sucesso! ${this.totalCarregados.toLocaleString('pt-BR')} CEPs carregados.`);
    }

    private lerCsvEnriquecido(csvPath: string): Promise<CepEntry[]> {
        return new Promise((resolve, reject) => {
            const dados: CepEntry[] = [];

            fs.createReadStream(csvPath)
                .pipe(csv()) 
                .on('data', (linha: Record<string, string>) => {
                    const cepLimpo = linha.cep?.replace(/\D/g, '');
                    if (!cepLimpo || cepLimpo.length !== 8) return;

                    const lat = parseFloat(linha.lat);
                    const lon = parseFloat(linha.lon);

                    // Pula as linhas que o robô não conseguiu achar a coordenada no Cep Aberto
                    if (isNaN(lat) || isNaN(lon)) return;

                    const cepFormatado = `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;

                    dados.push({
                        cep: cepFormatado,
                        logradouro: linha.logradouro || 'Logradouro não informado',
                        bairro: linha.bairro || '',
                        cidade: linha.id_cidade ? `Cidade ID: ${linha.id_cidade}` : 'Desconhecida',
                        lat,
                        lon,
                    });
                })
                .on('end', () => resolve(dados))
                .on('error', (err) => {
                    console.error(`Erro ao ler ${csvPath}:`, err);
                    reject(err);
                });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Endpoint principal: busca CEPs dentro de um raio (em km) a partir de um CEP de origem
    // ─────────────────────────────────────────────────────────────────────────
    async buscarCepsProximos(
        cepOrigem: string,
        raioKm: number,
        limit = 50,
        offset = 0,
    ): Promise<any> {
        if (!this.index || this.ceps.length === 0) {
            throw new BadRequestException('A base de dados ainda está sendo carregada. Tente novamente em instantes.');
        }

        const cepLimpo = cepOrigem.replace(/\D/g, '');

        const origem = this.ceps.find(item => item.cep.replace(/\D/g, '') === cepLimpo);
        if (!origem) {
            throw new NotFoundException(`CEP ${cepOrigem} não encontrado na base de dados.`);
        }

        const indicesVizinhos: number[] = geokdbush.around(
            this.index,
            origem.lon,
            origem.lat,
            Infinity,
            raioKm,
        ) as number[];

        const todosVizinhos = indicesVizinhos
            .filter((idx) => this.ceps[idx].cep !== origem.cep)
            .map((idx) => {
                const destino = this.ceps[idx];
                const distancia = geokdbush.distance(origem.lon, origem.lat, destino.lon, destino.lat);
                return {
                    cep: destino.cep,
                    logradouro: destino.logradouro,
                    bairro: destino.bairro,
                    cidade: destino.cidade,
                    distanciaKm: Number(distancia.toFixed(2)),
                };
            });

        const total = todosVizinhos.length;
        const vizinhosPaginados = todosVizinhos.slice(offset, offset + limit);

        return {
            origem: {
                cep: origem.cep,
                logradouro: origem.logradouro,
                bairro: origem.bairro,
                cidade: origem.cidade,
            },
            paginacao: {
                total,
                limit,
                offset,
                proximoOffset: offset + limit < total ? offset + limit : null,
            },
            vizinhos: vizinhosPaginados,
        };
    }
}