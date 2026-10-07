# F4 — Portal vira o app: URLs por tela, raiz, limpeza e entrega

Continuação de `2026-10-06-portar-canvas.md` (F1), `...-f2.md`, `...-f3.md` (tudo commitado no ramo `fase7-portal-canvas`: login real, leitura de `GET /portal/estado` e todas as escritas ligadas à API; 55 checagens e2e verdes). Esta fase é a última do front antes do deploy.

**Meta verificável:** `npm run build` gera `dist/index.html` que já é o portal; a tela atual está na URL (`/painel`, `/disciplinas`, …), recarregar e o botão voltar funcionam, rota de perfil errado cai no aviso do protótipo, visitante em rota protegida cai no login; o app antigo não existe mais no repositório; todos os e2e passam apontando para `/`.

## Decisões fechadas (não reabrir)

- **URLs** (mapa `tela` do protótipo → caminho): `inicio` → `/` (visitante) ; logado: `/` redireciona (sem recarregar a página) para a primeira tela do perfil; `login` → `/login`; `primeiro-acesso` → `/primeiro-acesso`; `painel` → `/painel`; `semestre` → `/semestre`; `disciplinas` → `/disciplinas`; `professores` → `/professores`; `alunos` → `/alunos`; `boletim` (a aba "Matrículas") → `/matriculas`; `frequencia` (a aba "Agenda") → `/agenda`; `avisos` → `/avisos`; `meu-painel` → `/meu-painel`. Sem subrotas (a disciplina aberta e as sub-abas continuam estado interno).
- Sincronização por `history.pushState` dentro de `ir()` (e ao entrar/sair), `popstate` aplica a tela do caminho, e a tela inicial vem do caminho na montagem (depois de restaurar a sessão). **Reaproveite o mecanismo que o protótipo já tem** para tela fora do perfil (`rotaAviso`: "Essa tela não faz parte do perfil …", redireciona à primeira tela do perfil); não invente tela nova nem mensagem nova. Visitante em rota protegida: mostra o login (`tela:'login'`, mesmo fluxo do botão Entrar) e depois do login vai à primeira tela do perfil. Caminho desconhecido: trata como `/` (visitante vê a apresentação; logado vai à primeira tela do perfil).
- O template e `componentes/*.tsx` são gerados e não mudam. As mudanças ficam em `Portal.tsx`, `main.tsx` e arquivos de configuração.
- O portal passa a ser a raiz: o conteúdo de `portal.html` vira `index.html` (um só ponto de entrada; `<div id="dc-root">`), `portal.html` deixa de existir, `vite.config.ts` volta a uma entrada só.
- **Remover o app antigo**: `src/App.tsx`, `src/components/**`, `src/auth/**`, `src/api.ts`, `src/http.ts`, `src/types.ts`, `src/destinos.tsx`, `src/formatar.ts`, `src/useAtraso.ts`, `src/ui/**`, `src/index.css`, o `src/main.tsx` antigo (o `src/portal/main.tsx` passa a ser a entrada e `index.html` aponta para ele ou para um `src/main.tsx` equivalente: escolha o mais simples), `e2e/smoke.mjs` (testava o app antigo) e o script `smoke` do `package.json`. Se alguma dessas coisas ainda for importada por `src/portal/**`, NÃO apague e relate. As dependências `axios` e `react-router-dom` deixam de ser usadas: remova-as do `package.json` SEM rodar npm (o orquestrador roda `npm install` depois para atualizar o lock; sandbox sem rede).
- `vercel.json` na raiz com rewrite de qualquer caminho para `/index.html` (SPA) e nada mais (build padrão `npm run build`, saída `dist`).
- `README.md` do front (reescrever): o que é o projeto em 3 linhas; como rodar (`npm install`, `.env.development` com `VITE_API_URL`, `npm run dev`); contas de demonstração do seed (escola, Prof. Carlos, Profa. Marta, Ana; senha `escola123`) e o que cada perfil vê; como a interface é gerada do canvas (`npm run converter`, `npm run comparar`) e quais e2e existem e como rodá-los; seção "Produção" com a linha `Link de produção: A PREENCHER` e a variável `VITE_API_URL` que a Vercel precisa; estrutura de pastas curta. Sem emojis.
- `.env.production` NÃO é criado (a URL da API vem da variável da Vercel). Em `src/portal/rede.ts`, mantenha `import.meta.env.VITE_API_URL || 'http://localhost:8000'`.
- Os e2e e o comparador passam a apontar para `/` em vez de `/portal.html` (`scripts/comparar-canvas.mjs`, `e2e/portal-*.mjs`); o comparador continua comparando contra o canvas original e deve continuar com os mesmos resultados (IGUAL/ANIMADO) nos estados que ele já cobre.

## Verificação

- Ajustar os e2e existentes (`e2e/portal-integracao.mjs`, `portal-escola.mjs`, `portal-operacao.mjs`) para `/`.
- Novo `e2e/portal-rotas.mjs` (Playwright + Edge, API `http://localhost:8000` e front `http://localhost:5173` já no ar; contas do seed com senha `escola123`; não altera dados): (1) visitante abre `/disciplinas` e vê o formulário de login, não a tela de disciplinas; (2) escola entra, navega pelo menu e a URL muda para cada caminho do mapa; recarregar em `/disciplinas` mantém a tela e a sessão; o botão voltar do navegador volta à tela anterior; (3) Prof. Carlos abre `/professores`: vê o aviso do protótipo e cai em `/painel`; Ana abre `/alunos`: cai em `/meu-painel`; (4) caminho desconhecido `/xyz` logado vai para a primeira tela do perfil e visitante vê a apresentação; (5) sair volta a `/` e `/painel` deslogado mostra o login. Cada negativo tem âncora positiva ao lado (por exemplo, "Carlos NÃO vê Professores" só vale se Carlos vê o painel dele na mesma navegação).
- Build de produção: `npm run build` e depois `npx vite preview --port 4173` com o mesmo `e2e/portal-rotas.mjs` apontando para `http://localhost:4173` (variável `FRONT_URL`), para provar que o `dist` serve o portal e que o fallback de SPA funciona em `vite preview`.
- Conferir que nada em `src/` importa arquivo apagado (`npx tsc -b`).

## Conferência

`npx tsc -b ; npm run build ; node --test e2e/adaptador.test.mjs e2e/converter-canvas.test.mjs ; node e2e/portal-integracao.mjs ; node e2e/portal-escola.mjs ; node e2e/portal-operacao.mjs ; node e2e/portal-rotas.mjs ; npm run comparar` (o comparador sobe o próprio vite e leva alguns minutos: roda por último).

## Fora de escopo

Subrotas por disciplina/aluno, `metricas` no lugar dos cálculos locais (F2b), CSV do servidor, deploy (Vercel/Render/Neon), mudar o canvas.
