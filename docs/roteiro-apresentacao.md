# Roteiro de apresentação — Portal de Gestão Escolar

Tempo: 8 a 10 minutos. Contas (senha de todas: `escola123`): `escola@escola.com`, `prof@escola.com` (Prof. Carlos: Python e Banco de Dados), `marta@escola.com` (Profa. Marta: Algoritmos), `ana@escola.com` (aluna).

Antes de começar: abra o link da API uns 5 minutos antes (a Render gratuita dorme e a primeira chamada leva até 1 minuto), deixe duas janelas do navegador logadas e uma em branco, e o DevTools na aba Network já aberto na janela da demonstração.

## 1. O que é (30 s)

Sistema de gestão escolar com três perfis: Escola (define semestre, professores, disciplinas, grade, alunos e matrículas), Professor (só vê e opera as suas disciplinas) e Aluno (só vê o que é dele). Front em React, API em FastAPI com PostgreSQL. A interface foi desenhada no Claude Design e convertida por script para o código, com o DOM provado idêntico ao desenho.

## 2. Critério: login e rotas protegidas por Bearer (2 min)

1. Janela anônima, abra direto `/disciplinas`: aparece o login, não a tela. É a rota protegida do front.
2. Na API (`/docs`, Swagger), chame `GET /portal/estado` sem token: **401**. Com token inválido: **401**.
3. Entre como `escola@escola.com`. No Network, mostre a chamada `POST /auth/login` (sem Authorization) e depois `GET /portal/estado` e as demais com `Authorization: Bearer ...`. Recarregue a página: a sessão continua.
4. Clique em Sair: volta ao início e o token some do armazenamento.

## 3. Critério: integração comprovada, front lendo e gravando na API (3 min)

Como Escola:

1. **Painel:** pendências de configuração (disciplina sem professor, sem grade) e alunos em risco, calculados pela API.
2. **Disciplinas:** crie uma disciplina com professor e dois horários de grade; a tela informa quantas aulas foram geradas (vem da resposta da API). No Swagger, `GET /disciplinas/{id}/grade` mostra os mesmos horários.
3. **Matrículas / Alunos:** cadastre um aluno com e-mail; a senha provisória aparece uma única vez (vem do servidor) e é pedida a troca no primeiro acesso.
4. **Agenda:** aulas do dia de várias disciplinas, ordenadas por horário; faça a chamada de uma aula e veja a frequência dos alunos mudar.

## 4. Critério: separação por perfil (2 min)

1. Entre como `prof@escola.com`: só aparecem Python e Banco de Dados e os alunos dessas turmas. Algoritmos (da Marta) não existe para ele.
2. Lance uma nota numa avaliação de Python e mostre a média ponderada recalculada.
3. No Swagger, com o token do Carlos, tente `PUT /avaliacoes/{id}/notas/{aluno}` numa avaliação de Algoritmos: **403**.
4. Entre como `ana@escola.com`: só o painel dela, com boletim, frequência e as próximas aulas, sem ações de escrita.

## 5. Produção e fecho (1 min)

- Link do front: A PREENCHER. Link da API: A PREENCHER (`/docs` para o Swagger).
- Arquitetura: Cloudflare Pages (front), Render (API), Neon (PostgreSQL).
- Testes: 55 verificações ponta a ponta no navegador contra a API real e mais de 300 testes de backend com banco real.

## Se algo falhar na hora

- Tela em branco ou erro de rede logo ao entrar: a API ainda estava dormindo; espere 1 minuto e recarregue.
- Dados bagunçados por testes ao vivo: o seed refaz tudo (`python seed.py --apagar-tudo` apontando para o banco da Neon) em segundos.
