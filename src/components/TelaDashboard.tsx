import { useEffect, useState } from "react";
import { avaliacoesSemNotaLancada, resumoDoDashboard } from "../api";
import type { AvaliacaoPendente, ResumoAluno, ResumoDoDashboard } from "../api";
import BotaoVoltar from "./BotaoVoltar";

interface TelaDashboardProps {
  aoVoltar: () => void;
}

function motivosDeRisco(aluno: ResumoAluno): string[] {
  const motivos: string[] = [];
  if (aluno.mediaGeral !== null && aluno.mediaGeral < 6) {
    motivos.push("média abaixo de 6");
  }
  if (aluno.frequenciaGeral !== null && aluno.frequenciaGeral < 75) {
    motivos.push("frequência abaixo de 75%");
  }
  return motivos;
}

function TelaDashboard({ aoVoltar }: TelaDashboardProps) {
  const [resumo, setResumo] = useState<ResumoDoDashboard | null>(null);
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const [resumoCarregado, pendentesCarregadas] = await Promise.all([
          resumoDoDashboard(),
          avaliacoesSemNotaLancada(),
        ]);
        setResumo(resumoCarregado);
        setPendentes(pendentesCarregadas);
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  if (carregando) {
    return (
      <div className="tela-dashboard">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <p className="mensagem-status">Carregando...</p>
      </div>
    );
  }

  if (erro !== "" || resumo === null) {
    return (
      <div className="tela-dashboard">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <p className="mensagem-erro">{erro !== "" ? erro : "Não foi possível carregar os indicadores."}</p>
      </div>
    );
  }

  return (
    <div className="tela-dashboard">
      <BotaoVoltar aoVoltar={aoVoltar} />

      <h2>Painel</h2>

      <div className="grade-indicadores">
        <div className="indicador">
          <span className="indicador-valor">{resumo.totalAlunos}</span>
          <span className="indicador-rotulo">alunos</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{resumo.mediaTurma === null ? "—" : resumo.mediaTurma.toFixed(1)}</span>
          <span className="indicador-rotulo">média da turma</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">
            {resumo.frequenciaMedia === null ? "—" : `${resumo.frequenciaMedia.toFixed(0)}%`}
          </span>
          <span className="indicador-rotulo">frequência média</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{pendentes.length}</span>
          <span className="indicador-rotulo">avaliações sem nota lançada</span>
        </div>
      </div>

      <div className="painel-colunas">
        <div className="painel-risco">
          <p className="rotulo-secao">Em risco</p>
          {resumo.alunosEmRisco.length === 0 && <p className="mensagem-vazia">Nenhum aluno em risco.</p>}
          {resumo.alunosEmRisco.length > 0 && (
            <ul className="lista-risco">
              {resumo.alunosEmRisco.map((aluno) => (
                <li key={aluno.id}>
                  <div>
                    <span>{aluno.nome}</span>
                    <span className="motivo-risco">{motivosDeRisco(aluno).join(" · ")}</span>
                  </div>
                  <span className="valor-risco">
                    {aluno.mediaGeral === null ? "—" : aluno.mediaGeral.toFixed(1)} ·{" "}
                    {aluno.frequenciaGeral === null ? "—" : `${aluno.frequenciaGeral.toFixed(0)}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="painel-risco">
          <p className="rotulo-secao">Ranking — top 5</p>
          {resumo.ranking.length === 0 && <p className="mensagem-vazia">Ainda não há notas lançadas.</p>}
          {resumo.ranking.length > 0 && (
            <ol className="lista-ranking">
              {resumo.ranking.map((aluno, indice) => (
                <li key={aluno.id}>
                  <span className="posicao-ranking">{indice + 1}</span>
                  <span className={indice === 0 ? "nome-ranking nome-ranking-primeiro" : "nome-ranking"}>
                    {aluno.nome}
                  </span>
                  <span className="valor-risco">{aluno.mediaGeral === null ? "—" : aluno.mediaGeral.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="painel-risco">
        <p className="rotulo-secao">Avaliações sem nenhuma nota lançada</p>
        {pendentes.length === 0 && <p className="mensagem-vazia">Todas as avaliações já têm alguma nota.</p>}
        {pendentes.length > 0 && (
          <ul className="lista-risco">
            {pendentes.map((item) => (
              <li key={item.avaliacao.id}>
                <span>
                  {item.disciplina.nome} — {item.avaliacao.nome}
                </span>
                <span className="valor-risco">peso {item.avaliacao.peso}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TelaDashboard;
