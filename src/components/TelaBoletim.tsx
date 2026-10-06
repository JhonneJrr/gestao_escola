import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { boletimDoAluno, lancarNota, listarAlunos } from "../api";
import type { BoletimDaMateria } from "../api";
import SeletorAlunos from "./SeletorAlunos";

function TelaBoletim() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [alunoId, setAlunoId] = useState("");
  const [boletim, setBoletim] = useState<BoletimDaMateria[]>([]);
  const [carregandoBoletim, setCarregandoBoletim] = useState(false);

  const [avaliacaoId, setAvaliacaoId] = useState("");
  const [valorNota, setValorNota] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  async function carregarBoletim(idAluno: string) {
    if (idAluno === "") {
      setBoletim([]);
      return;
    }

    setCarregandoBoletim(true);
    try {
      const boletimCarregado = await boletimDoAluno(Number(idAluno));
      setBoletim(boletimCarregado);
    } catch {
      setBoletim([]);
    } finally {
      setCarregandoBoletim(false);
    }
  }

  useEffect(() => {
    async function carregar() {
      try {
        const alunosCarregados = await listarAlunos();
        setAlunos(alunosCarregados);
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
    carregarBoletim(alunoId);
  }, [alunoId]);

  function aoMudarAluno(novoAlunoId: string) {
    setAlunoId(novoAlunoId);
    setAvaliacaoId("");
    setValorNota("");
    setMensagem("");
    setMensagemErro("");
  }

  async function aoLancarNota(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagem("");
    setMensagemErro("");

    const notaNumero = Number(valorNota);
    if (avaliacaoId === "") {
      setMensagemErro("Selecione a avaliação.");
      return;
    }
    if (valorNota.trim() === "" || Number.isNaN(notaNumero) || notaNumero < 0 || notaNumero > 10) {
      setMensagemErro("Informe uma nota entre 0 e 10.");
      return;
    }

    try {
      await lancarNota(Number(alunoId), Number(avaliacaoId), notaNumero);
      setMensagem("Nota lançada com sucesso.");
      setValorNota("");
      await carregarBoletim(alunoId);
    } catch (erroNota) {
      setMensagemErro((erroNota as Error).message);
    }
  }

  const alunoSelecionado = alunos.find((aluno) => aluno.id === Number(alunoId));

  return (
    <div className="tela-boletim">
      <h2>Boletim</h2>

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}

      {!carregando && erro === "" && (
        <div className="tela-com-roster">
          <SeletorAlunos alunos={alunos} alunoSelecionadoId={alunoId} aoSelecionar={aoMudarAluno} />

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

              {!carregandoBoletim && boletim.length === 0 && (
                <p className="mensagem-vazia">Este aluno ainda não está matriculado em nenhuma disciplina.</p>
              )}

              {!carregandoBoletim && boletim.length > 0 && (
                <form className="form-matricula-inline" onSubmit={aoLancarNota}>
                  <div className="campo">
                    <label htmlFor="select-avaliacao">Avaliação</label>
                    <select
                      id="select-avaliacao"
                      value={avaliacaoId}
                      onChange={(evento) => setAvaliacaoId(evento.target.value)}
                    >
                      <option value="">Selecione uma avaliação</option>
                      {boletim.map((materia) =>
                        materia.notas.map((nota) => (
                          <option key={nota.avaliacao.id} value={nota.avaliacao.id}>
                            {materia.disciplina.nome} — {nota.avaliacao.nome} (peso {nota.avaliacao.peso})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div className="campo campo-carga">
                    <label htmlFor="valor-nota">Nota</label>
                    <input
                      id="valor-nota"
                      type="number"
                      step="0.1"
                      placeholder="Ex.: 8.5"
                      value={valorNota}
                      onChange={(evento) => setValorNota(evento.target.value)}
                    />
                  </div>

                  <button className="botao-primario" type="submit">
                    Lançar nota
                  </button>

                  {mensagemErro !== "" && <p className="campo-erro">{mensagemErro}</p>}
                  {mensagem !== "" && <p className="mensagem-sucesso">{mensagem}</p>}
                </form>
              )}

              <div className="lista-vinculos">
                <p className="rotulo-secao">Boletim por matéria</p>
                {carregandoBoletim && <p className="mensagem-status">Carregando...</p>}
                {!carregandoBoletim &&
                  boletim.map((materia) => (
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
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TelaBoletim;
