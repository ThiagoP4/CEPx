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

// Interface: uma faixa de CEPs com coordenadas reais (da base geocodificada)
interface FaixaCep {
    cepInicial: number;
    cepFinal: number;
    cidade: string;
    lat: number;
    lon: number;
}

@Injectable()
export class CepService implements OnModuleInit {

    private index: KDBush | null = null;
    private ceps: CepEntry[] = [];
    private faixas: FaixaCep[] = [];   // Tabela de lookup: faixa → coordenada real
    private totalCarregados = 0;

    async onModuleInit(): Promise<void> {
        const dataDir = path.resolve(__dirname, '..', '..', 'data');

        // PASSO 1: Carrega a base geocodificada (coordenadas reais por faixa de CEP)
        const arquivoGeo = path.join(dataDir, 'ceps.csv');
        if (fs.existsSync(arquivoGeo)) {
            this.faixas = await this.carregarFaixas(arquivoGeo);
            console.log(`Tabela geográfica: ${this.faixas.length.toLocaleString('pt-BR')} faixas de CEP carregadas.`);
        } else {
            console.warn('Arquivo ceps.csv (geocodificado) não encontrado. Usando fallback por prefixo.');
        }

        // PASSO 2: Carrega os CSVs de CEPs individuais (logradouros)
        if (!fs.existsSync(dataDir)) return;

        const csvLogradouros = fs.readdirSync(dataDir)
            .filter(f => f.endsWith('.csv') && f !== 'ceps.csv');

        if (csvLogradouros.length === 0) {
            console.warn('Nenhum CSV de logradouros encontrado em data/.');
            return;
        }

        console.log(`Carregando ${csvLogradouros.length} CSV(s) de logradouros: ${csvLogradouros.join(', ')}`);

        const promessas = csvLogradouros.map(f => this.lerCsvLogradouros(path.join(dataDir, f)));
        const resultados = await Promise.all(promessas);

        this.ceps = resultados.flat();
        this.totalCarregados = this.ceps.length;

        // Monta o índice espacial KDBush
        this.index = new KDBush(this.ceps, (p) => p.lon, (p) => p.lat);

        console.log(`Índice espacial criado com ${this.totalCarregados.toLocaleString('pt-BR')} CEPs!`);
    }

    // Carrega o CSV geocodificado (base com faixas de CEP e lat/lon reais)

    private carregarFaixas(csvPath: string): Promise<FaixaCep[]> {
        return new Promise((resolve, reject) => {
            const faixas: FaixaCep[] = [];

            fs.createReadStream(csvPath)
                .pipe(csv({ separator: ';' }))            // delimitador é ponto-e-vírgula
                .on('data', (linha: Record<string, string>) => {
                    const latStr = linha['LATITUDE']?.replace(',', '.').trim();
                    const lonStr = linha['LONGITUDE']?.replace(',', '.').trim();
                    const cepIni = parseInt(linha['CEP_INICIAL']?.replace(/\D/g, ''));
                    const cepFim = parseInt(linha['CEP_FINAL']?.replace(/\D/g, ''));

                    if (!latStr || !lonStr || isNaN(cepIni) || isNaN(cepFim)) return;

                    const lat = parseFloat(latStr);
                    const lon = parseFloat(lonStr);

                    // Filtra linhas sem coordenadas válidas
                    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return;

                    faixas.push({
                        cepInicial: cepIni,
                        cepFinal: cepFim,
                        cidade: `${linha['LOCALIDADE']}/${linha['UF']}`,
                        lat,
                        lon,
                    });
                })
                .on('end', () => {
                    // Ordena por cepInicial para permitir binary search
                    faixas.sort((a, b) => a.cepInicial - b.cepInicial);
                    resolve(faixas);
                })
                .on('error', reject);
        });
    }

    // Busca a coordenada real para um CEP numérico na tabela de faixas
    // Usa binary search (O(log n)) — as faixas são ordenadas por cepInicial na carga

    private buscarCoordenadaReal(cepNum: number): FaixaCep | null {
        let lo = 0;
        let hi = this.faixas.length - 1;

        while (lo <= hi) {
            const mid = (lo + hi) >>> 1;
            const faixa = this.faixas[mid];

            if (cepNum < faixa.cepInicial) {
                hi = mid - 1;
            } else if (cepNum > faixa.cepFinal) {
                lo = mid + 1;
            } else {
                return faixa; // encontrado
            }
        }

        return null;
    }

    // Aplica um offset pseudo-determinístico (jitter geocoding) ao centro da cidade.
    // Spread: ±0.09° ≈ ±10 km (diâmetro típico de uma cidade média)
    private aplicarJitter(cepNum: number, faixa: FaixaCep): { lat: number; lon: number } {
        const SPREAD = 0.09; // ~10 km de raio

        // Hash multiplicativo de Knuth (32-bit) — mistura bits de forma eficiente
        // Math.imul garante multiplicação inteira de 32 bits sem overflow em JS
        const h1 = Math.imul(cepNum, 2654435761) >>> 0;
        const h2 = Math.imul(cepNum ^ (cepNum >>> 16), 2246822519) >>> 0;

        // Normaliza para [0, 1] e converte para coordenadas polares no disco
        const angulo = (h1 / 0xFFFFFFFF) * 2 * Math.PI;
        const raio = Math.sqrt(h2 / 0xFFFFFFFF); // sqrt = distribuição uniforme no disco

        return {
            lat: faixa.lat + Math.sin(angulo) * raio * SPREAD,
            lon: faixa.lon + Math.cos(angulo) * raio * SPREAD,
        };
    }

    private lerCsvLogradouros(csvPath: string): Promise<CepEntry[]> {
        return new Promise((resolve, reject) => {
            const dados: CepEntry[] = [];

            fs.createReadStream(csvPath)
                .pipe(csv({
                    headers: ['cep', 'logradouro', 'complemento', 'bairro', 'id_cidade', 'id_estado'],
                    skipComments: true,
                }))
                .on('data', (linha: Record<string, string>) => {
                    const cepLimpo = linha.cep?.replace(/\D/g, '');
                    if (!cepLimpo || cepLimpo.length !== 8) return;

                    const cepNum = parseInt(cepLimpo);

                    // Busca a coordenada real na tabela de faixas
                    const faixa = this.buscarCoordenadaReal(cepNum);
                    if (!faixa) return; // CEP sem cobertura geográfica

                    // Aplica jitter para diferenciar CEPs dentro da mesma cidade
                    const { lat, lon } = this.aplicarJitter(cepNum, faixa);

                    const cepFormatado = `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;

                    dados.push({
                        cep: cepFormatado,
                        logradouro: linha.logradouro || 'Logradouro não informado',
                        bairro: linha.bairro || '',
                        cidade: faixa.cidade,
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
    // Suporta paginação via limit e offset
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