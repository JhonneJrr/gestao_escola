# Roteiro de apresentação — Portal de Gestão Escolar

Tempo: 8 a 10 minutos. Contas (senha de todas: `escola123`): `escola@escola.com`, `prof@escola.com` (Prof. Carlos: Python e Banco de Dados), `marta@escola.com` (Profa. Marta: Algoritmos), `ana@escola.com` (aluna).

Antes de começar: abra o link da API uns 5 minutos antes (a Render gratuita dorme e a primeira chamada leva até 1 minuto), deixe duas janelas do navegador logadas e uma em branco, e o DevTools na aba Network já aberto na janela da demonstração.

## 1. O que é (30 s)

Sistema de gestão escolar com três perfis: Escola (define semestre, professores, disciplinas, grade, calendário, alunos e matrículas), Professor (só vê e opera as suas disciplinas) e Aluno (só vê o que é dele). Front em React, API em FastAPI com PostgreSQL. A interface foi desenhada no Claude Design e convertida por script para o código, com o DOM provado idêntico ao desenho.

## 2. Critério: login e rotas protegidas por Bearer (2 min)

1. Janela anônima, abra direto `/disciplinas`: aparece o login, não a tela. É a rota protegida do front.
2. Na API (`/docs`, Swagger), chame `GET /portal/estado` sem token: **401**. Com token inválido: **401**.
3. Entre como `escola@escola.com`. No Network, mostre a chamada `POST /auth/login` (sem Authorization) e depois `GET /portal/estado` e as demais com `Authorization: Bearer ...`. Recarregue a página: a sessão continua.
4. Clique em Sair: volta ao início e o token some do armazenamento.

## 3. Critério: integração comprovada, front lendo e gravando na API (3 min)

Como Escola:

1. **Painel:** pendências de configuração (disciplina sem professor, sem grade) e alunos em risco, calculados pela API.
2. **Professores:** abra a ficha do Prof. Carlos: ele tem um horário ocupado (Outra escola). Adicione outro e salve; a API responde 200 e a lista persiste.
3. **Grade e agenda, aba Quadro semanal:** a escala de todos os professores. O horário ocupado do Carlos aparece hachurado. Arraste uma aula para um horário que bate com o dele: o servidor recusa com a mensagem do choque (409). Arraste para um horário livre e confirme: a grade é gravada.
4. **Assistente de grade:** peça "Tem algum choque na grade atual?" e depois "Monte a grade das disciplinas que ainda estão sem horário". A proposta aparece, o servidor já conferiu professor, turma, sala e horários ocupados; aplique.
5. **Ano letivo:** calendário com feriados, bimestres e provas; publique um evento (só da escola) e veja que o aluno só vê os da própria turma.
6. **Pedidos de aula extra:** a Profa. Marta envia um pedido; a escola recusa com motivo ou aprova (a aprovação cria a aula extra).
7. **Matrículas / Alunos:** cadastre um aluno com e-mail; a senha provisória aparece uma única vez (vem do servidor) e é pedida a troca no primeiro acesso.

## 4. Critério: separação por perfil (2 min)

1. Entre como `prof@escola.com`: só aparecem Python e Banco de Dados e os alunos dessas turmas. Algoritmos (da Marta) não existe para ele. O quadro mostra só as aulas dele e ele não arrasta blocos.
2. Lance uma nota numa avaliação de Python e mostre a média ponderada recalculada.
3. No Swagger, com o token do Carlos, tente `PUT /avaliacoes/{id}/notas/{aluno}` numa avaliação de Algoritmos: **403**. Tente também `POST /ia/grade`: **403** (só a escola).
4. Entre como `ana@escola.com`: só o painel dela, com boletim, frequência, as próximas aulas e o calendário da turma, sem ações de escrita.

## 5. Produção e fecho (1 min)

- Link do front: A PREENCHER. Link da API: A PREENCHER (`/docs` para o Swagger).
- Arquitetura: Cloudflare Workers (front estático), Render (API FastAPI e PostgreSQL), Gemini (assistente de grade).
- Testes: mais de 80 verificações ponta a ponta no navegador contra a API real e mais de 560 testes de backend com banco real.

## Se algo falhar na hora

- Tela em branco ou erro de rede logo ao entrar: a API ainda estava dormindo; espere 1 minuto e recarregue.
- Assistente com "limite de uso": a cota gratuita do Gemini esgotou; os horários continuam podendo ser organizados à mão.
- Dados bagunçados por testes ao vivo: o seed refaz tudo (`python seed.py --apagar-tudo` apontando para o banco da Render) em segundos.
- A chamada (presença por aula) existe na API, mas a interface dela está sendo redesenhada; não faz parte desta demonstração.
