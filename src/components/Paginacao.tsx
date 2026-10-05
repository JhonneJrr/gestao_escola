interface PaginacaoProps {
  pagina: number;
  tamanho: number;
  total: number;
  aoMudar: (pagina: number) => void;
}

function Paginacao({ pagina, tamanho, total, aoMudar }: PaginacaoProps) {
  if (total === 0) {
    return null;
  }

  const inicio = (pagina - 1) * tamanho + 1;
  const fim = Math.min(pagina * tamanho, total);
  const totalPaginas = Math.ceil(total / tamanho);

  return (
    <nav className="paginacao" aria-label="Paginação">
      <span className="paginacao-resumo">
        Mostrando {inicio}–{fim} de {total}
      </span>
      <div className="paginacao-botoes">
        <button className="botao-pagina" type="button" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          Anterior
        </button>
        <span className="paginacao-posicao">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          className="botao-pagina"
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => aoMudar(pagina + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

export default Paginacao;
