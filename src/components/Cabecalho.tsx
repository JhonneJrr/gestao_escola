interface CabecalhoProps {
  email: string;
  aoIrParaHome: () => void;
  aoSair: () => void;
}

function Cabecalho({ email, aoIrParaHome, aoSair }: CabecalhoProps) {
  return (
    <header className="cabecalho">
      <h1>
        <button type="button" onClick={aoIrParaHome} aria-label="Ir para a Home">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
            <path d="M22 10v6"></path>
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
          </svg>
        </button>
        <span className="somente-leitura">Portal de Gestão Escolar</span>
      </h1>
      <div className="cabecalho-sessao">
        <span className="cabecalho-usuario">{email}</span>
        <button className="botao-sair" type="button" onClick={aoSair}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default Cabecalho;
