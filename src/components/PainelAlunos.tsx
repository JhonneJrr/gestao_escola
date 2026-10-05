import { useEffect, useState } from "react";
import type { Aluno } from "../types";
import { excluirAluno, listarAlunosPagina } from "../api";
import { useAtraso } from "../useAtraso";
import AlunoDrawer from "./AlunoDrawer";
import BotaoVoltar from "./BotaoVoltar";
import Filtros from "./Filtros";
import FormAluno from "./FormAluno";
import ListaAlunos from "./ListaAlunos";
import Paginacao from "./Paginacao";

interface PainelAlunosProps {
  aoVoltar: () => void;
}

const TAMANHO_PAGINA = 10;

function PainelAlunos({ aoVoltar }: PainelAlunosProps) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [recarregar, setRecarregar] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [q, setQ] = useState("");
  const [idadeMinima, setIdadeMinima] = useState("");
  const [mediaMinima, setMediaMinima] = useState("");
  const qAtrasado = useAtraso(q);

  const [alunoAberto, setAlunoAberto] = useState<Aluno | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const dados = await listarAlunosPagina(
          {
            q: qAtrasado === "" ? undefined : qAtrasado,
            idade_minima: idadeMinima === "" ? undefined : Number(idadeMinima),
            media_minima: mediaMinima === "" ? undefined : Number(mediaMinima),
          },
          pagina,
          TAMANHO_PAGINA
        );
        if (cancelado) {
          return;
        }
        if (dados.itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }
        setAlunos(dados.itens);
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
  }, [qAtrasado, idadeMinima, mediaMinima, pagina, recarregar]);

  function mudarQ(valor: string) {
    setQ(valor);
    setPagina(1);
  }
  function mudarIdadeMinima(valor: string) {
    setIdadeMinima(valor);
    setPagina(1);
  }
  function mudarMediaMinima(valor: string) {
    setMediaMinima(valor);
    setPagina(1);
  }

  function limparFiltros() {
    setQ("");
    setIdadeMinima("");
    setMediaMinima("");
    setPagina(1);
  }

  function aoCriarAluno() {
    limparFiltros();
    setRecarregar(recarregar + 1);
  }

  async function aoExcluir(id: number) {
    try {
      await excluirAluno(id);
      if (alunoAberto?.id === id) {
        setAlunoAberto(null);
      }
      setRecarregar(recarregar + 1);
    } catch (erroExclusao) {
      setErro((erroExclusao as Error).message);
    }
  }

  useEffect(() => {
    document.title = `Portal — ${total} alunos`;
  }, [total]);

  const temFiltroAtivo = q !== "" || idadeMinima !== "" || mediaMinima !== "";
  const mensagemVazia = temFiltroAtivo
    ? "Nenhum aluno encontrado com esses filtros."
    : "Nenhum aluno cadastrado ainda.";

  return (
    <main className="conteudo">
      <section className="painel">
        <BotaoVoltar aoVoltar={aoVoltar} />

        <h2>Gestão de Alunos</h2>

        <Filtros
          q={q}
          idadeMinima={idadeMinima}
          mediaMinima={mediaMinima}
          aoMudarQ={mudarQ}
          aoMudarIdadeMinima={mudarIdadeMinima}
          aoMudarMediaMinima={mudarMediaMinima}
          aoLimpar={limparFiltros}
        />
        {carregando && <p className="mensagem-status">Carregando...</p>}
        {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}
        {!carregando && erro === "" && (
          <>
            <p className="contagem">
              <strong>{total}</strong> aluno(s) encontrado(s)
            </p>
            <ListaAlunos
              alunos={alunos}
              mensagemVazia={mensagemVazia}
              aoAbrir={setAlunoAberto}
              aoExcluir={aoExcluir}
            />
            <Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={total} aoMudar={setPagina} />
          </>
        )}
      </section>

      <FormAluno aoCriarAluno={aoCriarAluno} />

      {alunoAberto && (
        <AlunoDrawer aluno={alunoAberto} aoFechar={() => setAlunoAberto(null)} aoExcluir={aoExcluir} />
      )}
    </main>
  );
}

export default PainelAlunos;
