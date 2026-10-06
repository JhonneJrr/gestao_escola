import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { boletimDoAluno, frequenciaDoAluno, situacaoDoAluno } from "../api";
import type { BoletimDaMateria, FrequenciaDaMateria, Situacao } from "../api";

interface AlunoDrawerProps {
  aluno: Aluno;
  aoFechar: () => void;
  aoExcluir: (id: number) => void;
}

function AlunoDrawer({ aluno, aoFechar, aoExcluir }: AlunoDrawerProps) {
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [boletim, setBoletim] = useState<BoletimDaMateria[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaDaMateria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErroCarregamento("");
      try {
        const [situacaoCarregada, boletimCarregado, frequenciasCarregadas] = await Promise.all([
          situacaoDoAluno(aluno.id),
          boletimDoAluno(aluno.id),
          frequenciaDoAluno(aluno.id),
        ]);
        if (cancelado) {
          return;
        }
        setSituacao(situacaoCarregada);
        setBoletim(boletimCarregado);
        setFrequencias(frequenciasCarregadas);
      } catch (erro) {
        if (!cancelado) {
          setErroCarregamento((erro as Error).message);
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
    };
  }, [aluno.id]);

  useEffect(() => {
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        aoFechar();
      }
    }

    document.addEventListener("keydown", aoPressionarTecla);
    return () => document.removeEventListener("keydown", aoPressionarTecla);
  }, [aoFechar]);

  let classeSelo = "selo";
  let textoSelo = "Sem dados";
  if (situacao?.aprovado === true) {
    classeSelo = "selo selo-aprovado";
    textoSelo = "Aprovado";
  } else if (situacao?.aprovado === false) {
    classeSelo = "selo selo-reprovado";
    textoSelo = "Reprovado";
  }

  function aoClicarExcluir() {
    aoExcluir(aluno.id);
    aoFechar();
  }

  function frequenciaDaDisciplina(disciplinaId: number): number | null {
    const encontrada = frequencias.find((item) => item.disciplina.id === disciplinaId);
    return encontrada ? encontrada.percentual : null;
  }

  return (
    <>
      <div className="scrim-aluno" onClick={aoFechar}></div>
      <aside className="drawer-aluno" aria-label={`Detalhes de ${aluno.nome}`}>
        <button className="botao-fechar-drawer" type="button" aria-label="Fechar" onClick={aoFechar}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <div className="drawer-aluno-topo">
          <h2>{aluno.nome}</h2>
          <span className={classeSelo}>{textoSelo}</span>
        </div>

        <dl className="drawer-aluno-dados">
          <div>
            <dt>Matrícula</dt>
            <dd>{aluno.matricula}</dd>
          </div>
          <div>
            <dt>Idade</dt>
            <dd>{aluno.idade} anos</dd>
          </div>
          <div>
            <dt>Média geral</dt>
            <dd>{situacao?.mediaGeral !== null && situacao?.mediaGeral !== undefined ? situacao.mediaGeral.toFixed(1) : "—"}</dd>
          </div>
          <div>
            <dt>Frequência geral</dt>
            <dd>
              {situacao?.frequenciaGeral !== null && situacao?.frequenciaGeral !== undefined
                ? `${situacao.frequenciaGeral.toFixed(0)}%`
                : "—"}
            </dd>
          </div>
        </dl>

        <p className="rotulo-secao">Boletim</p>
        {carregando && <p className="mensagem-status">Carregando...</p>}
        {!carregando && erroCarregamento !== "" && <p className="mensagem-erro">{erroCarregamento}</p>}
        {!carregando && erroCarregamento === "" && boletim.length === 0 && <p className="mensagem-vazia">Este aluno não está matriculado em nenhuma disciplina.</p>}
        {!carregando &&
          boletim.map((materia) => (
            <div key={materia.disciplina.id} className="materia-boletim">
              <div className="materia-boletim-topo">
                <strong>{materia.disciplina.nome}</strong>
                <span>
                  {materia.media === null ? "sem nota lançada" : `${materia.media.toFixed(1)}${materia.parcial ? " (parcial)" : ""}`}
                  {" · "}
                  {frequenciaDaDisciplina(materia.disciplina.id) === null
                    ? "sem chamada"
                    : `${frequenciaDaDisciplina(materia.disciplina.id)!.toFixed(0)}% freq.`}
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

        <div className="drawer-aluno-rodape">
          <button className="botao-excluir-drawer" type="button" onClick={aoClicarExcluir}>
            Excluir aluno
          </button>
        </div>
      </aside>
    </>
  );
}

export default AlunoDrawer;
