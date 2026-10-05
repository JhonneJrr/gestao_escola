# Fase 3 — Dashboard novo, busca e paginação (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Listas de Alunos, Disciplinas e Avisos paginadas no servidor com busca, painel novo sobre `GET /dashboard`, e a data do aviso no formato que a API aceita.

**Architecture:** `api.ts` ganha funções `*Pagina` e `resumoDoDashboard` (as listas completas ficam para os seletores); dois utilitários pequenos (`useAtraso`, `formatar`); dois componentes novos (`Paginacao`, `CampoBusca`); as três telas passam a ter estado `pagina` + busca com atraso + recarga explícita; `TelaDashboard` é reescrita sobre uma única chamada.

**Tech Stack:** React 19, Vite, TypeScript, axios, Playwright (`playwright-core` + Edge) no smoke. Backend FastAPI pronto (`gestao-alunos` `main` @ 6eb0ef4).

**Spec:** `docs/superpowers/specs/2026-10-05-fase3-dashboard-paginacao-design.md`

## Global Constraints

- Tamanho de página fixo: 10 (constante `TAMANHO_PAGINA = 10` em cada tela que pagina).
- Paginação, busca e filtros são no servidor (`GET /alunos|/disciplinas|/avisos` com `q`, `pagina`, `tamanho`); a API devolve `{itens,total,pagina,tamanho}`.
- Datas na API: `AAAA-MM-DD`; na tela: `DD/MM/AAAA`.
- Nenhum componente chama a rede fora de `api.ts`/`http.ts`/`AuthContext`. Erro de carga mostra `(erro as Error).message` com a classe `mensagem-erro`.
- Código simples, nível de curso: props tipadas por `interface`, sem `any`, sem biblioteca nova. Comentários só onde o "porquê" não é óbvio. Texto de UI em pt-br com acentos.
- Commits: 1 linha, sem acento, **sem Co-Authored-By nem menção a IA**. Sem push.
- Execução pelo Codex (por decisão do dono, inclusive UI nova); o orquestrador escreve a direção visual no briefing e VÊ as capturas (desktop 1280 e celular 390) antes de aceitar.
- Ambiente: API em `http://localhost:8000` com `python seed.py --apagar-tudo` aplicado; front em `http://localhost:5175` (a 5173 costuma estar ocupada); smoke: `FRONT_URL=http://localhost:5175 npm run smoke`. Logins: `prof@escola.com`, `ana@escola.com`, senha `escola123`. O Codex não alcança API nem navegador: roda só `npx tsc -b`, `npm run build` e `node --check`.

## Direção visual (vai no briefing das Tasks 2 e 3)

Mundo atual: monocromático editorial. Tokens do `:root` (`--fundo`, `--superficie`, `--borda`, `--borda-fraca`, `--texto`, `--texto-suave`, `--texto-fraco`, `--aviso`, `--raio:2px`, `--espaco`); títulos Newsreader, corpo Space Grotesk; bordas 1px; botões pretos ou com borda; sem sombra forte, sem gradiente, sem cor nova. Reaproveitar `.campo-busca`, `.botao-limpar`, `.contagem`, `.indicador`, `.painel-risco`, `.lista-risco`, `.valor-risco`, `.rotulo-secao`.
- `Paginacao`: linha abaixo da lista, `display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-top:20px; padding-top:16px; border-top:1px solid var(--borda-fraca)`. Resumo à esquerda em 13px `--texto-suave`. À direita Anterior · "Página X de Y" (13px `--texto-fraco`) · Próxima. `.botao-pagina`: min-height 36px, padding 6px 14px, borda 1px `var(--borda)`, fundo transparente, peso 600, raio `var(--raio)`, hover borda `var(--texto)`, `:disabled` opacidade .45 e cursor not-allowed sem hover, foco visível (outline 3px `var(--texto)`, offset 2px). Em ≤720px: resumo em cima, botões embaixo ocupando a linha.
- `CampoBusca`: reaproveita exatamente a aparência do campo de busca de `Filtros` (ícone de lupa + input) em largura total, max-width 360px; margem inferior `var(--espaco)`.
- Painel novo: grade de 4 indicadores (já existe `.grade-indicadores`/`.indicador`); abaixo, duas colunas em ≥900px (Em risco | Ranking) e uma coluna em telas menores; depois avaliações pendentes. `.motivo-risco`: 12px, `--aviso`, caixa normal; fica numa segunda linha do item, sem quebrar o valor. `.lista-ranking`: `<ol>` sem marcador com o número da posição em Newsreader itálico 20px, nome, e a média alinhada à direita em `.valor-risco`; o 1º lugar com o nome em peso 600.

