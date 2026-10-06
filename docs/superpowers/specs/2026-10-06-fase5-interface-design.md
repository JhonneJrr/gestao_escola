# Fase 5 — Interface nova (design)

Data: 2026-10-06. Repos: `gestao-alunos-frontend` (ramo `fase5-interface`, a partir de `main` @ 3846951) e `gestao-alunos` (ajustes pequenos de API, ramo próprio).
Referência de design (SÓ referência, repo sem licença: não copiar código nem imagens): `kargulstudio/sales-crm` (Next.js, tema escuro, tabela densa). Capturas locais em `e2e/saida/crm-*.png`.
Decisões do dono (06/10): só as funcionalidades e a melhoria de design, MANTENDO o tema de papel atual; melhoria visual em TODAS as abas; entram menu lateral + tabela densa de alunos, Cmd+K e painel lateral rico do aluno; NÃO entram notificações nem exportar CSV; ordem: redesign primeiro, deploy (Fase 4) no fim. UI nova implementada pelo Codex, com direção visual do orquestrador e capturas conferidas (desktop 1280 e celular 390).

## Decomposição (cada uma com spec/plano/implementação próprios)
- **5A Base:** primitivos de design, menu lateral, cabeçalho novo, Cmd+K.
- **5B Alunos:** tabela densa e painel lateral rico do aluno (+ ajustes de API).
- **5C Polimento:** Disciplinas, Matrículas, Boletim, Frequência, Avisos, Painel, Meu painel e Login na mesma linguagem.

## Linguagem visual "papel"
- Mesmos tokens do `:root` (`--fundo`, `--superficie`, `--sunken`, `--borda`, `--borda-fraca`, `--texto*`, `--aviso*`, `--raio:2px`), Newsreader nos títulos, Space Grotesk no corpo. Sem sombra forte, sem gradiente, sem cor de destaque nova.
- Densidade e acabamento do CRM: `SegmentBar` (barra de N segmentos em tinta; valor baixo em `--aviso`), `Tag` de contorno (situação: Aprovado / Em risco / Reprovado / Sem dados), `Avatar` quadrado de iniciais com borda, `Sparkline` em tinta, `Sheet` (painel lateral) com seções e cartões de números, rodapé de tabela com cálculos.
- Primitivos ficam em `src/ui/` (um arquivo por componente, props tipadas) e as telas os consomem; nada de cor ou borda repetida inline.

## 5A — Base
- `LayoutPortal` ganha barra lateral fixa (≥900px) com: Painel, Alunos, Disciplinas, Matrículas, Boletim, Frequência, Avisos; contadores em Alunos/Disciplinas/Avisos (totais do servidor); item ativo destacado; rodapé com e-mail e Sair. Em <900px vira gaveta aberta por botão no cabeçalho.
- A Home de cards sai: `/` passa a ser o Painel; "Voltar" desaparece das telas. Aluno logado vê só "Meu painel" na lateral.
- Cabeçalho novo: título da seção, botão de busca (abre o Cmd+K), e-mail.
- **Cmd+K / Ctrl+K:** paleta (`Command`) com campo de busca, resultados agrupados (Alunos, Disciplinas, Avisos) buscados no servidor com atraso, navegação por ↑ ↓ Enter, Esc fecha. Selecionar aluno abre `/alunos?aluno={id}` (painel lateral aberto); disciplina leva a `/disciplinas?q=nome`; aviso leva a `/avisos?q=título`. Só professor.

## 5B — Alunos
- Tabela densa substitui a grade de cards: colunas Aluno (avatar+nome+matrícula), Situação (tag), Média (SegmentBar + valor), Frequência (SegmentBar + valor), Presenças (Sparkline das últimas 8 semanas), ações; cabeçalhos clicáveis ordenam no servidor; rodapé "média da turma / frequência média" da LISTA FILTRADA; paginação e busca existentes continuam.
- Painel lateral do aluno (`Sheet`): situação (barras de média e frequência), tendência de frequência (Sparkline + texto), cartões de números (presenças, faltas, avaliações com nota), boletim por disciplina com SegmentBar; excluir e fechar.
- **Backend:** `GET /alunos` aceita `ordem` (`nome|media|frequencia|idade`) e `direcao` (`asc|desc`) e devolve `frequencia` (média das frequências por disciplina, `null` sem aulas); novo `GET /alunos/{id}/frequencia/tendencia?semanas=8` → `[{semana: "AAAA-MM-DD", percentual|null}]` (segunda-feira da semana); rodapé de médias vem de `GET /alunos/resumo?q&idade_minima&media_minima` → `{total, media, frequencia}`. Todos exigem professor (tendência também aceita o próprio aluno).

## 5C — Polimento
Cada aba recebe a mesma linguagem: Disciplinas (lista densa com tag e contagem de alunos), Matrículas, Boletim (SegmentBar por nota/média), Frequência (calendário e chamada com `Tag`), Avisos (cartões com data e autor), Painel (indicadores e listas com os primitivos), Meu painel (aluno) e Login. Sem mudar comportamento nem dados.

## Verificação
`tsc` e `npm run build` limpos; `npm run smoke` estendido (sidebar e navegação, Cmd+K abrindo aluno, ordenação por média, painel lateral, gaveta no celular); backend com pytest; o orquestrador vê as capturas (1280 e 390) de cada fase antes de aceitar; revisão ampla do Codex no fecho de cada sub-fase.

## Fora de escopo
Notificações, exportar CSV, tema escuro, foto de aluno (upload), deploy (Fase 4, depois da Fase 5).
