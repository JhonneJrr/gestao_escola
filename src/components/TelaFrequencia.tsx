import { useEffect, useState } from "react";
import type { Disciplina } from "../types";
import { frequenciaDaTurma, listarDisciplinas } from "../api";
import type { AlunoComFrequencia } from "../api";
import BotaoVoltar from "./BotaoVoltar";
import CalendarioChamada from "./CalendarioChamada";

interface TelaFrequenciaProps {
  aoVoltar: () => void;
}

function TelaFrequencia({ aoVoltar }: TelaFrequenciaProps) {
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [disciplinaId, setDisciplinaId] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [turma, setTurma] = useState<AlunoComFrequencia[]>([]);
  const [carregandoTurma, setCarregandoTurma] = useState(false);

  async function carregarTurma(idDisciplina: string) {
    if (idDisciplina === "") {
      setTurma([]);
      return;
    }

    setCarregandoTurma(true);
    try {
      const dados = await frequenciaDaTurma(Number(idDisciplina));
      setTurma(dados);
    } catch {
      setTurma([]);
    } finally {
      setCarregandoTurma(false);
    }
  }

  useEffect(() => {
    async function carregar() {
      try {
        const disciplinasCarregadas = await listarDisciplinas();
        setDisciplinas(disciplinasCarregadas);
        if (disciplinasCarregadas.length > 0) {
          setDisciplinaId(String(disciplinasCarregadas[0].id));
        }
      } catch {
        setErro("Não foi possível carregar as disciplinas.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  useEffect(() => {
    carregarTurma(disciplinaId);
  }, [disciplinaId]);

  const disciplinaSelecionada = disciplinas.find((disciplina) => disciplina.id === Number(disciplinaId));

  return (
    <div className="tela-frequencia">
      <BotaoVoltar aoVoltar={aoVoltar} />
      <h2>Frequência</h2>

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}
      {!carregando && erro === "" && disciplinas.length === 0 && (
        <p className="mensagem-vazia">Nenhuma disciplina cadastrada ainda.</p>
      )}

      {!carregando && erro === "" && disciplinas.length > 0 && (
        <>
          <div className="campo">
            <label htmlFor="select-disciplina-frequencia">Disciplina</label>
            <select
              id="select-disciplina-frequencia"
              value={disciplinaId}
              onChange={(evento) => setDisciplinaId(evento.target.value)}
            >
              {disciplinas.map((disciplina) => (
                <option key={disciplina.id} value={disciplina.id}>
                  {disciplina.nome}
                </option>
              ))}
            </select>
          </div>

          {disciplinaSelecionada && (
            <div className="frequencia-grid">
              <CalendarioChamada
                disciplinaId={disciplinaSelecionada.id}
                aoAtualizarFrequencia={() => carregarTurma(disciplinaId)}
              />

              <div className="quadro-turma">
                <p className="rotulo-secao">Frequência da turma</p>
                {carregandoTurma && <p className="mensagem-status">Carregando...</p>}
                {!carregandoTurma && turma.length === 0 && (
                  <p className="mensagem-vazia">Nenhum aluno matriculado nessa disciplina.</p>
                )}
                {!carregandoTurma && turma.length > 0 && (
                  <ul className="lista-risco">
                    {turma.map((aluno) => (
                      <li key={aluno.id}>
                        <span>{aluno.nome}</span>
                        <span className={aluno.percentual !== null && aluno.percentual < 75 ? "valor-risco" : "valor-turma"}>
                          {aluno.percentual === null ? "sem chamada" : `${aluno.percentual.toFixed(0)}%`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TelaFrequencia;