## Review Focus

- Busca com atraso: digitar rápido não deixa a resposta antiga sobrescrever a nova (flag `cancelado`).
- Mudar busca ou filtro volta à página 1; excluir o único item da última página volta uma página (não mostra "nenhum aluno" com total > 0).
- Página além do fim (`pagina` maior que as existentes) cai de volta e nunca fica em branco.
- Busca sem resultado mostra a mensagem de "nenhum ... encontrado" e esconde a paginação.
- Dashboard com banco vazio ou aluno sem notas/aulas (`null`): mostra "—", sem `NaN`, sem `toFixed` em `null`.
- Aviso criado pela UI vai com `AAAA-MM-DD` (POST 201) e aparece como `DD/MM/AAAA`; data vazia continua barrada.
- Total muda por outra aba/usuário: a contagem vem sempre do `total` da última resposta.

---

### Task 1: Camada de dados — `api.ts`, `useAtraso`, `formatar`

**Files:**
- Modify: `src/api.ts`
- Create: `src/useAtraso.ts`, `src/formatar.ts`

**Interfaces:**
- Produces (`api.ts`): `export interface Pagina<T> { itens: T[]; total: number; pagina: number; tamanho: number }`; `listarAlunosPagina(filtros: FiltrosAluno, pagina: number, tamanho?: number): Promise<Pagina<Aluno>>`; `listarDisciplinasPagina(q: string, pagina: number, tamanho?: number): Promise<Pagina<DisciplinaComContagem>>`; `listarAvisosPagina(q: string, pagina: number, tamanho?: number): Promise<Pagina<Aviso>>`; `resumoDoDashboard(): Promise<ResumoDoDashboard>` com `ResumoAluno { id: number; nome: string; mediaGeral: number | null; frequenciaGeral: number | null }` e `ResumoDoDashboard { totalAlunos: number; totalDisciplinas: number; mediaTurma: number | null; frequenciaMedia: number | null; alunosEmRisco: ResumoAluno[]; ranking: ResumoAluno[] }`. REMOVE `listarDisciplinasComContagem`.
- Produces: `useAtraso<T>(valor: T, ms?: number): T` (padrão 300); `formatarDataBR(iso: string): string`; `hojeISO(): string`.

- [ ] **Step 1: `src/useAtraso.ts`**
```ts
import { useEffect, useState } from "react";

// Devolve o valor so depois que ele parar de mudar por `ms` (evita uma chamada a cada tecla)
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const tempo = window.setTimeout(() => setAtrasado(valor), ms);
    return () => window.clearTimeout(tempo);
  }, [valor, ms]);

  return atrasado;
}
```

- [ ] **Step 2: `src/formatar.ts`**
```ts
// A API fala AAAA-MM-DD; a tela mostra DD/MM/AAAA
export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) {
    return iso;
  }
  return `${dia}/${mes}/${ano}`;
}

export function hojeISO(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}
```

