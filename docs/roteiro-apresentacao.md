# Roteiro de apresentação: Portal de Gestão Escolar

Tempo total: 13,5 min (abertura 0,5 + stack 3 + Swagger 2 + demonstração 5,5 + prova 1 + desafios 1 + encerramento 0,5).

Quem fala: o aluno-desenvolvedor, em primeira pessoa, em linguagem simples.

## Dados de acesso

- Front (produção): https://gestao-escola.felipefelipejulio242.workers.dev
- API: [LINK DA API: preencher depois do deploy] (documentação interativa em `/docs`)
- Senha de todas as contas: `escola123`
  - `escola@escola.com`: perfil Escola
  - `prof@escola.com`: Prof. Carlos (Python e Banco de Dados)
  - `marta@escola.com`: Profa. Marta (Algoritmos), usada só se perguntarem
  - `ana@escola.com`: Ana Souza, aluna
- O seed usa `escola123` como senha, a não ser que a variável `SEED_SENHA` esteja definida ao rodá-lo. Rode sem ela.

## Antes de começar

- Rodar o seed no banco da Render perto da hora (as datas do seed são relativas ao dia em que ele roda). Comando, com a *External Database URL* da Render em `DATABASE_URL`: `python seed.py --apagar-tudo`. Ele apaga todas as tabelas.
- Dois minutos antes, abrir o link da API, o `/docs` (Swagger) e o front, e deixar o login da escola pronto.

## 1. Abertura (30 s)

Fala: "O Portal de Gestão Escolar organiza o semestre da escola com três tipos de acesso."

- Escola: monta o semestre, os professores, as turmas, a grade e as matrículas.
- Professor: opera só as suas disciplinas (aulas, chamada e notas).
- Aluno: consulta as próprias notas e frequência.

## 2. A stack do produto (3 min)

| Camada | Tecnologia | Por que escolhi |
|---|---|---|
| Front | React 19 + Vite 8 + TypeScript | React monta a tela em pedaços reutilizáveis. O Vite sobe rápido e gera arquivos estáticos. O TypeScript aponta erro de tipo antes de rodar, e o build já roda a checagem. |
| Interface | Desenho no Claude Design (canvas em `design/canvas/`), conversor próprio (`scripts/converter-canvas.mjs`) e comparador (`npm run comparar`) | Eu desenhei a tela no canvas. O conversor gera o código das telas. O comparador confere o DOM do portal contra o canvas, em desktop e celular. |
| Back | Python 3.13 + FastAPI (com uvicorn) | FastAPI já traz a documentação interativa (`/docs`) e valida os dados que chegam. |
| Banco | PostgreSQL 16 + psycopg2, com SQL puro (sem ORM) | É um banco de verdade: chave única, ligação entre tabelas e exclusão em cascata. As tabelas são criadas sozinhas quando a API sobe. |
| Autenticação | Senha com bcrypt + token JWT no cabeçalho `Authorization: Bearer` | A senha fica só como hash (coluna `senha_hash`). Cada chamada leva o token, e a API confere o perfil (escola, professor, aluno). |
| Assistente de grade | Gemini, chamado pelo servidor (urllib, sem SDK) | Propõe a grade e a API confere os horários. Se um modelo responde 503 ou demora, tenta o próximo da lista. A chave fica só no servidor. |
| Testes | pytest (back); `node --test` e scripts de navegador com Playwright e Microsoft Edge (front) | O pytest usa um PostgreSQL só de teste. Os testes de navegador abrem o Edge de verdade contra a API real. |
| Deploy | Cloudflare Workers (front, arquivos estáticos); Render (API e PostgreSQL, pelo `render.yaml`); Docker (rodar tudo na própria máquina) | O front estático é leve e rápido. A Render cria API e banco de uma vez pelo blueprint. O Docker deixa a pilha igual na minha máquina. |

Diagrama do fluxo:

