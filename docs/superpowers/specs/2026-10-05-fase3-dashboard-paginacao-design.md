# Fase 3 — Dashboard novo, busca e paginação (design)

Data: 2026-10-05. Repo: `gestao-alunos-frontend` (ramo `fase3-dashboard-busca`). Depende da Fase 2 (`main` @ d2b2fee) e do backend (`gestao-alunos` `main` @ 6eb0ef4).
Decisões do dono (05/10): painel novo e enxuto; paginação + busca em Alunos, Disciplinas e Avisos; UI nova implementada pelo Codex (orquestrador escreve a direção visual e vê as capturas); Codex só roda quando a conta de cota voltar.

## Critérios de aceite
1. `PainelAlunos`, `TelaDisciplinas` e `TelaAvisos` listam por página no servidor (10 por página), com "Mostrando X–Y de N", Anterior/Próxima e busca com atraso (~300 ms). Alunos: busca por nome OU matrícula. A página volta a 1 ao mudar busca/filtros; criar/excluir recarrega e, se a página ficar vazia, volta uma.
2. `TelaDashboard` faz UMA chamada `GET /dashboard` (+ `GET /avaliacoes/pendentes`) e mostra: 4 indicadores (alunos, média da turma, frequência média, avaliações sem nota), lista "Em risco" (nome, média, frequência, motivo), Top 5 do ranking e avaliações pendentes. Nenhuma chamada `/alunos/{id}/situacao` no painel.
3. Contrato de datas: o aviso é criado com `AAAA-MM-DD` (input `type="date"`, padrão hoje) e exibido como `DD/MM/AAAA` (mural do professor e do aluno). Corrige o 422 que a Fase 2 deixou passar.
4. `tsc`, `npm run build` limpos e o `npm run smoke` estendido passa.

## Dados
- `api.ts`: exporta `Pagina<T>`; novas `listarAlunosPagina(filtros, pagina, tamanho=10)`, `listarDisciplinasPagina(q, pagina, tamanho=10)` (acrescenta `totalAlunos` só aos itens da página), `listarAvisosPagina(q, pagina, tamanho=10)`, `resumoDoDashboard()` (snake -> camelCase). Remove `listarDisciplinasComContagem` (fica órfã). As listas completas (`listarAlunos`, `listarDisciplinas`, `listarAvisos`) continuam para seletores e para o mural do aluno.
- `src/useAtraso.ts` (debounce), `src/formatar.ts` (`formatarDataBR`, `hojeISO`).
- Resposta fora de ordem (digitação rápida) é descartada (flag `cancelado` no efeito).

## UI nova (Codex, com direção visual do orquestrador)
`Paginacao`, `CampoBusca`, classes do painel novo (`.lista-ranking`, `.motivo-risco`), mesmo mundo visual (monocromático editorial, raio 2px, bordas 1px).

## Verificação
Smoke estendido: cria 6 alunos extras pela API (12 no total) e limpa no fim; confere página 1 ("1–10 de 12"), página 2 ("11–12 de 12"), busca por matrícula (`q=` na requisição), `/dashboard` com Bearer e sem chamadas de situação, criar aviso pela UI (POST 201) e busca de disciplina.

## Fora de escopo
Deploy (Fase 4); paginar o mural do aluno e as telas de seletor; tratamento de erro de carga em `AlunoCard`, `ResumoAluno`, `CalendarioChamada` (débito da Fase 2).
