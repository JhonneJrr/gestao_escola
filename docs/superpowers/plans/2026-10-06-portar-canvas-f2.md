# F2 — Login real e dados reais no portal (somente leitura)

Continuação de `2026-10-06-portar-canvas.md` (F1 pronta e commitada: `src/portal/**` renderiza o canvas fiel com dados fictícios). Ramo `fase7-portal-canvas`.

**Meta verificável:** `http://localhost:5173/portal.html` entra com `escola@escola.com`, `prof@escola.com`, `marta@escola.com` e `ana@escola.com` (senha `escola123`) contra a API real em `http://localhost:8000`, e cada perfil mostra os dados do seed recortados pelo backend. Recarregar a página mantém a sessão. Sair volta ao início. A senha provisória leva ao Primeiro acesso e troca de verdade. **Escritas (cadastrar, lançar nota, chamada…) continuam locais nesta fase; elas viram chamadas à API na F3.**

## Decisões fechadas (não reabrir)

- Fonte única dos dados: **`GET /portal/estado`** (backend, Task B1 de `gestao-alunos/docs/superpowers/plans/2026-10-06-estado-do-portal.md`; ler a seção "Resposta" e "Recorte por perfil" lá, é o contrato). Sessão: `POST /auth/login` → `{access_token, token_type, perfil, aluno_id}`; identidade: `GET /auth/me`.
- O **template não muda** (`template.tsx`, `componentes/*.tsx` são gerados). Tudo se faz em `src/portal/Portal.tsx` (a partir de agora código nosso, não mais cópia verbatim), em arquivos novos e em `main.tsx`.
- O estado do Portal continua sendo a MESMA forma do protótipo (`alunos`, `discs`, `mats`, `avals`, `notas`, `aulas`, `avisos`, `profs`, `semestre`, `hist`…); um adaptador traduz a resposta da API para essa forma. O resto da lógica e de `renderVals()` não é reescrito.
- Perfil da API → `papel` do protótipo: `escola`→`'escola'`, `professor`→`'prof'`, `aluno`→`'aluno'`. `profId` = `usuario.id` quando `'prof'`.
- Token em `localStorage` (chave `portal.token`). `Authorization: Bearer <token>` em toda chamada, menos no login. Backend em `import.meta.env.VITE_API_URL` (padrão `http://localhost:8000`).
- Nenhuma dependência nova. Usar `axios` (já instalado) ou `fetch`; escolha o mais simples.
- As quatro contas demo (`demos` no `renderVals`) e o handler delas continuam EXATAMENTE como estão no Portal.tsx (hoje preenchem e-mail, senha e papel; não limite nada, não reescreva).

## Tarefas

### F2.1 Rede e sessão — `src/portal/rede.ts`

- Cliente HTTP com o Bearer, `baseURL` conforme acima. Erro normalizado: `{ status: number, detalhe: string }` (o `detail` da API; se `detail` for lista de erros de validação, junte as mensagens). **Não** deslogar automaticamente em 401 de `/auth/login` nem de `/auth/trocar-senha` (senha errada é 401 e não pode derrubar a sessão); em 401 de qualquer outra rota, apagar o token e avisar o Portal (callback `aoExpirar`).
- Funções: `login(email, senha)`, `me()`, `estado()`, `trocarSenha(senhaAtual, senhaNova)`, `guardarToken`, `lerToken`, `apagarToken`.

### F2.2 Adaptador — `src/portal/adaptador.ts` (puro, sem React)

`montarEstado(usuario, estado)` devolve o objeto a passar para `setState` do Portal, com estas correspondências exatas (nomes do protótipo à esquerda; ver o `seed()` e as constantes `ALUNOS0`, `DISC0`, `SEM0`, `PROFS0`, `HIST0` em `Portal.tsx` para a forma):

- `papel`, `profId` (acima) e `usuario` (o objeto de `/auth/me`, guardado em `state.usuario`). O protótipo FIXA o usuário logado em `renderVals()` (linhas ~1252-1253: `usuarioEmail`/`usuarioIniciais`/`usuarioNome` valem `escola@escola.com`/`Secretaria` para escola, o professor de `profs` para prof e `ana@escola.com`/`Ana Souza` para aluno) e assume o aluno logado como `id === 1` (linhas ~1027 e ~1228: `reais.find(a => a.id === 1)`), `primeiroEmail` com padrão `ana@escola.com`, e `selAluno: 1`. Troque cada uma dessas suposições por dados de `state.usuario` (aluno logado = `usuario.aluno_id`; nome do aluno vem de `alunos`; escola mostra `usuario.nome`/`usuario.email`). Procure no arquivo inteiro qualquer outra suposição de que o usuário é Ana, Carlos ou id 1 e relate as que não trocar.
- `semestre` = `{id,nome,inicio,fim,encerrado_em}` com `encerrado_em` só a parte da data (`AAAA-MM-DD`) ou `null`; `null` se a API devolver `null`.
- `historico` (esta é a chave do `state` no Portal.tsx, linha ~150; NÃO `hist`; o `hist` que existe é um campo de cada aluno, ver `alunos` abaixo) = `semestres_encerrados` na forma de `HIST0`: `{id,nome,inicio,fim,encerrado_em,resumo:[{disc,alunos,media,mediaCor,freq,freqCor,aprov,reprov,reprovCor}]}` com os campos do `resumo` JÁ FORMATADOS como no `HIST0` (`alunos` string; `media` com vírgula e uma casa, `—` se nulo; `freq` inteiro com `%`, `—` se nulo; `aprov`/`reprov` strings; `reprovCor` = `AVISO` se `reprov > 0` senão `TINTA`; `mediaCor`/`freqCor` = `TINTA`). Reaproveite `fmt`, `pct`, `AVISO`, `TINTA`.
- `profs` = `professores` → `{id,nome,email}`.
- `alunos` = `alunos` → `{id,nome,mat:matricula,idade,media,email,hist:semestre_historico}`; `provisoria: true` só no próprio aluno logado quando `usuario.senha_provisoria`.
- `discs` = `disciplinas` → `{id,nome,carga_horaria,professor_id,grade}`.
- `mats` = `{ 'alunoId-disciplinaId': true }` a partir de `matriculas`.
- `avals` = `avaliacoes` → `{id,did:disciplina_id,nome,peso}`.
- `notas` = `{ 'alunoId-avaliacaoId': valor }` a partir de `notas`.
- `aulas` = `aulas` → `{aula_id:id,disciplina_id,data,hora_inicio,hora_fim,status,origem,remarcada_de,chamada}` com `chamada` = `null` se a API manda `null`, senão `{ 'alunoId': presente }`.
- `avisos` = `avisos` → `{id,titulo,data,msg:mensagem,disciplina_id,autor_id,autor_nome}`.
- Guardar também `metricas` (como veio) em `state.metricas` para a F2b.
- Testes de unidade em `e2e/adaptador.test.mjs` (`node --test`; se o Node não importar `.ts` direto, escreva o adaptador sem sintaxe não apagável e importe via o mecanismo que o projeto já usa em `e2e/converter-canvas.test.mjs`): uma resposta de exemplo por perfil (escola, professor, aluno) com os valores esperados escritos à mão; um professor sem disciplina gera listas vazias; `encerrado_em` vira só data.

