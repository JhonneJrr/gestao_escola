import { useEffect, useState } from "react";
import type { Aluno, Disciplina } from "../types";
import { disciplinasDoAluno, listarAlunos, listarDisciplinas, matricular } from "../api";
import BotaoVoltar from "./BotaoVoltar";
import ResumoAluno from "./ResumoAluno";
import SeletorAlunos from "./SeletorAlunos";

interface TelaMatriculasProps {
  aoVoltar: () => void;
}

function TelaMatriculas({ aoVoltar }: TelaMatriculasProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [alunoId, setAlunoId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [disciplinasDoAlunoLista, setDisciplinasDoAlunoLista] = useState<Disciplina[]>([]);
  const [carregandoVinculos, setCarregandoVinculos] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  async function carregarVinculos(idAluno: string) {
    if (idAluno === "") {
      setDisciplinasDoAlunoLista([]);
      return;
    }

    setCarregandoVinculos(true);
    try {
      const dados = await disciplinasDoAluno(Number(idAluno));
      setDisciplinasDoAlunoLista(dados);
    } catch {
      setDisciplinasDoAlunoLista([]);
    } finally {
      setCarregandoVinculos(false);
    }
  }

  useEffect(() => {
    async function carregar() {
      try {
        const alunosCarregados = await listarAlunos();
        const disciplinasCarregadas = await listarDisciplinas();
        setAlunos(alunosCarregados);
        setDisciplinas(disciplinasCarregadas);
        if (alunosCarregados.length > 0) {
          setAlunoId(String(alunosCarregados[0].id));
        }
      } catch {
        setErro("Não foi possível carregar os dados.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  useEffect(() => {
    carregarVinculos(alunoId);
  }, [alunoId]);

  function aoMudarAluno(novoAlunoId: string) {
    setAlunoId(novoAlunoId);
    setDisciplinaId("");
    setMensagem("");
    setMensagemErro("");
  }

  async function aoMatricular(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagem("");
    setMensagemErro("");

    if (alunoId === "" || disciplinaId === "") {
      setMensagemErro("Selecione o aluno e a disciplina.");
      return;
    }

    try {
      await matricular(Number(alunoId), Number(disciplinaId));
      setMensagem("Aluno matriculado com sucesso.");
      setDisciplinaId("");
      await carregarVinculos(alunoId);
    } catch (erroMatricula) {
      setMensagemErro((erroMatricula as Error).message);
    }
  }

  const alunoSelecionado = alunos.find((aluno) => aluno.id === Number(alunoId));

  return (
    <div className="tela-matriculas">
      <BotaoVoltar aoVoltar={aoVoltar} />
      <h2>Matrículas</h2>

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}

      {!carregando && erro === "" && (
        <div className="tela-com-roster">
          <SeletorAlunos alunos={alunos} alunoSelecionadoId={alunoId} aoSelecionar={aoMudarAluno} />

          {alunoSelecionado && (
            <div className="matricula-grid">
              <div className="painel-matricula">
                <div className="aluno-selecionado">
                  <div className="aluno-selecionado-icone">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3>{alunoSelecionado.nome}</h3>
                    <p>Matrícula {alunoSelecionado.matricula}</p>
                  </div>
                </div>

                {disciplinas.length === 0 && (
                  <p className="mensagem-vazia">Nenhuma disciplina cadastrada ainda.</p>
                )}

                {disciplinas.length > 0 && (
                  <form className="form-matricula-inline" onSubmit={aoMatricular}>
                    <div className="campo">
                      <label htmlFor="select-disciplina">Nova disciplina</label>
                      <select
                        id="select-disciplina"
                        value={disciplinaId}
                        onChange={(evento) => setDisciplinaId(evento.target.value)}
                      >
                        <option value="">Selecione uma disciplina</option>
                        {disciplinas.map((disciplina) => (
                          <option key={disciplina.id} value={disciplina.id}>
                            {disciplina.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button className="botao-primario" type="submit">
                      Matricular
                    </button>

                    {mensagemErro !== "" && <p className="campo-erro">{mensagemErro}</p>}
                    {mensagem !== "" && <p className="mensagem-sucesso">{mensagem}</p>}
                  </form>
                )}

                <div className="lista-vinculos">
                  <p className="rotulo-secao">Disciplinas cursadas</p>
                  {carregandoVinculos && <p className="mensagem-status">Carregando...</p>}
                  {!carregandoVinculos && disciplinasDoAlunoLista.length === 0 && (
                    <p className="mensagem-vazia">Este aluno ainda não tem disciplinas.</p>
                  )}
                  {!carregandoVinculos && disciplinasDoAlunoLista.length > 0 && (
                    <ul className="chips-disciplinas">
                      {disciplinasDoAlunoLista.map((disciplina) => (
                        <li key={disciplina.id} className="chip-disciplina">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v16"></path>
                            <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"></path>
                          </svg>
                          {disciplina.nome}
                          <span className="chip-disciplina-horas">{disciplina.carga_horaria}h</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {!carregandoVinculos && (
                <ResumoAluno aluno={alunoSelecionado} disciplinas={disciplinasDoAlunoLista} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TelaMatriculas;