```
 Navegador
     |  (1) abre o site
     v
 Front (Cloudflare, arquivos estáticos)
     |  (2) chamadas HTTP com "Authorization: Bearer <token>"
     v
 API FastAPI (Render) ----(3) SQL----> PostgreSQL (Render)
     |
     +----(4) só no assistente de grade----> Gemini
```

Fala: "A IA fica ao lado da API. O navegador nunca fala com o Gemini, e a conversa e a grade não são gravadas."

Se perguntarem por que:
- Por que PostgreSQL e não arquivo: várias pessoas gravam ao mesmo tempo, e o banco garante as regras (chave única, ligação entre tabelas) e guarda os dados mesmo que o servidor reinicie.
- Por que token Bearer: o servidor não guarda sessão. Cada chamada leva o token, e a API decide o que aquela pessoa pode ver.
- Por que o front é estático: é só HTML, CSS e JavaScript prontos. Hospedar na Cloudflare é simples e rápido, e quem manda nos dados é a API.

## 3. Swagger: a documentação da API (2 min)

Fala de abertura: "Antes da tela, mostro a conversa da tela com o servidor. A API tem documentação interativa, gerada pelo próprio código."

Gotcha, treinar antes: cada caixa do Swagger é independente. Ela só atualiza quando eu clico "Try it out" e depois "Execute" *naquela caixa*. Criar algo no POST não muda o que o GET mostra; tem que executar o GET de novo.

**Passo S1: abrir /docs (15 s)**
- Clicar: abrir `[LINK DA API]/docs`.
- Fala: "As rotas estão agrupadas por assunto. Cada uma mostra o formato que entra e o que sai."
- Deve aparecer: os grupos (tags) auth, semestres, professores, agenda, pedidos de aula, notas, frequência, avisos, eventos, assistente, turmas e salas, portal. Ao expandir uma rota, os campos de entrada e de saída. As rotas de alunos e disciplinas aparecem no grupo "default", porque não têm tag no `main.py`.

**Passo S2: o 401 sem token (20 s)**
- Clicar: GET `/portal/estado` → "Try it out" → "Execute", sem token.
- Fala: "Sem token, a API recusa. Este é o 401."
- Deve aparecer: código 401 e a mensagem "Não autenticado".

**Passo S3: login e Authorize (45 s)**
- Clicar: POST `/auth/login` → "Try it out" → corpo `{"email": "escola@escola.com", "senha": "escola123"}` → "Execute".
- Deve aparecer: 200 com `access_token`, `token_type` "bearer", `perfil` "escola" e `aluno_id` nulo.
- Copiar só o valor de `access_token`.
- Clicar no botão Authorize (cadeado) e colar o token no campo HTTPBearer, sem a palavra Bearer. Depois, "Authorize" e "Close".
- Clicar: GET `/portal/estado` → "Try it out" → "Execute" de novo, porque a caixa antiga não muda sozinha.
- Deve aparecer: 200, com o estado do perfil da escola.
- Fala: "Agora o token vai em todas as chamadas que eu fizer aqui."

**Passo S4: o 403 com o token do professor (30 s)**
- Clicar: Authorize, clicar em "Logout" no diálogo, e fazer login de novo com `prof@escola.com` e `escola123`. Colar o novo token.
- Clicar: POST `/semestres` → "Try it out" → preencher o corpo `{"nome": "2027.1", "inicio": "2027-02-01", "fim": "2027-07-01"}` → "Execute".
- Deve aparecer: 403 com "Sem permissão".
- Fala: "O mesmo código, com outro token, é barrado. Criar semestre é tarefa da escola."

**Se algo falhar**
- 401 depois de autorizar: o token foi colado errado ou é de um login antigo. Fazer o login de novo e colar.
- `/docs` demora: a API estava dormindo (30 a 60 s).

## 4. Demonstração (5,5 min)

Antes: o link da API pode levar 30 a 60 s na primeira chamada (a Render gratuita dorme). Por isso o login já deve estar feito 2 minutos antes. Para trocar de perfil, use Sair (ele apaga o token guardado no navegador). Se preferir não depender dele, abra uma janela anônima por perfil.

