interface FiltrosProps {
  q: string;
  idadeMinima: string;
  mediaMinima: string;
  aoMudarQ: (valor: string) => void;
  aoMudarIdadeMinima: (valor: string) => void;
  aoMudarMediaMinima: (valor: string) => void;
  aoLimpar: () => void;
}

function Filtros({
  q,
  idadeMinima,
  mediaMinima,
  aoMudarQ,
  aoMudarIdadeMinima,
  aoMudarMediaMinima,
  aoLimpar,
}: FiltrosProps) {
  return (
    <div className="filtros">
      <div className="campo-busca">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21 21-4.34-4.34"></path>
          <circle cx="11" cy="11" r="8"></circle>
        </svg>
        <input
          type="text"
          placeholder="Buscar por nome ou matrícula..."
          aria-label="Buscar por nome ou matrícula"
          value={q}
          onChange={(evento) => aoMudarQ(evento.target.value)}
        />
      </div>

      <div className="campo-numero">
        <label htmlFor="idade-min">Idade mín.</label>
        <input
          id="idade-min"
          type="number"
          placeholder="0"
          value={idadeMinima}
          onChange={(evento) => aoMudarIdadeMinima(evento.target.value)}
        />
      </div>

      <div className="campo-numero">
        <label htmlFor="media-min">Média mín.</label>
        <input
          id="media-min"
          type="number"
          placeholder="0"
          value={mediaMinima}
          onChange={(evento) => aoMudarMediaMinima(evento.target.value)}
        />
      </div>

      <button className="botao-limpar" type="button" onClick={aoLimpar}>
        Limpar filtros
      </button>
    </div>
  );
}

export default Filtros;
