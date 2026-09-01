interface TelaEntryProps {
  aoEntrar: (destino: "home" | "modoAluno") => void;
}

function TelaEntry({ aoEntrar }: TelaEntryProps) {
  return (
    <div className="tela-entry">
      <div className="entry-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
          <path d="M22 10v6"></path>
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
        </svg>
      </div>
      <h1>Portal de Gestão Escolar</h1>
      <p>Acompanhe alunos, disciplinas e matrículas em um só lugar.</p>
      <div className="entry-acoes">
        <button className="botao-entrar" type="button" onClick={() => aoEntrar("home")}>
          Entrar no portal
        </button>
        <button className="botao-entrar-secundario" type="button" onClick={() => aoEntrar("modoAluno")}>
          Ver como aluno
        </button>
      </div>
    </div>
  );
}

export default TelaEntry;
