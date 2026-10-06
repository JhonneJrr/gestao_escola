interface TopbarProps {
  mostrarBusca: boolean;
  aoAbrirMenu: () => void;
  aoAbrirBusca: () => void;
}

function Topbar({ mostrarBusca, aoAbrirMenu, aoAbrirBusca }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="botao-menu" type="button" aria-label="Abrir menu" onClick={aoAbrirMenu}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16"></path>
          <path d="M4 12h16"></path>
          <path d="M4 18h16"></path>
        </svg>
      </button>
      {mostrarBusca && (
        <button className="botao-busca" type="button" aria-label="Buscar (Ctrl K)" onClick={aoAbrirBusca}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>
          <span className="botao-busca-texto">Buscar...</span>
          <span className="botao-busca-atalho" aria-hidden="true">
            <kbd>Ctrl</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      )}
    </header>
  );
}

export default Topbar;
