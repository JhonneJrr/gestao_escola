import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DisciplinaComContagem } from "../types";
import { excluirDisciplina, listarDisciplinasPagina } from "../api";
import { useAtraso } from "../useAtraso";
import CampoBusca from "./CampoBusca";
import DisciplinaCard from "./DisciplinaCard";
import FormDisciplina from "./FormDisciplina";
import Paginacao from "./Paginacao";

const TAMANHO_PAGINA = 10;

function TelaDisciplinas() {
  const [params] = useSearchParams();
  const qParam = params.get("q");
  const [disciplinas, setDisciplinas] = useState<DisciplinaComContagem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [recarregar, setRecarregar] = useState(0);
  const [q, setQ] = useState(qParam ?? "");
  const qAtrasado = useAtraso(q);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // a paleta pode mudar o ?q= com a tela ja aberta
  useEffect(() => {
    if (qParam !== null) {
      setQ(qParam);
      setPagina(1);
    }
  }, [qParam]);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const dados = await listarDisciplinasPagina(qAtrasado, pagina, TAMANHO_PAGINA);
        if (cancelado) {
          return;
        }
        if (dados.itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }
        setDisciplinas(dados.itens);
        setTotal(dados.total);
      } catch (e) {
        if (!cancelado) {
          setErro((e as Error).message);
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
  }, [qAtrasado, pagina, recarregar]);

  function aoCriarDisciplina() {
    setQ("");
    setPagina(1);
    setRecarregar((n) => n + 1);
  }

  async function aoExcluir(id: number) {
    try {
      await excluirDisciplina(id);
      setRecarregar((n) => n + 1);
    } catch (erroExclusao) {
      setErro((erroExclusao as Error).message);
    }
  }

  return (
    <div className="tela-disciplinas">
      <h2>Disciplinas</h2>

      <FormDisciplina aoCriarDisciplina={aoCriarDisciplina} />
      <CampoBusca valor={q} rotulo="Buscar disciplina" placeholder="Buscar disciplina..." aoMudar={(v) => { setQ(v); setPagina(1); }} />

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}
      {!carregando && erro === "" && (
        <>
          <p className="contagem">
            <strong>{total}</strong> disciplina(s) encontrada(s)
          </p>
          {disciplinas.length === 0 && (
            <p className="mensagem-vazia">
              {q !== "" ? "Nenhuma disciplina encontrada com essa busca." : "Nenhuma disciplina cadastrada ainda."}
            </p>
          )}
          {disciplinas.length > 0 && (
            <div className="grade-disciplinas">
              {disciplinas.map((disciplina) => (
                <DisciplinaCard key={disciplina.id} disciplina={disciplina} aoExcluir={aoExcluir} />
              ))}
            </div>
          )}
        </>
      )}
      {erro === "" && (
        <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={total} aoMudar={setPagina} />
      )}
    </div>
  );
}

export default TelaDisciplinas;
