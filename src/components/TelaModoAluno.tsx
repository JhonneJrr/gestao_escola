import { useEffect, useState } from "react";
import type { Aluno, Aviso } from "../types";
import { boletimDoAluno, frequenciaDoAluno, listarAlunos, listarAvisos } from "../api";
import type { BoletimDaMateria, FrequenciaDaMateria } from "../api";
import BotaoVoltar from "./BotaoVoltar";
import SeletorAlunos from "./SeletorAlunos";

interface TelaModoAlunoProps {
  aoVoltar: () => void;
}

function TelaModoAluno({ aoVoltar }: TelaModoAlunoProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [alunoId, setAlunoId] = useState("");
  const [boletim, setBoletim] = useState<BoletimDaMateria[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaDaMateria[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const alunosCarregados = await listarAlunos();
        setAlunos(alunosCarregados);
        if (alunosCarregados.length > 0) {
          setAlunoId(String(alunosCarregados[0].id));
        }
      } catch {
        setErro("Não foi possível carregar os alunos.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  useEffect(() => {
    async function carregarDetalhes() {
      if (alunoId === "") {
        setBoletim([]);
        setFrequencias([]);
        setAvisos([]);
        return;
      }

      setCarregandoDetalhes(true);
      try {
        const [boletimCarregado, frequenciasCarregadas, avisosCarregados] = await Promise.all([
          boletimDoAluno(Number(alunoId)),
          frequenciaDoAluno(Number(alunoId)),
          listarAvisos(),
        ]);
        setBoletim(boletimCarregado);
        setFrequencias(frequenciasCarregadas);
        setAvisos(avisosCarregados);
      } finally {
        setCarregandoDetalhes(false);
      }
    }

    carregarDetalhes();
  }, [alunoId]);

  const alunoSelecionado = alunos.find((aluno) => aluno.id === Number(alunoId));

  return (
    <div className="tela-modo-aluno">
      <BotaoVoltar aoVoltar={aoVoltar} />
      <h2>Ver como aluno</h2>

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}

      {!carregando && erro === "" && (
        <div className="tela-com-roster">
          <SeletorAlunos alunos={alunos} alunoSelecionadoId={alunoId} aoSelecionar={setAlunoId} />

          {alunoSelecionado && (
            <div className="painel-matricula">
              <div className="aluno-selecionado">
                <div className="aluno-selecionado-icone">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h3>{alunoSelecionado.nome}</h3>
                  <p>Matrícula {alunoSelecionado.matricula}</p>
                </div>
              </div>

              {carregandoDetalhes && <p className="mensagem-status">Carregando...</p>}

              {!carregandoDetalhes && (
                <>
                  <p className="rotulo-secao">Boletim</p>
                  {boletim.length === 0 && (
                    <p className="mensagem-vazia">Nenhuma disciplina matriculada.</p>
                  )}
                  {boletim.map((materia) => (
                    <div key={materia.disciplina.id} className="materia-boletim">
                      <div className="materia-boletim-topo">
                        <strong>{materia.disciplina.nome}</strong>
                        <span>
                          {materia.media === null
                            ? "sem nota lançada"
                            : `${materia.media.toFixed(1)}${materia.parcial ? " (parcial)" : ""}`}
                        </span>
                      </div>
                      <ul className="chips-disciplinas">
                        {materia.notas.map((nota) => (
                          <li key={nota.avaliacao.id} className="chip-disciplina">
                            {nota.avaliacao.nome}
                            <span className="chip-disciplina-horas">{nota.valor === null ? "—" : nota.valor.toFixed(1)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <p className="rotulo-secao" style={{ marginTop: "24px" }}>
                    Frequência
                  </p>
                  {frequencias.length === 0 && <p className="mensagem-vazia">Nenhuma frequência registrada.</p>}
                  {frequencias.length > 0 && (
                    <ul className="chips-disciplinas">
                      {frequencias.map((item) => {
                        if (item.percentual === null) {
                          return (
                            <li key={item.disciplina.id} className="chip-disciplina">
                              {item.disciplina.nome}
                              <span className="chip-disciplina-horas">sem chamada</span>
                            </li>
                          );
                        }
                        const risco = item.percentual < 75;
                        const classeChip = risco ? "chip-disciplina chip-risco" : "chip-disciplina";
                        return (
                          <li key={item.disciplina.id} className={classeChip}>
                            {item.disciplina.nome}
                            <span className="chip-disciplina-horas">{item.percentual.toFixed(0)}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <p className="rotulo-secao" style={{ marginTop: "24px" }}>
                    Mural de avisos
                  </p>
                  {avisos.length === 0 && <p className="mensagem-vazia">Nenhum aviso publicado ainda.</p>}
                  {avisos.length > 0 && (
                    <div className="grade-avisos">
                      {avisos.map((aviso) => (
                        <article key={aviso.id} className="card-aviso">
                          <div className="card-aviso-topo">
                            <div className="card-aviso-icone">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path><path d="M8 6v8"></path></svg>
                            </div>
                            <div className="card-aviso-info">
                              <h3>{aviso.titulo}</h3>
                              <span className="card-aviso-data">{aviso.data}</span>
                            </div>
                          </div>
                          <p className="card-aviso-mensagem">{aviso.mensagem}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TelaModoAluno;
