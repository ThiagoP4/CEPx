# CEPx — Busca de CEPs por Raio Geográfico

API performática e escalável que recebe um CEP de origem e um raio em quilômetros, retornando todos os CEPs localizados dentro dessa área geográfica.

---

## Arquitetura

```
CEPx/
├── api/          # Backend — NestJS (Node.js + TypeScript)
│   ├── src/
│   │   └── cep/
│   │       ├── cep.controller.ts   # Endpoint HTTP
│   │       └── cep.service.ts      # Lógica de busca geoespacial
│   └── data/                       # Base de dados CSV
│       ├── ceps.csv                # Faixas de CEP com lat/lon reais por município
│       ├── ceps_es.csv             # Logradouros — Espírito Santo
│       ├── ceps_sp.csv             # Logradouros — São Paulo
│       ├── ceps_mg.csv             # Logradouros — Minas Gerais
│       └── ceps_ba.csv             # Logradouros — Bahia
└── cepx/         # Frontend — React + Vite + TypeScript
    └── src/
        └── components/
            └── BuscaCep.tsx
```

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS · Node.js · TypeScript |
| Busca Geoespacial | KDBush · geokdbush |
| Leitura de Dados | Node.js Streams (`fs.createReadStream`) + `csv-parser` |
| Frontend | React · Vite · TypeScript |

---

## Decisões Técnicas

### ⚡ Streams e Non-Blocking I/O

A leitura dos arquivos CSV é feita via `fs.createReadStream` com `csv-parser`, garantindo que o event loop do Node.js **nunca seja bloqueado**, mesmo carregando centenas de milhares de registros. Cada arquivo é processado em paralelo via `Promise.all`.

### 🗺️ Índice Espacial com KDBush

Após a carga inicial, todos os CEPs são indexados em uma estrutura **KD-Tree** (`KDBush`). A busca por raio usa o algoritmo `geokdbush.around()`, que opera em **O(log n)** — muito mais eficiente que uma varredura linear O(n) sobre todos os registros.

### 📍 Geocodificação Exata (Enriquecimento Offline)

Para garantir precisão em nível de GPS sem comprometer a inicialização do servidor (startup) ou estourar limites de requisições de APIs externas (Rate Limit), a arquitetura utiliza a estratégia de Enriquecimento Offline:

Script Isolado: Um robô processa os arquivos CSV brutos offline, consultando a API do CEP Aberto para obter a Latitude e Longitude reais de cada logradouro.

Base Definitiva: Os dados geocodificados são salvos em novos arquivos *_enriquecido.csv.

Alta Performance: Em produção, a API Node.js não faz cálculos matemáticos complexos (como jitter geocoding) nem chamadas HTTP externas. Ela apenas consome os arquivos enriquecidos, resultando em um tempo de boot de milissegundos e buscas absurdamente rápidas.

---

## Como Rodar

### Pré-requisitos

- Node.js v18+
- npm

### 1. Backend (API)

```bash
cd api
npm install
npm run start:dev
```

A API estará disponível em `http://localhost:3000`.

### 2. Frontend

```bash
cd cepx
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

> 💡 Copie os arquivos de exemplo para um `.env` local:
> - `api/.env.example` → `api/.env`
> - `cepx/.env.example` → `cepx/.env`
> 
> Ajuste `PORT`, `ALLOWED_ORIGIN` e `VITE_API_URL` conforme o seu ambiente.

---

## Endpoint

### `GET /cep/busca`

Retorna CEPs dentro de um raio a partir de um CEP de origem, com suporte a paginação.

**Parâmetros de query:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `origem` | `string` | ✅ | CEP de origem (com ou sem traço) |
| `raio` | `number` | ✅ | Raio em quilômetros (máx. **50 km**) |
| `limit` | `number` | ❌ | Máximo de resultados por página (1–200, padrão: 50) |
| `offset` | `number` | ❌ | Índice inicial para paginação (padrão: 0) |

**Exemplo:**

```bash
curl "http://localhost:3000/cep/busca?origem=29171-212&raio=10&limit=50&offset=0"
```

**Resposta:**

```json
{
  "origem": {
    "cep": "29171-212",
    "logradouro": "Rua Maranta",
    "bairro": "Praia de Carapebus",
    "cidade": "Serra/ES"
  },
  "paginacao": {
    "total": 847,
    "limit": 50,
    "offset": 0,
    "proximoOffset": 50
  },
  "vizinhos": [
    {
      "cep": "29171-208",
      "logradouro": "Rua Alyssum",
      "bairro": "Praia de Carapebus",
      "cidade": "Serra/ES",
      "distanciaKm": 1.24
    }
  ]
}
```

> `proximoOffset` é `null` quando não há mais resultados.

**Erros tratados:**

| Status | Descrição |
|---|---|
| `400 Bad Request` | Base de dados ainda carregando |
| `404 Not Found` | CEP não encontrado na base |

---

## Base de Dados

| Arquivo | Origem | Conteúdo |
|---|---|---|
| `ceps.csv` | IBGE / Correios | Faixas de CEP com coordenadas reais por município |
| `ceps_*.csv` | [CEP Aberto](https://cepaberto.com) | Logradouros individuais por estado |

Os dados cobrem os estados de **ES, SP, MG e BA**, totalizando ~30.000 CEPs indexados.

---

## Performance

- **Carga inicial**: paralela via `Promise.all` — todos os CSVs são lidos simultaneamente
- **Busca**: O(log n) via KD-Tree — independente do tamanho da base
- **Múltiplas requisições simultâneas**: o índice fica em memória após a carga; requisições concorrentes não competem por I/O
