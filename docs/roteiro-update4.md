# Roteiro de apresentação: Portal de Gestão Escolar (update 4)

Tempo total: 15,3 min (abertura 0,5 + stack 2,5 + Swagger 3 + demonstração 6,8 + prova 1 + desafios 1 + encerramento 0,5).

Quem fala: o aluno-desenvolvedor, em primeira pessoa, em linguagem simples.

Marcação: "CONFERIR:" indica um rótulo, valor ou comportamento que não aparece nos arquivos lidos para este roteiro. Confirme na tela antes de apresentar.

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
- Conferir antes, no seed fresco: CONFERIR: o valor da média mínima do seed (o roteiro assume 6); qual aluno do seed está com a situação "Prova final" numa disciplina (para o passo de conselho); qual disciplina do seed tem nota (para o bloqueio de exclusão).

## 1. Abertura (30 s)

Fala: "O Portal de Gestão Escolar organiza o semestre da escola com três tipos de acesso."

- Escola: monta o semestre, os professores, as turmas, a grade, as matrículas e a regra de avaliação.
- Professor: opera só as suas disciplinas (aulas, chamada, atividades e notas).
- Aluno: consulta as próprias notas, frequência e situação.

## 2. A stack do produto (2,5 min)

| Camada | Tecnologia | Por que escolhi |
|---|---|---|
| Front | React 19 + Vite 8 + TypeScript | O React monta a tela em pedaços reutilizáveis e atualiza só o que muda, sem recarregar a página. O Vite compila o projeto para produção. O TypeScript aponta erro de tipo antes de rodar. |
| Interface | Desenho no Claude Design (canvas em `design/canvas/`), conversor próprio (`scripts/converter-canvas.mjs`) e comparador (`npm run comparar`) | Eu desenhei a tela no canvas. O conversor gera o código das telas. O comparador confere o DOM do portal contra o canvas, em desktop e celular. |
| Back | Python 3.13 + FastAPI (com uvicorn) | FastAPI já traz a documentação interativa (`/docs`) e valida os dados que chegam. A conta de médias e situação fica num módulo próprio (`notas_calc.py`), sem banco e sem FastAPI. |
| Banco | PostgreSQL 16 + psycopg2, com SQL puro (sem ORM) | É um banco de verdade: chave única, ligação entre tabelas e exclusão em cascata. As tabelas e as colunas novas são criadas sozinhas quando a API sobe (`esquema.sql`). |
| Autenticação | Senha com bcrypt + token JWT no cabeçalho `Authorization: Bearer` | A senha fica só como hash (coluna `senha_hash`). Cada chamada leva o token, e a API confere o perfil (escola, professor, aluno). |
| Assistente de grade | Gemini, chamado pelo servidor (urllib, sem SDK) | Propõe a grade e a API confere os horários. Se um modelo responde 503 ou demora, tenta o próximo da lista. A chave fica só no servidor. |
| Testes | pytest (back); `node --test` e scripts de navegador com Playwright e Microsoft Edge (front) | O pytest usa um PostgreSQL só de teste. Os testes de navegador abrem o Edge de verdade contra a API real. |
| Produção | Cloudflare (front); Render (API e PostgreSQL, pelo `render.yaml`); Docker (rodar tudo na própria máquina) | Tudo está no ar: o front React é entregue pela Cloudflare e roda no navegador de quem acessa; a API e o banco rodam na Render. A Render cria API e banco de uma vez pelo blueprint. O Docker deixa a pilha igual na minha máquina. |

Diagrama do fluxo:

