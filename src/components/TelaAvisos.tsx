import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Aviso } from "../types";
import { criarAviso, excluirAviso, listarAvisosPagina } from "../api";
import { formatarDataBR, hojeISO } from "../formatar";
import { useAtraso } from "../useAtraso";
import CampoBusca from "./CampoBusca";
import Paginacao from "./Paginacao";

const TAMANHO_PAGINA = 10;

function TelaAvisos() {
  const [params] = useSearchParams();
  const qParam = params.get("q");
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [recarregar, setRecarregar] = useState(0);
  const [q, setQ] = useState(qParam ?? "");
  const qAtrasado = useAtraso(q);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [titulo, setTitulo] = useState("");
  const [mensagemTexto, setMensagemTexto] = useState("");
  const [data, setData] = useState(hojeISO());
  const [mensagemErro, setMensagemErro] = useState("");

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
        const dados = await listarAvisosPagina(qAtrasado, pagina, TAMANHO_PAGINA);
        if (cancelado) {
          return;
        }
        if (dados.itens.length === 0 && pagina > 1) {
          setPagina(pagina - 1);
          return;
        }
        setAvisos(dados.itens);
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

  function limparCampos() {
    setTitulo("");
    setMensagemTexto("");
    setData(hojeISO());
  }

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagemErro("");

    if (titulo.trim() === "") {
      setMensagemErro("Informe o título do aviso.");
      return;
    }
    if (mensagemTexto.trim() === "") {
      setMensagemErro("Informe a mensagem do aviso.");
      return;
    }
    if (data.trim() === "") {
      setMensagemErro("Informe a data do aviso.");
      return;
    }

    try {
      await criarAviso({ titulo, mensagem: mensagemTexto, data });
      setQ("");
      setPagina(1);
      setRecarregar((n) => n + 1);
      limparCampos();
    } catch (erroAviso) {
      setMensagemErro((erroAviso as Error).message);
    }
  }

  async function aoExcluir(id: number) {
    try {
      await excluirAviso(id);
      setRecarregar((n) => n + 1);
    } catch (erroExclusao) {
      setErro((erroExclusao as Error).message);
    }
  }

  return (
    <div className="tela-avisos">
      <h2>Mural de avisos</h2>

      <form className="form-aviso-inline" onSubmit={aoEnviar}>
        <div className="campo">
          <label htmlFor="titulo-aviso">Título</label>
          <input
            id="titulo-aviso"
            type="text"
            placeholder="Ex.: Prova de Python"
            value={titulo}
            onChange={(evento) => setTitulo(evento.target.value)}
          />
        </div>

        <div className="campo campo-carga">
          <label htmlFor="data-aviso">Data</label>
          <input
            id="data-aviso"
            type="date"
            value={data}
            onChange={(evento) => setData(evento.target.value)}
          />
        </div>

        <div className="campo campo-mensagem">
          <label htmlFor="mensagem-aviso">Mensagem</label>
          <textarea
            id="mensagem-aviso"
            placeholder="Detalhes do aviso..."
            value={mensagemTexto}
            onChange={(evento) => setMensagemTexto(evento.target.value)}
          ></textarea>
        </div>

        {mensagemErro !== "" && <p className="campo-erro">{mensagemErro}</p>}

        <button className="botao-primario" type="submit">
          Publicar aviso
        </button>
      </form>
      <CampoBusca valor={q} rotulo="Buscar aviso" placeholder="Buscar aviso pelo título..." aoMudar={(v) => { setQ(v); setPagina(1); }} />

      {carregando && <p className="mensagem-status">Carregando...</p>}
      {!carregando && erro !== "" && <p className="mensagem-erro">{erro}</p>}
      {!carregando && erro === "" && (
        <>
          {avisos.length === 0 && (
            <p className="mensagem-vazia">
              {q !== "" ? "Nenhum aviso encontrado com essa busca." : "Nenhum aviso publicado ainda."}
            </p>
          )}
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
                      <span className="card-aviso-data">{formatarDataBR(aviso.data)}</span>
                    </div>
                    <button
                      className="botao-excluir"
                      type="button"
                      aria-label={`Excluir aviso ${aviso.titulo}`}
                      onClick={() => aoExcluir(aviso.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                  <p className="card-aviso-mensagem">{aviso.mensagem}</p>
                </article>
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

export default TelaAvisos;
