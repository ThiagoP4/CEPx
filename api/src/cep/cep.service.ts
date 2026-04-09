import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import * as fs from 'fs'
import * as path from 'path'
import csv from 'csv-parser'
import KDBush from 'kdbush'
import * as geokdbush from 'geokdbush';

@Injectable()
export class CepService implements OnModuleInit {

    private index: any;

    private readonly mockCeps = [
        { cep: '29111-625', logradouro: 'Rua Teolândia', cidade: 'Vila Velha/ES', lat: -20.354, lon: -40.357 },
        { cep: '29100-000', logradouro: 'Centro', cidade: 'Vila Velha/ES', lat: -20.329, lon: -40.292 },
        { cep: '29010-000', logradouro: 'Centro', cidade: 'Vitória/ES', lat: -20.319, lon: -40.337 },
        { cep: '01001-000', logradouro: 'Praça da Sé', cidade: 'São Paulo/SP', lat: -23.550, lon: -46.633 },
    ];

    onModuleInit(){
        console.log('Montando Índice Espacial com os dados de Mock...');
        this.index = new KDBush(this.mockCeps, (p: any) => p.lon, (p: any) => p.lat);
        console.log('Índice KDBush criado com sucesso!');
    }
    async buscarCepsProximos(cepOrigem: string, raioKm: number): Promise<any[]> {
        // 1. Procurar o CEP digitado, na base de dados
        const origem = this.mockCeps.find(item => item.cep === cepOrigem);
        if (!origem) {
            throw new Error('CEP de origem não encontrado');
        }

        const vizinhos = geokdbush.around(
            this.index,
            origem.lon,
            origem.lat,
            Infinity, // sem limite de resultados
            raioKm
        );

        return vizinhos
            .map((resultado: any) => typeof resultado === 'number' ? this.mockCeps[resultado] : resultado)
            .filter((destino: any) => destino.cep !== cepOrigem) // excluir o próprio CEP de origem
            .map((destino: any) => {
                const distancia = geokdbush.distance(origem.lon, origem.lat, destino.lon, destino.lat);
                return {
                    ...destino,
                    distanciaKm: (distancia.toFixed(2))
                };
            });
       
    }
}