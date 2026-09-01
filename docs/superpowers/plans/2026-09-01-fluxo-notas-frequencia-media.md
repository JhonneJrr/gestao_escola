# Fluxo de notas, frequência, média calculada e modo aluno — Implementation Plan

> **EXECUTADO em 2026-09-01, sozinho, dono ausente (apresentação era no
> mesmo dia).** `npx tsc --noEmit -p tsconfig.app.json` limpo no fim, dev
> server servindo todas as telas sem erro de transform. Nada foi commitado
> (protocolo de ausência — fica pro dono revisar o working tree).
>
> **Descobertas durante a execução que não estavam no plano original**
> (arquivos que também usavam `Aluno.media` e precisaram entrar no escopo
> da Task 2): `ResumoAluno.tsx` e `TelaMatriculas.tsx`. Também precisei
> adicionar duas funções a mais em `api.ts` que a spec não previu
> explicitamente: `alunosDaDisciplina` (pra montar a lista de chamada) e
> `avaliacoesSemNotaLancada` (pro Painel). Removido também o CSS morto de
> `.painel-aprovacao`/`.barra`/`.barra-aprovados` (não usado por nenhum
> componente depois da reescrita do Painel).

> **Para quem executar:** este projeto não tem suíte de testes automatizados
> (React/TS/Vite puro, sem vitest/jest). Cada tarefa é verificada com
> `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) (zero erros) + checagem manual no dev server
> (`npm run dev`, já costuma estar rodando com hot-reload). Não introduzir
> framework de teste como parte deste plano — foge do escopo e do nível de
> código combinado com o dono (ver `feedback-beginner-level-code`).

**Goal:** substituir `Aluno.media` digitado por médias calculadas a partir de
notas por avaliação (com peso) e frequência calculada a partir de chamadas
registradas por aula; adicionar Modo Aluno (visualização somente leitura).

**Architecture:** camada de dados (`types.ts`/`mock.ts`/`api.ts`) primeiro,
depois cada tela migra pra consumir as novas funções. Nenhuma abstração nova
de state management — continua tudo `useState` local por componente, mesmo
padrão já usado no resto do app.

**Tech Stack:** React 19 + TypeScript + Vite, sem libs novas.

**Spec:** `docs/superpowers/specs/2026-09-01-fluxo-notas-frequencia-media-design.md`

## Global Constraints

- Código nível iniciante: funções pequenas, sem generics chiques, sem
  abstração de state management, mesmo estilo do resto do arquivo.
- Nenhuma dependência nova no `package.json`.
- Nenhuma tela pode ficar sem estado vazio tratado (mesma convenção já usada:
  mensagem clara quando não há dado).
- Peso de avaliações de uma disciplina deve somar exatamente 100 (validação
  no formulário, não só no cálculo).
- Exclusão de avaliação com notas lançadas é bloqueada com mensagem de erro
  (mesmo padrão de excluir disciplina/aluno com vínculo).

---

## Task 1: Camada de dados — tipos, mock e funções de cálculo

**Files:**
- Modify: `src/types.ts`
- Modify: `src/mock.ts`
- Modify: `src/api.ts`

**Interfaces (produzidas aqui, usadas por todas as tarefas seguintes):**
```ts
// types.ts
interface Aluno { id: number; nome: string; idade: number; matricula: string } // sem media
interface Avaliacao { id: number; disciplina_id: number; nome: string; peso: number }
interface Nota { aluno_id: number; avaliacao_id: number; valor: number }
interface Aula { id: number; disciplina_id: number; data: string }
interface Presenca { aula_id: number; aluno_id: number; presente: boolean }
type Tela = ... | "modoAluno" // adicionado à união existente