- [ ] **Step 3: `src/api.ts`** — (a) trocar `interface Pagina<T> {` por `export interface Pagina<T> {`; (b) REMOVER a função `listarDisciplinasComContagem` inteira; (c) acrescentar, depois de `listarAlunos`:
```ts
export async function listarAlunosPagina(
  filtros: FiltrosAluno,
  pagina: number,
  tamanho = 10
): Promise<Pagina<Aluno>> {
  const { data } = await http.get<Pagina<Aluno>>("/alunos", {
    params: {
      q: filtros.q === "" ? undefined : filtros.q,
      idade_minima: filtros.idade_minima,
      media_minima: filtros.media_minima,
      pagina,
      tamanho,
    },
  });
  return data;
}
```
depois de `listarDisciplinas`:
```ts
export async function listarDisciplinasPagina(
  q: string,
  pagina: number,
  tamanho = 10
): Promise<Pagina<DisciplinaComContagem>> {
  const { data } = await http.get<Pagina<Disciplina>>("/disciplinas", {
    params: { q: q === "" ? undefined : q, pagina, tamanho },
  });
  const itens = await Promise.all(
    data.itens.map(async (disciplina) => {
      const alunos = await alunosDaDisciplina(disciplina.id);
      return { ...disciplina, totalAlunos: alunos.length };
    })
  );
  return { ...data, itens };
}
```
depois de `listarAvisos`:
```ts
export async function listarAvisosPagina(q: string, pagina: number, tamanho = 10): Promise<Pagina<Aviso>> {
  const { data } = await http.get<Pagina<Aviso>>("/avisos", {
    params: { q: q === "" ? undefined : q, pagina, tamanho },
  });
  return data;
}
```
e no fim do arquivo:
```ts
// ----------------------------- painel -----------------------------

export interface ResumoAluno {
  id: number;
  nome: string;
  mediaGeral: number | null;
  frequenciaGeral: number | null;
}

export interface ResumoDoDashboard {
  totalAlunos: number;
  totalDisciplinas: number;
  mediaTurma: number | null;
  frequenciaMedia: number | null;
  alunosEmRisco: ResumoAluno[];
  ranking: ResumoAluno[];
}

interface ResumoAlunoDaApi {
  id: number;
  nome: string;
  media_geral: number | null;
  frequencia_geral: number | null;
}

interface DashboardDaApi {
  total_alunos: number;
  total_disciplinas: number;
  media_turma: number | null;
  frequencia_media: number | null;
  alunos_em_risco: ResumoAlunoDaApi[];
  ranking: ResumoAlunoDaApi[];
}

function converterResumo(aluno: ResumoAlunoDaApi): ResumoAluno {
  return {
    id: aluno.id,
    nome: aluno.nome,
    mediaGeral: aluno.media_geral,
    frequenciaGeral: aluno.frequencia_geral,
  };
}

export async function resumoDoDashboard(): Promise<ResumoDoDashboard> {
  const { data } = await http.get<DashboardDaApi>("/dashboard");
  return {
    totalAlunos: data.total_alunos,
    totalDisciplinas: data.total_disciplinas,
    mediaTurma: data.media_turma,
    frequenciaMedia: data.frequencia_media,
    alunosEmRisco: data.alunos_em_risco.map(converterResumo),
    ranking: data.ranking.map(converterResumo),
  };
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc -b`
Expected: erro SÓ em `src/components/TelaDisciplinas.tsx` (importa `listarDisciplinasComContagem`, removida); resolvido na Task 2. Nenhum outro erro.

- [ ] **Step 5: Commit**
```bash
git add src/api.ts src/useAtraso.ts src/formatar.ts
git commit -m "Adiciona funcoes paginadas, resumo do painel e utilitarios"
```

---

### Task 2: Paginação e busca nas telas + data do aviso (UI — Codex com a direção visual acima)

**Files:**
- Create: `src/components/Paginacao.tsx`, `src/components/CampoBusca.tsx`
- Modify: `src/components/PainelAlunos.tsx`, `src/components/Filtros.tsx`, `src/components/TelaDisciplinas.tsx`, `src/components/TelaAvisos.tsx`, `src/components/TelaModoAluno.tsx` (só a exibição da data), `src/index.css`

**Interfaces:**
- Consumes: Task 1 (`listarAlunosPagina`, `listarDisciplinasPagina`, `listarAvisosPagina`, `useAtraso`, `formatarDataBR`, `hojeISO`).
- Produces: `Paginacao({ pagina, tamanho, total, aoMudar })`; `CampoBusca({ valor, rotulo, placeholder, aoMudar })` (o `rotulo` vira o `aria-label` do input).

