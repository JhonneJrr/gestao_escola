import { useEffect, useState } from "react";
import type { Avaliacao } from "../types";
import { criarAvaliacao, excluirAvaliacao, listarAvaliacoes } from "../api";

interface FormAvaliacaoProps {
  disciplinaId: number;
}

function FormAvaliacao({ disciplinaId }: FormAvaliacaoProps) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");

  const [nome, setNome] = useState("");
  const [peso, setPeso] = useState("");
  const [mensagemErro, setMensagemErro] = useState("");

  async function carregar() {
    setCarregando(true);
    setErroCarregamento("");
    try {
      const dados = await listarAvaliacoes(disciplinaId);
      setAvaliacoes(dados);
    } catch (erro) {
      setErroCarregamento((erro as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [disciplinaId]);

  const somaAtual = avaliacoes.reduce((soma, avaliacao) => soma + avaliacao.peso, 0);
  const restante = 100 - somaAtual;

  async function aoAdicionar(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagemErro("");

    if (nome.trim() === "") {
      setMensagemErro("Informe o nome da avaliação.");
      return;
    }

    const pesoNumero = Number(peso);
    if (peso.trim() === "" || Number.isNaN(pesoNumero) || pesoNumero <= 0 || pesoNumero > 100) {
      setMensagemErro("Informe um peso entre 1 e 100.");
      return;
    }

    try {
      await criarAvaliacao(disciplinaId, nome, pesoNumero);
      setNome("");
      setPeso("");
      await carregar();
    } catch (erro) {
      setMensagemErro((erro as Error).message);
    }
  }

  async function aoExcluir(id: number) {
    setMensagemErro("");
    try {
      await excluirAvaliacao(id);
      await carregar();
    } catch (erro) {
      setMensagemErro((erro as Error).message);
    }
  }

  return (
    <div className="form-avaliacoes">
      <p className="rotulo-secao">Avaliações</p>

      {carregando && <p className="mensagem-status">Carregando...</p>}

      {!carregando && erroCarregamento !== "" && <p className="mensagem-erro">{erroCarregamento}</p>}
      {!carregando && erroCarregamento === "" && avaliacoes.length === 0 && (
        <p className="mensagem-vazia">Nenhuma avaliação cadastrada ainda.</p>
      )}

      {!carregando && avaliacoes.length > 0 && (
        <ul className="lista-avaliacoes">
          {avaliacoes.map((avaliacao) => (
            <li key={avaliacao.id}>
              <span>
                {avaliacao.nome} <span className="peso-avaliacao">peso {avaliacao.peso}</span>
              </span>
              <button className="botao-excluir" type="button" aria-label={`Excluir ${avaliacao.nome}`} onClick={() => aoExcluir(avaliacao.id)}>
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      {!carregando && (
        <>
          <p className="mensagem-status">
            {restante > 0 ? `Faltam ${restante}% para completar 100%.` : "Os pesos já somam 100%."}
          </p>

          {restante > 0 && (
            <form className="form-matricula-inline" onSubmit={aoAdicionar}>
              <div className="campo">
                <label htmlFor={`nome-avaliacao-${disciplinaId}`}>Nome</label>
                <input
                  id={`nome-avaliacao-${disciplinaId}`}
                  type="text"
                  placeholder="Ex.: P1"
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                />
              </div>

              <div className="campo campo-carga">
                <label htmlFor={`peso-avaliacao-${disciplinaId}`}>Peso</label>
                <input
                  id={`peso-avaliacao-${disciplinaId}`}
                  type="number"
                  placeholder={`Até ${restante}`}
                  value={peso}
                  onChange={(evento) => setPeso(evento.target.value)}
                />
              </div>

              <button className="botao-primario" type="submit">
                Adicionar avaliação
              </button>
            </form>
          )}
        </>
      )}

      {mensagemErro !== "" && <p className="campo-erro">{mensagemErro}</p>}
    </div>
  );
}

export default FormAvaliacao;