// api.ts
function listarAvaliacoes(disciplinaId: number): Promise<Avaliacao[]>
function criarAvaliacao(disciplinaId: number, nome: string, peso: number): Promise<Avaliacao> // valida soma <= 100
function excluirAvaliacao(id: number): Promise<void> // bloqueia se houver Nota
function lancarNota(alunoId: number, avaliacaoId: number, valor: number): Promise<void> // upsert
interface NotaDaMateria { avaliacao: Avaliacao; valor: number | null }
interface BoletimDaMateria { disciplina: Disciplina; notas: NotaDaMateria[]; media: number | null; parcial: boolean }
function boletimDoAluno(alunoId: number): Promise<BoletimDaMateria[]>
function mediaGeralDoAluno(alunoId: number): Promise<number | null>
function registrarChamada(disciplinaId: number, data: string, presencas: { aluno_id: number; presente: boolean }[]): Promise<void>
interface FrequenciaDaMateria { disciplina: Disciplina; percentual: number | null }
function frequenciaDoAluno(alunoId: number): Promise<FrequenciaDaMateria[]>
function frequenciaGeralDoAluno(alunoId: number): Promise<number | null>
interface Situacao { mediaGeral: number | null; frequenciaGeral: number | null; aprovado: boolean | null }
function situacaoDoAluno(alunoId: number): Promise<Situacao>
```

- [x] **Passo 1: Atualizar `src/types.ts`**
  - Remover `media` de `Aluno` e de `AlunoEntrada`.
  - Adicionar `Avaliacao`, mudar `Nota` para `{ aluno_id, avaliacao_id, valor }`.
  - Adicionar `Aula`, `Presenca`; remover a interface `Frequencia` antiga
    (era `{ aluno_id, disciplina_id, presencas, total_aulas }`).
  - Adicionar `"modoAluno"` na união `Tela`.

- [x] **Passo 2: Atualizar `src/mock.ts`**
  - Remover `media` dos objetos de `alunosIniciais`.
  - Trocar `notasIniciais` (formato antigo) por: `avaliacoesIniciais` (2-3
    avaliações por disciplina existente, pesos somando 100, ex.: P1=40,
    P2=60) e `notasIniciais` no novo formato (`aluno_id, avaliacao_id, valor`),
    cobrindo alguns alunos com nota completa e outros parciais (só P1).
  - Trocar `frequenciasIniciais` por `aulasIniciais` (2-3 aulas por
    disciplina, datas diferentes) e `presencasIniciais` (presença de cada
    aluno matriculado em cada aula, mistura de presente/ausente).

- [x] **Passo 3: Reescrever a seção de NOTAS em `src/api.ts`**
  - Remover `notasDoAluno` (formato antigo) e o `lancarNota` antigo.
  - Implementar `listarAvaliacoes`, `criarAvaliacao` (throw se
    `somaAtual + peso > 100`), `excluirAvaliacao` (throw se existir `Nota`
    com esse `avaliacao_id`).
  - Implementar `lancarNota(alunoId, avaliacaoId, valor)` como upsert por
    `(aluno_id, avaliacao_id)`, igual ao padrão do `lancarNota` antigo.
  - Implementar `boletimDoAluno(alunoId)`: para cada disciplina matriculada,
    monta `NotaDaMateria[]` (uma por avaliação da disciplina, `valor: null`
    se não lançada), calcula `media` (ponderada pelas avaliações com nota,
    peso renormalizado; `null` se nenhuma nota lançada) e `parcial` (`true`
    se tem nota mas não todas).
  - Implementar `mediaGeralDoAluno(alunoId)`: média simples das `media`
    não-nulas retornadas por `boletimDoAluno`; `null` se nenhuma.

- [x] **Passo 4: Adicionar a seção de FREQUÊNCIA (chamada) em `src/api.ts`**
  - Implementar `registrarChamada(disciplinaId, data, presencas)`: cria uma
    `Aula` nova (ou reusa se já existir a mesma `disciplina_id`+`data`) e
    grava/atualiza uma `Presenca` por item de `presencas`.
  - Implementar `frequenciaDoAluno(alunoId)`: para cada disciplina
    matriculada, `percentual = presenças do aluno nas aulas dessa
    disciplina ÷ total de aulas dessa disciplina × 100`, `null` se a
    disciplina ainda não tem nenhuma aula registrada.
  - Implementar `frequenciaGeralDoAluno(alunoId)`: média simples dos
    `percentual` não-nulos.
  - Implementar `situacaoDoAluno(alunoId)`: chama `mediaGeralDoAluno` e
    `frequenciaGeralDoAluno`; `aprovado = mediaGeral >= 6 && frequenciaGeral
    >= 75` só se as duas existirem, senão `null`.

- [x] **Passo 5: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota)
  Esperado: erros nos arquivos que ainda usam os tipos/funções antigos
  (`FormAluno.tsx`, `AlunoCard.tsx`, `AlunoDrawer.tsx`, `TelaBoletim.tsx`,
  `TelaFrequencia.tsx`, `TelaDashboard.tsx`) — são exatamente os arquivos
  das tarefas 2-6. Confirmar que a lista de erros bate só com esses
  arquivos, nada em `api.ts`/`mock.ts`/`types.ts`.

- [x] **Passo 6: Commit** (não fazer — dono pediu pra não commitar/pushar
  nada sem ele; deixar no working tree pra ele revisar quando voltar)

---

## Task 2: Gestão de Alunos — remover média digitada, mostrar calculada

**Files:**
- Modify: `src/components/FormAluno.tsx`
- Modify: `src/components/AlunoCard.tsx`
- Modify: `src/components/AlunoDrawer.tsx`

**Interfaces:**
- Consome: `situacaoDoAluno(alunoId)`, `boletimDoAluno(alunoId)`,
  `frequenciaDoAluno(alunoId)` de `api.ts` (Task 1).

- [x] **Passo 1: `FormAluno.tsx`** — remover o campo/estado `media`, a
  validação de média e o envio de `media` em `criarAluno`.

- [x] **Passo 2: `AlunoCard.tsx`** — remover uso de `aluno.media`. Buscar
  `situacaoDoAluno(aluno.id)` num `useEffect` (mesmo padrão do
  `AlunoDrawer` já implementado), guardar em `useState<Situacao | null>`.
  Selo vira 3 estados: `Aprovado` (`aprovado === true`), `Reprovado`
  (`aprovado === false`), `Sem dados` (`aprovado === null`, classe neutra
  tipo `selo` sem `selo-aprovado`/`selo-reprovado`). Bloco de média mostra
  `situacao.mediaGeral?.toFixed(1) ?? "—"`.

- [x] **Passo 3: `AlunoDrawer.tsx`** — trocar a busca de `notasDoAluno` por
  `boletimDoAluno(aluno.id)` e `frequenciaDoAluno(aluno.id)`. Renderizar por
  matéria: nome da disciplina, média da matéria (ou "parcial"/"sem nota"),
  lista de avaliações com nota ou "—". Usar `situacaoDoAluno` pro selo
  (mesmo esquema de 3 estados da Task 2 Passo 2) e pra média geral exibida
  no topo do drawer.

- [x] **Passo 4: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — esperado: PASS (zero erros) nesses 3 arquivos.
  Manual: abrir Gestão de Alunos no navegador, confirmar que cada card
  mostra "Sem dados" (nenhuma nota mockada ainda pra esse aluno) ou uma
  média de verdade pros alunos que a Task 1 populou com nota no mock;
  abrir o drawer de um aluno e conferir a lista por matéria.

---

## Task 3: Disciplinas — sub-seção de Avaliações

**Files:**
- Modify: `src/components/DisciplinaCard.tsx`
- Modify: `src/components/TelaDisciplinas.tsx`
- Create: `src/components/FormAvaliacao.tsx`

**Interfaces:**
- Consome: `listarAvaliacoes`, `criarAvaliacao`, `excluirAvaliacao` (Task 1).
- Produz: nada consumido por tarefas seguintes.

- [x] **Passo 1: `FormAvaliacao.tsx`** (novo) — recebe `disciplinaId` e
  `avaliacoes: Avaliacao[]` atuais; mostra lista (nome, peso, excluir) e
  formulário (nome + peso) que calcula `somaAtual` a partir das
  `avaliacoes` recebidas e mostra "faltam X% pra completar 100%" ou bloqueia
  o envio com `campo-erro` se estourar 100. Excluir chama `excluirAvaliacao`
  e mostra `campo-erro` se a API rejeitar (nota já lançada).

- [x] **Passo 2: `DisciplinaCard.tsx` / `TelaDisciplinas.tsx`** — cada
  card de disciplina passa a expandir (mesmo padrão de clique já usado no
  `AlunoCard`/drawer) mostrando `FormAvaliacao` pra aquela disciplina,
  carregando `listarAvaliacoes(disciplina.id)` ao expandir.

- [x] **Passo 3: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS.
  Manual: em Disciplinas, abrir uma matéria, cadastrar duas avaliações que
  somem 100, tentar uma terceira e confirmar o bloqueio; tentar excluir uma
  avaliação sem nota (funciona) e uma com nota do mock (bloqueia).

---

## Task 4: Boletim — lançar nota por avaliação, ver por matéria

**Files:**
- Modify: `src/components/TelaBoletim.tsx`

**Interfaces:**
- Consome: `listarAvaliacoes`, `lancarNota`, `boletimDoAluno` (Task 1).

- [x] **Passo 1:** trocar o `<select>` de disciplina por um `<select>` de
  avaliação: para o aluno selecionado, listar avaliações de todas as suas
  disciplinas matriculadas (`"<Disciplina> — <Avaliação> (peso <N>)"` como
  texto da `<option>`), carregado via `listarAvaliacoes` por disciplina
  matriculada.

- [x] **Passo 2:** `aoLancarNota` chama `lancarNota(alunoId, avaliacaoId,
  valor)` (era `disciplinaId`).

- [x] **Passo 3:** trocar a lista "Notas lançadas" por
  `boletimDoAluno(alunoId)`: uma seção por matéria com nome, média (ou
  "parcial"/"sem nota lançada") e chips de avaliação+valor (ou "—").

- [x] **Passo 4: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS.
  Manual: lançar nota numa avaliação, conferir que a média da matéria
  recalcula e que "parcial" aparece quando falta avaliação.

---

## Task 5: Frequência — fazer chamada

**Files:**
- Modify: `src/components/TelaFrequencia.tsx`
- Create: `src/components/FormChamada.tsx`

**Interfaces:**
- Consome: `registrarChamada`, `frequenciaDoAluno` (Task 1),
  `disciplinasDoAluno`/`listarAlunos` (já existentes).

- [x] **Passo 1: `FormChamada.tsx`** (novo) — recebe `disciplinaId` e a
  lista de alunos matriculados nela; campo de data (`type="date"`, padrão
  hoje via `new Date().toISOString().slice(0,10)`), lista de alunos com
  toggle presente/ausente (padrão `true`), botão "Salvar chamada" chama
  `registrarChamada`.

- [x] **Passo 2: `TelaFrequencia.tsx`** — adicionar uma ação "Fazer
  chamada" (por disciplina, escolhida num `<select>` a partir das
  disciplinas com matrícula) que abre `FormChamada`; a leitura existente de
  percentual passa a vir de `frequenciaDoAluno(alunoId)` em vez do mock
  antigo.

- [x] **Passo 3: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS.
  Manual: fazer uma chamada nova pra uma disciplina, conferir que o
  percentual de frequência do aluno muda de acordo.

---

## Task 6: Painel — visão de risco

**Files:**
- Modify: `src/components/TelaDashboard.tsx`

**Interfaces:**
- Consome: `listarAlunos`, `situacaoDoAluno` (Task 1), `listarAvaliacoes`/
  `listarDisciplinas` (já existentes, pra contar avaliação sem nota).

- [x] **Passo 1:** buscar `situacaoDoAluno` de todos os alunos (Promise.all)
  e montar 3 listas: média < 6, frequência < 75%, e — por disciplina —
  quantas avaliações ainda não têm nenhuma nota lançada por ninguém.

- [x] **Passo 2:** renderizar as 3 listas como seções simples (reaproveitar
  `.indicador`/`.painel-aprovacao` já existentes no CSS onde fizer sentido,
  senão uma lista simples com nome do aluno + valor).

- [x] **Passo 3: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS.
  Manual: abrir o Painel, conferir que os alunos com nota/frequência ruim
  do mock aparecem nas listas certas.

---

## Task 7: Modo Aluno

**Files:**
- Create: `src/components/TelaModoAluno.tsx`
- Modify: `src/components/TelaHome.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consome: `listarAlunos`, `boletimDoAluno`, `frequenciaDoAluno`,
  `listarAvisos` (já existente).

