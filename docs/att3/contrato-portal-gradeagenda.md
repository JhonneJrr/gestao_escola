# Contrato entre `Portal.tsx` e `GradeAgenda.tsx` no porte da atualização 3

Dois agentes trabalham em paralelo, cada um num worktree próprio, e eu junto os dois depois. Este arquivo fixa a fronteira entre eles. Não mude os nomes daqui; se algo faltar, acrescente e relate.

## Dono de cada arquivo (ninguém edita arquivo do outro)

- **Portal (F2):** `src/portal/Portal.tsx`, `src/portal/demo-canvas.ts`, `src/portal/loja.ts`, `src/portal/adaptador.ts`, `src/portal/main.tsx`, `e2e/adaptador.test.mjs`.
- **GradeAgenda (F3):** `src/portal/GradeAgenda.tsx`, o arquivo NOVO `src/portal/demo-grade.ts` (dados de demonstração da atualização 3 só para DEV, carregados por import dinâmico dentro de `if (import.meta.env.DEV)`), `src/portal/rede.ts`.
- Ninguém edita `design/canvas/**`, `src/portal/template.tsx`, `src/portal/componentes/**`, `*.css` (gerados), nem `scripts/converter-canvas.mjs`.
- Ninguém roda Playwright nem o comparador (`npm run comparar`) nesta etapa: eu rodo na integração. Cada um roda `npx tsc -b`, `npm run build`, `node --test e2e/adaptador.test.mjs e2e/converter-canvas.test.mjs` e a contagem de `Carlos Mendes` em `dist/assets/*.js` (0).

## O que o Portal publica no store (`loja.ts`) e a GradeAgenda lê

Formato (todos já existem exceto os marcados NOVO): `perfil` (`'escola' | 'prof' | 'aluno'`), `usuario`, `semestre` (`{ id, nome, inicio, fim, encerrado_em }`), `disciplinas` (formato do canvas: `id, nome, sigla?, turma, prof, sala, carga, grade[{dia_semana,hora_inicio,hora_fim,sala}]`, com `turma` e `sala` em TEXTO ou `''`), `professores` (com `ocupados`), `aulas` (como o Portal já as publica, com status, `origem`, `remarcada_de`, `chamada_feita` e a chamada por aluno), `turmas`, `salas`, `eventos`, `pedidos`, `alunos` (`{ id, nome, turma }`, já recortado pelo servidor), `turmaAluno`, e NOVO: **`matriculas`** (`[{ aluno_id, disciplina_id }]`, do estado), **`carga`** (`'ok' | 'carregando' | 'erro'`: o Portal publica `'carregando'` enquanto busca `/portal/estado` pela primeira vez, `'erro'` se a busca falhar, `'ok'` depois). Já existe `recarregarLoja()` (a GradeAgenda chama depois de qualquer gravação) e `configurarRecarga`.

A GradeAgenda **lê os dados do store**, nunca das props `base`, `profs`, `turmas`, `alunos` e `turmaAluno` (essas props existem no canvas para o protótipo; em produção são ignoradas). Em DEV com `?inicio=` (demonstração do comparador) o Portal publica no store os dados fictícios do canvas.

## Props de CONTROLE que o Portal passa à GradeAgenda (o template gerado já as passa; o Portal fornece os valores)

`perfil`, `estado` (só DEV/demonstração, valores do canvas como `Escola / Aula / Chamada de hoje`), `abaInicial` (`gaAbaIni`), `soEditor` + `discId` + `aoFechar` (modo editor único de disciplina embutido em Acadêmico → Disciplinas), `aoNovaTurma` (a GradeAgenda avisa quando uma turma foi criada), `aoSalvar` (a GradeAgenda avisa depois de gravar uma disciplina com sucesso, o Portal só recarrega), `aoAbrirDisc` (a GradeAgenda pede ao Portal para abrir a página da disciplina), `embutido`, `relogio`, `falhaGravacao`/`falhaCarga` (simulações do canvas, só DEV). Os valores do Portal (`gaTurmas`, `gaAlunos`, `gaBase`, `gaProfs`, `gaTurmaAluno` etc.) continuam sendo calculados e passados porque o template os referencia, mas a GradeAgenda não os usa em produção.

## Regras comuns

- Estado do servidor é a verdade; o front só mostra o que o servidor devolve. Gravação: bloquear envio duplo, mostrar "Salvando…", em erro mostrar o `detail` do servidor (409/422) ou `Não consegui salvar. Confira a conexão e tente de novo.`; atualizar a tela só depois do sucesso e recarregar o estado.
- A aparência é a do canvas da atualização 3 (verdade visual, comparada depois com o comparador, que hoje dá 0 diferenças e não pode regredir): só a lógica é nossa.
- Dado fictício do canvas só em DEV (import dinâmico); o build de produção não pode conter "Carlos Mendes".
- Em produção a aula só pode ser cancelada ou reativada se o canvas tiver uma AÇÃO para isso; a atualização 3 só mostra o estado "Cancelada" (vindo de `aulas[].status === 'cancelada'`), então não crie botão novo.
- A chamada da API é `PUT /disciplinas/{id}/chamada` com `{ data, presencas: [{ aluno_id, presente }] }` e a lista de alunos da chamada é a dos MATRICULADOS na disciplina (`store.matriculas`), não a da turma. Aula cancelada, em feriado, futura ou de semestre encerrado não abre chamada (o canvas já tem as mensagens).
- API da turma do aluno (contrato `C:\Users\Administrator\Documents\gestao-alunos\docs\superpowers\specs\2026-10-07-att3-turma-do-aluno-design.md`, implementado em paralelo pelo back): `POST /alunos` e `PATCH /alunos/{id}` aceitam `turma_id`; o PATCH devolve `matriculas_mantidas`; `POST /turmas` e `POST /salas` criam `{ nome }`. Matricular e desmatricular usam as funções que já existem em `rede.ts`.
- Commits de UMA linha, sem acento, sem `Co-Authored-By` nem menção a IA, sem push, sem `git stash`/`reset`/`checkout -- <arquivo>`/`restore`; `git add` só dos arquivos que são seus (há arquivos não rastreados que não são seus: `.design-sync/`, `docs/design/`, `design/canvas/Funções Espiral.dc.html`, `.gitignore` modificado).
