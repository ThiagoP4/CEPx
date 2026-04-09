import { Injectable } from '@nestjs/common';

@Injectable()
export class CepService {

    private readonly mockCeps = [
        { cep: '29111-625', logradouro: 'Rua Teolândia', cidade: 'Vila Velha/ES', lat: -20.354, lon: -40.357 },
        { cep: '29100-000', logradouro: 'Centro', cidade: 'Vila Velha/ES', lat: -20.329, lon: -40.292 },
        { cep: '29010-000', logradouro: 'Centro', cidade: 'Vitória/ES', lat: -20.319, lon: -40.337 },
        { cep: '01001-000', logradouro: 'Praça da Sé', cidade: 'São Paulo/SP', lat: -23.550, lon: -46.633 },
    ];
    async buscarCepsProximos(cepOrigem: string, raioKm: number): Promise<any[]> {
        // 1. Procurar o CEP digitado, na base de dados
        const origem = this.mockCeps.find(item => item.cep === cepOrigem);
        if (!origem) {
            throw new Error('CEP de origem não encontrado');
        }
        // 2. Filtrar quem está dentro do raio
        const resultados = this.mockCeps.filter(destino => {
            if (destino.cep === cepOrigem) return false; // Ignora o próprio CEP de origem

            // Calcula distancia usando as coordenadas (lat/lon) 
            const distancia = this.calcularDistancia(origem.lat, origem.lon, destino.lat, destino.lon);
            destino['distanciaKm'] = Number(distancia.toFixed(2));
            return distancia <= raioKm;
        });
        return resultados.sort((a, b) => a['distanciaKm'] - b['distanciaKm']); // Ordena do mais próximo para o mais distante
    }

    private calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const raioTerra = 6371; // Raio da Terra em km
        const distanciaLat = (lat2 - lat1) * Math.PI / 180;
        const distanciaLong = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(distanciaLat / 2) * Math.sin(distanciaLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(distanciaLong / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return raioTerra * c;
    }
}