**Passo 1: entrar como escola (30 s)**
- Clicar: login com `escola@escola.com` e senha `escola123`.
- Fala: "A escola entra e cai no Painel."
- Deve aparecer: a tela Painel (CONFERIR: nome e conteúdo dos cards).

**Passo 2: Semestre (20 s)**
- Clicar: Semestre.
- Fala: "Disciplinas, aulas e notas pertencem a um semestre. O seed usa o 2026.2."
- Deve aparecer: o semestre ativo, 2026.2 (CONFERIR: rótulo exato).

**Passo 3: Professores (20 s)**
- Clicar: Professores e depois o Prof. Carlos.
- Fala: "Aqui a escola cadastra os professores e vê quem dá cada disciplina. Cada professor também pode ter horários ocupados, que a grade respeita."
- Deve aparecer: a lista de professores. O seed não cadastra horário ocupado; se quiser mostrar um, cadastre um na hora.

**Passo 4: Alunos (30 s)**
- Clicar: Alunos e depois uma turma (1º A, 2º A ou 3º A).
- Fala: "Os alunos são organizados por turma. A turma do aluno decide em quais disciplinas ele entra sozinho."
- Deve aparecer: os alunos da turma escolhida (CONFERIR).

**Passo 5: Acadêmico, Quadro semanal (90 s)**
- Clicar: Acadêmico e depois Quadro semanal (rota `/agenda`; CONFERIR: nome exato da aba).
- Fala: "Aqui está a grade de todos os professores. Se eu arrastar uma aula para um horário que choca, o servidor recusa."
- Arrastar uma aula para um horário que choca com o professor, a turma ou a sala.
- Deve aparecer: a mensagem de choque que vem da API, e a aula volta para o lugar. Nem toda aula arrasta (CONFERIR: quais).
- Arrastar a mesma aula para um horário livre.
- Deve aparecer: a aula remarcada na grade (CONFERIR: se continua depois de recarregar a página).

**Passo 6: Pedidos de aula extra (30 s)**
- Clicar: Acadêmico e depois Pedidos (CONFERIR: nome exato).
- Fala: "O professor pede uma aula extra, e a escola aprova ou recusa com motivo. O seed já deixa um pedido pendente."
- Aprovar o pedido pendente.
- Deve aparecer: o pedido marcado como aprovado, e a aula extra criada (CONFERIR).

**Passo 7: Chamada (20 s)**
- Clicar: Acadêmico, Disciplinas, Python, aba Chamada (CONFERIR: caminho exato).
- Fala: "A chamada só aceita um dia com aula prevista e alunos matriculados."
- Deve aparecer: a lista de presença da data escolhida e a mensagem de salvo (CONFERIR).

**Passo 8: entrar como professor (60 s)**
- Clicar: Sair e entrar com `prof@escola.com`.
- Fala: "O professor vê só as disciplinas dele, Python e Banco de Dados. A disciplina da Profa. Marta não existe para ele."
- Deve aparecer: Painel e Acadêmico só com Python e Banco de Dados.
- Digitar na barra de endereço `/semestre`.
- Fala: "A tela é barrada para ele, e a API também recusaria os dados."
- Deve aparecer: o aviso do portal, e o sistema volta para a primeira tela permitida (o Painel).

**Passo 9: entrar como aluna (30 s)**
- Clicar: Sair e entrar com `ana@escola.com`.
- Fala: "A Ana vê só o que é dela: notas, frequência, próximas aulas e avisos, sem botões de escrita."
- Deve aparecer: a tela Meu painel, somente leitura (CONFERIR: como boletim e frequência aparecem na tela).

