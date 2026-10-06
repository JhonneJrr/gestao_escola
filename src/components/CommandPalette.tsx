import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buscaGlobal, type ResultadosDaBusca } from "../api";
import { formatarDataBR } from "../formatar";
import Avatar from "../ui/Avatar";
import { useAtraso } from "../useAtraso";

interface CommandPaletteProps {
  aoFechar: () => void;
}

interface ItemDaPaleta {
  chave: string;
  grupo: string;
  titulo: string;
  detalhe: string;
  destino: string;
  avatar?: string;
}

const PAGINAS: ItemDaPaleta[] = [
  { chave: "p-painel", grupo: "Ir para", titulo: "Painel", detalhe: "Indicadores da turma", destino: "/" },
  { chave: "p-alunos", grupo: "Ir para", titulo: "Alunos", detalhe: "Lista e cadastro", destino: "/alunos" },
  { chave: "p-disciplinas", grupo: "Ir para", titulo: "Disciplinas", detalhe: "Lista e cadastro", destino: "/disciplinas" },
  { chave: "p-matriculas", grupo: "Ir para", titulo: "Matrículas", detalhe: "Vincular alunos às disciplinas", destino: "/matriculas" },
  { chave: "p-boletim", grupo: "Ir para", titulo: "Boletim", detalhe: "Notas por aluno", destino: "/boletim" },
  { chave: "p-frequencia", grupo: "Ir para", titulo: "Frequência", detalhe: "Chamada e presença", destino: "/frequencia" },
  { chave: "p-avisos", grupo: "Ir para", titulo: "Avisos", detalhe: "Mural de avisos", destino: "/avisos" },
];

function montarItens(resultados: ResultadosDaBusca): ItemDaPaleta[] {
  return [
    ...resultados.alunos.map((aluno) => ({
      chave: `a-${aluno.id}`,
      grupo: "Alunos",
      titulo: aluno.nome,
      detalhe: `Matrícula ${aluno.matricula}`,
      destino: `/alunos?aluno=${aluno.id}`,
      avatar: aluno.nome,
    })),
    ...resultados.disciplinas.map((disciplina) => ({
      chave: `d-${disciplina.id}`,
      grupo: "Disciplinas",
      titulo: disciplina.nome,
      detalhe: `${disciplina.carga_horaria}h`,
      destino: `/disciplinas?q=${encodeURIComponent(disciplina.nome)}`,
    })),
    ...resultados.avisos.map((aviso) => ({
      chave: `v-${aviso.id}`,
      grupo: "Avisos",
      titulo: aviso.titulo,
      detalhe: formatarDataBR(aviso.data),
      destino: `/avisos?q=${encodeURIComponent(aviso.titulo)}`,
    })),
  ];
}

function CommandPalette({ aoFechar }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const qAtrasado = useAtraso(q.trim());
  const [itens, setItens] = useState<ItemDaPaleta[]>(PAGINAS);
  const [ativo, setAtivo] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const buscando = q.trim() !== qAtrasado || carregando;
  const itensDisponiveis = buscando || erro !== "" ? [] : itens;
  const campo = useRef<HTMLInputElement>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const navegou = useRef(false);

  useEffect(() => {
    const acionador = document.activeElement;
    const dialogo = caixa.current;
    campo.current?.focus();
    return () => {
      if (!navegou.current && acionador instanceof HTMLElement && acionador.isConnected &&
          (document.activeElement === document.body || dialogo?.contains(document.activeElement))) {
        acionador.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (qAtrasado === "") {
      setItens(PAGINAS);
      setAtivo(0);
      setErro("");
      setCarregando(false);
      return;
    }
    let cancelado = false;
    async function buscar() {
      setCarregando(true);
      setErro("");
      try {
        const resultados = await buscaGlobal(qAtrasado);
        if (!cancelado) {
          setItens(montarItens(resultados));
          setAtivo(0);
        }
      } catch (e) {
        if (!cancelado) {
          setErro((e as Error).message);
          setItens([]);
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }
    buscar();
    return () => {
      cancelado = true;
    };
  }, [qAtrasado]);

  function abrir(item: ItemDaPaleta | undefined) {
    if (buscando || !item) {
      return;
    }
    navegou.current = item.destino.split("?")[0] !== pathname;
    aoFechar();
    navigate(item.destino);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === "Tab") {
      const focaveis = caixa.current?.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button");
      const primeiro = focaveis?.[0];
      const ultimo = focaveis?.[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo?.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro?.focus();
      }
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      evento.nativeEvent.stopImmediatePropagation();
      aoFechar();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAtivo((indice) => (itensDisponiveis.length === 0 ? 0 : (indice + 1) % itensDisponiveis.length));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtivo((indice) => (itensDisponiveis.length === 0 ? 0 : (indice - 1 + itensDisponiveis.length) % itensDisponiveis.length));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      abrir(itensDisponiveis[ativo]);
    }
  }

  // agrupa mantendo a ordem para exibir os rotulos de grupo
  const grupos: { nome: string; itens: { item: ItemDaPaleta; indice: number }[] }[] = [];
  itensDisponiveis.forEach((item, indice) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nome === item.grupo) {
      ultimo.itens.push({ item, indice });
    } else {
      grupos.push({ nome: item.grupo, itens: [{ item, indice }] });
    }
  });

  return (
    <div className="paleta" onMouseDown={aoFechar}>
      <div
        ref={caixa}
        className="paleta-caixa"
        role="dialog"
        aria-modal="true"
        aria-label="Busca global"
        onMouseDown={(evento) => evento.stopPropagation()}
        onKeyDown={aoTeclar}
      >
        <div className="paleta-campo">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 21-4.34-4.34"></path>
            <circle cx="11" cy="11" r="8"></circle>
          </svg>
          <input
            ref={campo}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="paleta-resultados"
            aria-activedescendant={itensDisponiveis[ativo] ? `paleta-${itensDisponiveis[ativo].chave}` : undefined}
            aria-label="Buscar alunos, disciplinas e avisos"
            placeholder="Buscar alunos, disciplinas e avisos..."
            value={q}
            onChange={(evento) => setQ(evento.target.value)}
          />
        </div>
        <div id="paleta-resultados" className="paleta-lista" role="listbox" aria-label="Resultados">
          {buscando && <p className="paleta-estado">Buscando…</p>}
          {!buscando && erro !== "" && <p className="paleta-estado mensagem-erro">{erro}</p>}
          {!buscando && erro === "" && itensDisponiveis.length === 0 && (
            <p className="paleta-estado">Nada encontrado para "{qAtrasado}".</p>
          )}
          {erro === "" &&
            grupos.map((grupo) => (
              <div key={grupo.nome}>
                <p className="paleta-grupo">{grupo.nome}</p>
                {grupo.itens.map(({ item, indice }) => (
                  <button
                    key={item.chave}
                    id={`paleta-${item.chave}`}
                    type="button"
                    role="option"
                    aria-selected={indice === ativo}
                    className={indice === ativo ? "paleta-item paleta-item-ativo" : "paleta-item"}
                    onFocus={() => setAtivo(indice)}
                    onMouseEnter={() => setAtivo(indice)}
                    onClick={() => abrir(item)}
                  >
                    {item.avatar && <Avatar nome={item.avatar} tamanho="sm" />}
                    <span className="paleta-titulo">{item.titulo}</span>
                    <span className="paleta-detalhe">{item.detalhe}</span>
                  </button>
                ))}
              </div>
            ))}
        </div>
        <p className="paleta-rodape">↑↓ navegar · Enter abrir · Esc fechar</p>
      </div>
    </div>
  );
}

export default CommandPalette;
