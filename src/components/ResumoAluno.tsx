import { useEffect, useState } from "react";
import type { Aluno, Disciplina } from "../types";
import { situacaoDoAluno, type Situacao } from "../api";

interface ResumoAlunoProps {
  aluno: Aluno;
  disciplinas: Disciplina[];
}

function ResumoAluno({ aluno, disciplinas }: ResumoAlunoProps) {
  const [situacao, setSituacao] = useState<Situacao | null>(null);

  useEffect(() => {
    situacaoDoAluno(aluno.id).then(setSituacao);
  }, [aluno.id]);

  const cargaTotal = disciplinas.reduce((soma, disciplina) => soma + disciplina.carga_horaria, 0);

  let classeSelo = "selo";
  let textoSelo = "Sem dados";
  if (situacao?.aprovado === true) {
    classeSelo = "selo selo-aprovado";
    textoSelo = "Aprovado";
  } else if (situacao?.aprovado === false) {
    classeSelo = "selo selo-reprovado";
    textoSelo = "Reprovado";
  }

  return (
    <aside className="resumo-aluno">
      <h3>Resumo</h3>

      <div className="resumo-aluno-numeros">
        <div>
          <span className="media-valor">{cargaTotal}</span>
          <span className="media-rotulo">horas cursadas</span>
        </div>
        <div>
          <span className="media-valor">{disciplinas.length}</span>
          <span className="media-rotulo">disciplina(s)</span>
        </div>
        <div>
          <span className="media-valor">
            {situacao?.mediaGeral !== null && situacao?.mediaGeral !== undefined ? situacao.mediaGeral.toFixed(1) : "—"}
          </span>
          <span className="media-rotulo">média geral</span>
        </div>
      </div>

      <span className={classeSelo}>{textoSelo}</span>
    </aside>
  );
}

export default ResumoAluno;