- [ ] **Step 1: `src/components/Paginacao.tsx`**
```tsx
interface PaginacaoProps {
  pagina: number;
  tamanho: number;
  total: number;
  aoMudar: (pagina: number) => void;
}

function Paginacao({ pagina, tamanho, total, aoMudar }: PaginacaoProps) {
  if (total === 0) {
    return null;
  }

  const inicio = (pagina - 1) * tamanho + 1;
  const fim = Math.min(pagina * tamanho, total);
  const totalPaginas = Math.ceil(total / tamanho);

  return (
    <nav className="paginacao" aria-label="Paginação">
      <span className="paginacao-resumo">
        Mostrando {inicio}–{fim} de {total}
      </span>
      <div className="paginacao-botoes">
        <button className="botao-pagina" type="button" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
          Anterior
        </button>
        <span className="paginacao-posicao">
          Página {pagina} de {totalPaginas}
        </span>
        <button
          className="botao-pagina"
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => aoMudar(pagina + 1)}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}

export default Paginacao;
```

- [ ] **Step 2: `src/components/CampoBusca.tsx`** (a casca e o SVG são os MESMOS do campo de busca de `Filtros.tsx`; copie de lá o `<div className="campo-busca">…</div>`)
```tsx
interface CampoBuscaProps {
  valor: string;
  rotulo: string;
  placeholder: string;
  aoMudar: (valor: string) => void;
}

function CampoBusca({ valor, rotulo, placeholder, aoMudar }: CampoBuscaProps) {
  return (
    <div className="campo-busca campo-busca-isolado">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 21-4.34-4.34"></path>
        <circle cx="11" cy="11" r="8"></circle>
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        aria-label={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
    </div>
  );
}

export default CampoBusca;
```

- [ ] **Step 3: `Filtros.tsx`** — no input de busca, trocar `placeholder="Buscar por nome..."` por `placeholder="Buscar por nome ou matrícula..."` e `aria-label="Buscar por nome"` por `aria-label="Buscar por nome ou matrícula"`.

- [ ] **Step 4: `PainelAlunos.tsx`** — trocar `listarAlunos` por `listarAlunosPagina`, acrescentar `useAtraso`/`Paginacao`, e substituir o estado/efeito/handlers. Trechos (o JSX de `Filtros`, `ListaAlunos`, `FormAluno` e `AlunoDrawer` continua; mudam só as props indicadas):
```tsx
const TAMANHO_PAGINA = 10;

// dentro do componente:
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
```
No JSX: `Filtros` recebe `aoMudarQ={mudarQ}`, `aoMudarIdadeMinima={mudarIdadeMinima}`, `aoMudarMediaMinima={mudarMediaMinima}`; a contagem usa `total` (`<strong>{total}</strong> aluno(s) encontrado(s)`); depois de `<ListaAlunos .../>` entra `<Paginacao pagina={pagina} tamanho={TAMANHO_PAGINA} total={total} aoMudar={setPagina} />`; `FormAluno` continua com `aoCriarAluno={aoCriarAluno}` (o parâmetro `novo` do callback pode ser ignorado: `FormAluno` chama `aoCriarAluno(novoAluno)` e a função acima tem zero parâmetros, o que o TypeScript aceita).

- [ ] **Step 5: `TelaDisciplinas.tsx`** — mesmo padrão. Imports: `listarDisciplinasPagina`, `excluirDisciplina`, `useAtraso`, `CampoBusca`, `Paginacao`; estados `disciplinas: DisciplinaComContagem[]`, `total`, `pagina`, `recarregar`, `q`, `qAtrasado = useAtraso(q)`, `carregando`, `erro`; o `useEffect` é o mesmo de `PainelAlunos` com `listarDisciplinasPagina(qAtrasado, pagina, TAMANHO_PAGINA)` e dependências `[qAtrasado, pagina, recarregar]`, flag `cancelado` e a volta de página quando `itens` vazio e `pagina > 1`. `aoCriarDisciplina()` (sem parâmetro) faz `setQ("")`, `setPagina(1)`, `setRecarregar(recarregar + 1)`; `aoExcluir` chama `excluirDisciplina`, depois `setRecarregar(recarregar + 1)` (erro em `setErro`). JSX: entre `<FormDisciplina .../>` e o estado de carga, `<CampoBusca valor={q} rotulo="Buscar disciplina" placeholder="Buscar disciplina..." aoMudar={(v) => { setQ(v); setPagina(1); }} />`; contagem `<strong>{total}</strong> disciplina(s) encontrada(s)`; mensagem vazia: `q !== "" ? "Nenhuma disciplina encontrada com essa busca." : "Nenhuma disciplina cadastrada ainda."`; `<Paginacao .../>` depois da `grade-disciplinas`.

