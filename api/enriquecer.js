const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();

// 1. CONFIGURAÇÕES
const API_TOKEN = process.env.CEP_ABERTO_TOKEN;
const ARQUIVO_ENTRADA = path.join(__dirname, 'data', 'ceps_sp.csv'); // Arquivo original
const ARQUIVO_SAIDA = path.join(__dirname, 'data', 'ceps_sp_enriquecido.csv'); // Arquivo final

// Função para pausar o robô e evitar bloqueio da API
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function enriquecerBase() {
  console.log('Lendo arquivo original da memória...');
  const ceps = [];
  
  // Lê todas as linhas do CSV original
  await new Promise((resolve, reject) => {
    fs.createReadStream(ARQUIVO_ENTRADA)
      .pipe(csv(['cep', 'logradouro', 'complemento', 'bairro', 'id_cidade', 'id_estado']))
      .on('data', (data) => ceps.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Total de CEPs carregados: ${ceps.length}`);
  
  // Prepara o novo arquivo com as colunas novas (lat, lon)
  const streamSaida = fs.createWriteStream(ARQUIVO_SAIDA);
  streamSaida.write('cep,logradouro,complemento,bairro,id_cidade,id_estado,lat,lon\n');

  console.log('Iniciando requisições à API do CEP Aberto...\n');

  // Loop FOR tradicional (NÃO use Promise.all aqui, senão a API bloqueia seu IP)
  for (let i = 0; i < ceps.length; i++) {
    const linha = ceps[i];
    const cepLimpo = linha.cep.replace(/\D/g, ''); // Tira o hífen para a API
    
    try {
      // Faz o pedido para a API
      const response = await fetch(`https://www.cepaberto.com/api/v3/cep?cep=${cepLimpo}`, {
        headers: { 'Authorization': `Token token=${API_TOKEN}` }
      });
      
      const data = await response.json();
      let lat = '';
      let lon = '';
      
      // Se a API encontrou a coordenada
      if (data && data.latitude && data.longitude) {
        lat = data.latitude;
        lon = data.longitude;
        console.log(`[${i + 1}/${ceps.length}] CEP ${cepLimpo}: Encontrado! (Lat: ${lat}, Lon: ${lon})`);
      } else {
        console.log(`[${i + 1}/${ceps.length}] CEP ${cepLimpo}: Sem coordenadas precisas na API.`);
      }

      // Salva a linha no novo arquivo (mantendo o texto entre aspas para evitar quebra por vírgulas)
      streamSaida.write(`${linha.cep},"${linha.logradouro}","${linha.complemento}","${linha.bairro}",${linha.id_cidade},${linha.id_estado},${lat},${lon}\n`);
      
      await delay(1500);

    } catch (error) {
      console.error(`[${i + 1}/${ceps.length}] Falha de conexão no CEP ${cepLimpo}. Pulando...`);
      streamSaida.write(`${linha.cep},"${linha.logradouro}","${linha.complemento}","${linha.bairro}",${linha.id_cidade},${linha.id_estado},,\n`);
      await delay(3000); // Se tomar erro, esfria o motor por 3 segundos
    }
  }

  streamSaida.end();
  console.log('\nEnriquecimento finalizado com sucesso! 🎉');
  console.log('O arquivo ceps_es_enriquecido.csv está pronto para uso na sua API principal.');
}

enriquecerBase();