**Se algo falhar**
- Tela em branco ou carregando por muito tempo na primeira entrada: a API estava dormindo. Esperar até 60 s e recarregar.
- Sessão caiu (erro 401): fazer login de novo.
- Chamada recusada: confirmar que a data tem aula prevista para aquela disciplina.
- Dados bagunçados por testes ou remarcações: rodar o seed de novo (`python seed.py --apagar-tudo` com a URL do banco da Render). Ele apaga e recria tudo. Fazer isso antes da apresentação, nunca no meio.

## 5. Prova de integração e qualidade (1 min)

- Back: suíte pytest com 698 testes, contra um PostgreSQL de teste separado. A suíte recusa rodar sem a variável do banco de teste, e as tabelas de teste são apagadas antes de cada teste.
- Front, unitários: `node --test` cobre o adaptador, o conversor e as regras da grade: 61 testes.
- Front, ponta a ponta: scripts com Playwright e Microsoft Edge, rodando contra a API real. Cobrem login e perfis, cadastros, notas e chamada, rotas e acesso por perfil, o quadro com arraste, pedidos de aula extra e o assistente, inclusive com erro simulado: 9 scripts, todos verdes contra a API real.
- Comparador do canvas: `npm run comparar` confere o DOM do portal contra o desenho, em desktop e celular. CONFERIR: resultado atual de diferenças (rodar antes da apresentação).

Fala: "Cada tela é comparada com o desenho, e as regras principais da escola são testadas contra um banco de verdade."

## 6. Desafios que enfrentei (1 min)

1. **Choque de horário.** A grade é conferida contra a ocupação do professor, as outras disciplinas dele, a turma e a sala. Quando há choque, a API responde 409 e não grava nada pela metade. Na matrícula, o choque de horário do aluno também é recusado.
2. **Matrícula automática pela turma.** O aluno pertence a uma turma e entra nas disciplinas dela, sem matricular um por um.
3. **Exclusão protegida.** Antes, excluir uma disciplina apagava notas e matrículas sem aviso. Agora a API recusa excluir disciplina ou aluno que já tem nota ou chamada (resposta 409).

Fala: "Mapeei os furos da lógica escolar antes de apresentar e corrigi os principais, cada um com teste."

## 7. Encerramento e perguntas (30 s)

Fala: "Resumindo: três perfis, as regras da escola ficam na API e o front mostra e pede. Obrigado. Quais são as perguntas?"

Perguntas prováveis:

1. **A IA grava a grade sozinha?** Não. Ela só propõe. A API confere blocos de horário, ocupação e choques, e a escola aplica a grade pelo caminho normal de gravação.
2. **E se a IA cair ou atingir o limite?** A API responde 503 (não configurada), 429 (limite de uso) ou 502 (falha). A grade continua podendo ser montada à mão.
3. **Os dados ficam salvos?** Sim, no PostgreSQL. O seed é que apaga e recria os dados de demonstração.
4. **Um aluno vê as notas de outra turma?** Não. A API filtra pelo perfil: o aluno só acessa o próprio registro, e o professor só as disciplinas dele.
5. **O que ainda falta?** O mapa de furos de 07/10 lista pontos ainda abertos, como a aprovação calculada pela média geral, a transferência no meio do semestre e o feriado por turma.

## Itens a conferir antes de apresentar

Tudo abaixo precisa de você, na máquina, antes de entrar:

- Link da API depois do deploy: troque `[LINK DA API: preencher depois do deploy]` neste arquivo.
- Ensaie uma vez os Passos 1 a 9 com o seed fresco (`python seed.py --apagar-tudo`), principalmente: o nome exato das abas do Acadêmico (Quadro, Ano, Disciplinas, Pedidos), quais aulas arrastam no Quadro e se a remarcação continua depois de recarregar.
- Ensaie o Swagger (Passos S1 a S4) uma vez, para memorizar o "Try it out" e o "Execute" de cada caixa.
- Rode `npm run comparar` se quiser citar o número de diferenças (a última rodada deu 0 DIFERENTE).
- O banco gratuito da Render expira em 30 dias; para a apresentação não importa.
