import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { alunosDaDisciplina, presencasDoDia, registrarChamada } from "../api";

interface PainelChamadaDoDiaProps {
  disciplinaId: number;
  data: string;
  aoFechar: () => void;
  aoSalvar: () => void;
}

function formatarDataBR(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function PainelChamadaDoDia({ disciplinaId, data, aoFechar, aoSalvar }: PainelChamadaDoDiaProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [presentes, setPresentes] = useState<Record<number, boolean>>({});
  const [salvando, setSalvando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState("");

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const [alunosCarregados, presencasExistentes] = await Promise.all([
          alunosDaDisciplina(disciplinaId),
          presencasDoDia(disciplinaId, data),
        ]);
        setAlunos(alunosCarregados);

        const presencaInicial: Record<number, boolean> = {};
        for (const aluno of alunosCarregados) {
          presencaInicial[aluno.id] = presencasExistentes[aluno.id] ?? true;
        }
        setPresentes(presencaInicial);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [disciplinaId, data]);

  function aoAlternarPresenca(alunoId: number) {
    setPresentes((presencaAnterior) => ({
      ...presencaAnterior,
      [alunoId]: !presencaAnterior[alunoId],
    }));
  }

  async function aoSalvarChamada(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagemErro("");
    setSalvando(true);

    try {
      const listaPresencas = alunos.map((aluno) => ({
        aluno_id: aluno.id,
        presente: presentes[aluno.id] ?? true,
      }));
      await registrarChamada(disciplinaId, data, listaPresencas);
      aoSalvar();
    } catch (erro) {
      setMensagemErro((erro as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="form-chamada" onSubmit={aoSalvarChamada}>
      <p className="form-chamada-cabecalho">Chamada de {formatarDataBR(data)}</p>

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && alunos.length === 0 && (
        <p className="mensagem-vazia">Nenhum aluno matriculado nessa disciplina.</p>
      )}

      {!carregando && alunos.length > 0 && (
        <ul className="lista-chamada">
          {alunos.map((aluno) => (
            <li key={aluno.id} className="item-chamada">
              <span>{aluno.nome}</span>
              <button
                type="button"
                className={presentes[aluno.id] ? "botao-presenca botao-presente" : "botao-presenca botao-ausente"}
                onClick={() => aoAlternarPresenca(aluno.id)}
              >
                {presentes[aluno.id] ? "Presente" : "Ausente"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mensagemErro !== "" && <p className="campo-erro">{mensagemErro}</p>}

      <div className="form-chamada-acoes">
        <button type="button" className="botao-limpar" onClick={aoFechar}>
          Cancelar
        </button>
        <button type="submit" className="botao-primario" disabled={carregando || alunos.length === 0 || salvando}>
          {salvando ? "Salvando..." : "Salvar chamada"}
        </button>
      </div>
    </form>
  );
}

export default PainelChamadaDoDia;