### F2.3 Fluxo no Portal — `src/portal/Portal.tsx`

Troque as partes abaixo (e só elas) do protótipo:

- `state` inicial: sem dados fictícios. Remova o uso de `seed()`/`ALUNOS0`/`DISC0`/`PROFS0`/`HIST0`/`SEM0` como estado inicial; deixe as coleções vazias (`[]`/`{}`/`null`). Mantenha as constantes soltas só se algo ainda as referenciar (a `FUNCOES`/apresentação não depende delas); apague as mortas.
- `entrar` (o submit do login, hoje decide o papel pelo e-mail em memória): chame `login()`, depois `me()` e `estado()`; erro → `loginErro` com o `detalhe` da API (sem inventar texto). Com `usuario.senha_provisoria` verdadeiro: `tela: 'primeiro-acesso'` (`primeiroEmail`, `primeiroPapel`) sem entrar no app. Senão: carregue o estado (`setState(montarEstado(...))`) e chame `entrarAnimado(papel)`, com `preCarregar` devolvendo a Promise REAL do carregamento (o protótipo já deixou esse ponto de integração comentado em `preCarregar`).
- `salvarPrimeiro` (primeiro acesso): `trocarSenha(senhaAtual = a senha provisória digitada no login, senhaNova)`; erro da API → `fErro`; sucesso → recarregue o estado e entre (`entrarAnimado`).
- `trocarSenha` (menu do avatar): `trocarSenha(sAtual, sNova)`; 401/403 → `fErro` com o `detalhe` (a sessão NÃO cai); sucesso → `senhaOk`.
- `sair`: `apagarToken()` e volte ao estado de visitante (`logado:false`, coleções vazias, `tela:'login'`).
- Restaurar sessão: em `componentDidMount`, se há token, chame `me()` + `estado()` e entre direto (sem animação, `entrarComo`); falha 401 → apague o token e fique no início. `aoExpirar` (401 durante o uso) faz o mesmo que `sair` mostrando o login.
- `main.tsx`: produção usa `inicio="Apresentação"`; os parâmetros `?inicio=` etc. continuam valendo só em `import.meta.env.DEV`.
- Enquanto `estado()` carrega depois do login, o canvas já tem `estado` Carregando para as listas; o aviso visual durante o mergulho é o próprio `entrarAnimado`. Não invente tela nova.

### F2.4 Verificação — `e2e/portal-integracao.mjs` (Playwright + Edge, como `e2e/smoke.mjs`)

Pré-requisito (o orquestrador deixa pronto): API em `http://localhost:8000` com o seed novo (`escola@escola.com`, `prof@escola.com`, `marta@escola.com`, `ana@escola.com`, senha `escola123`) e o front em `http://localhost:5173` (`npm run dev`). O script abre `/portal.html` e, para cada conta: faz login pela tela, espera entrar e confere **texto visível vindo do seed**: escola vê `Redes` (disciplina sem professor) e as 3 disciplinas com professor; Carlos vê `Python` e `Banco de Dados` e NÃO vê `Algoritmos`; Marta vê `Algoritmos` e NÃO vê `Python`; Ana vê só o painel de aluno. Confere que toda chamada à API depois do login leva `Authorization: Bearer`, que senha errada mostra o texto de erro da API e NÃO entra, que recarregar mantém a sessão, e que `Sair` + recarregar volta ao início. Imprime uma linha `OK`/`FALHOU` por checagem; código 1 se alguma falhar. Cada `expect` negativo tem a âncora positiva ao lado (por exemplo, Carlos NÃO vê `Algoritmos` só vale se Carlos vê `Python` na mesma tela).

### Conferência

`npx tsc -b ; npm run build ; node --test e2e/adaptador.test.mjs e2e/converter-canvas.test.mjs ; node e2e/portal-integracao.mjs`

## Fora de escopo da F2

Qualquer escrita (a F3 cuida), usar `metricas` para trocar os números do protótipo (F2b), URLs por tela, remover o app antigo, deploy.