```
 Navegador
     |  (1) abre o site
     v
 Front React (entregue pela Cloudflare, roda no navegador)
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
- Por que o front é separado da API: o front só mostra as telas e pede os dados; as regras da escola e o acesso ao banco ficam na API. Assim eu publico, troco ou testo cada lado sozinho, e o navegador nunca chega ao banco.
- Por que a média fica num módulo só: o boletim, o painel e a documentação usam a mesma conta. Se a regra mudar, muda em um lugar.

## 3. Swagger: a documentação da API (3 min)

Fala de abertura: "Antes da tela, mostro a conversa da tela com o servidor. A API tem documentação interativa, gerada pelo próprio código."

Gotcha, treinar antes: cada caixa do Swagger é independente. Ela só atualiza quando eu clico "Try it out" e depois "Execute" *naquela caixa*. Criar algo no POST não muda o que o GET mostra; tem que executar o GET de novo.

**Passo S1: abrir /docs (15 s)**
- Clicar: abrir `[LINK DA API]/docs`.
- Fala: "As rotas estão agrupadas por assunto. Cada uma mostra o formato que entra e o que sai."
- Deve aparecer: os grupos (tags) auth, semestres, professores, agenda, pedidos de aula, notas, frequência, avisos, eventos, assistente, turmas e salas, portal. Ao expandir uma rota, os campos de entrada e de saída. As rotas de alunos e disciplinas aparecem no grupo "default", porque não têm tag no `main.py`. CONFERIR: se a regra de avaliação tem grupo próprio (tag) ou está no "default".

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

**Passo S5: a regra de avaliação em JSON (30 s)**
- Clicar: com o token do professor que já está colado (S4), GET `/regra-avaliacao` → "Try it out" → "Execute".
- Fala: "Qualquer pessoa logada lê a regra da escola. Aqui está o JSON: os períodos, os itens com peso, as atividades extras, a recuperação, a prova final, a média mínima e a frequência mínima."
- Deve aparecer: 200 com os campos `tipo`, `periodos`, `itens`, `extras`, `participacao`, `recuperacao`, `final`, `arred`, `mediaMin`, `freqMin` e `conselho`. Com o seed, `mediaMin` com o valor do seed (CONFERIR: se é 6) e `freqMin` 75.

**Passo S6: o professor não muda a regra (30 s)**
- Clicar: PUT `/regra-avaliacao` → "Try it out" → "Execute", com o token do professor. Não executar com o token da escola na frente de quem assiste, porque isso grava a regra.
- Fala: "Ler a regra é para todos. Mudar a regra é só da escola. O mesmo token que acabou de ler é barrado aqui."
- Deve aparecer: 403 (CONFERIR: mensagem exata da resposta).

**Se algo falhar**
- 401 depois de autorizar: o token foi colado errado ou é de um login antigo. Fazer o login de novo e colar.
- `/docs` demora: a API estava dormindo (30 a 60 s).

## 4. Demonstração (6,8 min)

Antes: o link da API pode levar 30 a 60 s na primeira chamada (a Render gratuita dorme). Por isso o login já deve estar feito 2 minutos antes. Para trocar de perfil, use Sair (ele apaga o token guardado no navegador). Se preferir não depender dele, abra uma janela anônima por perfil. Ao final da demonstração, voltar a média mínima para o valor do seed (CONFERIR: o botão de diminuir o valor, que não aparece nos testes lidos).

**Passo 1: entrar como escola (20 s)**
- Clicar: login com `escola@escola.com` e senha `escola123`.
- Fala: "A escola entra e cai no Painel."
- Deve aparecer: a tela Painel (CONFERIR: nome e conteúdo dos cards).

**Passo 2: Semestre e Professores (40 s)**
- Clicar: Semestre. Depois, Professores e o Prof. Carlos.
- Fala: "Disciplinas, aulas e notas pertencem a um semestre. O seed usa o 2026.2. Cada professor também pode ter horários ocupados, que a grade respeita."
- Deve aparecer: o semestre ativo, 2026.2 (CONFERIR: rótulo exato), e a lista de professores.

**Passo 3: Alunos e Matricular todos (30 s)**
- Clicar: Alunos e depois a turma 1º A. Na linha de uma disciplina, o botão "Matricular todos".
- Fala: "Os alunos são organizados por turma. A turma do aluno decide em quais disciplinas ele entra sozinho. Se faltar gente, um clique matricula a turma inteira."
- Deve aparecer: o texto "Fora (N): " na linha da disciplina e, depois do clique, "Turma inteira matriculada em <disciplina>." (CONFERIR: se o seed tem alunos fora da disciplina; senão, mostrar só a lista de alunos da turma.)

**Passo 4: Acadêmico, aba Avaliação, a regra da escola (1 min 15 s)**
- Clicar: Acadêmico e depois a aba Avaliação.
- Fala: "Esta é a regra de avaliação da escola, uma só para o colégio. Ela define os períodos, as avaliações obrigatórias com peso, as atividades extras, a recuperação, a prova final, a média mínima e a frequência mínima. Um período pode ser fechado: as notas dele ficam travadas."
- Clicar: no botão "Aumentar" do grupo "Média mínima".
- Deve aparecer: o valor subir meio ponto (6 para 6,5, com vírgula).
- Clicar: "Salvar regra".
- Deve aparecer: a regra salva (CONFERIR: se aparece mensagem de sucesso).
- Clicar: recarregar a página (F5) e voltar à aba Avaliação.
- Deve aparecer: 6,5 de novo.
- Fala: "Recarreguei a página e o valor continua. Ele não ficou no navegador: ficou gravado no servidor."
- Fala de apoio, sem clicar: "Se a escola tentar uma média mínima de 11, o servidor recusa e a tela mostra a mensagem dele."

**Passo 5: Quadro semanal, arrastar e cancelar aula (1 min)**
- Clicar: Quadro semanal (rota `/agenda`).
- Fala: "Aqui está a grade de todos os professores. Se eu arrastar uma aula para um horário que choca, o servidor recusa."
- Arrastar uma aula para um horário que choca com o professor, a turma ou a sala.
- Deve aparecer: a mensagem de choque que vem da API, e a aula volta para o lugar. Nem toda aula arrasta (CONFERIR: quais).
- Clicar: em uma aula do Quadro. Abre o painel "Aula". Clicar em "Cancelar aula".
- Deve aparecer: o status da aula como cancelada, e o botão "Reativar aula" no lugar do "Cancelar aula".
- Fala: "Cancelar não apaga a aula. Reativo com um clique, e a grade mostra o estado certo."
- Clicar: "Reativar aula" para deixar a aula como estava.

**Passo 6: Pedidos de aula extra (30 s)**
- Clicar: Acadêmico e depois a aba Pedidos de aula extra. Depois, "Nova aula extra".
- Fala: "A escola também cria uma aula extra direto, sem pedido do professor. O quadro mostra os horários livres para o professor, a turma e a sala."
- Preencher a disciplina, a data, o início e o fim, até aparecer o aviso de horário livre.
- Clicar: "Criar aula extra".
- Deve aparecer: "Aula extra criada: <disciplina> em <dia/mês>, <hora>. Já está no Quadro." (CONFERIR: o texto exato no seed.)
- Se houver pedido pendente de professor (CONFERIR: se o seed deixa um), aprovar um, com a mesma aba.

**Passo 7: Chamada (20 s)**
- Clicar: Acadêmico, aba Disciplinas, Python, aba Chamada.
- Fala: "A chamada só aceita um dia com aula prevista e alunos matriculados. Aula cancelada também é recusada."
- Deve aparecer: a lista de presença da data escolhida e a mensagem de salvo (CONFERIR: contador "Chamada feita (N/M)" com os números do seed).

**Passo 8: entrar como professor (1 min)**
- Clicar: Sair e entrar com `prof@escola.com`.
- Fala: "O professor vê só as disciplinas dele, Python e Banco de Dados. A disciplina da Profa. Marta não existe para ele."
- Deve aparecer: as telas Painel, Acadêmico, Minhas turmas e Avisos. No Acadêmico, só Python e Banco de Dados.
- Digitar na barra de endereço `/semestre`.
- Fala: "A tela é barrada para ele, e a API também recusaria os dados."
- Deve aparecer: o aviso "Essa tela não faz parte do perfil Professor. Você voltou ao início." e o Painel.
- Clicar: Minhas turmas, depois a turma 1º A (CONFERIR: se o hub do professor mostra cartões por turma, como o da escola), depois Python, depois a sub-aba "Avaliações e notas".
- Clicar: "Atividade extra", digitar o nome "Lista de exercícios" e clicar em "Criar".
- Fala: "O professor cria atividades extras, dentro do limite da regra. A atividade começa como rascunho."
- Digitar uma nota no campo "Nota de Ana Souza em Lista de exercícios" e sair do campo (Tab).
- Deve aparecer: a nota no campo, e a confirmação "Nota de Ana Souza em Lista de exercícios: <valor>." (CONFERIR: texto exato.)
- Clicar: "Publicar lançadas".
- Fala: "Publicar lançadas manda para o aluno só o que tem nota. O rascunho sem nota continua escondido."
- Deve aparecer: a atividade e a nota marcadas como publicadas (CONFERIR: o sinal visual de publicado).

**Passo 9: entrar como aluna (20 s)**
- Clicar: Sair e entrar com `ana@escola.com`.
- Fala: "A Ana vê só o que é publicado: as notas, a frequência, as próximas aulas e os avisos, sem botões de escrita. A atividade que o Carlos acabou de publicar aparece. O que ainda está em rascunho não aparece."
- Deve aparecer: a tela Meu painel, somente leitura, com "Lista de exercícios" (CONFERIR: como boletim e frequência aparecem na tela).

**Passo 10: aprovar pelo conselho (20 s)**
- Clicar: Sair e entrar com a escola. Clicar em Disciplinas (aba do Acadêmico ou a tela Disciplinas), escolher a disciplina, a aba "Avaliações e notas" e depois a sub-aba "Resultado do ano".
- Deve aparecer: a linha do aluno com a situação "Prova final" (CONFERIR: qual aluno do seed).
- Clicar: "Aprovar pelo conselho" na linha desse aluno.
- Deve aparecer: a situação "Aprovado pelo conselho".
- Fala: "Um aluno abaixo da média pode ser aprovado pela escola, na reunião do conselho de classe. A nota não muda; a decisão fica registrada, e o botão Desfazer volta atrás."

**Passo 11: excluir disciplina com nota (20 s)**
- Clicar: na lista de disciplinas, a disciplina com nota (CONFERIR: qual é), e depois "Excluir disciplina".
- Deve aparecer: o diálogo "Não dá para excluir <disciplina>" com o texto "Disciplina já tem notas ou chamadas: não dá para excluir. O histórico do semestre precisa ficar." Clicar em "Entendi".
- Fala: "Excluir disciplina sem histórico pede confirmação com o botão 'Excluir de vez'. Com nota ou chamada, a API recusa, e o diálogo mostra o motivo."
- Não clicar em "Excluir de vez" na apresentação, a não ser que a disciplina de teste já esteja preparada (CONFERIR).

**Passo 12: quem está em aula agora (15 s)**
- Clicar: Acadêmico e depois a aba "Agora" (CONFERIR: o rótulo exato; ele não aparece nos testes lidos).
- Fala: "Esta tela mostra quem está em aula neste momento."
- Deve aparecer: as aulas em andamento no horário atual (CONFERIR: o conteúdo com o seed).

**Se algo falhar**
- Tela em branco ou carregando por muito tempo na primeira entrada: a API estava dormindo. Esperar até 60 s e recarregar.
- Sessão caiu (erro 401): fazer login de novo.
- Chamada recusada: confirmar que a data tem aula prevista para aquela disciplina e que a aula não está cancelada.
- Nota recusada com "Período fechado pela escola: notas travadas.": o período está fechado. Reabrir pela aba Avaliação (com a escola) ou seguir sem essa nota.
- Dados bagunçados por testes ou remarcações: rodar o seed de novo (`python seed.py --apagar-tudo` com a URL do banco da Render). Ele apaga e recria tudo. Fazer isso antes da apresentação, nunca no meio.

## 5. Prova de integração e qualidade (1 min)

- Back: CONFERIR: número de testes do pytest no update 4 e a afirmação de que o banco de teste é apagado antes de cada teste (a regra do update 4 não está nos arquivos lidos). Módulo de cálculo (`notas_calc.py`): CONFERIR: quantidade de testes unitários.
- Front, unitários: CONFERIR: número de testes do `node --test` no update 4.
- Front, ponta a ponta: scripts com Playwright e Microsoft Edge, rodando contra a API real. Os que eu li para este roteiro cobrem:
  - regra de avaliação: média mínima salva e recarregada, recusa do servidor com a mensagem dele, atividade extra, nota publicada (o aluno só vê o publicado), período fechado, aprovação e desfazer pelo conselho, e a média da tela comparada com o boletim do servidor em dois casos;
  - agenda: aula extra direta, cancelar e reativar aula, exclusão de disciplina com bloqueio e com o 409 do servidor, e "Matricular todos";
  - operação: atividades extras, notas, exclusão protegida, chamada, e a recusa de escrita na disciplina de outra professora (403);
  - turmas: hub por turma, matrícula automática pela turma, troca de turma com matérias mantidas e chamada;
  - rotas: menu por perfil, telas que não são do perfil redirecionadas ao início, e recarga mantendo a tela.
  - CONFERIR: quantos scripts existem no total no update 4 e o resultado da última rodada.
- Comparador do canvas: `npm run comparar` confere o DOM do portal contra o desenho, em desktop e celular. CONFERIR: resultado atual de diferenças (rodar antes da apresentação).

Fala: "Cada tela é comparada com o desenho, e as regras principais da escola são testadas contra um banco de verdade. A média que a tela mostra é conferida contra a média que o servidor devolve."

## 6. Desafios que enfrentei (1 min)

1. **Choque de horário.** A grade é conferida contra a ocupação do professor, as outras disciplinas dele, a turma e a sala. Quando há choque, a API responde 409 e não grava nada pela metade. Na matrícula, o choque de horário do aluno também é recusado.
2. **Uma só regra de média.** A média, a recuperação, a prova final e a situação (Aprovado, Na média, Abaixo da média, Prova final, Aprovado pelo conselho) ficam num módulo próprio. O boletim, o painel e a documentação usam esse mesmo módulo. Um teste confere o cálculo da tela com o do servidor.
3. **Nota em rascunho.** O aluno não pode ver uma nota antes do professor publicar. A API filtra o que chega ao aluno, e a tela só mostra o que veio do servidor. Um teste confere que nenhuma nota de rascunho chega ao aluno.
4. **Exclusão protegida.** Antes, excluir uma disciplina apagava notas e matrículas sem aviso. Agora a API recusa excluir disciplina ou aluno que já tem nota ou chamada (resposta 409), e a tela avisa antes de chamar a API.

Fala: "Mapeei os furos da lógica escolar antes de apresentar e corrigi os principais, cada um com teste."

## 7. Encerramento e perguntas (30 s)

Fala: "Resumindo: três perfis, as regras da escola ficam na API e o front mostra e pede. A conta de média é uma só, e o aluno só vê o que foi publicado. Obrigado. Quais são as perguntas?"

Perguntas prováveis:

1. **A IA grava a grade sozinha?** Não. Ela só propõe. A API confere blocos de horário, ocupação e choques, e a escola aplica a grade pelo caminho normal de gravação.
2. **E se a IA cair ou atingir o limite?** A API responde 503 (não configurada), 429 (limite de uso) ou 502 (falha). A grade continua podendo ser montada à mão.
3. **Os dados ficam salvos?** Sim, no PostgreSQL. O seed é que apaga e recria os dados de demonstração.
4. **Um aluno vê as notas de outra turma?** Não. A API filtra pelo perfil: o aluno só acessa o próprio registro, e o professor só as disciplinas dele.
5. **Por que o aluno não vê a nota que o professor acabou de lançar?** Porque a nota fica em rascunho até o professor publicar. Só o publicado chega ao aluno, no boletim e no painel.
6. **Como a média é calculada?** Por um módulo só, sem banco e sem FastAPI. A recuperação substitui a menor nota ou entra na média, conforme a regra da escola. Se a média ficar abaixo da mínima e houver prova final, a média final é a média do ano com a prova final.
7. **O que ainda falta?** Ficou de fora de propósito: feriado por turma, copiar semestre, frequência por horas, vigência de matrícula e aprovação por disciplina. A aprovação pelo conselho cobre a decisão da escola, não uma regra por disciplina.

## Apêndice: variantes da linha do banco (para colar)

A tabela da seção 2 traz a variante V1. Para trocar a linha do banco, use uma das duas abaixo.

**V1 (SQL puro, a linha atual):**

> PostgreSQL 16 + psycopg2, SQL puro (sem ORM). É um banco de verdade: chave única, ligação entre tabelas e exclusão em cascata. As tabelas e as colunas novas são criadas sozinhas quando a API sobe.

Pergunta provável: **Por que SQL puro?** Escrevo cada comando SQL à mão, então sei exatamente o que vai para o banco e consigo ajustar a consulta quando precisa. Para um projeto deste tamanho, o código fica simples de ler, e não preciso aprender uma camada a mais por cima do banco.

**V2 (SQLAlchemy 2, ORM):**

> PostgreSQL 16 + SQLAlchemy 2 (ORM) sobre psycopg2: os modelos ficam em models.py, o CRUD e as consultas usam o ORM (Session, select), e o banco é criado e migrado no startup.

CONFERIR: a V2 descreve uma stack que não aparece nos arquivos lidos para este roteiro. Os arquivos do update 4 que li (contrato, `esquema.sql` citado com `ADD COLUMN IF NOT EXISTS`) apontam para SQL puro. Só colar a V2 se o código estiver assim.

Pergunta provável: **Por que ORM?** O ORM deixa o código mais curto: a tabela vira uma classe, e o CRUD sai sem escrever SQL a cada tela. O custo é que o SQL fica escondido, então eu confiro o que ele gera quando a consulta fica pesada.

## Itens a conferir antes de apresentar

Tudo abaixo precisa de você, na máquina, antes de entrar:

- Link da API depois do deploy: troque `[LINK DA API: preencher depois do deploy]` neste arquivo.
- Ensaie os Passos 1 a 12 com o seed fresco (`python seed.py --apagar-tudo`), principalmente: os rótulos marcados com CONFERIR (aba "Agora", botão de diminuir a média, sinal de publicado, mensagem de aula extra criada), o aluno com "Prova final", a disciplina com nota e o tempo total.
- Ensaie o Swagger (Passos S1 a S6) uma vez. Confira o código e a mensagem do 403 do S6 e a tag da regra no S1.
- Rode `npm run comparar` se quiser citar o número de diferenças.
- Confira os números da seção 5 (testes do pytest e do `node --test`, quantidade de scripts) antes de citá-los; o roteiro não cita número que eu não tenha lido.
- O banco gratuito da Render expira em 30 dias; para a apresentação não importa.