- [x] **Passo 1: `App.tsx`** — adicionar o `case "modoAluno"` renderizando
  `<TelaModoAluno aoVoltar={...} />`, mesmo padrão das outras telas.

- [x] **Passo 2: `TelaHome.tsx`** — adicionar um 8º `CardFuncao` "Ver como
  aluno" (ícone de olho) abrindo `"modoAluno"`.

- [x] **Passo 3: `TelaModoAluno.tsx`** (novo) — reaproveita
  `SeletorAlunos` pra escolher o aluno; ao selecionar, mostra 3 seções
  somente-leitura empilhadas: Boletim (via `boletimDoAluno`), Frequência
  (via `frequenciaDoAluno`), Avisos (via `listarAvisos`, mesma lista da
  tela de avisos). Nenhum formulário, nenhuma ação de escrita.

- [x] **Passo 4: Verificar**
  Run: `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS.
  Manual: abrir "Ver como aluno", escolher um aluno, conferir que as 3
  seções mostram dado real e nenhum controle de edição aparece.

---

## Task 8: Varredura final

**Files:** todo o `src/`

- [x] **Passo 1:** `grep -rn "\.media\b\|notasDoAluno\|frequenciasDoAluno\|disciplina_id.*nota\|Frequencia\b" src/` —
  confirmar que não sobrou nenhuma referência às formas antigas fora deste
  plano (tipo `Frequencia` removido, `notasDoAluno`/`frequenciasDoAluno`
  removidos, `aluno.media` removido).

- [x] **Passo 2:** `npx tsc --noEmit -p tsconfig.app.json` (correção: o tsc bare não checava nada, ver nota) — PASS, zero erros no projeto inteiro.

- [x] **Passo 3:** rodar `npm run dev` (se não estiver rodando) e passar
  por todas as 8 telas manualmente uma vez: Home, Gestão de Alunos,
  Disciplinas, Matrículas, Painel, Boletim, Frequência, Mural de Avisos,
  Modo Aluno.

- [x] **Passo 4:** não commitar/pushar — deixar tudo no working tree pro
  dono revisar quando voltar (protocolo de ausência).
