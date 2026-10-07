# Portal de Gestão Escolar — Frontend

Portal em React e TypeScript, servido pelo Vite, para escola, professores e alunos.
Faz login real e consulta e grava dados na API de gestão escolar (FastAPI).
A interface vem do canvas e tem URLs por tela, sessão restaurada e navegação pelo histórico do navegador.

## Desenvolvimento

Requer Node.js 20.19+ ou 22.12+ e a API em execução.

```bash
npm install
```

Crie `.env.development` na raiz com a URL da API:

```dotenv
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Abra `http://localhost:5173`. Sem configuração, a API usa `http://localhost:8000`.

## Contas de demonstração

O seed da API usa o semestre 2026.2. A senha de todas as contas abaixo é `escola123`.

| Conta | Perfil | O que vê |
| --- | --- | --- |
| `escola@escola.com` | Escola | Painel, semestre, disciplinas, professores, alunos, matrículas, agenda e avisos de toda a escola. |
| `prof@escola.com` | Prof. Carlos | Painel, agenda, Python e Banco de Dados, seus alunos e avisos. |
| `marta@escola.com` | Profa. Marta | Painel, agenda, Algoritmos, seus alunos e avisos. |
| `ana@escola.com` | Ana Souza | Meu painel, com suas notas, frequência, próximas aulas e avisos, para leitura. |

Visitantes veem a apresentação em `/` e o login em `/login`. Após entrar, escola e professores vão para `/painel`; alunos vão para `/meu-painel`. As demais telas usam `/semestre`, `/disciplinas`, `/professores`, `/alunos`, `/matriculas`, `/agenda` e `/avisos`. A troca de senha provisória usa `/primeiro-acesso`. Rotas fora do perfil mostram o aviso do portal e voltam à primeira tela permitida.

## Canvas e conferência

O canvas original fica em `design/canvas/`. O conversor gera `src/portal/template.tsx`, os componentes e estilos; esses arquivos gerados não devem ser editados manualmente. A lógica de navegação e integração com a API fica em `Portal.tsx`, `rede.ts` e `adaptador.ts`.

```bash
npm run converter
npm run comparar
```

O comparador usa Microsoft Edge via Playwright e compara o DOM do portal com o canvas em desktop e celular. Os parâmetros de diagnóstico como `?inicio=Professor` só funcionam em desenvolvimento.

Com API em `http://localhost:8000`, front em `http://localhost:5173` e Microsoft Edge instalado:

```bash
npx tsc -b
npm run build
node --test e2e/adaptador.test.mjs e2e/converter-canvas.test.mjs
node e2e/portal-integracao.mjs
node e2e/portal-escola.mjs
node e2e/portal-operacao.mjs
node e2e/portal-rotas.mjs
npm run comparar
```

Os testes unitários conferem o adaptador e o conversor. Integração verifica login, sessão, perfis e troca de senha; escola verifica cadastros, grade e matrículas; operação verifica notas, chamadas, aulas e avisos; rotas verifica URLs, recarga, histórico e acesso por perfil. O teste de rotas não altera dados. Os demais criam e apagam seus registros de teste; professores de teste permanecem. As escritas de semestre são simuladas no teste de escola.

Para conferir o build, rode `npx vite preview --port 4173` em outro terminal e aponte o teste de rotas para ele:

```powershell
$env:FRONT_URL = 'http://localhost:4173'
node e2e/portal-rotas.mjs
```

## Produção

Link de produção: https://gestao-escola.felipefelipejulio242.workers.dev

O front está publicado na Cloudflare (Workers com arquivos estáticos, ligado ao ramo `main` deste repositório), com o comando `npm run build` e a saída `dist`. A API roda em Docker na máquina da apresentação (`docker compose`, ver o README do back-end): sem `VITE_API_URL` no build, o front chama `http://localhost:8000`, e o navegador pede permissão de acesso à rede local na primeira chamada. Para apontar o front para uma API pública, defina `VITE_API_URL` com a URL dela antes do build. O arquivo `public/_redirects` manda todos os caminhos para `/index.html`, permitindo abrir e recarregar as URLs da SPA.

## Estrutura

```text
index.html                 Entrada única do portal
src/portal/main.tsx         Montagem e opções de diagnóstico
src/portal/Portal.tsx       Lógica da interface e navegação
src/portal/rede.ts          Acesso à API e token de sessão
src/portal/adaptador.ts     Dados da API para o estado do portal
src/portal/template.tsx     Template gerado do canvas
src/portal/componentes/     Componentes gerados
src/portal/ds/              Estilos do sistema de design
design/canvas/             Canvas original
scripts/                   Conversor e comparador
e2e/                       Testes unitários e de navegador
docs/superpowers/plans/     Planos de implementação
```
