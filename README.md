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
| `escola@escola.com` | Escola | Painel, semestre, professores, alunos (hub por turma), acadêmico (quadro, ano letivo, disciplinas e pedidos) e avisos de toda a escola. |
| `prof@escola.com` | Prof. Carlos | Painel, acadêmico (Python e Banco de Dados), seus alunos e avisos. |
| `marta@escola.com` | Profa. Marta | Painel, acadêmico (Algoritmos), seus alunos e avisos. |
| `ana@escola.com` | Ana Souza | Meu painel, com suas notas, frequência, próximas aulas e avisos, para leitura. |

Visitantes veem a apresentação em `/` e o login em `/login`. Após entrar, escola e professores vão para `/painel`; alunos vão para `/meu-painel`. As demais telas usam `/semestre`, `/professores`, `/alunos`, `/agenda` e `/avisos`. O Acadêmico responde em `/agenda` (quadro semanal), `/disciplinas` (página da disciplina) e `/grade`; `/matriculas` abre Alunos para a escola e as notas da disciplina para o professor. A troca de senha provisória usa `/primeiro-acesso`. Rotas fora do perfil mostram o aviso do portal e voltam à primeira tela permitida.

## Canvas e conferência

O canvas original fica em `design/canvas/`. O conversor gera `src/portal/template.tsx`, os componentes e estilos; esses arquivos gerados não devem ser editados manualmente. A lógica de navegação e integração com a API fica em `Portal.tsx`, `rede.ts` e `adaptador.ts`.

```bash
npm run converter
npm run comparar
```

O comparador usa Microsoft Edge via Playwright e compara o DOM do portal com o canvas em desktop e celular. Os parâmetros de diagnóstico como `?inicio=Professor` só funcionam em desenvolvimento. Para rodar por partes, use `ESTADOS=<regex> npm run comparar` (a expressão vale para o nome de cada estado, por exemplo `ESTADOS="Chamada.*1280"`). Quando o próprio canvas muda de uma abertura para outra, o resultado sai como ANIMADO.

Com API em `http://localhost:8000`, front em `http://localhost:5173` e Microsoft Edge instalado:

```bash
npx tsc -b
npm run build
node --test e2e/adaptador.test.mjs e2e/converter-canvas.test.mjs e2e/gradeagenda.test.mjs
node e2e/portal-integracao.mjs
node e2e/portal-escola.mjs
node e2e/portal-operacao.mjs
node e2e/portal-rotas.mjs
node e2e/portal-grade.mjs
node e2e/portal-turmas.mjs
npm run comparar
```

Os testes unitários conferem o adaptador, o conversor e as regras da Grade e agenda. Integração verifica login, sessão, perfis e troca de senha; escola verifica cadastros, editor de disciplina e matrícula pela disciplina; operação verifica notas, chamada pela página da disciplina, aulas e avisos; rotas verifica URLs, recarga, histórico e acesso por perfil; grade verifica quadro, calendário, pedidos de aula extra e assistente; turmas verifica o hub por turma, a matrícula automática pela turma do aluno, a troca de turma e a chamada. O teste de rotas não altera dados. Os demais criam e apagam seus registros de teste; professores e a turma de teste permanecem (o reseed da API limpa). As escritas de semestre são simuladas no teste de escola.

Para conferir o build, rode `npx vite preview --port 4173` em outro terminal e aponte o teste de rotas para ele:

```powershell
$env:FRONT_URL = 'http://localhost:4173'
node e2e/portal-rotas.mjs
```

## Produção

Link de produção: https://gestao-escola.felipefelipejulio242.workers.dev

O front está publicado na Cloudflare (Workers com arquivos estáticos, ligado ao ramo `main` deste repositório), com o comando `npm run build` e a saída `dist`. A API roda na Render (ver o README do back-end); a variável `VITE_API_URL` do build na Cloudflare aponta para ela (URL sem barra no final). Sem `VITE_API_URL`, o front chama `http://localhost:8000`, que é o uso local, inclusive com a API em Docker (nesse caso, como o site é https, o navegador pede permissão de acesso à rede local na primeira chamada). O arquivo `public/_redirects` manda todos os caminhos para `/index.html`, permitindo abrir e recarregar as URLs da SPA.

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
