import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { avaliacoesSemNotaLancada, listarAlunos, situacaoDoAluno } from "../api";
import type { AvaliacaoPendente, Situacao } from "../api";
import BotaoVoltar from "./BotaoVoltar";

interface TelaDashboardProps {
  aoVoltar: () => void;
}

interface AlunoComSituacao {
  aluno: Aluno;
  situacao: Situacao;
}

function TelaDashboard({ aoVoltar }: TelaDashboardProps) {
  const [alunosComSituacao, setAlunosComSituacao] = useState<AlunoComSituacao[]>([]);
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const alunos = await listarAlunos();
        const situacoes = await Promise.all(alunos.map((aluno) => situacaoDoAluno(aluno.id)));
        setAlunosComSituacao(alunos.map((aluno, indice) => ({ aluno, situacao: situacoes[indice] })));
        setPendentes(await avaliacoesSemNotaLancada());
      } catch {
        setErro("Não foi possível carregar os indicadores.");
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

  if (erro !== "") {
    return (
      <div className="tela-dashboard">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <p className="mensagem-erro">{erro}</p>
      </div>
    );
  }

  const mediaBaixa = alunosComSituacao.filter((item) => item.situacao.mediaGeral !== null && item.situacao.mediaGeral < 6);
  const frequenciaBaixa = alunosComSituacao.filter(
    (item) => item.situacao.frequenciaGeral !== null && item.situacao.frequenciaGeral < 75
  );

  return (
    <div className="tela-dashboard">
      <BotaoVoltar aoVoltar={aoVoltar} />

      <h2>Painel</h2>

      <div className="grade-indicadores">
        <div className="indicador">
          <span className="indicador-valor">{alunosComSituacao.length}</span>
          <span className="indicador-rotulo">alunos</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{mediaBaixa.length}</span>
          <span className="indicador-rotulo">com média abaixo de 6</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{frequenciaBaixa.length}</span>
          <span className="indicador-rotulo">com frequência abaixo de 75%</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{pendentes.length}</span>
          <span className="indicador-rotulo">avaliações sem nota lançada</span>
        </div>
      </div>

      <div className="painel-risco">
        <p className="rotulo-secao">Média abaixo de 6</p>
        {mediaBaixa.length === 0 && <p className="mensagem-vazia">Nenhum aluno nessa situação.</p>}
        {mediaBaixa.length > 0 && (
          <ul className="lista-risco">
            {mediaBaixa.map((item) => (
              <li key={item.aluno.id}>
                <span>{item.aluno.nome}</span>
                <span className="valor-risco">{item.situacao.mediaGeral!.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="painel-risco">
        <p className="rotulo-secao">Frequência abaixo de 75%</p>
        {frequenciaBaixa.length === 0 && <p className="mensagem-vazia">Nenhum aluno nessa situação.</p>}
        {frequenciaBaixa.length > 0 && (
          <ul className="lista-risco">
            {frequenciaBaixa.map((item) => (
              <li key={item.aluno.id}>
                <span>{item.aluno.nome}</span>
                <span className="valor-risco">{item.situacao.frequenciaGeral!.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        )}
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
