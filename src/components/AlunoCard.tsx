import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { situacaoDoAluno, type Situacao } from "../api";

interface AlunoCardProps {
  aluno: Aluno;
  aoAbrir: (aluno: Aluno) => void;
  aoExcluir: (id: number) => void;
}

function AlunoCard({ aluno, aoAbrir, aoExcluir }: AlunoCardProps) {
  const [situacao, setSituacao] = useState<Situacao | null>(null);

  useEffect(() => {
    situacaoDoAluno(aluno.id).then(setSituacao);
  }, [aluno.id]);

  let classeSelo = "selo";
  let textoSelo = "Sem dados";
  if (situacao?.aprovado === true) {
    classeSelo = "selo selo-aprovado";
    textoSelo = "Aprovado";
  } else if (situacao?.aprovado === false) {
    classeSelo = "selo selo-reprovado";
    textoSelo = "Reprovado";
  }

  function aoClicarExcluir(evento: React.MouseEvent) {
    evento.stopPropagation();
    aoExcluir(aluno.id);
  }

  return (
    <article
      className="card-aluno"
      tabIndex={0}
      role="button"
      aria-label={`Ver detalhes de ${aluno.nome}`}
      onClick={() => aoAbrir(aluno)}
      onKeyDown={(evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
          evento.preventDefault();
          aoAbrir(aluno);
        }
      }}
    >
      <div className="card-topo">
        <h3>{aluno.nome}</h3>
        <span className={classeSelo}>{textoSelo}</span>
      </div>
      <dl className="card-dados">
        <div>
          <dt>Matrícula</dt>
          <dd>{aluno.matricula}</dd>
        </div>
        <div>
          <dt>Idade</dt>
          <dd>{aluno.idade} anos</dd>
        </div>
      </dl>
      <div className="card-rodape">
        <div className="card-metricas">
          <div className="media-bloco">
            <span className="media-valor">{situacao?.mediaGeral !== null && situacao?.mediaGeral !== undefined ? situacao.mediaGeral.toFixed(1) : "—"}</span>
            <span className="media-rotulo">média</span>
          </div>
          <div className="media-bloco">
            <span className="media-valor">{situacao?.frequenciaGeral !== null && situacao?.frequenciaGeral !== undefined ? `${Math.round(situacao.frequenciaGeral)}%` : "—"}</span>
            <span className="media-rotulo">freq.</span>
          </div>
        </div>
        <button className="botao-excluir" type="button" aria-label={`Excluir ${aluno.nome}`} onClick={aoClicarExcluir}>
          Excluir
        </button>
      </div>
    </article>
  );
}

export default AlunoCard;