- [ ] **Step 6: `TelaAvisos.tsx`** — mesmo padrão com `listarAvisosPagina(qAtrasado, pagina, TAMANHO_PAGINA)`; `CampoBusca` com `rotulo="Buscar aviso"` e `placeholder="Buscar aviso pelo título..."` ENTRE o formulário e a grade; `<Paginacao .../>` depois da grade; vazio: `q !== "" ? "Nenhum aviso encontrado com essa busca." : "Nenhum aviso publicado ainda."`. Em `aoEnviar`, depois de `criarAviso(...)` com sucesso: `setQ("")`, `setPagina(1)`, `setRecarregar(recarregar + 1)`, `limparCampos()` (não inserir manualmente no array). `aoExcluir`: `excluirAviso` e depois `setRecarregar(recarregar + 1)`.
  **Data (contrato):** o estado `data` inicia em `hojeISO()` e `limparCampos` o devolve a `hojeISO()`; o input vira `<input id="data-aviso" type="date" value={data} onChange={...} />` (sem `placeholder`); a data exibida no card é `{formatarDataBR(aviso.data)}`. Importar `formatarDataBR`, `hojeISO` de `../formatar`.

- [ ] **Step 7: `TelaModoAluno.tsx`** — importar `formatarDataBR` e trocar `{aviso.data}` por `{formatarDataBR(aviso.data)}`.

- [ ] **Step 8: Estilos em `src/index.css`** conforme a "Direção visual": `.paginacao`, `.paginacao-resumo`, `.paginacao-botoes`, `.paginacao-posicao`, `.botao-pagina`, `.campo-busca-isolado` (max-width 360px, margem inferior `var(--espaco)`), e o `@media (max-width: 720px)` da paginação. Sem tokens novos.

- [ ] **Step 9: Verificar**

Run: `npx tsc -b` e `npm run build`
Expected: ambos limpos. `Select-String -Path src\components\*.tsx -Pattern "listarDisciplinasComContagem"` vazio.

- [ ] **Step 10: Commit**
```bash
git add -A src
git commit -m "Adiciona paginacao e busca em alunos, disciplinas e avisos"
```

---

### Task 3: Painel novo sobre `GET /dashboard` (UI — Codex com a direção visual acima)

**Files:**
- Modify (reescrever): `src/components/TelaDashboard.tsx`
- Modify: `src/index.css` (`.lista-ranking`, `.motivo-risco`, colunas do painel)

**Interfaces:**
- Consumes: `resumoDoDashboard`, `avaliacoesSemNotaLancada`, tipos `ResumoDoDashboard`, `ResumoAluno`, `AvaliacaoPendente` (de `../api`).
- Produces: `TelaDashboard({ aoVoltar })` (mesma assinatura).

