# Brief: pendências de UI do Portal (att 3)

Data: 07/10/2026. Front: `fase9-att3` (`91b59ee`). Back: `fase10-grade-agenda` (`9564f6d`). Nada pushado.
Prazo da entrega: quinta 08/10/2026.

## Meta verificável

Cada item abaixo tem um critério de pronto de uma linha. Pronto = o critério passa rodando contra a API final (`~/api-final`, porta 8000, `seed.py --apagar-tudo` antes) e `tsc`, build e unit 61/61 continuam verdes.

## Correção de um relato anterior

Eu havia dito que a UI não tinha botões para cancelar, reativar, remarcar e criar aula extra. **Estava errado.** Eles existem na Agenda do `Portal.tsx`:

- Menu da aula (escola): "Cancelar aula" / "Reativar aula" / "Remarcar" (`Portal.tsx:1593-1599`).
- Remarcar: `abrirRemarcar` → `atualizarAula` (`Portal.tsx:834`).
- Aula extra direta: `criarAula` (`Portal.tsx:850`).
- Nova turma: `criarTurma` (`Portal.tsx:759`) e painel "Nova turma" na Grade (`GradeAgenda.tsx:865`).

O que falta é **prova em navegador**: nenhum e2e aciona esses botões (o único toque é `portal-operacao.mjs:215`, que confere que o professor NÃO os vê). Só a API foi testada.

## Itens

### U1. e2e da Agenda: cancelar, reativar, remarcar, aula extra (escola)

- Novo `e2e/portal-agenda.mjs`, mesmo molde de `portal-operacao.mjs` (login escola, API final).
- Roteiro: abrir a Agenda → criar aula extra numa data futura → cancelar → ver "Cancelada" → reativar → remarcar para outro horário/dia → ver "Remarcada de dd/mm".
- Regras da API que o teste precisa respeitar: só data futura, sem choque de professor/sala/turma, uma aula por disciplina/dia, aula com presença não cancela (409 "Aula já tem presenças").
- Segundo caso: aula com chamada feita → "Cancelar aula" aparece desabilitado e mostra "Aula já tem presenças".
- Resíduo: aula extra e remarcada ficam até o reseed; registrar no cabeçalho do arquivo como os outros e2e fazem.
- Pronto quando: `node e2e/portal-agenda.mjs` passa 2x seguidas contra a mesma API (sem depender de reseed entre as rodadas) e o README do front lista o novo e2e.
- Se achar bug de UI: não consertar dentro do teste; anotar em "Achados" no fim deste arquivo e corrigir como item à parte.

### U2. Arraste no Quadro (Grade) com ponteiro

- Hoje só `podeArrastar` é conferido por lógica (`GradeAgenda.tsx:278`); o arraste real nunca foi feito com `page.mouse`.
- Roteiro: escola, Quadro da semana, arrastar aula de grade futura para outro slot livre → PATCH `/aulas/{id}` → aula aparece "remarcada" no novo lugar; arrastar para slot com choque → mensagem de erro da API na tela e aula volta ao lugar.
- Aula passada, com chamada, cancelada ou em feriado: `mouse.down/move` não deve iniciar arraste.
- Pronto quando: um `e2e/portal-quadro.mjs` com esses 3 casos passa contra a API final. Se o arraste por `page.mouse` for frágil demais (eventos pointer vs. drag), cortar o caso 3 e deixar como conferência manual do dono, dizendo isso no relatório.

### U3. Assistente de grade (Gemini): erro 429 e teste real

- Na minha rodada o Gemini devolveu 429 (cota); só a mensagem de erro foi conferida.
- Verificar na UI: o 429 vira texto legível em português (via `erroGradeIA`), o botão destrava e o usuário pode tentar de novo; nenhum JSON cru aparece na tela.
- Teste real do caminho feliz só é possível depois da chave na Render (item do dono). Fica agendado para o teste em produção.
- Pronto quando: caso 429 coberto (mock de rede no Playwright basta) e o caminho feliz rodado uma vez em produção.

### U4. Varredura visual dos estados vazios e de erro

