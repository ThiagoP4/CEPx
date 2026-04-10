import { useState, useCallback } from 'react';
import './BuscaCep.css';

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CepVizinho {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  distanciaKm: number;
}

interface OrigemData {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
}

interface Paginacao {
  total: number;
  limit: number;
  offset: number;
  proximoOffset: number | null;
}

interface RespostaApi {
  origem: OrigemData;
  paginacao: Paginacao;
  vizinhos: CepVizinho[];
}

// ─── Constantes ───────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const RAIO_MAXIMO = 50;
const PAGE_LIMIT = 50;

// ─── Utilitários ─────────────────────────────────────────────────────────

function formatarCep(valor: string): string {
  const apenas = valor.replace(/\D/g, '').slice(0, 8);
  if (apenas.length > 5) {
    return `${apenas.slice(0, 5)}-${apenas.slice(5)}`;
  }
  return apenas;
}

function cepValido(valor: string): boolean {
  return valor.replace(/\D/g, '').length === 8;
}

function mensagemDeErro(status: number, body: any): string {
  if (body?.message) return body.message;
  if (status === 404) return 'CEP não encontrado na nossa base de dados.';
  if (status === 400) return 'Requisição inválida. Verifique o CEP e o raio informados.';
  return 'Erro inesperado. Tente novamente mais tarde.';
}

// ─── Componente ───────────────────────────────────────────────────────────

export default function BuscaCep() {
  const [cep, setCep] = useState('');
  const [raio, setRaio] = useState('10');
  const [loading, setLoading] = useState(false);
  const [loadingMais, setLoadingMais] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origem, setOrigem] = useState<OrigemData | null>(null);
  const [vizinhos, setVizinhos] = useState<CepVizinho[]>([]);
  const [paginacao, setPaginacao] = useState<Paginacao | null>(null);
  const [buscaRealizada, setBuscaRealizada] = useState(false);

  // ─── Busca inicial ──────────────────────────────────────────────────────

  const realizarBusca = useCallback(async () => {
    setError(null);

    if (!cepValido(cep)) {
      setError('Informe um CEP válido com 8 dígitos.');
      return;
    }

    const raioNum = Number(raio);
    if (!raio || isNaN(raioNum) || raioNum <= 0) {
      setError('Informe um raio válido (número positivo).');
      return;
    }

    if (raioNum > RAIO_MAXIMO) {
      setError(`O raio máximo permitido é ${RAIO_MAXIMO} km.`);
      return;
    }

    setLoading(true);
    setBuscaRealizada(false);
    setVizinhos([]);
    setOrigem(null);
    setPaginacao(null);

    try {
      const url = `${API_URL}/cep/busca?origem=${cep}&raio=${raio}&limit=${PAGE_LIMIT}&offset=0`;
      const resposta = await fetch(url);
      const dados: RespostaApi = await resposta.json();

      if (!resposta.ok) {
        setError(mensagemDeErro(resposta.status, dados));
        return;
      }

      setOrigem(dados.origem);
      setVizinhos(dados.vizinhos);
      setPaginacao(dados.paginacao);
      setBuscaRealizada(true);
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, [cep, raio]);

  // ─── Carregar mais ──────────────────────────────────────────────────────

  const carregarMais = useCallback(async () => {
    if (!paginacao?.proximoOffset) return;

    setLoadingMais(true);

    try {
      const url = `${API_URL}/cep/busca?origem=${cep}&raio=${raio}&limit=${PAGE_LIMIT}&offset=${paginacao.proximoOffset}`;
      const resposta = await fetch(url);
      const dados: RespostaApi = await resposta.json();

      if (!resposta.ok) return;

      setVizinhos((prev) => [...prev, ...dados.vizinhos]);
      setPaginacao(dados.paginacao);
    } catch {
      // silencia erros no carregamento incremental
    } finally {
      setLoadingMais(false);
    }
  }, [cep, raio, paginacao]);

  // ─── Handlers de input ──────────────────────────────────────────────────

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCep(formatarCep(e.target.value));
  };

  const handleRaioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+(\.\d{0,1})?$/.test(val)) {
      setRaio(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') realizarBusca();
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  const temMais = paginacao !== null && paginacao.proximoOffset !== null;
  const carregados = vizinhos.length;
  const total = paginacao?.total ?? 0;

  return (
    <div className="busca-cep-container">
      <div className="header">
        <h1>Busca de CEPs por Raio</h1>
        <p>Informe um CEP e um raio em quilômetros para encontrar CEPs próximos na mesma região.</p>
      </div>

      <div className="form-card">
        <div className="form-group">
          <label htmlFor="input-cep">CEP de origem</label>
          <div className="input-wrapper">
            <input
              id="input-cep"
              type="text"
              placeholder="00000-000"
              value={cep}
              onChange={handleCepChange}
              onKeyDown={handleKeyDown}
              maxLength={9}
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="input-raio">Raio (km) — máx. {RAIO_MAXIMO} km</label>
          <input
            id="input-raio"
            type="number"
            value={raio}
            min={1}
            max={RAIO_MAXIMO}
            onChange={handleRaioChange}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button className="btn-buscar" onClick={realizarBusca} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar CEPs'}
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <p>⚠️ {error}</p>
        </div>
      )}

      {buscaRealizada && origem && (
        <div className="result-card">
          <p className="result-title">CEP de origem: {origem.cep}</p>
          <p className="result-address">
            {origem.logradouro}{origem.bairro ? `, ${origem.bairro}` : ''} — {origem.cidade}
          </p>
        </div>
      )}

      {buscaRealizada && (
        <>
          <div className="results-header">
            <h2>Resultados</h2>
            <span>
              {total === 0
                ? 'Nenhum CEP encontrado'
                : `Exibindo ${carregados} de ${total} CEPs encontrados`}
            </span>
          </div>

          <div className="results-list">
            {vizinhos.length === 0 ? (
              <p className="no-results">Nenhum CEP encontrado dentro do raio especificado.</p>
            ) : (
              <>
                <ul className="cep-list">
                  {vizinhos.map((item) => (
                    <li key={item.cep} className="cep-item">
                      <strong>{item.cep}</strong>
                      {' — '}
                      {item.logradouro}
                      {item.bairro ? `, ${item.bairro}` : ''}
                      {' — '}
                      {item.cidade}
                      <span className="distance"> ({item.distanciaKm} km)</span>
                    </li>
                  ))}
                </ul>

                {temMais && (
                  <button
                    className="btn-carregar-mais"
                    onClick={carregarMais}
                    disabled={loadingMais}
                  >
                    {loadingMais
                      ? 'Carregando...'
                      : `Carregar mais (${total - carregados} restantes)`}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}