- [ ] **Step 1: Reescrever `src/components/TelaDashboard.tsx`**
```tsx
import { useEffect, useState } from "react";
import { avaliacoesSemNotaLancada, resumoDoDashboard } from "../api";
import type { AvaliacaoPendente, ResumoAluno, ResumoDoDashboard } from "../api";
import BotaoVoltar from "./BotaoVoltar";

interface TelaDashboardProps {
  aoVoltar: () => void;
}

function motivosDeRisco(aluno: ResumoAluno): string[] {
  const motivos: string[] = [];
  if (aluno.mediaGeral !== null && aluno.mediaGeral < 6) {
    motivos.push("média abaixo de 6");
  }
  if (aluno.frequenciaGeral !== null && aluno.frequenciaGeral < 75) {
    motivos.push("frequência abaixo de 75%");
  }
  return motivos;
}

function TelaDashboard({ aoVoltar }: TelaDashboardProps) {
  const [resumo, setResumo] = useState<ResumoDoDashboard | null>(null);
  const [pendentes, setPendentes] = useState<AvaliacaoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const [resumoCarregado, pendentesCarregadas] = await Promise.all([
          resumoDoDashboard(),
          avaliacoesSemNotaLancada(),
        ]);
        setResumo(resumoCarregado);
        setPendentes(pendentesCarregadas);
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  if (carregando) {
    return (
      <div className="tela-dashboard">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <p className="mensagem-status">Carregando...</p>
      </div>
    );
  }

  if (erro !== "" || resumo === null) {
    return (
      <div className="tela-dashboard">
        <BotaoVoltar aoVoltar={aoVoltar} />
        <p className="mensagem-erro">{erro !== "" ? erro : "Não foi possível carregar os indicadores."}</p>
      </div>
    );
  }

  return (
    <div className="tela-dashboard">
      <BotaoVoltar aoVoltar={aoVoltar} />

      <h2>Painel</h2>

      <div className="grade-indicadores">
        <div className="indicador">
          <span className="indicador-valor">{resumo.totalAlunos}</span>
          <span className="indicador-rotulo">alunos</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{resumo.mediaTurma === null ? "—" : resumo.mediaTurma.toFixed(1)}</span>
          <span className="indicador-rotulo">média da turma</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">
            {resumo.frequenciaMedia === null ? "—" : `${resumo.frequenciaMedia.toFixed(0)}%`}
          </span>
          <span className="indicador-rotulo">frequência média</span>
        </div>
        <div className="indicador">
          <span className="indicador-valor">{pendentes.length}</span>
          <span className="indicador-rotulo">avaliações sem nota lançada</span>
        </div>
      </div>

      <div className="painel-colunas">
        <div className="painel-risco">
          <p className="rotulo-secao">Em risco</p>
          {resumo.alunosEmRisco.length === 0 && <p className="mensagem-vazia">Nenhum aluno em risco.</p>}
          {resumo.alunosEmRisco.length > 0 && (
            <ul className="lista-risco">
              {resumo.alunosEmRisco.map((aluno) => (
                <li key={aluno.id}>
                  <div>
                    <span>{aluno.nome}</span>
                    <span className="motivo-risco">{motivosDeRisco(aluno).join(" · ")}</span>
                  </div>
                  <span className="valor-risco">
                    {aluno.mediaGeral === null ? "—" : aluno.mediaGeral.toFixed(1)} ·{" "}
                    {aluno.frequenciaGeral === null ? "—" : `${aluno.frequenciaGeral.toFixed(0)}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="painel-risco">
          <p className="rotulo-secao">Ranking — top 5</p>
          {resumo.ranking.length === 0 && <p className="mensagem-vazia">Ainda não há notas lançadas.</p>}
          {resumo.ranking.length > 0 && (
            <ol className="lista-ranking">
              {resumo.ranking.map((aluno, indice) => (
                <li key={aluno.id}>
                  <span className="posicao-ranking">{indice + 1}</span>
                  <span className={indice === 0 ? "nome-ranking nome-ranking-primeiro" : "nome-ranking"}>
                    {aluno.nome}
                  </span>
                  <span className="valor-risco">{aluno.mediaGeral === null ? "—" : aluno.mediaGeral.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="painel-risco">
        <p className="rotulo-secao">Avaliações sem nenhuma nota lançada</p>
        {pendentes.length === 0 && <p className="mensagem-vazia">Todas as avaliações já têm alguma nota.</p>}
        {pendentes.length > 0 && (
          <ul className="lista-risco">
            {pendentes.map((item) => (
              <li key={item.avaliacao.id}>
                <span>
                  {item.disciplina.nome} — {item.avaliacao.nome}
                </span>
                <span className="valor-risco">peso {item.avaliacao.peso}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TelaDashboard;
```

- [ ] **Step 2: Estilos** em `src/index.css`: `.painel-colunas` (grade de 2 colunas em ≥900px, 1 coluna abaixo), `.motivo-risco` (bloco de 12px, `--aviso`, `display:block`), `.lista-ranking`, `.posicao-ranking`, `.nome-ranking`, `.nome-ranking-primeiro` conforme a "Direção visual". Sem tokens novos.

- [ ] **Step 3: Verificar**

Run: `npx tsc -b` e `npm run build`
Expected: limpos. `Select-String -Path src -Pattern "situacaoDoAluno" -Recurse` mostra a função só em `api.ts`, `AlunoCard.tsx`, `AlunoDrawer.tsx`, `ResumoAluno.tsx` (o painel não a usa mais).

- [ ] **Step 4: Commit**
```bash
git add -A src
git commit -m "Reescreve o painel sobre o GET /dashboard"
```

---

### Task 4: Smoke estendido, fecho e merge

**Files:**
- Modify: `e2e/smoke.mjs`, `README.md` (uma linha sobre paginação/busca/painel)

**Interfaces:**
- Consumes: textos e rótulos das Tasks 2–3: `aria-label` "Buscar por nome ou matrícula", "Buscar disciplina", "Buscar aviso"; `Mostrando X–Y de N`; botões "Anterior"/"Próxima"/"Publicar aviso"; título "Painel"; campo de data `#data-aviso`; rótulos "Título" e "Mensagem" do formulário de aviso.

- [ ] **Step 1: Acrescentar ao `e2e/smoke.mjs`** (antes do bloco `finally`, depois dos passos atuais; reaproveitar `chamadas`, `conferir`, `page`, `API`, `FRONT`; adicionar os helpers abaixo no topo):
```js
async function api(metodo, caminho, corpo, token) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, corpo: resposta.status === 204 ? null : await resposta.json().catch(() => null) };
}
const login = await api("POST", "/auth/login", { email: "prof@escola.com", senha: "escola123" });
const tokenProfessor = login.corpo.access_token;
const extras = [];
```
Preparação (antes do passo 1 atual): criar 6 alunos extras
```js
for (let i = 1; i <= 6; i++) {
  const r = await api("POST", "/alunos", { nome: `Aluno Fumaça ${i}`, idade: 20, matricula: `S3-00${i}` }, tokenProfessor);
  conferir(r.status === 201, `preparacao: aluno extra ${i} criado`);
  extras.push(r.corpo.id);
}
```
Passos novos (como professor, depois do login do passo 3 atual e antes de "Sair"):
```js
// 9) paginacao e busca em Alunos (12 alunos: 6 do seed + 6 extras)
await page.goto(`${FRONT}/alunos`);
await page.getByText("Mostrando 1–10 de 12").waitFor();
conferir(true, "alunos: pagina 1 mostra 1-10 de 12");
await page.getByRole("button", { name: "Próxima" }).click();
await page.getByText("Mostrando 11–12 de 12").waitFor();
conferir(true, "alunos: pagina 2 mostra 11-12 de 12");
await page.getByLabel("Buscar por nome ou matrícula").fill("S3-003");
await page.getByText("Mostrando 1–1 de 1").waitFor();
await page.getByText("Aluno Fumaça 3").first().waitFor();
const busca = chamadas.filter((c) => c.metodo === "GET" && c.url.includes("/alunos?")).pop();
conferir(busca.url.includes("q=S3-003") && busca.url.includes("pagina=1"), "busca por matricula vai ao servidor com q e pagina=1");
await page.screenshot({ path: "e2e/saida/alunos-paginado.png" });

// 10) painel: uma chamada ao /dashboard, com Bearer, sem situacao por aluno
const antes = chamadas.length;
await page.goto(`${FRONT}/dashboard`);
await page.getByRole("heading", { name: "Painel" }).waitFor();
await page.getByText("Ranking — top 5").waitFor();
const novas = chamadas.slice(antes);
const painel = novas.filter((c) => c.url.endsWith("/dashboard"));
conferir(painel.length === 1 && painel[0].auth?.startsWith("Bearer "), "painel: 1 chamada a /dashboard com Bearer");
conferir(!novas.some((c) => c.url.includes("/situacao")), "painel: nenhuma chamada /situacao por aluno");
conferir(await page.getByText("Ana Souza").first().isVisible(), "painel: ranking mostra Ana Souza");
await page.screenshot({ path: "e2e/saida/painel-professor.png" });

// 11) avisos: criar pela UI com data AAAA-MM-DD, busca e exclusao
await page.goto(`${FRONT}/avisos`);
await page.getByLabel("Título").fill("Aviso de fumaça");
await page.getByLabel("Mensagem").fill("Criado pelo teste de fumaça.");
const criacao = page.waitForResponse((r) => r.url().endsWith("/avisos") && r.request().method() === "POST");
await page.getByRole("button", { name: "Publicar aviso" }).click();
const respostaAviso = await criacao;
conferir(respostaAviso.status() === 201, "avisos: POST /avisos com data valida responde 201");
await page.getByText("Aviso de fumaça").first().waitFor();
await page.getByLabel("Buscar aviso").fill("fumaça");
await page.getByText("Aviso de fumaça").first().waitFor();
const avisoCriado = (await api("GET", "/avisos?q=fuma%C3%A7a", null, tokenProfessor)).corpo.itens[0];
await api("DELETE", `/avisos/${avisoCriado.id}`, null, tokenProfessor);
conferir(true, "avisos: criado, achado pela busca e removido");

// 12) disciplinas: busca no servidor
await page.goto(`${FRONT}/disciplinas`);
await page.getByLabel("Buscar disciplina").fill("Pyth");
await page.getByText("Python").first().waitFor();
conferir(await page.getByText("Banco de Dados").count() === 0, "disciplinas: busca 'Pyth' esconde as outras");
```
No `finally`, ANTES de fechar o navegador, apagar os extras: `for (const id of extras) await api("DELETE", `/alunos/${id}`, null, tokenProfessor);`

- [ ] **Step 2: Rodar**

Pré-requisito: API e front de pé (ver Global Constraints) e `python seed.py --apagar-tudo` recém-aplicado.
Run: `FRONT_URL=http://localhost:5175 npm run smoke`
Expected: todas as linhas `ok - ...` e `SMOKE OK`; exit 0. O orquestrador vê `e2e/saida/*.png` (alunos paginado, painel) em 1280px e 390px antes de aceitar.

- [ ] **Step 3: Commit**
```bash
git add e2e README.md
git commit -m "Estende o smoke com paginacao, busca, painel e aviso"
```

- [ ] **Step 4: Fecho (orquestrador)** — `npm run build` limpo; revisão ampla do branch pelo Codex (`revisao-branch`, achados como hipótese); correções; merge local de `fase3-dashboard-busca` em `main`, **sem push**.

---

## Self-review (feito)

- **Cobertura do spec:** critério 1 (T2, T4), 2 (T3, T4), 3 (T1 `formatar`, T2 passos 6–7, T4 passo 11), 4 (T2/T3 verificações + T4). Dados do spec: todas as funções de T1 existem com as assinaturas do spec; `listarDisciplinasComContagem` removida em T1 e a tela migrada em T2.
- **Consistência de nomes:** `TAMANHO_PAGINA`, `recarregar`, `cancelado`, `useAtraso`, `Paginacao({pagina,tamanho,total,aoMudar})`, `CampoBusca({valor,rotulo,placeholder,aoMudar})` iguais entre tasks; rótulos acessíveis de T2 são os que T4 consulta.
- **Placeholders:** nenhum; as telas Disciplinas/Avisos são descritas como "mesmo padrão" com as diferenças exatas, e o padrão completo está em código na Task 2 (`PainelAlunos`) — o implementador lê os dois arquivos.
- **Risco aberto:** a busca por `q` em Avisos casa só o título (como o backend); o smoke depende de o seed ter 6 alunos e 4 disciplinas.