- Passar pelas telas Acadêmico/hub por turma, Agenda, Grade, Pedidos, Avisos com: sem semestre ativo, semestre encerrado (somente leitura), turma sem alunos, disciplina sem professor, API fora do ar.
- Comparar com o canvas att 3 (`scripts/comparar-canvas.mjs`, estados) e anotar só divergências reais. Não redesenhar.
- Pronto quando: lista de divergências em "Achados" (ou "nenhuma"), cada uma com tela e causa.

## Fora de escopo (não mexer)

- Demo DEV da Grade segue o canvas (arrasta qualquer aula): divergência consciente.
- 7 decisões de produto: aprovação por disciplina, avaliação pendente, vigência de matrícula, frequência por horas, feriado por turma, professor marca prova, copiar semestre.
- `src/portal/*` gerado pelo conversor: nunca editar à mão; só `GradeAgenda.tsx`, `Portal.tsx`, `loja.ts` e `rede.ts` são nossos.
- Resíduo de teste ("Turma E2E…", históricos): some no reseed.

## Quem faz

- U1, U2, U3 (testes): mecânico, bom para subagente Sonnet em paralelo.
- Qualquer correção que mude superfície visual: direção do Opus 5.5 com a skill `impeccable`; não vai para o Codex.
- Correção de lógica do back que o e2e revelar: Codex (`implementa`).
- Commit: 1 linha, sem trailer nem menção a IA. Sem push nem produção sem a palavra do dono.

## Achados

(preencher durante a execução)

### e2e (08/10)

1. **A Agenda do dia (menu da aula e botão "Aula extra") não está na tela.** Tela: Acadêmico, `/agenda` e `/disciplinas`, como escola. Passo: abrir qualquer semana do Quadro semanal ou a página de uma disciplina; não há "Cancelar aula", "Reativar aula", "Remarcar" (menu) nem "Aula extra". Causa provável: `Portal.tsx:1903` fixa `agendaLegado: false` e o template só monta a lista de aulas do dia (`section aria-label="Aulas do dia"`, com o menu) quando essa flag é verdadeira; o Acadêmico da att 3 é o `GradeAgenda` e a Agenda antiga ficou atrás da flag. O trecho "Correção de um relato anterior" acima está, portanto, só meio certo: os botões existem no código, mas nenhum usuário os alcança. Consequências: (a) cancelar, reativar e criar aula extra direta não têm porta de entrada na UI (só a API; remarcar existe pelo arraste do Quadro); (b) textos que mandam para essa Agenda ficam sem destino: "Cancelar, remarcar e aula extra ficam na Agenda." (página da disciplina, sub-aba Chamada) e "Reative a aula na agenda para fazer a chamada." (`Portal.tsx:2009`); uma aula cancelada pela API não pode ser reativada por ninguém na tela; (c) o texto "Remarcada de dd/mm" também só existe nessa Agenda: no Quadro a aula remarcada mostra a marca "Remarcada" e, no painel, "Remarcada só nesta semana". Por isso `e2e/portal-agenda.mjs` aprova o pedido pela tela e faz cancelar, reativar e remarcar pela API, conferindo só o que a tela mostra. Decisão do dono: reabrir a Agenda (flag ou tela nova) ou tirar os textos que apontam para ela.
2. **Bloco de aula em dia de feriado não recebe clique.** Tela: Quadro semanal, semana com feriado (ex.: segunda 12/10, N. Sra. Aparecida). Passo: clicar ou arrastar o bloco da aula (aparece "Feriado"). Causa provável: a camada hachurada do feriado (`position:absolute; inset:0; z-index:3`) cobre a coluna inteira e intercepta o ponteiro (`elementFromPoint` devolve a camada); o painel da aula só abre pelo teclado (Enter no bloco). Pode ser intencional (dia sem aula); anotado porque o painel "Sem aula: <feriado>" fica inalcançável para quem usa mouse ou toque.
3. **Aviso do React no console (só dev):** "In HTML, <span> cannot be a child of <option>" nas listas de filtro do Quadro (`<option><span class="sc-interp">`). Vem do template gerado (`componentes/GradeAgendaTemplate.tsx`), então só se corrige no conversor, nunca à mão.
