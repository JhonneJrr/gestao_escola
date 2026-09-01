# Fluxo de notas, frequência, média calculada e modo aluno

Data: 2026-09-01
Status: aprovado pelo dono (com decisões tomadas na ausência dele — ver seção final)

## 1. Contexto e motivação

O dono identificou problemas conceituais no modelo de dados do Portal de
Gestão Escolar:

1. Só dava pra lançar UMA nota por (aluno, matéria) — sem conceito de várias
   avaliações.
2. Frequência era só leitura de um número mockado — sem forma de registrar
   presença de verdade.
3. `Aluno.media` era digitado direto no cadastro do aluno — deveria ser
   CALCULADO a partir das notas lançadas por matéria.
4. Mural de Avisos parecia redundante (feito pra aluno ver, mas só existia
   visão de professor).
5. Painel (dashboard) tinha pouco uso.
6. Sensação geral de "faltam funções".

Esta spec descreve o novo modelo de dados e o fluxo por tela que resolve
esses pontos, mantendo o nível de código do projeto deliberadamente simples
(sem Context API, sem roteador, sem libs de state management — ver memória
`feedback-beginner-level-code`), porque o dono vai usar isso pra explicar o
projeto numa apresentação.

## 2. Modelo de dados

**Muda:**

- `Aluno { id, nome, idade, matricula }` — perde o campo `media`.
- `Avaliacao { id, disciplina_id, nome, peso }` — **nova**. Configurada por
  matéria (vale pra todos os alunos matriculados nela). Pesos de uma mesma
  disciplina devem somar exatamente 100.
- `Nota { aluno_id, avaliacao_id, valor }` — antes apontava direto pra
  `disciplina_id`; agora aponta pra `avaliacao_id` (a matéria vem junto,
  via `avaliacao.disciplina_id`).
- `Aula { id, disciplina_id, data }` — **nova**, uma "chamada" por dia.
- `Presenca { aula_id, aluno_id, presente }` — **nova**, substitui
  `Frequencia { presencas, total_aulas }` (que era um contador solto sem
  histórico).

**Sem mudança:** `Disciplina`, `Matricula`, `Aviso`.

## 3. Cálculos derivados (nunca guardados, sempre recalculados)

```
mediaDaMateria(aluno, disciplina):
  avaliacoes = avaliações da disciplina
  notasLancadas = notas do aluno cujas avaliações são dessa disciplina
  se notasLancadas está vazia: sem média (matéria "sem nota lançada")
  senão: média ponderada de notasLancadas, usando o peso de cada
         avaliação, renormalizado só entre as avaliações que têm nota
         lançada (média "parcial" quando falta alguma)

mediaGeral(aluno):
  medias = mediaDaMateria(aluno, d) para cada matéria matriculada que
           tenha ao menos 1 nota lançada (matéria sem nenhuma nota não
           entra na conta, não conta como 0)
  se medias está vazio: sem média geral ainda
  senão: média simples de medias (peso igual entre matérias)

frequenciaDaMateria(aluno, disciplina):
  aulas = aulas registradas da disciplina
  se aulas está vazia: sem frequência ainda
  senão: (presenças do aluno nessas aulas) / (total de aulas) × 100

frequenciaGeral(aluno):
  mesma lógica de mediaGeral, mas com frequenciaDaMateria — média simples
  entre as matérias que já têm ao menos 1 aula registrada

aprovado(aluno):
  mediaGeral(aluno) >= 6 E frequenciaGeral(aluno) >= 75
  (se média geral ou frequência geral ainda não existem, tratar como
  "indefinido", não como reprovado)
```

## 4. Fluxo por tela

**Gestão de Alunos** — `FormAluno` perde o campo "Média". `AlunoCard` e o
`AlunoDrawer` (painel lateral já implementado) mostram a média geral
calculada e o selo Aprovado/Reprovado/Indefinido usando a regra da seção 3.

**Disciplinas** — cada disciplina ganha uma sub-seção "Avaliações": lista
de avaliações (nome + peso), formulário pra adicionar, exclusão bloqueada
se a avaliação já tem notas lançadas (com mensagem de erro, mesmo padrão
que já existe pra excluir disciplina/aluno com vínculo). Validação: soma
dos pesos de uma disciplina tem que fechar em 100 antes de permitir
adicionar uma nova avaliação que estoure isso (mensagem clara do quanto
falta/sobra).

**Boletim** — o formulário de lançar nota passa a escolher uma
**avaliação** (não a matéria direto) — o `<select>` mostra
"Matemática — P1 (peso 40)", por exemplo. A lista "notas lançadas" mostra
cada avaliação da matéria com sua nota (ou "—" se ainda não lançada) e a
média calculada da matéria, com aviso "parcial" quando faltar avaliação.

**Frequência** — ganha uma ação "Fazer chamada": escolhe a disciplina e a
data (padrão hoje), lista os alunos matriculados com um toggle
presente/ausente, salvar cria a `Aula` (se ainda não existir pra aquela
disciplina+data) e as `Presenca` de cada aluno. A tela continua mostrando
a leitura do percentual por matéria, agora calculado a partir das aulas
registradas em vez de um número mockado.

**Painel** — muda de contagens soltas pra uma "visão de risco": lista de
alunos com média abaixo de 6, lista de alunos com frequência abaixo de
75%, e quantas avaliações/matérias ainda não têm nota lançada.

**Mural de Avisos** — sem mudança de CRUD. Passa a ser lido também no Modo
Aluno (seção 5), o que resolve a redundância — deixa de ser uma tela sem
público.

## 5. Modo Aluno (novo)

Sem login real — um botão "Ver como aluno" (nova entrada, ex. na Home)
abre um seletor de aluno (reaproveita o padrão do `SeletorAlunos`) e, ao
escolher, mostra uma tela **somente leitura** com: boletim (médias por
matéria + notas lançadas), frequência (por matéria) e o mural de avisos
daquele aluno. Sem edição nenhuma nessa tela — é só visualização.

## 6. Fora de escopo (fica pra depois)

- Autenticação de verdade (login com senha).
- Avaliações com peso configurável por aluno individualmente (ficou
  definido que é por matéria, vale pra turma toda).
- Edição/exclusão de uma `Aula` já registrada (só criação, por ora).

## 7. Decisões tomadas na ausência do dono (registro em formato entrevista)

O dono se ausentou antes da apresentação (hoje, 2026-09-01) e autorizou
seguir com a opção recomendada em qualquer decisão que sobrasse, com
registro pra revisão posterior (protocolo "o mesmo de sempre" — ver
memória `feedback-ausencia-siga-sem-mim`). Decisões tomadas por mim,
sozinho, seguindo esse protocolo:

- **Fluxo de "fazer chamada"**: uma ação só (escolher disciplina + data,
  marcar presença de todos, salvar) em vez de separar "criar aula" e
  "lançar presença" em duas telas. Mais simples de explicar, sem CRUD
  extra de `Aula` como lista independente.
- **Entrada do Modo Aluno**: um botão/card na Home, não uma tela de login
  separada — consistente com "sem autenticação real" já decidido.
- Nenhuma dessas duas é uma decisão de alto risco ou difícil de reverter;
  registradas aqui para o dono revisar e pedir ajuste se discordar.
