import { useState } from 'react';
import './BuscaCep.css';

export default function BuscaCep() {
  const [cep, setCep] = useState('29111-625');
  const [raio, setRaio] = useState('10');

  return (
    <div className="busca-cep-container">
      <div className="header">
        <h1>Busca de CEPs por Raio</h1>
        <p>Informe um CEP e um raio em quilômetros para encontrar CEPs próximos na mesma região.</p>
      </div>

      <div className="form-card">
        <div className="form-group">
          <label>CEP de origem</label>
          <div className="input-wrapper">
            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Raio (km)</label>
          <input
            type="number"
            value={raio}
            onChange={(e) => setRaio(e.target.value)}
          />
        </div>

        <button className="btn-buscar">
          Buscar CEPs
        </button>
      </div>

      <div className="result-card">
        <div>
          <p className="result-title">CEP de origem: {cep}</p>
          <p className="result-address">Rua Teolândia, Cobilândia, Vila Velha/ES</p>
        </div>
      </div>

      <div className="results-header">
        <h2>Resultados</h2>
        <span>0 CEPs encontrados</span>
      </div>
    </div>
  );
}