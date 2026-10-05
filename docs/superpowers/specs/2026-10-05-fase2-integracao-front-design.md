# Fase 2 — Integração do front com a API real, login e rotas protegidas (design)

Data: 2026-10-05. Repo: `gestao-alunos-frontend`. Depende do backend da Fase 1 (`gestao-alunos`, `main` @ 90b9f77).
Spec geral: `gestao-alunos/docs/superpowers/specs/2026-10-05-integracao-auth-deploy-design.md`.

## Critérios de aceite
1. O front consome a API real: nenhum componente importa `mock.ts`; `mock.ts` removido. Comprovável na aba Network (chamadas a `VITE_API_URL` com `Authorization: Bearer`).
2. Login real (`POST /auth/login`), sessão em `localStorage`, rotas protegidas por token e por perfil. Sem token -> `/login`; 401 da API -> sessão apagada e `/login`; aluno em rota de professor -> `/meu-painel`.
3. `npm run build` limpo; console do navegador sem erro; um teste de browser de fumaça (login real + chamada protegida).

## Dados
- `src/http.ts`: instância axios, `baseURL = import.meta.env.VITE_API_URL`. Request: injeta `Authorization: Bearer <token>`. Response: 401 -> limpa sessão e `window.location` para `/login` (exceto na própria chamada de login); erro -> `Error(detail)` com a mensagem da API (string; se `detail` for lista de validação, junta as `msg`).
- `src/api.ts`: MESMAS assinaturas exportadas hoje (os 22 componentes não mudam de chamada), miolo trocado por axios. `listarAlunos(filtros?)` e `listarDisciplinas()` percorrem todas as páginas (`tamanho=100`). `situacaoDoAluno` mapeia `media_geral/frequencia_geral/aprovado` para `mediaGeral/frequenciaGeral/aprovado`. Funções que dependem de endpoints novos (`listarAvisos` paginado etc.) devolvem os mesmos tipos de antes. Dashboard usa `GET /dashboard` (novas funções), sem N+1.
- Remover: `mock.ts`, `esperar`, bancos em memória, `precarregar` simulado (passa a ser `GET /` para acordar a API).
- `.env.development`: `VITE_API_URL=http://localhost:8000`. `.env.production` fica para a Fase 4. `.env` e `.env.local` seguem ignorados.

## Auth e rotas (React Router)
- `src/auth/AuthContext.tsx`: estado `{token, perfil, aluno_id, email}` persistido em `localStorage` (try/catch), `entrar(email, senha)` e `sair()`.
- `ProtectedRoute({perfil})`: sem token -> `/login`; perfil errado -> aluno vai a `/meu-painel`, professor a `/`.
- Rotas: `/login` pública; professor: `/`, `/alunos`, `/disciplinas`, `/matriculas`, `/dashboard`, `/boletim`, `/frequencia`, `/avisos`; aluno: `/meu-painel` (a `TelaModoAluno`, com `aluno_id` do token, sem seletor de aluno).
- `App.tsx` vira roteamento; `Tela` type e `setTela` saem; `aoVoltar`/`aoIrParaHome` usam `navigate`. A animação `transicao-card` é mantida (dispara antes do `navigate`).
- `Cabecalho`: mostra o e-mail e botão "Sair".
- Vercel (Fase 4) precisará de rewrite SPA (`vercel.json`); fora desta fase.

## UI nova
- `TelaLogin` (substitui `TelaEntry`): direção visual do Opus 5.5 com `impeccable`, no mundo visual atual. Erro de credencial no formulário; acessos de demonstração indicados na tela.

## Ajuste no backend (repo `gestao-alunos`, ramo próprio)
- `db.lancar_nota` recalcula e grava `alunos.media` (média das médias por disciplina; `NULL` -> 0) na MESMA transação, para `Aluno.media`, filtro "média mínima" e card do aluno ficarem reais. Teste de regressão no backend.

## Verificação
- `npm run build` e `npx tsc -b` limpos.
- Um teste de browser de fumaça (Playwright ou equivalente já disponível): login real contra a API local (seed), abre `/alunos`, confere requisição com `Authorization: Bearer`; sem token, `/alunos` redireciona para `/login`; aluno logado não abre `/alunos`.
- Pré-requisito de ambiente: API local no ar (`uvicorn`, Postgres portátil em `~/.pg16:55432`) com `python seed.py --apagar-tudo` aplicado.

## Fora de escopo
Paginação/busca na UI e dashboard novo (Fase 3); deploy e `vercel.json` (Fase 4); tema/estilo das telas existentes.
