# Estudo para a apresentação: Portal de Gestão Escolar (update 4)

Material para estudar e apresentar hoje à noite: stack, regras de negócio, trechos de código e Swagger. Escrito em 08/10/2026, só com o que foi lido nos arquivos do projeto.

- **Versão principal:** back com ORM em `C:\Users\Administrator\Documents\gestao-alunos-orm` (ramo `fase12-orm`) e front do update 4 em `C:\Users\Administrator\Documents\gestao-alunos-frontend-u4` (ramo `fase11-update4`).
- **Plano B (se o ORM não entrar):** back em SQL puro em `C:\Users\Administrator\Documents\gestao-alunos-u4` (ramo `fase11-update4`). Tudo o que muda está no **Apêndice A**.
- **Marcas:** `CONFERIR:` = não está nas fontes; confirme antes de afirmar. `arquivo:linha` = posição no dia em que li. **Fala:** = o que dizer. **Aponte:** = o que mostrar com o mouse. "(medido)" = conferi rodando o módulo puro ou o schema, sem banco.
- As datas do seed são relativas ao dia em que ele roda; os exemplos usam 08/10/2026.

## Sumário

0. Como usar este documento e resumo de 1 página
1. A stack, tecnologia por tecnologia (ORM e diagrama da requisição)
2. Arquitetura do back em camadas
3. Regras de negócio (3.1 a 3.14, com a média passo a passo)
4. Código para mostrar (8 trechos) e a ordem de abrir os arquivos
5. Swagger: rotas por tag e roteiro de 10 passos
6. Perguntas prováveis (26)
7. Glossário (30 termos) e checklist de 15 minutos
Apêndice A. Plano B sem ORM

## 0. Como usar este documento

### 0.1 Ordem de estudo em 60 minutos

| Minutos | O que fazer | Seção |
|---|---|---|
| 0 a 5 | Ler o resumo de 1 página abaixo e dizer as 5 frases em voz alta | 0.2 a 0.4 |
| 5 a 15 | Stack: tabela, ORM e diagrama. Treinar a explicação do ORM (1.2) | 1 |
| 15 a 25 | Arquitetura e os 8 trechos de código, abrindo os arquivos no editor na ordem sugerida | 2 e 4 |
| 25 a 45 | Regras: perfis, semestre, turma, choque, avaliação (refazer a conta da Carla à mão) e exclusão protegida | 3 |
| 45 a 55 | Swagger: ensaiar os 10 passos com o seed fresco | 5 |
| 55 a 60 | Responder as perguntas em voz alta e passar o checklist | 6 e 7 |

### 0.2 O produto em 5 frases

1. O Portal de Gestão Escolar organiza o semestre de uma escola: turmas, disciplinas, grade de horários, aulas, chamada, notas e avisos.
2. Tem três perfis: a **escola** administra tudo, o **professor** opera só as suas disciplinas e o **aluno** consulta o que é dele.
3. O front (React) mostra as telas e pede os dados; o back (FastAPI) guarda as regras e conversa com o PostgreSQL.
4. No update 4 a escola configura a regra de avaliação (períodos, provas com peso, recuperação, prova final, média e frequência mínimas) e uma só conta de média serve o boletim, o painel e o CSV.
5. O servidor recusa o que quebra a regra (choque de horário, nota em período fechado, exclusão com histórico, escrita em semestre encerrado) e o aluno nunca vê nota em rascunho.

### 0.3 A stack em 1 tabela

| Camada | Tecnologia | Arquivos-chave |
|---|---|---|
| Front | React 19, Vite 8, TypeScript | `package.json`, `src/portal/` |
| Interface | Canvas do Claude Design, conversor próprio, comparador | `design/canvas/`, `scripts/converter-canvas.mjs`, `scripts/comparar-canvas.mjs` |
| API | Python 3.13, FastAPI, uvicorn, Pydantic | `main.py`, `routers/`, `schemas.py` |
| Banco | PostgreSQL 16, SQLAlchemy 2 (ORM) sobre psycopg2 | `models.py`, `db.py` |
| Login | bcrypt e JWT (PyJWT) | `auth.py` |
| IA | Gemini, chamado com `urllib` | `gemini.py`, `routers/ia.py` |
| Testes | pytest (back); `node --test` e Playwright com Edge (front) | `tests/`, `e2e/` |
| Entrega | Docker, Render (API e banco), Cloudflare (front) | `Dockerfile`, `docker-compose.yml`, `render.yaml` |

### 0.4 As 8 regras mais importantes em 1 linha

1. **Perfis:** professor só mexe nas suas disciplinas (403 `Sem permissão para esta disciplina`); aluno só vê o que é dele.
2. **Semestre:** um ativo por vez; encerrado vira só leitura (409 `Semestre encerrado`).
3. **Turma:** a turma do aluno decide as disciplinas em que ele entra sozinho (matrícula automática R1 a R5).
4. **Choque:** a grade não pode chocar com ocupação ou disciplina do professor, da turma ou da sala (409 com o motivo); encostar não é choque.
5. **Aulas:** uma aula por disciplina por dia; a grade semanal gera as aulas do semestre; chamada só em dia com aula, sem feriado, com aluno matriculado.
6. **Média:** por período (com recuperação), média simples dos períodos, prova final só se o ano ficar abaixo da média mínima; frequência mínima e conselho decidem a situação.
7. **Rascunho:** nota só chega ao aluno depois que o professor publica; período fechado trava as notas.
8. **Exclusão protegida:** disciplina ou aluno com nota ou chamada não se exclui (409).

## 1. A stack, tecnologia por tecnologia

| Tecnologia | O que é (para leigo) | Por que foi escolhida | Onde aparece |
|---|---|---|---|
| FastAPI | Framework Python que transforma funções em rotas web e gera a documentação (Swagger) sozinho | Valida os dados que chegam e documenta no `/docs` sem código extra | `main.py:42` (`app = FastAPI(...)`), `routers/*.py` |
| Pydantic | Biblioteca que confere se o JSON recebido tem o formato certo (tipos, tamanhos, limites) | Recusa dado inválido com 422 antes da regra rodar | `schemas.py` (ex.: `NotaEntrada`, linha 672) |
| uvicorn | O servidor que fica escutando a porta e entrega cada requisição ao FastAPI | É o servidor padrão do FastAPI; o mesmo comando serve local, Docker e Render | `render.yaml` (startCommand), `Dockerfile` (CMD) |
| PostgreSQL | Banco de dados relacional: tabelas ligadas por chaves | Garante chave única, ligação entre tabelas e cascata; guarda os dados mesmo se o servidor reiniciar | `db.criar_tabelas()` (`db.py:221`), `esquema.sql` |
| psycopg2 | O "motorista" que fala com o PostgreSQL pelo Python | É o driver que o SQLAlchemy usa por baixo (`postgresql+psycopg2`) e que os helpers `consultar`/`executar` usam direto | `db.py:16`, `db.py:103`, `db.py:160-190` |
| SQLAlchemy 2 (ORM) | Camada que deixa você tratar tabela como classe e linha como objeto (seção 1.2) | Menos SQL repetido, parâmetros sempre vinculados, colunas conferidas pelo Python | `models.py`, `db.py:20-24`, `db.py:135-143` |
| bcrypt | Função que embaralha a senha de um jeito lento e sem volta (hash com sal) | A senha nunca fica legível no banco; ser lento atrapalha quem tenta adivinhar | `auth.py:22-29` |
| JWT (PyJWT) | Um "crachá" assinado: texto com o id do usuário e a validade, que o servidor confere sem guardar sessão | Cada chamada leva o token; a API decide o que aquela pessoa pode ver | `auth.py:32-34` e `auth.py:45-55` |
| Gemini | IA do Google; o servidor manda o contexto e recebe uma proposta de grade | Ajuda a escola a montar horários; o servidor confere tudo e a chave nunca vai ao navegador | `gemini.py`, `routers/ia.py` |
| pytest | Programa que roda os testes automáticos | Cada regra tem teste; mudar o código sem quebrar o que já funcionava | `tests/` (453 funções `def test_`), `pytest.ini` |
| React | Biblioteca para montar a tela em pedaços reutilizáveis | Atualiza só o que mudou, sem recarregar a página | `package.json` (^19.2), `src/portal/` |
| Vite | Ferramenta que roda o front em desenvolvimento e o compila para produção | Rápida e simples | `vite.config.ts`, `npm run dev` e `npm run build` |
| TypeScript | JavaScript com tipos | Aponta erro de tipo antes de rodar | `src/portal/rede.ts`, `tsc -b` no build |
| Conversor do canvas | Script que transforma o desenho (`.dc.html`) em código React | Eu desenho a tela e o código sai igual; evita reescrever à mão | `scripts/converter-canvas.mjs`; gera `src/portal/template.tsx` (não editar) |
| Comparador | Script que abre o portal e o canvas no Edge e compara o DOM em desktop e celular | Prova que a tela ficou igual ao desenho | `scripts/comparar-canvas.mjs`, `npm run comparar` |
| Playwright | Automatiza um navegador de verdade | Os testes e2e abrem o Edge contra a API real | `e2e/portal-*.mjs` (8 scripts) |
| Docker | Empacota a API num "container" que roda igual em qualquer máquina | Sobe API e banco com um comando (CONFERIR o aviso do checklist 7.2 sobre o `Dockerfile`) | `Dockerfile`, `docker-compose.yml` |
| Render | Hospedagem da API e do PostgreSQL | O `render.yaml` cria os dois de uma vez (plano gratuito: a API dorme, a primeira chamada leva 30 a 60 s) | `render.yaml` |
| Cloudflare | Hospedagem do front (Workers com arquivos estáticos) | Entrega o site estático; `public/_redirects` deixa recarregar qualquer URL da SPA | README do front, "Produção" |

As razões acima vêm do roteiro e do bom senso. Se perguntarem "por que você escolheu", diga o que realmente pesou para você. Os números de versão (React 19, Vite 8, TypeScript 6, Python 3.13, PostgreSQL 16) estão no `package.json`, no README e no `render.yaml`.

### 1.2 ORM: o que é e como aparece neste projeto

**Analogia:** tabela = classe, linha = objeto, coluna = atributo.

| No banco | No Python (ORM) | Exemplo do projeto |
|---|---|---|
| tabela `semestres` | classe `Semestre` | `models.py:30` |
| uma linha da tabela | um objeto `Semestre(...)` | `db.py:526` |
| coluna `encerrado_em` | atributo `Semestre.encerrado_em` | `db.py:535` |
| `SELECT ... WHERE` | `select(Semestre).where(...)` | `db.py:535` |

**A diferença com um exemplo real.** Primeiro o SQL puro (versão do update 4 sem ORM, `gestao-alunos-u4/db.py:458-466`), depois a mesma função com ORM (`gestao-alunos-orm/db.py:524-535`):

```python
def inserir_semestre(nome, inicio, fim):
    return executar_retornando(
        "INSERT INTO semestres (nome, inicio, fim) VALUES (%s, %s, %s) RETURNING *",
        (nome, inicio, fim),
    )


def semestre_ativo():
    return consultar("SELECT * FROM semestres WHERE encerrado_em IS NULL", um=True)
```

```python
def inserir_semestre(nome, inicio, fim):
    with sessao() as s:
        semestre = Semestre(nome=nome, inicio=inicio, fim=fim)
        s.add(semestre)
        s.flush()
        s.refresh(semestre)
        return _dict_modelo(semestre)


def semestre_ativo():
    with sessao() as s:
        return _dict_modelo(s.scalars(select(Semestre).where(Semestre.encerrado_em.is_(None))).first())
```

**A porta de entrada do ORM**, `sessao()` (`db.py:135-143`): abre uma `Session`, confirma (`commit`) no fim, e se o banco recusar (`IntegrityError`) faz `rollback` e relança o erro original do psycopg2 (`erro.orig`).

```python
@contextmanager
def sessao():
    with Session(_obter_engine()) as s:
        try:
            yield s
            s.commit()
        except IntegrityError as erro:
            s.rollback()
            raise erro.orig from None
```

Por isso as rotas continuam capturando `UniqueViolation` do psycopg2: `main.py`, `schemas.py` e `routers/` são idênticos nos dois repositórios (comparei ignorando o fim de linha). Trocar o acesso ao banco não mexeu nas rotas, e esse é o argumento da separação em camadas.

**O que o ORM é e o que não é aqui (honestamente):**
- O README diz que "CRUDs simples usam o ORM e o SQL à mão fica nas consultas complexas". Lendo o `db.py`, a maior parte das consultas, até as complexas, usa os construtores do SQLAlchemy (`select`, `insert`, `update`, `delete` sobre as classes). SQL escrito em texto sobrou em: `criar_tabelas()` (CREATE TABLE e migrações), `consultar`/`executar` (usados por `seed.py`, `routers/ia.py` e testes) e `listar_paginado` (disciplinas e avisos).
- **`models.py` não cria as tabelas:** quem cria é `criar_tabelas()` com SQL. O modelo é um espelho conferido por teste (`tests/test_modelos_orm.py::test_modelos_correspondem_ao_banco_criado` compara tabelas, colunas, chaves e cascatas com o banco real).
- **Quando usar SQL puro:** criar e migrar tabelas, relatórios com muitas junções, ajuste fino de desempenho, carga em massa. **Quando usar ORM:** CRUD do dia a dia, para escrever menos e errar menos.
- **Custo do ORM:** o SQL fica escondido; é preciso saber o que ele gera. Veja `_alunos_com_media` (`db.py:736-750`): uma consulta complexa em ORM fica mais longa que em SQL.

### 1.3 O caminho de uma requisição (exemplo: o professor lança uma nota)

```
[Navegador]  clique em "Salvar nota"
   |
   v
src/portal/rede.ts   salvarNota() -> pedir('/avaliacoes/5/notas/1', {valor: 5}, 'PUT')   (rede.ts:98 e :8)
   |   fetch + cabeçalho  Authorization: Bearer <token>
   v
FastAPI (main.py, CORS)  ->  routers/avaliacoes.py : lancar_nota()   (:104)
   |-- Pydantic confere o corpo NotaEntrada (valor de 0 a 10)          -> senão 422
   |-- Depends(auth.exige_equipe): lê o JWT e busca o usuário no banco -> senão 401 / 403
   |-- regras: professor da disciplina? semestre aberto? período aberto? aluno matriculado?  -> 403 / 409
   v
db.lancar_nota()  (db.py:1543)  ->  sessao() abre a Session do ORM  ->  INSERT ... ON CONFLICT DO UPDATE
   v
PostgreSQL (tabela notas)  <-  commit; a média do aluno é recalculada (notas_calc.py via regras.py)
   v
204 sem corpo volta pelo mesmo caminho; o front recarrega o estado (GET /portal/estado)
```

## 2. Arquitetura do back em camadas

| Camada | Arquivos | O que faz | O que não faz |
|---|---|---|---|
| Rotas | `main.py`, `routers/*.py` | Recebe o HTTP, chama as "portas" de `auth`, usa o schema, chama `db` e `regras`, devolve o status | Não escreve SQL; não faz conta de média |
| Entrada e saída | `schemas.py` | Define o formato e os limites do JSON com Pydantic (422 automático) | Não consulta o banco |
| Login e perfis | `auth.py` | Hash da senha, token JWT, e as dependências `usuario_atual`, `exige_escola`, `exige_equipe`, `pode_ver_aluno` | Não decide regra escolar |
| Regras puras | `regras.py`, `notas_calc.py` | Contas e conferências: choque de horário, média, situação, validação de evento | **Não importa banco nem FastAPI** |
| Banco | `db.py`, `models.py` | Todo acesso ao PostgreSQL e as transações | Não fala HTTP |
| Dados de demonstração | `seed.py` | Apaga tudo e recria o cenário da apresentação | Não roda sozinho (exige `--apagar-tudo`) |

**Por que separar assim: "a regra não sabe do banco".**
1. Dá para testar a regra sem PostgreSQL: `python -m pytest tests/test_regras.py --noconftest -q` (README, seção Testes).
2. A mesma conta serve o boletim, o painel, o CSV e o resumo do semestre; mudou a regra, muda em um lugar.
3. Trocar o banco (SQL puro para ORM) não tocou nas rotas.

**O padrão que se repete** (exemplo em `routers/semestres.py:27-33`, `choque_da_grade`): o router busca no `db` as ocupações e as grades, entrega tudo à regra pura `regras.choque_grade` e transforma o texto devolvido em `409`. A regra recebe dicionários e devolve um texto (ou `None`).

**Ressalva honesta:** as regras que precisam acontecer na mesma transação (matrícula automática R1 a R4, exclusão protegida, publicar notas) moram dentro do `db.py`, não em `regras.py`.

**A "porta" de autenticação** (`auth.py:45-61`):

```python
def usuario_atual(credenciais: HTTPAuthorizationCredentials = Depends(esquema)):
    if credenciais is None:
        raise _nao_autenticado()
    try:
        dados = jwt.decode(credenciais.credentials, os.environ["SECRET_KEY"], algorithms=["HS256"])
        usuario = db.buscar_usuario(int(dados["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _nao_autenticado()
    if usuario is None:
        raise _nao_autenticado()
    return usuario


def exige_escola(usuario=Depends(usuario_atual)):
    if usuario["perfil"] != "escola":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")
    return usuario
```

**Armadilhas ao abrir os arquivos na frente de todos:**
- `main.py:1-16` e `schemas.py:1-14` ainda têm a docstring do esqueleto do curso ("ESQUELETO, implemente você mesmo"). Não leia essa parte em voz alta.
- Em `main.py:66` a lista chamada `professor` é `[Depends(auth.exige_escola)]`, ou seja, escola. Em `routers/avaliacoes.py:16` e `routers/frequencia.py:16`, `professor` é `exige_equipe` (escola ou professor). O nome engana; a regra vale.
- O README diz que "Redes fica sem professor, notas e aulas", mas o `seed.py` dá notas à Eva em Redes (`tests/test_seed.py::test_seed_chamadas_e_resultados_de_negocio` espera média 6,3). Redes tem nota e não tem professor nem aula.

## 3. Regras de negócio

Cada regra tem: o que é, exemplo do seed, o que acontece se violar (código HTTP e mensagem exata, lida no código), onde está e qual teste a prova. Contas do seed (senha `escola123`): `escola@escola.com`, `prof@escola.com` (Prof. Carlos: Python e Banco de Dados), `marta@escola.com` (Profa. Marta: Algoritmos), `ana@escola.com` (aluna). Alunos: Ana, Bruno e Carla no 1º A (Python e Banco de Dados); Diego e Fabio no 2º A (Algoritmos); Eva no 3º A (Redes, sem professor).

### 3.1 Perfis e permissões

- **O que é:** três perfis. A **escola** é o superconjunto (administra e também opera todas as disciplinas). O **professor** opera só as disciplinas em que ele é o professor (`disciplinas.professor_id`): agenda, aulas, chamada, frequência, avaliações, notas, avisos de disciplina e pedidos de aula extra. O **aluno** vê só o que é dele (boletim, frequência, grade, avisos, avaliações publicadas). Nas listas o filtro é silencioso: o professor não recebe 403, só não vê o que não é dele.
- **Exemplo:** Prof. Carlos tenta lançar nota numa avaliação de Algoritmos (da Marta).
- **Se violar:** sem token, `401` `"Não autenticado"`; perfil errado, `403` `"Sem permissão"`; professor em disciplina alheia, `403` `"Sem permissão para esta disciplina"`; aluno vendo outro aluno, `403` `"Sem permissão"`.
- **Onde:** `auth.py` (`usuario_atual` :45, `exige_escola` :58, `exige_equipe` :70, `exigir_professor_da_disciplina` :76, `pode_ver_aluno` :86).
- **Testes:** `test_perfis.py::test_guards_e_escopo_do_aluno`, `::test_rotas_exclusivas_da_escola`, `::test_operacao_exige_disciplina_do_professor`, `::test_professor_so_pode_ver_aluno_matriculado_em_sua_disciplina`; `test_auth.py::test_sem_token_401_e_com_token_200`, `::test_aluno_nao_acessa_rota_de_professor`.

### 3.2 Semestre: ativo, encerrar, somente leitura depois

- **O que é:** ativo = `encerrado_em` vazio. Um índice único parcial no banco (`models.py:34`, `semestres_unico_ativo`) impede dois ativos. Encerrar grava a data; depois disso toda escrita em disciplinas daquele semestre é recusada (nota, chamada, aula, grade, matrícula, avaliação, aviso, pedido) e as leituras continuam. `GET /semestres/{id}/resumo` mostra por disciplina: alunos, média, frequência, aprovados e reprovados.
- **Exemplo:** o seed cria o semestre `2026.2` de hoje menos 63 dias até hoje mais 70 dias (08/10/2026: de 06/08 a 17/12).
- **Se violar:** criar um segundo ativo, `409` `"Já existe um semestre ativo"`; fim antes do início, `422`; encerrar de novo, `409` `"Semestre encerrado"`; escrever depois de encerrar, `409` `"Semestre encerrado"`; id inexistente, `404` `"Semestre não encontrado"`.
- **Onde:** `routers/semestres.py` (`exigir_semestre_aberto` :15, `criar_semestre` :57, `encerrar_semestre` :78, `resumo_semestre` :88), `db.py` (`encerrar_semestre` :548).
- **Testes:** `test_encerramento.py::test_encerrar_grava_data_e_segunda_tentativa_da_409`, `::test_escrita_funciona_aberto_e_da_409_encerrado_sem_mudar_leituras`; `test_semestres_grade_agenda.py::test_segundo_semestre_ativo_da_409_e_lista_mais_recente_primeiro`, `::test_semestre_exige_fim_depois_do_inicio`.

### 3.3 Turma do aluno e matrícula automática (R1 a R5)

- **O que é:** o aluno pertence a uma turma. Salvar o aluno com turma o matricula nas disciplinas dessa turma; aluno sem turma não entra sozinho. Vale só para disciplinas do **semestre ativo**, é idempotente (`ON CONFLICT DO NOTHING`) e acontece na **mesma transação** (se algo falhar, nada muda).

| Regra | Gatilho | Efeito |
|---|---|---|
| R1 | `POST /alunos` com `turma_id` | matricula o aluno em todas as disciplinas da turma |
| R2 | `PATCH /alunos/{id}` trocando a turma de A para B (ou `null`) | matricula nas de B; desmatricula das de A só se não houver nota nem presença; as que têm histórico ficam e voltam em `matriculas_mantidas` |
| R3 | `POST /disciplinas` com `turma_id` | matricula todos os alunos da turma |
| R4 | `PATCH /disciplinas/{id}` trocando a turma | matricula os alunos da nova; dos da antiga, tira quem não tem nota nem presença NESTA disciplina |
| R5 | `POST` e `DELETE /alunos/{id}/matricular/{disciplina_id}` | exceções individuais continuam permitidas |

- **Exemplo (seed):** Ana, Bruno e Carla estão no 1º A, por isso estão em Python e Banco de Dados sem matrícula avulsa. Demonstração opcional no Swagger: `POST /alunos` com `{"nome":"Gustavo Reis","idade":21,"matricula":"2026007","turma_id":1}` e depois `GET /alunos/{id}/disciplinas` devolve Python e Banco de Dados (apague com `DELETE /alunos/{id}`; sem histórico dá 204).
- **Se violar:** turma inexistente, `422` `"turma_id não encontrada"`; matrícula repetida, `409` `"O aluno já está matriculado nessa disciplina."`; choque de horário do aluno, `409` `"Ana já está em Disciplina A neste horário (sexta, 13:30–15:10)."` (formato: `{nome} já está em {disciplina} neste horário ({dia}, {ini}–{fim}).`); desmatricular com nota ou presença, `409` `"aluno já tem notas ou frequência"`.
- **Onde:** `db.py` (`inserir_aluno` :710 R1, `atualizar_aluno` :797 R2, `inserir_disciplina` :897 R3, `atualizar_disciplina` :953 R4, `matricular` :1055, `desmatricular` :1062), `main.py` (`matricular` :271), `regras.choque_do_aluno` (:97). Especificação: `docs/superpowers/specs/2026-10-07-att3-turma-do-aluno-design.md`.
- **Testes:** `test_turma_do_aluno.py::test_r1_criar_aluno_matricula_so_na_turma_e_no_semestre_ativo`, `::test_r2_troca_ou_limpa_turma_preserva_historico_e_excecoes`, `::test_r3_criar_disciplina_matricula_so_alunos_da_turma`, `::test_r4_trocar_turma_preserva_historico_so_na_disciplina`, `::test_r5_excecao_individual_independe_da_turma_e_e_idempotente`, `::test_r5_historico_impede_desmatricula_individual`, `::test_aluno_turma_inexistente_422_sem_alteracoes`; `test_matricula_avaliacao_exclusao.py::test_choque_recusa_e_encostar_aceita`, `::test_matricula_repetida_recusa_e_primeira_aceita`.

### 3.4 Choque de horário (professor, turma, sala) e horários ocupados do professor

- **O que é:** ao salvar a grade, trocar professor, turma ou sala de uma disciplina, gravar ocupações, pedir aula extra ou remarcar, o servidor confere nesta ordem: (1) ocupação do professor, (2) mesmo professor, (3) mesma turma, (4) mesma sala (a sala do item da grade ou, se vazia, a da disciplina). **Encostar não é choque** (fim 09:40 e início 09:40 passam): a regra é `a.inicio < b.fim e b.inicio < a.fim`. A grade só vale de segunda a sexta, entre 08:00 e 17:10. Ocupação = horário em que o professor não pode (ex.: outra escola), gravado por `PUT /professores/{id}/ocupacoes` (só a escola; o professor só lê as próprias).
- **Exemplo (seed):** Carlos tem ocupação `segunda 08:00–12:00 "Outra escola"`; Banco de Dados tem terça 10:00–11:40. Salvar a grade de Python com terça 10:00–11:40 chega ao choque de professor.
- **Se violar (409, nada é gravado):**
  - ocupação: `"Choca com um horário ocupado de Prof. Carlos (segunda, 08:00–12:00: Outra escola)."`
  - professor: `"Prof. Carlos já dá Banco de Dados neste horário (terça, 10:00–11:40)."`
  - turma: `"{turma} já tem {disciplina} neste horário ({dia}, {ini}–{fim})."`
  - sala: `"{sala} já está com {disciplina} · {turma da outra ou 'sem turma'} neste horário ({dia}, {ini}–{fim})."`
  - janela e dia: `"Fora da janela da escola (08:00 às 17:10)."` e `"Escolha um dia de segunda a sexta."`
  - ocupações que se sobrepõem entre si: `422` (`Horários ocupados se sobrepõem`); professor inexistente: `404` `"Professor não encontrado"`.
- **Onde:** `regras.py` (`se_sobrepoem` :92, `motivo_de_choque` :130, `choque_grade` :142, `fora_do_padrao` :107), `routers/semestres.py` (`choque_da_grade` :27, `salvar_grade` :115), `main.py` (`atualizar_disciplina` :229), `routers/professores.py` (`salvar_ocupacoes` :50).
- **Testes:** `test_ocupacoes.py::test_grade_choque_com_mesmo_professor_e_aceita_professor_diferente`, `::test_grade_choque_de_turma_da_409_e_outra_turma_ou_encostar_passa`, `::test_grade_choque_de_sala_usa_sala_efetiva_e_cita_a_turma_da_outra`, `::test_grade_choque_prioridade_professor_turma_sala`, `::test_grade_fora_da_janela_ou_fim_de_semana_da_409_antes_dos_choques`, `::test_ocupacoes_choque_com_grade_da_409_sem_gravar`, `::test_regra_pura_primeiro_choque_e_intervalos`.

### 3.5 Uma aula por disciplina por dia

- **O que é:** a disciplina tem no máximo uma aula em cada data e no máximo um horário por dia da semana na grade. O banco garante com `UNIQUE (disciplina_id, data)` (`models.py:162`).
- **Exemplo:** Python tem terça 08:00–09:40 e quinta 08:00–09:40 (um horário por dia). Tentar terça 08:00 e terça 13:30 na mesma grade é recusado.
- **Se violar:** grade com dois horários no mesmo dia, `409` `"Uma disciplina só pode ter uma aula por dia na grade."`; aula avulsa em dia que já tem aula, `409` `"Já existe aula nessa data"`.
- **Onde:** `routers/semestres.py:119-122`, `regras.conferir_data_extra` (:352-354), `routers/agenda.py:53`.
- **Testes:** `test_furos_mapeados.py::test_furo_m1_duas_faixas_no_mesmo_dia_sao_recusadas`; `test_semestres_grade_agenda.py::test_extra_duplicada_da_409_e_cria_quando_data_fica_livre`, `::test_grade_ignora_data_com_aula_extra_e_gera_uma_aula_por_dia`.

### 3.6 A grade semanal gera as aulas do semestre

- **O que é:** `PUT /disciplinas/{id}/grade` substitui a grade e devolve `{"itens": [...], "aulas_geradas": N}`. O servidor apaga as aulas futuras de origem `grade` que estão agendadas, sem remarcação e sem chamada, e cria uma aula para cada data do semestre (de hoje em diante) cujo dia da semana bate com a grade. Aulas canceladas, remarcadas, extras e com chamada são preservadas (`ON CONFLICT DO NOTHING`; data original de aula remarcada não é recriada).
- **Exemplo:** Python (terça e quinta) tem 18 aulas já passadas no seed (9 semanas de 2 aulas); as futuras vão até o fim do semestre. CONFERIR: quantas aulas futuras o `aulas_geradas` devolve no dia do seed.
- **Se violar:** semestre encerrado, `409` `"Semestre encerrado"`; sala inexistente, `422` `"sala_id não encontrada"`; disciplina inexistente, `404` `"Disciplina não encontrada"`.
- **Onde:** `db.py` (`salvar_grade` :663), `routers/semestres.py` (`salvar_grade` :115).
- **Testes:** `test_semestres_grade_agenda.py::test_grade_segunda_e_quarta_gera_datas_e_horarios_do_semestre`; `test_furos_mapeados.py::test_furo_6_1_salvar_a_mesma_grade_nao_desfaz_cancelamento`; `test_diario_de_classe.py::test_grade_preserva_aula_com_presenca_e_extra`.

### 3.7 Feriados e eventos

- **O que é:** o calendário tem eventos dos tipos `prova`, `entrega`, `evento`, `gincana`, `reuniao`, `conselho`, `feriado` e `bimestre`, para todas as turmas ou só para algumas. Só a escola cria, edita e apaga; cada perfil recebe o recorte que lhe cabe (professor e aluno veem os gerais e os das turmas deles). **Feriado bloqueia** chamada, pedido de aula extra, aula avulsa, remarcação e reativação naquela data, mas **não apaga** as aulas já geradas.
- **Exemplo (seed):** 4 bimestres, 10 feriados (ex.: Nossa Senhora Aparecida, 12/10), 4 provas, 1 entrega, gincana, feira de ciências, reunião de pais e conselho de classe.
- **Se violar (422, texto no `detail`):** `"Dê um título ao evento."`, `"A data precisa estar no ano letivo de 2026."` (o ano vem do semestre ativo), `"O fim precisa ser no mesmo dia ou depois do início."`, `"Preencha os dois horários ou deixe os dois em branco."`, `"O horário de fim precisa ser depois do início."`, `"Escolha pelo menos uma turma."`, `"turma_ids com turma inexistente"`, `"disciplina_id inexistente"`. Em feriado: `409` `"Dia sem aula: {título}."`.
- **Onde:** `regras.validar_evento` (:286), `routers/eventos.py`, `db.py` (`listar_eventos` :1902, `feriados_do_dia` :2145).
- **Testes:** `test_eventos.py::test_evento_invalido_da_422_com_texto_exato_e_nao_grava`, `::test_recorte_de_eventos_por_perfil`; `test_pedidos_aula.py::test_pedido_em_feriado_da_409_com_o_titulo_e_vale_no_intervalo`; `test_diario_de_classe.py::test_chamada_recusa_feriado_e_cancelada`.

### 3.8 Pedidos de aula extra e aula extra direta

- **O que é:** o professor da disciplina pede uma aula extra; a escola decide. Estados: `pendente` → `aprovada` (cria a aula extra, onde a chamada já funciona), `recusada` (com motivo) ou `sugestao` (a escola propõe outro horário); da sugestão, o professor **aceita** (vira `aprovada`) ou **recusa** (vira `recusada`). A escola também cria aula extra direto (`POST /disciplinas/{id}/aulas`), com as mesmas conferências.
- **Ordem da conferência de data (`conferir_data_extra`):** dentro do semestre; feriado; dia útil (sem horário) ou horário válido e dentro da janela; ocupação do professor; choque com as aulas do dia (professor, turma, sala; aula cancelada não conta); por fim, uma aula por disciplina por dia.
- **Exemplo (seed):** 3 pedidos: um pendente da Marta (Algoritmos), um aprovado do Carlos (Python, já com a aula criada) e um recusado do Carlos (Banco de Dados: `"A sala está reservada para a Feira de ciências."`).
- **Se violar:** professor de outra disciplina, `403` `"Sem permissão para esta disciplina"`; escola criando pedido, `403` `"Sem permissão"`; data passada, `409` `"Não dá para pedir aula em data que já passou."`; motivo vazio, `422` `"Explique o motivo da aula extra."`; fora do semestre, `409` `"Fora do semestre (06/08 a 17/12)."` (as datas do semestre); pedido já respondido, `409` `"Este pedido já foi respondido."`; recusa sem motivo, `422` `"Escreva o motivo da recusa. O professor vai ver."`; sugestão que também choca, `409` `"Esse horário também tem choque. {motivo}"`; aceitar sugestão que deixou de estar livre, `409` `"A sugestão deixou de estar livre: {motivo}"`; sem sugestão, `409` `"Este pedido não tem sugestão da escola."`; `404` `"Pedido não encontrado"`.
- **Onde:** `routers/pedidos.py`, `regras.conferir_data_extra` (:311), `db.py` (`aprovar_pedido` :2103, `responder_pedido` :2093), `routers/agenda.py` (`criar_aula` :43).
- **Testes:** `test_pedidos_aula.py::test_criar_pedido_so_o_professor_da_disciplina`, `::test_aprovar_cria_aula_extra_e_a_chamada_funciona_nela`, `::test_recusar_grava_o_motivo_e_so_a_escola_recusa`, `::test_sugerir_grava_a_sugestao_e_confere_o_horario`, `::test_aceitar_sugestao_troca_o_pedido_cria_a_aula_e_aprova`, `::test_recusar_sugestao_limpa_a_sugestao_e_grava_a_resposta`, `::test_regra_pura_ordem_da_conferencia_de_data`; `test_diario_de_classe.py::test_aula_direta_usa_conferencia_do_pedido`; `test_furos_mapeados.py::test_furo_6_3_aula_avulsa_num_sabado_e_recusada`.

### 3.9 Cancelar, reativar e remarcar aula

- **O que é:** `PATCH /aulas/{id}`. Cancelar (`{"status":"cancelada"}`) **não apaga**: a aula fica cancelada e some do cálculo de frequência. Reativar (`{"status":"agendada"}`) reconfere data, feriado e ocupação. Remarcar (`{"data": ..., "hora_inicio": ..., "hora_fim": ...}`) passa pela mesma conferência do pedido, ignorando a própria aula, e guarda a primeira data original em `remarcada_de`.
- **Exemplo:** cancelar a aula de Python de uma terça e reativar em seguida.
- **Se violar:** cancelar ou mudar a data de aula que já tem chamada, `409` `"Aula já tem presenças"`; choque na nova data, `409` com a mensagem do choque; aula inexistente, `404` `"Aula não encontrada"`; corpo vazio, `422`.
- **Onde:** `routers/agenda.py` (`atualizar_aula` :57), `db.py` (`atualizar_aula` :1705).
- **Testes:** `test_semestres_grade_agenda.py::test_patch_aula_cancela_reativa_e_atualiza_horarios_sem_apagar`, `::test_cancelar_com_presenca_da_409_e_sem_presenca_da_200`, `::test_remarcar_data_ocupada_da_409_e_livre_da_200`, `::test_remarcada_de_preserva_primeira_data_e_agenda`; `test_furos_mapeados.py::test_furo_6_5_reativar_aula_sobre_ocupacao_nova_da_409`.

### 3.10 Chamada e frequência

- **O que é:** `PUT /disciplinas/{id}/chamada` com `{"data": "2026-10-08", "presencas": [{"aluno_id": 1, "presente": true}]}` grava a presença (204). A frequência de uma disciplina é presentes ÷ aulas, contando só aulas **agendadas que tiveram chamada** (cancelada ou sem chamada não pesa). Quem não aparece na chamada de uma aula com chamada conta como falta. A frequência geral do aluno é a soma das presenças ÷ a soma das aulas (não a média dos percentuais). Frequência mínima: `freqMin` da regra (75 no seed).
- **Exemplo (seed):** cada disciplina com grade tem 18 aulas com chamada; Ana 18/18 = 100%; Carla 6/18 = 33,3%; Fabio 13/18 = 72,2% (abaixo de 75%).
- **Se violar (409, nesta ordem):** `"Fora do semestre (dd/mm a dd/mm)."`, `"Aula cancelada"`, `"Não há aula prevista nessa data."`, `"Dia sem aula: {feriado}."`, `"O aluno {id} não está matriculado nessa disciplina."`.
- **Onde:** `routers/frequencia.py` (`registrar_chamada` :27), `db.py` (`registrar_chamada` :1723, `frequencia_da_turma` :1777, `linhas_frequencia_aluno` :1805), `regras.py` (`percentual` :16, `resumo` :60).
- **Testes:** `test_frequencia.py::test_chamada_em_aula_existente_e_repetir_atualiza_sem_duplicar`, `::test_frequencia_ignora_aulas_sem_chamada_e_canceladas`, `::test_ausencia_sem_registro_conta_como_falta`; `test_furos_mapeados.py::test_furo_6_4a_chamada_em_data_sem_aula_prevista_e_recusada`, `::test_furo_6_4b_chamada_com_aluno_nao_matriculado_e_recusada`, `::test_furo_6_4c_chamada_fora_do_semestre_e_recusada`; `test_matricula_avaliacao_exclusao.py::test_frequencia_geral_soma_aulas_na_situacao_portal_e_dashboard`.

### 3.11 Regra de avaliação do update 4

A escola grava **uma regra só** (tabela `regra_avaliacao`, uma linha, coluna JSON). Sem linha gravada, a API devolve o padrão (dois períodos que dividem o semestre ao meio). O servidor mantém as avaliações de cada disciplina em sincronia com a regra (`db._sincronizar_avaliacoes`, :1281).

| Parte da regra | O que faz | Padrão do seed |
|---|---|---|
| `periodos` (1 a 4) | divide o ano; cada um tem `fechado`; **fechado trava as notas** dele | `p1` "1º semestre" e `p2` "2º semestre" |
| `itens` (obrigatórias com peso) | uma avaliação por período e item, com `nome`, `tipo` (Prova ou Trabalho) e `peso > 0` | P1 e P2, peso 1 |
| `extras` | atividades extras criadas pelo professor: `permitido`, `max` (0 a 5 por período), `peso` | permitido, máximo 2, peso 1 |
| `participacao` | uma "Participação" por período se `ativo`, com peso | desligada |
| `recuperacao` | uma por período, peso 0; modo `menor` (a nota de recuperação substitui a menor nota se for maior) ou `media` (substitui a média do período se for maior) | ativa, `menor` |
| `final` | uma prova final (`periodo_id = "final"`, peso 0, nunca travada por período) | ativa |
| `arred` | `0,1`, `0,5` ou `inteiro`; meio sempre para cima | `0,1` |
| `mediaMin` / `freqMin` | média mínima (0 a 10) e frequência mínima (0 a 100) | 6 e 75 |
| `conselho` | permite aprovar aluno pelo conselho de classe | ligado |

- **Publicar, rascunho e prazo:** obrigatórias, participação e extras nascem em **rascunho** (`publicada = false`); recuperação e prova final nascem publicadas. `POST /disciplinas/{id}/avaliacoes/publicar` (opcional `{"periodo_id": "p2"}`) publica as não publicadas que tenham ao menos uma nota e devolve `{"publicadas": N}`. `PATCH /avaliacoes/{id}` aceita `publicada`, `prazo` e, só em extra, `nome`. O `prazo` é informativo: o servidor não bloqueia nota depois dele.
- **O que o aluno vê:** só avaliações e notas publicadas; a média dele é calculada só com as publicadas e vem com `parcial: true` quando falta nota. Professor e escola veem tudo.
- **Conselho:** `POST /disciplinas/{id}/conselho/{aluno_id}` (só escola, 204, idempotente) faz a situação virar `"Aprovado pelo conselho"` com prioridade sobre média e frequência; `DELETE` desfaz.
- **Se violar:**
  - nota fora de 0 a 10: `422`; aluno não matriculado: `409` `"O aluno não está matriculado nessa disciplina"`; avaliação inexistente: `404` `"Avaliação não encontrada"`;
  - período fechado (nota ou nova extra): `409` `"Período fechado pela escola: notas travadas."`;
  - extras: `409` `"Atividades extras desligadas."`, `"Limite de 2 atividades extras por período atingido."`, `"Já existe uma avaliação com esse nome neste período."`; período fora da regra: `422` `"Período não encontrado na regra de avaliação."`;
  - excluir avaliação: `409` `"Só dá para excluir atividade extra."` ou `"Só dá para excluir atividade sem notas."`;
  - salvar a regra: `422` com `type` `regra_invalida` para dados fora dos limites; `409` `"Período já tem notas: não dá para reduzir a quantidade de períodos."`, `"Item já tem notas: não dá para remover."`, `"Prova final já tem notas: não dá para desligar."`; só a escola grava (`403`);
  - conselho: `409` `"Conselho de classe desligado."`; `404` `"Aluno não matriculado nessa disciplina"`.
- **Onde:** `notas_calc.py`, `regras.montar_boletim` (:27), `routers/regra.py`, `routers/avaliacoes.py`, `schemas.py` (`RegraAvaliacao` :572), `db.py` (`buscar_regra_avaliacao` :1237, `gravar_regra_avaliacao` :1338, `criar_avaliacao_extra` :1370, `publicar_avaliacoes` :1419). Contrato: `docs/contrato-update4.md`.
- **Testes:** `test_regra_avaliacao.py::test_padrao_e_permissoes`, `::test_validacoes_do_put`, `::test_remocao_com_nota_409_sem_nota_permitida`; `test_avaliacoes_v2.py::test_extras_limite_duplicado_e_periodo`, `::test_periodo_fechado_trava_notas_mas_final_nao`, `::test_publicar_contagem_e_aluno_so_ve_publicadas`, `::test_aluno_ve_notas_de_recuperacao_e_final_sem_publicar_mas_p2_fica_escondida`; `test_boletim_regra.py::test_aluno_nao_ve_rascunho_nas_notas_nem_na_media_do_boletim_e_estado`, `::test_situacao_com_periodos_fechados_frequencia_e_conselho`; `test_conselho.py::test_conselho_permissoes_matricula_idempotencia`, `::test_conselho_desligado_e_semestre_encerrado`; `test_notas.py::test_nota_fora_da_faixa_422_e_limites_ok`.

### 3.12 A média passo a passo (exemplo completo: Carla em Python)

Regra do seed: dois períodos, itens P1 e P2 (peso 1), recuperação `menor`, prova final ativa, `arred` `0,1`, `mediaMin` 6, `freqMin` 75. Notas da Carla em Python: no 1º semestre P1 = 4,0, P2 = 3,5 e recuperação = 8,0; no 2º semestre P1 = 3,5 e P2 = 4,0 (sem recuperação). Frequência: 6 de 18 aulas = 33,3%.

| Passo | Conta | Resultado |
|---|---|---|
| 1. Período 1, recuperação `menor` | a menor nota lançada é a P2 (3,5); como 8,0 > 3,5, a recuperação ocupa o lugar dela, com o mesmo peso: notas 4,0 e 8,0; média ponderada (1×4,0 + 1×8,0) ÷ (1+1) | 6,0 |
| 2. Período 2 | (1×3,5 + 1×4,0) ÷ 2 = 3,75; arredonda com `floor(3,75×10 + 0,5) ÷ 10` = `floor(38,0) ÷ 10` | 3,8 |
| 3. Média do ano | média simples dos períodos que têm resultado: (6,0 + 3,8) ÷ 2 = 4,9; arredonda | 4,9 |
| 4. Prova final | só entra se o ano < `mediaMin` **e** houver nota final. 4,9 < 6, mas Carla não tem nota final | `m = 4,9` |
| 5. Situação (ordem de prioridade) | (1) conselho? Carla tem conselho em Python no seed | **"Aprovado pelo conselho"** |

Sem o conselho, a ordem continua: (2) sem nota nenhuma? `"Sem nota"`; (3) frequência < `freqMin`? `"Abaixo da frequência"` (33,3 < 75: é o que vale para ela em Banco de Dados); (4) `m` ≥ `mediaMin`? `"Na média"` (ou `"Aprovado"` se todos os períodos estiverem fechados); (5) final ativa e sem nota final? `"Prova final"`; (6) senão `"Abaixo da média"` (ou `"Reprovado"` com períodos fechados).

**Conferência com `notas_calc.py` (medido):** `media_periodo` do 1º período = `{'m': 6.0, 'parcial': False, 'rec': True}` e do 2º = `{'m': 3.8, ...}`; `media_ano` = ano 4,9, `fin` None, `m` 4,9; com prova final 7,0, `m = arred((4,9 + 7,0) ÷ 2)` = arred(5,95) = **6,0**; com 8,0, `m` = 6,5; no modo `media` a recuperação 8,0 > 3,75 vira a média do 1º período (8,0); `situacao` devolve "Prova final" (frequência 80%), "Aprovado pelo conselho" (com conselho) e "Abaixo da frequência" (frequência 60%). No seed, todos os alunos batem com `tests/test_seed.py`: Ana 9,0 / 9,0; Bruno 6,0 / 6,0; Carla 4,9 (Python) e 3,8 (Banco de Dados); Diego 8,5; Eva 6,3; Fabio 4,8.

**O arredondamento** (`notas_calc.py:6-14`): `floor(x × fator + 0,5) ÷ fator`, com fator 10, 2 ou 1. Meio sempre para cima, como o `Math.round` do JavaScript; o `round()` do Python arredonda 6,25 para 6,2 (medido) e quebraria a paridade com a tela. O teste `tests/test_notas_calc.py::test_arred_paridade_float64_com_js` e o teste do front `e2e/adaptador.test.mjs` ("o JS do canvas coincide com o cálculo do back") guardam isso.

**Painel e "em risco":** a média geral do aluno é a média simples das médias das disciplinas (Carla: (4,9 + 3,8) ÷ 2 = 4,35) e a frequência geral é presenças totais ÷ aulas totais; o painel usa os dois com `mediaMin` e `freqMin`. Ele **não olha o conselho**: por isso Carla aparece em risco no painel e "Aprovada pelo conselho" em Python no boletim.

**Dica para a demonstração:** pelas contas do seed, **ninguém** cai em "Prova final" (Carla e Fabio têm frequência baixa, que vem antes na ordem). Para mostrar a "Prova final" ao vivo, suba a média mínima para 6,5 (Passo 4 do roteiro do front): Bruno (média 6,0 e frequência 100%) passa a "Prova final" (medido). Depois volte para 6.

- **Testes:** `test_notas_calc.py::test_recuperacao_menor_so_troca_se_maior_e_preserva_peso`, `::test_recuperacao_media_so_sobe`, `::test_arred_meios_sempre_para_cima`, `::test_media_ano_final_meio_em_float64`, `::test_situacao_seis_ramos_em_ordem_de_precedencia`; `test_boletim_regra.py::test_media_por_periodo_com_recuperacao_e_csv_igual_ao_json`; `test_seed.py::test_seed_chamadas_e_resultados_de_negocio`.

### 3.13 Exclusão protegida

- **O que é:** o que tem histórico (nota ou chamada) não se apaga. Sem histórico, a exclusão funciona e leva junto o que depende (matrículas, aulas, avaliações, avisos, pedidos; no aluno, também o login).
- **Exemplo (seed):** `DELETE /disciplinas/1` (Python) tem notas e chamadas, então é recusado.
- **Se violar (409):** disciplina, `"A disciplina tem notas ou chamadas lançadas e não pode ser excluída."`; aluno, `"O aluno tem notas ou presenças lançadas e não pode ser excluído."` (se o histórico é de semestre encerrado: `"Aluno tem historico em semestre encerrado"`, sem acento no código); desmatricular, `"aluno já tem notas ou frequência"`; avaliação com nota, `"Só dá para excluir atividade sem notas."`. Sucesso sem histórico: `204`.
- **Onde:** `main.py` (`excluir_aluno` :167, `excluir_disciplina` :258), `db.py` (`historico_do_aluno` :866, `disciplina_tem_historico` :991).
- **Testes:** `test_matricula_avaliacao_exclusao.py::test_excluir_disciplina_protege_historico_e_sem_historico_204`, `::test_excluir_aluno_protege_qualquer_semestre_e_sem_historico_204`; `test_furos_mapeados.py::test_furo_9_1_excluir_disciplina_com_nota_lancada_nao_apaga_tudo`, `::test_furo_9_2_excluir_aluno_com_nota_lancada_nao_apaga_tudo`.

### 3.14 Assistente de grade com IA

- **O que é:** `POST /ia/grade` (só escola) recebe a conversa (1 a 30 mensagens, texto de 1 a 2000 caracteres, a última do usuário). O servidor manda ao Gemini o contexto do semestre **sem alunos e sem e-mails** e uma instrução de que as respostas só podem usar os quatro blocos 08:00–09:40, 10:00–11:40, 13:30–15:10 e 15:30–17:10, de segunda a sexta. **A IA só propõe; o servidor confere** (blocos, ocupações, choque de professor, turma e sala, sala existente). Se houver recusas, pede uma correção ao mesmo modelo **uma única vez**. Nada é gravado: a escola aplica pelo `PUT /disciplinas/{id}/grade`. Resposta: `{"resposta", "proposta", "recusados"}`.
- **Modelos:** `GEMINI_MODEL` com vários nomes (padrão `gemini-3.8-flash,gemini-3.5-flash`); troca para o próximo só em 503 ou tempo esgotado (20 s por tentativa). A chave vai só no cabeçalho `x-goog-api-key`.
- **Se violar:** sem chave, `503` `"O assistente não está configurado neste servidor."`; limite de uso, `429` `"O assistente atingiu o limite de uso. Tente de novo em alguns minutos."`; rede, tempo, outro status ou JSON inválido, `502` `"Não consegui falar com o assistente. Tente de novo."`; sem semestre ativo, `409` `"Não há semestre ativo."`; professor ou aluno, `403`.
- **Onde:** `routers/ia.py` (`sugerir_grade` :18), `gemini.py` (`gerar` :25), `regras.conferir_proposta` (:212), `regras.sem_emails` (:282).
- **Testes:** `test_ia_grade.py::test_assistente_permissoes`, `::test_assistente_sem_chave`, `::test_assistente_mapeia_excecoes`, `::test_assistente_recusa_inteira_e_pede_correcao_uma_vez`, `::test_assistente_saida_malformada_da_502`, `::test_gemini_tenta_segundo_so_em_sobrecarga_ou_tempo`, `::test_gemini_mapeia_erros_sem_expor_chave`.

## 4. Código para mostrar na apresentação

Oito trechos reais, colados do arquivo (conferi linha a linha). Cada um tem: o que dizer em 3 frases, o que apontar com o mouse e a pergunta provável. A ordem segue o caminho da requisição: front, rota, login, regra, cálculo, modelo, banco.

**Ordem de abrir os arquivos no editor** (abra as 8 abas antes, na ordem, e use Ctrl+G para ir à linha):

| Ordem | Arquivo | Linhas | Assunto |
|---|---|---|---|
| 1 | `gestao-alunos-frontend-u4/src/portal/rede.ts` | 8-30 | o front pede |
| 2 | `gestao-alunos-orm/routers/avaliacoes.py` | 104-116 | a rota |
| 3 | `gestao-alunos-orm/auth.py` | 22-34 | senha e token |
| 4 | `gestao-alunos-orm/regras.py` | 92-104 | regra de choque |
| 5 | `gestao-alunos-orm/notas_calc.py` | 38-59 | cálculo da média |
| 6 | `gestao-alunos-orm/models.py` | 30-42 | a classe |
| 7 | `gestao-alunos-orm/db.py` | 524-535 | função do ORM |
| 8 | `gestao-alunos-orm/db.py` | 710-727 | matrícula automática |

### Trecho 1: o front pede (`rede.ts:8-30`)

```typescript
async function pedir<T = any>(caminho: string, corpo?: object, metodo = corpo ? 'POST' : 'GET'): Promise<T> {
  const token = lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(baseURL + caminho, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(caminho !== '/auth/login' && token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
  } catch { throw { status: 0, detalhe: 'Não foi possível falar com o servidor.' }; }
  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json();
  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== '/auth/login' && caminho !== '/auth/trocar-senha') {
      apagarToken(); expirou?.();
    }
    throw { status: resposta.status, detalhe: Array.isArray(dados.detail) ? dados.detail.map((e: { msg: string }) => e.msg).join('; ') : dados.detail };
  }
  return dados;
}
```

- **Fala:** "Todo pedido do front passa por esta função. Ela lê o token guardado no navegador e o manda no cabeçalho `Authorization: Bearer`, menos no login. Se der erro, ela devolve o status e a mensagem do servidor, e se for 401 apaga o token e manda a pessoa entrar de novo."
- **Aponte:** a linha 16 (o `Bearer`), a 21 (resposta 204 sem corpo), as 24 a 26 (401 limpa a sessão) e a 27 (o `detail` do servidor vira a mensagem da tela).
- **Pergunta provável:** "Onde fica o token?" Resposta: no `localStorage` do navegador (chave `portal.token`). É simples, mas qualquer script malicioso na página poderia lê-lo; a alternativa é um cookie `httpOnly`.

### Trecho 2: a rota (`routers/avaliacoes.py:104-116`)

```python
@router.put("/avaliacoes/{avaliacao_id}/notas/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=professor)
def lancar_nota(avaliacao_id: int, aluno_id: int, dados: NotaEntrada, usuario=Depends(auth.exige_equipe)):
    avaliacao = db.buscar_avaliacao(avaliacao_id)
    if avaliacao is None:
        raise _nao_encontrado("Avaliação não encontrada")
    auth.exigir_professor_da_disciplina(avaliacao["disciplina_id"], usuario)
    exigir_semestre_aberto(avaliacao["disciplina_id"])
    exigir_periodo_aberto(avaliacao)
    if db.buscar_aluno(aluno_id) is None:
        raise _nao_encontrado("Aluno não encontrado")
    if not db.aluno_matriculado(aluno_id, avaliacao["disciplina_id"]):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="O aluno não está matriculado nessa disciplina")
    db.lancar_nota(avaliacao_id, aluno_id, dados.valor)
```

- **Fala:** "Esta rota é fina: não calcula nada. Primeiro garante quem pode (`exige_equipe` e depois o professor daquela disciplina), depois confere as regras (semestre aberto, período aberto, aluno matriculado) e só então chama o banco. O corpo é validado pelo schema `NotaEntrada`, que só aceita nota de 0 a 10."
- **Aponte:** `dependencies=professor` e `dados: NotaEntrada` na primeira linha; as três chamadas `exigir_*`; `db.lancar_nota` no fim.
- **Pergunta provável:** "E se mandarem nota 11?" Resposta: 422 antes de a função rodar. "E se for aluno?" 403 em `exige_equipe`. "E de outro professor?" 403 em `exigir_professor_da_disciplina`.

### Trecho 3: senha e token (`auth.py:22-34`)

```python
def gerar_hash(senha):
    return bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()


def senha_confere(senha, senha_hash):
    if len(senha.encode()) > 72:
        return False
    return bcrypt.checkpw(senha.encode(), senha_hash.encode())


def criar_token(usuario):
    validade = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=8)
    return jwt.encode({"sub": str(usuario["id"]), "exp": validade}, os.environ["SECRET_KEY"], algorithm="HS256")
```

- **Fala:** "A senha nunca é guardada: guardamos o hash do bcrypt, que mistura um sal aleatório e é lento de propósito. No login comparamos com `checkpw`. Depois o servidor assina um token JWT com a `SECRET_KEY`, carregando só o id do usuário e a validade de 8 horas."
- **Aponte:** `bcrypt.gensalt()` (linha 23), o limite de 72 bytes (27), `timedelta(hours=8)` (33) e `algorithm="HS256"` (34).
- **Pergunta provável:** "Por que 72 bytes?" Resposta: o bcrypt só considera os 72 primeiros bytes; a API recusa senha maior em vez de cortar em silêncio.

### Trecho 4: a regra de choque, sem banco (`regras.py:92-104`)

```python
def se_sobrepoem(a, b):
    # Horários chegam em HH:MM; encostar no início ou no fim não é choque.
    return a["hora_inicio"] < b["hora_fim"] and b["hora_inicio"] < a["hora_fim"]


def choque_do_aluno(grade, outras_grades, nome):
    for item in grade:
        for outra in outras_grades:
            if item["dia_semana"] == outra["dia_semana"] and se_sobrepoem(item, outra):
                dia = DIAS[outra["dia_semana"] - 1]
                return (f"{nome} já está em {outra['disciplina_nome']} neste horário "
                        f"({dia}, {outra['hora_inicio']}–{outra['hora_fim']}).")
    return None
```

- **Fala:** "Esta é a regra de choque, sem banco nenhum. Dois horários se sobrepõem quando um começa antes de o outro terminar e vice-versa, por isso encostar não é choque. A função recebe dicionários e devolve o texto do erro, ou `None`; quem vira 409 é a rota."
- **Aponte:** o `<` (e não `<=`) na linha 94, o `DIAS[...]` na 101 e o `return None` no fim.
- **Pergunta provável:** "Por que a regra não busca no banco?" Resposta: para testar sem PostgreSQL e reaproveitar. "09:40 com 09:40 choca?" Não.

### Trecho 5: o cálculo da média (`notas_calc.py:38-59`)

```python
    rec = None
    if regra["recuperacao"]["ativo"]:
        rec = next((
            nota(aval, notas, so_publicadas) for aval in avaliacoes
            if aval["periodo_id"] == periodo_id and aval["tipo"] == "recuperacao"
        ), None)

    if rec is not None and regra["recuperacao"]["modo"] == "menor":
        menor = min(range(len(pares)), key=lambda i: pares[i][1])
        peso, valor = pares[menor]
        if rec > valor:
            pares[menor] = (peso, rec)

    soma = 0.0
    pesos = 0.0
    for peso, valor in pares:
        soma += peso * valor
        pesos += peso
    m = soma / pesos
    if rec is not None and regra["recuperacao"]["modo"] == "media" and rec > m:
        m = rec
    return {"m": arred(m, regra["arred"]), "parcial": len(pares) < len(do_periodo), "rec": rec is not None}
```

- **Fala:** "Aqui está a recuperação. No modo `menor`, se a nota de recuperação é maior que a menor nota do período, ela entra no lugar dessa nota, com o mesmo peso. Depois é média ponderada só das notas lançadas. No modo `media`, a recuperação só vale se superar a média, e o resultado é arredondado pela regra da escola."
- **Aponte:** o `min(range(...))` (linha 46), `if rec > valor` (48), a divisão `soma / pesos` (56) e o modo `media` (57 e 58).
- **Pergunta provável:** "E se não houver nenhuma nota no período?" Resposta: as linhas 35 e 36, logo acima, devolvem `None`, e o período não entra na média do ano.

### Trecho 6: a classe (`models.py:30-42`)

```python
class Semestre(Base):
    __tablename__ = "semestres"
    __table_args__ = (
        CheckConstraint("fim > inicio"),
        Index("semestres_unico_ativo", text("(true)"), unique=True,
              postgresql_where=text("encerrado_em IS NULL")),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(40))
    inicio: Mapped[date] = mapped_column(Date)
    fim: Mapped[date] = mapped_column(Date)
    encerrado_em: Mapped[datetime | None] = mapped_column(DateTime)
```

- **Fala:** "Cada tabela é uma classe: `Semestre` tem id, nome, datas e `encerrado_em`. As regras do banco também estão aqui: o fim tem que ser depois do início, e só pode existir um semestre ativo, por causa deste índice único parcial. O modelo descreve a tabela; quem cria a tabela é o `criar_tabelas()`."
- **Aponte:** `__tablename__`, o `CheckConstraint`, o `Index(..., unique=True, postgresql_where=...)` e os `Mapped[...]`.
- **Pergunta provável:** "Por que não usa `create_all`?" Resposta: as tabelas e migrações saem do `criar_tabelas()`, em SQL idempotente; o modelo é um espelho e o teste `test_modelos_correspondem_ao_banco_criado` garante que os dois não divergem. CONFERIR: se essa foi a razão original da escolha.

### Trecho 7: duas funções com ORM (`db.py:524-535`)

```python
def inserir_semestre(nome, inicio, fim):
    with sessao() as s:
        semestre = Semestre(nome=nome, inicio=inicio, fim=fim)
        s.add(semestre)
        s.flush()
        s.refresh(semestre)
        return _dict_modelo(semestre)


def semestre_ativo():
    with sessao() as s:
        return _dict_modelo(s.scalars(select(Semestre).where(Semestre.encerrado_em.is_(None))).first())
```

- **Fala:** "Estas são duas funções do ORM. `inserir_semestre` cria um objeto `Semestre`, manda salvar e devolve como dicionário. `semestre_ativo` faz um `select` onde `encerrado_em` é nulo. Cada uma abre a sessão com `with sessao()`, que confirma no fim e desfaz se der erro."
- **Aponte:** `s.add`, `s.flush()`, `select(Semestre).where(...)` e `_dict_modelo`.
- **Pergunta provável:** "Qual a diferença para escrever SQL?" Resposta: a seção 1.2 (o mesmo código nos dois estilos, lado a lado).

### Trecho 8: a matrícula automática (`db.py:710-727`)

```python
def inserir_aluno(nome, idade, matricula, media=0, email=None, senha_hash=None, turma_id=None):
    from sqlalchemy import literal

    with sessao() as s:
        aluno_id = s.scalar(
            insert(Aluno).values(nome=nome, idade=idade, matricula=matricula, media=0, turma_id=turma_id)
            .returning(Aluno.id)
        )
        aluno = _dict_linha(s.execute(
            select(*Aluno.__table__.columns, Turma.nome.label("turma_nome"))
            .outerjoin(Turma, Turma.id == Aluno.turma_id).where(Aluno.id == aluno_id)
        ).mappings().first())
        # R1: aluno novo ainda nao tem notas; media recebida e ignorada.
        if turma_id is not None:
            s.execute(pg_insert(Matricula).from_select(
                ["aluno_id", "disciplina_id"],
                select(literal(aluno["id"]), Disciplina.id)
                .join(Semestre, Semestre.id == Disciplina.semestre_id)
```

- **Fala:** "Esta é a matrícula automática. Ao criar o aluno com turma, a mesma transação insere uma matrícula para cada disciplina daquela turma no semestre ativo. É um `INSERT ... SELECT`: o banco faz o laço sozinho, e o `ON CONFLICT DO NOTHING` evita duplicar. Se qualquer passo falhar, nada é gravado."
- **Aponte:** `Disciplina.turma_id == turma_id`, `Semestre.encerrado_em.is_(None)`, `.on_conflict_do_nothing()` e o comentário `R1`.
- **Pergunta provável:** "E se eu trocar a aluna de turma?" Resposta: é a R2, em `atualizar_aluno` (`db.py:797`): matricula nas disciplinas da nova turma e só tira das antigas as que não têm nota nem presença; as com histórico ficam e voltam em `matriculas_mantidas`.

## 5. Swagger

### 5.1 Rotas por tag (78 rotas, contadas nos decoradores)

Quem pode: **E** escola, **P** professor, **A** aluno, **L** qualquer perfil logado, **—** sem login. "P*" = só nas disciplinas dele. Nas rotas de aluno, P vê só alunos das suas disciplinas e A só o próprio. As rotas de alunos e disciplinas não têm tag em `main.py`: aparecem no grupo **default**.

| Tag | Método e caminho | Quem | O que faz |
|---|---|---|---|
| default | `GET /` | — | mensagem de boas-vindas (a API está no ar) |
| default | `POST /alunos` | E | cria aluno; com `email` cria o login provisório; com `turma_id` aplica a R1 |
| default | `GET /alunos` | E, P | lista paginada (`q`, `pagina`, `tamanho`) |
| default | `GET /alunos/{aluno_id}` | E, P, A | um aluno |
| default | `PATCH /alunos/{aluno_id}` | E | altera dados, e-mail (cria ou troca o acesso) e turma (R2) |
| default | `DELETE /alunos/{aluno_id}` | E | exclui se não tiver histórico |
| default | `POST /alunos/{aluno_id}/redefinir-senha` | E | nova senha provisória |
| default | `POST /disciplinas` | E | cria disciplina (R3 se tiver turma) |
| default | `GET /disciplinas` | L | lista paginada, recortada pelo perfil |
| default | `PATCH /disciplinas/{id}` | E | altera nome, carga, professor, turma (R4) e sala; confere choque |
| default | `DELETE /disciplinas/{id}` | E | exclui se não tiver histórico |
| default | `GET /disciplinas/{id}/alunos` | E, P* | alunos da disciplina |
| default | `POST` e `DELETE /alunos/{aluno_id}/matricular/{disciplina_id}` | E | matricula (confere choque do aluno) e desmatricula (se não tiver histórico) |
| default | `GET /alunos/{aluno_id}/disciplinas` | E, P, A | disciplinas do aluno |
| auth | `POST /auth/login` | — | devolve o token JWT |
| auth | `GET /auth/me` | L | quem sou eu |
| auth | `POST /auth/trocar-senha` | L | troca a própria senha |
| auth | `POST /usuarios` | E | cria usuário de qualquer perfil |
| regra de avaliação | `GET /regra-avaliacao` | L | lê a regra da escola |
| regra de avaliação | `PUT /regra-avaliacao` | E | grava a regra (valida e sincroniza as avaliações) |
| semestres | `POST /semestres`, `GET /semestres` | E | cria e lista |
| semestres | `GET /semestres/atual` | L | o semestre ativo |
| semestres | `POST /semestres/{id}/encerrar` | E | encerra (vira só leitura) |
| semestres | `GET /semestres/{id}/resumo` | E | alunos, médias e aprovados por disciplina |
| semestres | `PUT /disciplinas/{id}/grade` | E | grava a grade e gera as aulas |
| semestres | `GET /disciplinas/{id}/grade` | E, P*, A (matriculado) | lê a grade |
| professores | `POST /professores`, `GET /professores` | E | cria (senha provisória) e lista |
| professores | `GET /professores/{id}/ocupacoes` | E, P (o próprio) | horários ocupados |
| professores | `PUT /professores/{id}/ocupacoes` | E | troca a lista inteira de ocupações |
| professores | `POST /professores/{id}/redefinir-senha` | E | nova senha provisória |
| turmas e salas | `GET /turmas`, `GET /salas` | L | listas por nome |
| turmas e salas | `POST /turmas`, `POST /salas` | E | cria (409 se o nome repetir) |
| agenda | `GET /agenda?data=` | E, P* | aulas do dia |
| agenda | `GET /agenda/mes?mes=AAAA-MM` | E, P* | dias do mês com aula |
| agenda | `POST /disciplinas/{id}/aulas` | E, P* | aula extra direta (mesmas conferências do pedido) |
| agenda | `PATCH /aulas/{id}` | E, P* | cancelar, reativar, remarcar |
| frequencia | `PUT /disciplinas/{id}/chamada` | E, P* | grava a chamada do dia |
| frequencia | `GET /disciplinas/{id}/chamada?data=` | E, P* | lê a chamada do dia |
| frequencia | `GET /disciplinas/{id}/aulas` | E, P* | aulas da disciplina |
| frequencia | `GET /disciplinas/{id}/frequencia` e `.csv` | E, P* | frequência da turma (e CSV) |
| frequencia | `GET /alunos/{aluno_id}/frequencia` | E, P, A | frequência do aluno por disciplina |
| notas | `POST` e `GET /disciplinas/{id}/avaliacoes` | E, P* (GET também A) | cria atividade extra; lista (aluno só as publicadas) |
| notas | `POST /disciplinas/{id}/avaliacoes/publicar` | E, P* | publica as avaliações com nota |
| notas | `PATCH` e `DELETE /avaliacoes/{id}` | E, P* | altera publicada, prazo, nome da extra; exclui extra sem nota |
| notas | `PUT` e `DELETE /avaliacoes/{id}/notas/{aluno_id}` | E, P* | lança e apaga nota |
| notas | `POST` e `DELETE /disciplinas/{id}/conselho/{aluno_id}` | E | aprova pelo conselho e desfaz |
| notas | `GET /alunos/{aluno_id}/boletim` e `.csv` | E, P, A | boletim com média e situação (e CSV) |
| notas | `GET /avaliacoes/pendentes` | E, P* | avaliações de período aberto com nota faltando |
| dashboard | `GET /alunos/{aluno_id}/situacao` | E, P, A | média geral, frequência geral e aprovado |
| dashboard | `GET /dashboard` | E, P* | painel: ranking e alunos em risco |
| avisos | `GET /avisos` | L | lista paginada, recortada pelo perfil |
| avisos | `POST /avisos` | E (geral ou de disciplina), P* (só de disciplina) | cria aviso |
| avisos | `PATCH` e `DELETE /avisos/{id}` | E; P (só os seus) | altera e exclui |
| eventos | `GET /eventos?de=&ate=` | L | calendário recortado pelo perfil |
| eventos | `POST /eventos`, `PATCH` e `DELETE /eventos/{id}` | E | cria, edita, apaga |
| pedidos de aula | `GET /pedidos` | L | E vê todos, P os seus, A só os aprovados das suas disciplinas |
| pedidos de aula | `POST /pedidos` | P* | pede aula extra |
| pedidos de aula | `POST /pedidos/{id}/aprovar`, `/recusar`, `/sugerir` | E | responde o pedido |
| pedidos de aula | `POST /pedidos/{id}/aceitar-sugestao`, `/recusar-sugestao` | P (dono) | responde à sugestão |
| portal | `GET /portal/estado` | L | tudo que o front precisa, recortado pelo perfil |
| assistente | `POST /ia/grade` | E | proposta de grade pela IA (não grava) |

### 5.2 Roteiro de demonstração em 10 passos

**Antes de começar**
- Seed fresco (`python seed.py --apagar-tudo`). Pela ordem de inserção, os ids são: Python 1, Banco de Dados 2, Algoritmos 3, Redes 4; Ana 1, Bruno 2, Carla 3, Diego 4, Eva 5, Fabio 6; Carlos (usuário) 2. **CONFERIR** com `GET /disciplinas` e `GET /alunos` antes de usar. Datas nos exemplos: seed rodado em 08/10/2026.
- Abra **duas abas** do `/docs`: a aba A para escola e depois Carlos; a aba B, anônima, já autorizada com o token da Ana (passo 10).
- Cada caixa do Swagger é independente: só atualiza com **Try it out** e **Execute** naquela caixa. Em **Authorize**, cole **só o token, sem a palavra Bearer**. O token vale 8 horas.
- Reordenei o 403 para depois do 409 e do 422 para trocar de usuário só uma vez (409 e 422 usam a escola; 403 e a nota usam o Carlos).

**Passo 1. Abrir `/docs`.** Aponte os grupos (tags) e abra uma rota para mostrar entrada e saída. Fala: "Esta documentação é gerada do próprio código: cada rota mostra o que entra e o que sai."

**Passo 2. O 401 sem token.** `GET /portal/estado` → Try it out → Execute, sem autorizar. Resposta: `401`

```json
{"detail": "Não autenticado"}
```

**Passo 3. Login e Authorize.** `POST /auth/login`, corpo:

```json
{"email": "escola@escola.com", "senha": "escola123"}
```

Resposta `200`:

```json
{"access_token": "eyJhbGciOiJIUzI1NiIs...", "token_type": "bearer", "perfil": "escola", "aluno_id": null}
```

Copie só o valor de `access_token` → botão **Authorize** → cole → Authorize → Close. Fala: "Agora o token vai em todas as chamadas feitas aqui."

**Passo 4. O estado do portal.** `GET /portal/estado` (Execute de novo). Resposta `200` com as chaves `usuario`, `semestre`, `regra`, `conselho`, `semestres_encerrados`, `professores`, `alunos`, `disciplinas`, `matriculas`, `avaliacoes`, `notas`, `aulas`, `avisos`, `metricas`, `turmas`, `salas`, `eventos`, `pedidos`. No seed fresco, para a escola (contado em `seed.py`): 6 alunos, 4 disciplinas, 2 professores, 3 turmas, 4 salas, 28 avaliações (7 por disciplina), 23 eventos, 4 avisos, 3 pedidos e `conselho` = `[{"aluno_id": 3, "disciplina_id": 1}]` (Carla em Python). Fala: "Uma chamada traz tudo o que a tela precisa, já recortado pelo perfil."

**Passo 5. Uma leitura: a regra.** `GET /regra-avaliacao` → `200` (datas de um seed rodado em 08/10/2026; os números saem como `1.0` e `6.0` porque o schema usa `float`):

```json
{"tipo": "Semestre",
 "periodos": [{"id": "p1", "nome": "1º semestre", "inicio": "2026-08-06", "fim": "2026-10-11", "fechado": false},
              {"id": "p2", "nome": "2º semestre", "inicio": "2026-10-12", "fim": "2026-12-17", "fechado": false}],
 "itens": [{"id": "i1", "nome": "P1", "tipo": "Prova", "peso": 1.0}, {"id": "i2", "nome": "P2", "tipo": "Prova", "peso": 1.0}],
 "extras": {"permitido": true, "max": 2, "peso": 1.0}, "participacao": {"ativo": false, "peso": 1.0},
 "recuperacao": {"ativo": true, "modo": "menor"}, "final": {"ativo": true},
 "arred": "0,1", "mediaMin": 6.0, "freqMin": 75.0, "conselho": true}
```

**Passo 6. Uma escrita com sucesso.** `POST /avisos`, corpo:

```json
{"titulo": "Aviso da apresentação", "mensagem": "Teste feito pelo Swagger.", "data": "2026-10-08"}
```

Resposta `201` (o `id` é 5 no seed fresco, que já tem 4 avisos):

```json
{"titulo": "Aviso da apresentação", "mensagem": "Teste feito pelo Swagger.", "data": "2026-10-08", "disciplina_id": null, "id": 5, "disciplina_nome": null, "autor_nome": "Secretaria"}
```

Para desfazer: `DELETE /avisos/5` → `204`. Fala: "O aviso geral aparece para todos os perfis."

**Passo 7. Um 409: choque de horário.** (ainda com a escola) `PUT /disciplinas/1/grade`, corpo (terça 10:00–11:40 é o horário do Banco de Dados, do mesmo professor):

```json
{"itens": [{"dia_semana": 2, "hora_inicio": "10:00", "hora_fim": "11:40"}]}
```

Resposta `409` (e nada é gravado: o `GET /disciplinas/1/grade` continua com terça e quinta, 08:00–09:40):

```json
{"detail": "Prof. Carlos já dá Banco de Dados neste horário (terça, 10:00–11:40)."}
```

Alternativa de 409, a exclusão protegida: `DELETE /disciplinas/1` → `{"detail": "A disciplina tem notas ou chamadas lançadas e não pode ser excluída."}`. Fala: "O servidor recusa e não grava nada pela metade."

**Passo 8. Um 422: corpo inválido.** (ainda com a escola) `PUT /avaliacoes/5/notas/1`, corpo:

```json
{"valor": 11}
```

Resposta `422` (medido com o schema real; o formato é o padrão do FastAPI, uma lista em `detail`):

```json
{"detail": [{"type": "less_than_equal", "loc": ["body", "valor"], "msg": "Input should be less than or equal to 10", "input": 11, "ctx": {"le": 10.0}}]}
```

Fala: "Quem barra é o schema (`NotaEntrada`), antes de qualquer regra rodar."

**Passo 9. Um 403: professor na rota da escola.** Authorize → **Logout** → `POST /auth/login` com `{"email": "prof@escola.com", "senha": "escola123"}` → autorize com o novo token. Depois `POST /semestres`, corpo:

```json
{"nome": "2027.1", "inicio": "2027-02-01", "fim": "2027-07-01"}
```

Resposta `403`:

```json
{"detail": "Sem permissão"}
```

Opcional: `PUT /avaliacoes/15/notas/4` com `{"valor": 7}` (avaliação de Algoritmos, da Marta; CONFERIR o id) → `403` `{"detail": "Sem permissão para esta disciplina"}`. Fala: "O mesmo servidor, com outro token, barra. Criar semestre é da escola."

**Passo 10. O fluxo de nota (professor lança, aluna vê).** Ainda com o Carlos, na aba A:
1. `GET /disciplinas/1/avaliacoes` → `200`, 7 itens. A lista vem ordenada por período, então a "Prova final" (`periodo_id` `final`) aparece primeiro. Procure a **P2 do 2º semestre** (`periodo_id` `p2`, `item_id` `i2`): no seed fresco é o `id` 5, com `"publicada": false` e `prazo` de hoje mais 14 dias (`"2026-10-22"`). CONFERIR o id.
2. `PUT /avaliacoes/5/notas/1`, corpo `{"valor": 5}` → `204` (sem corpo). A Ana tinha 9,0 nessa prova.
3. `GET /alunos/1/boletim` (Carlos): Python com a nota nova e a média recalculada. A escola e o professor veem rascunho.

```json
{"disciplina": {"id": 1, "nome": "Python", "carga_horaria": 40}, "notas": ["... 7 itens, a P2 do 2º semestre com valor 5.0 ..."], "media": 8.0, "parcial": false, "situacao": "Na média"}
```

   Conta: período 1 = (9,5 + 8,5) ÷ 2 = 9,0; período 2 = (9,0 + 5,0) ÷ 2 = 7,0; ano = (9,0 + 7,0) ÷ 2 = 8,0.
4. **Aba B (Ana):** `GET /alunos/1/boletim` → ela ainda **não vê** a P2 em rascunho: `"media": 9.0`, `"parcial": true`, `"situacao": "Na média"` (só o 1º semestre conta).
5. Volte à aba A: `POST /disciplinas/1/avaliacoes/publicar`, corpo `{"periodo_id": "p2"}` → `200`

```json
{"publicadas": 2}
```

   (a P1 e a P2 do 2º semestre, que têm nota; a recuperação do 2º semestre já nasce publicada).
6. Aba B, de novo `GET /alunos/1/boletim` → agora `"media": 8.0`, `"parcial": false`.

Fala: "A nota do professor só chega à aluna quando ele publica. Antes disso, o servidor nem manda o dado." **Depois do ensaio**, reponha o seed: rode `python seed.py --apagar-tudo` de novo (ou desfaça com `PUT /avaliacoes/5/notas/1` `{"valor": 9}` e `PATCH /avaliacoes/4` e `/avaliacoes/5` com `{"publicada": false}`).

**Se algo falhar:** 401 depois de autorizar = token colado errado ou de outro login (faça o login de novo); `/docs` lento = a API dormia (30 a 60 s); 403 inesperado = o token é de outro perfil; 404 = id diferente do esperado (confira com os GET).

## 6. Perguntas prováveis (com respostas curtas e honestas)

1. **O que é um ORM e por que vocês usaram?** É uma camada que trata tabela como classe e linha como objeto (seção 1.2). Usamos para escrever menos SQL repetido e ter os parâmetros sempre vinculados. O custo é o SQL ficar escondido.
2. **Quando usar SQL puro?** Para criar e migrar tabelas, relatórios com muitas junções e ajuste de desempenho. No projeto, `criar_tabelas()` e os helpers `consultar`/`executar` (usados no seed) são SQL em texto.
3. **Por que FastAPI?** Valida a entrada com Pydantic e gera o Swagger (`/docs`) do próprio código, o que ajuda a testar e a explicar a API.
4. **JWT ou sessão?** Com JWT o servidor não guarda sessão: cada chamada leva o token, que expira em 8 horas. A desvantagem é que não dá para derrubar um token antes de expirar (não há lista de revogação). Com sessão no servidor seria fácil revogar, mas exigiria guardar estado.
5. **Como a senha é guardada?** Só o hash do bcrypt, com sal, na coluna `senha_hash`; a API nunca devolve esse campo (`test_me_nunca_traz_senha_hash`). Senha provisória: 8 caracteres sem letras ambíguas, mostrada uma única vez ao criar ou redefinir.
6. **O que impede um professor de ver dado de outro?** Três camadas: o token identifica o usuário; `exigir_professor_da_disciplina` devolve 403; e as listas já saem filtradas pelo `professor_id` direto no banco. Os testes de `test_perfis.py` provam isso com dois professores.
7. **O que é migração?** Mudar a estrutura do banco sem perder dados. Aqui `criar_tabelas()` usa `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, então pode rodar quantas vezes quiser (`test_criar_tabelas_duas_vezes_preserva_semestre`). Não usamos ferramenta de migração como o Alembic; seria o próximo passo.
8. **Por que testar?** Para mudar o código sem quebrar o que já funcionava. São 453 funções de teste no back, contra um PostgreSQL de teste que é apagado a cada teste, e cada regra tem o caso que falha e o que passa. CONFERIR: rode `python -m pytest -q` antes e diga o resultado real; não afirme "tudo verde" sem rodar.
9. **A regra fica no front ou no back?** No back. O front só mostra e pede; mesmo que alguém chame a API sem o front, o servidor recusa.
10. **Por que o front não fala direto com o banco?** Segurança (o navegador nunca chega ao banco), regras num só lugar e poder trocar ou testar cada lado sozinho.
11. **O que é CORS?** O navegador só deixa um site chamar outra origem se a API permitir. A lista vem da variável `CORS_ORIGINS` (`main.py:44-49`); no `render.yaml` está o endereço do front.
12. **Por que a média fica num módulo puro?** Para o boletim, o painel e o CSV usarem a mesma conta, e para testar sem banco. Um teste do front compara a conta da tela com a do `notas_calc.py`.
13. **Por que não usar o `round()` do Python?** Ele arredonda 6,25 para 6,2; a tela (JavaScript) arredonda para 6,3. O projeto arredonda "meio para cima" nos dois lados (seção 3.12).
14. **O que acontece com o aluno abaixo da média?** A recuperação pode substituir a menor nota do período (ou a média); se o ano ainda ficar abaixo da média mínima e houver nota da prova final, a média final é (ano + final) ÷ 2; sem final, a situação é "Prova final"; a escola ainda pode aprovar pelo conselho.
15. **A IA grava a grade sozinha?** Não. Ela só propõe; o servidor confere blocos, ocupações e choques e a escola aplica pelo caminho normal.
16. **E se a IA cair?** A API responde 503 (sem chave), 429 (limite) ou 502 (falha); a grade continua sendo montada à mão.
17. **A chave do Gemini pode vazar?** Fica só no servidor (variável de ambiente), vai apenas no cabeçalho da chamada e não aparece nas respostas (`test_gemini_mapeia_erros_sem_expor_chave`). Os e-mails e dados de aluno são retirados do que se envia.
18. **E se duas pessoas gravarem ao mesmo tempo?** Há travas pontuais: `SELECT ... FOR UPDATE` (no ORM, `with_for_update`) ao trocar turma, sincronizar avaliações e aprovar pedido, `ON CONFLICT` nos upserts, e `responder_pedido` só muda se o pedido ainda está no status esperado. Não há controle de concorrência geral; o mapa de furos cita que encerrar e gravar nota não são atômicos (item 9.3).
19. **O que é o seed e por que apaga tudo?** É o script que monta o cenário de demonstração (`TRUNCATE` das tabelas e novos dados). Só roda com `--apagar-tudo`. As datas são relativas ao dia em que roda.
20. **Por que 409 e não 400?** 409 é "conflito com o estado atual" (horário ocupado, semestre encerrado, já existe); 422 é formato inválido; 401 é "não sei quem é você"; 403 é "sei, mas não pode"; 404 é "não existe".
21. **Por que Render e Cloudflare? E a API que dorme?** Planos gratuitos. A Render dorme a API sem uso e a primeira chamada leva 30 a 60 s; o banco gratuito da Render expira em 30 dias (a alternativa é a Neon). Por isso se abre o link antes de apresentar.
22. **O que é o conversor do canvas? Por que não escrever o React à mão?** Eu desenho a tela no canvas; o script gera os componentes e o comparador prova que o resultado é igual ao desenho, em desktop e celular. A lógica (rede, regras) é escrita à mão em `Portal.tsx`, `rede.ts` e `adaptador.ts`.
23. **Como evitaram consultas demais (N+1)?** O portal monta o estado em consultas por coleção, e há testes que impedem o número de consultas de crescer com as aulas (`test_consultas_do_estado_nao_crescem_com_aulas_com_chamada`). Honestamente, ainda há uma consulta de boletim e de frequência por aluno em `routers/portal.py`; é um ponto a melhorar.
24. **Quanto do código foi feito com IA?** CONFERIR e responda a verdade. Os documentos do projeto citam o Claude Design (o desenho) e o Codex (partes do back e do front). O que importa: saber explicar cada trecho do bloco 4 e ter conferido os testes.
25. **Quais os limites conhecidos do projeto?** Do mapa de furos de 07/10 (`docs/mapa-furos-logica-escolar.md`) e da leitura do código:
    - **Aprovação por disciplina:** o painel, o resumo do semestre e "em risco" usam média geral e frequência geral e **ignoram o conselho** (a Carla aparece em risco e aprovada pelo conselho em Python). O boletim já tem situação por disciplina.
    - **Frequência por encontros**, não por horas.
    - **Feriado vale para todas as turmas** no back; não existe feriado por turma. CONFERIR: o front tem uma regra visual por turma (`e2e/gradeagenda.test.mjs`).
    - **Matrícula sem data de entrada e saída:** entrada tardia gera faltas retroativas e transferência no meio do semestre não existe.
    - **Semestre:** não tem edição (`PATCH`), não copia o anterior (o novo nasce vazio), e o encerramento não trata pedidos pendentes nem aulas futuras.
    - **Professor** não marca a própria prova nem informa os próprios horários ocupados (só a escola grava).
    - **Sem histórico de alterações:** nota ou presença corrigida substitui o valor, sem registro de quem e quando.
    - **Sem capacidade** de sala ou turma.
    - **"Hoje" vem do relógio do servidor** (`date.today()`), em UTC na Render: depois das 21h no Brasil já é "amanhã" (item 5.6 do mapa; CONFERIR se foi tratado).
    - Os eventos "bimestre" do calendário são independentes dos períodos da regra de avaliação.
    - **Já resolvido no update 4:** média mínima e frequência mínima configuráveis (antes fixas em 6 e 75), recuperação e períodos entram no resultado, avaliação editável, pendências por nota faltante.
26. **O que faria com mais tempo?** Aprovação por disciplina (e o painel respeitando o conselho), frequência por horas, feriado por turma, data de entrada e saída na matrícula, histórico de alterações de nota, migrações com Alembic, e reduzir as consultas por aluno no portal.

## 7. Glossário e checklist

### 7.1 Glossário (30 termos)

| # | Termo | Em uma frase |
|---|---|---|
| 1 | API | Conjunto de rotas pelas quais um programa conversa com outro |
| 2 | Rota (endpoint) | Um endereço da API com um método, como `GET /alunos` |
| 3 | HTTP e método | O protocolo da web; GET lê, POST cria, PUT substitui, PATCH altera em parte, DELETE apaga |
| 4 | Status code | Número da resposta: 200 deu certo, 201 criado, 204 sem corpo, 401, 403, 404, 409, 422 |
| 5 | JSON | Texto estruturado em chaves e valores que o front e a API trocam |
| 6 | Swagger (OpenAPI) | Página `/docs` gerada pelo código para ler e testar as rotas |
| 7 | Token | Texto que prova quem é você nas chamadas seguintes ao login |
| 8 | JWT | Token assinado com a `SECRET_KEY`, com id e validade, que o servidor confere sem guardar sessão |
| 9 | Bearer | Forma de mandar o token: cabeçalho `Authorization: Bearer <token>` |
| 10 | Hash e sal (bcrypt) | Embaralhamento sem volta da senha, com um tempero aleatório e lento de propósito |
| 11 | Autenticação | Descobrir quem é você (login) |
| 12 | Autorização | Decidir o que você pode fazer (perfil) |
| 13 | Perfil | Escola, professor ou aluno |
| 14 | Schema (Pydantic) | Molde do JSON de entrada ou saída, com tipos e limites |
| 15 | Validação | Conferir se o dado cabe no molde; se não, 422 |
| 16 | Dependência (`Depends`) | Função que o FastAPI roda antes da rota, como a conferência de login |
| 17 | CORS | Permissão para o site de um endereço chamar a API de outro |
| 18 | ORM | Camada que trata tabela como classe e linha como objeto |
| 19 | Session | O "balcão" do ORM: abre a conversa com o banco, junta as mudanças e confirma no fim |
| 20 | Transação | Grupo de comandos que ou valem todos (`commit`) ou nenhum (`rollback`) |
| 21 | Chave estrangeira | Coluna que aponta para a linha de outra tabela |
| 22 | Cascata (`ON DELETE CASCADE`) | Apagar o pai apaga os dependentes |
| 23 | Índice único parcial | Regra de unicidade só para algumas linhas, como "um só semestre ativo" |
| 24 | Idempotente | Pode repetir sem mudar o resultado (`ON CONFLICT DO NOTHING`, `IF NOT EXISTS`) |
| 25 | Migração | Mudar a estrutura do banco sem perder os dados |
| 26 | Seed | Script que apaga e recria os dados de demonstração |
| 27 | Upsert | Inserir, ou atualizar se já existir (a nota usa `ON CONFLICT DO UPDATE`) |
| 28 | N+1 | Fazer uma consulta por item de uma lista em vez de uma consulta só |
| 29 | Pool de conexões | Conjunto de conexões abertas com o banco, reaproveitadas pelas requisições |
| 30 | SPA | Aplicação de uma página só: o React troca as telas sem recarregar o site |

### 7.2 Checklist de 15 minutos antes de apresentar

- [ ] **API acordada:** abra `<link da API>/` e veja `{"mensagem": "API de Gestão de Alunos. Veja /docs para os endpoints."}`. Na Render gratuita a primeira chamada leva 30 a 60 s. CONFERIR: o link de produção da API (o README ainda diz "A PREENCHER depois do deploy").
- [ ] **Front apontando para ela:** `VITE_API_URL` do build sem barra no final; `CORS_ORIGINS` da API inclui o endereço do front.
- [ ] **Seed fresco** (apaga tudo, não rode no meio da apresentação): `python seed.py --apagar-tudo` com a `DATABASE_URL` certa. Deixe `SEED_SENHA` sem definir (senha `escola123`). `SECRET_KEY` precisa estar definida na API, ou o login quebra.
- [ ] **Contas:** entre com `escola@escola.com`, `prof@escola.com`, `ana@escola.com` (e `marta@escola.com` se perguntarem). O token vale 8 h.
- [ ] **Abas abertas:** front no login; `/docs` na aba A (escola) e aba anônima B com o token da Ana; o editor com os 8 arquivos na ordem da seção 4; este documento; o terminal com o `pytest` pronto (opcional).
- [ ] **Ids conferidos no Swagger:** `GET /disciplinas` (Python = 1), `GET /alunos` (Ana = 1), `GET /disciplinas/1/avaliacoes` (P2 do 2º semestre = 5).
- [ ] **Teste de fumaça:** os passos 2, 3 e 6 do Swagger funcionam; o assistente de grade responde 503 se não houver `GEMINI_API_KEY` (CONFERIR se a produção tem a chave).
- [ ] **Tela:** zoom do navegador e do editor em 125% a 150%; feche notificações.
- [ ] **Plano B se a internet cair:** rode tudo local como no README: PostgreSQL local (Docker) com o banco `gestao_dev`, `DATABASE_URL`, `SECRET_KEY` e `CORS_ORIGINS` no ambiente, `python -m uvicorn main:app --reload`, `python seed.py --apagar-tudo` e, no front, `VITE_API_URL=http://localhost:8000 npm run dev`. **Cuidado com `docker compose up`:** o `Dockerfile` copia só `auth.py db.py gemini.py main.py regras.py schemas.py seed.py` e `routers/`; não inclui `notas_calc.py`, que o `regras.py` importa (e, no ramo ORM, nem `models.py`). Pelo que li o contêiner não subiria; CONFERIR com um `docker compose build` antes de depender dele. A Render não usa o Dockerfile (o `render.yaml` roda `pip install` e `uvicorn` direto). Último recurso: grave um vídeo curto da demonstração antes (CONFERIR) e mostre este documento.
- [ ] **Plano B se o ORM não entrar:** use o Apêndice A.
- [ ] **Depois do ensaio:** rode o seed de novo (o passo 10 do Swagger altera notas e publicações).

## Apêndice A. Plano B sem ORM (back em SQL puro)

Use se o ORM não entrar na versão que vai ao ar. Fonte: `C:\Users\Administrator\Documents\gestao-alunos-u4` (ramo `fase11-update4`, HEAD `8d97acf`). O resto do documento (regras, rotas, Swagger, perguntas, glossário) vale igual nos dois casos.

### A.0 Fatos conferidos sobre o Plano B

- `main.py`, `schemas.py`, `auth.py`, `gemini.py`, `notas_calc.py`, `seed.py` e todos os `routers/*.py` são **idênticos** aos do ramo ORM (comparei ignorando o fim de linha). As diferenças de código são: `db.py`, `models.py` (só existe no ORM), `requirements.txt` (o u4 não tem SQLAlchemy) e `regras.py`.
- O `regras.py` do u4 tem 6 linhas a mais (46 a 51, "Legadas sem periodo entram no primeiro periodo apenas para o calculo"). Por isso, em `regras.py`, todo número de linha depois da 46 **sobe 6** no u4 (`se_sobrepoem` fica em :98, `choque_do_aluno` em :103). Nos demais arquivos a numeração é a mesma.
- O u4 tem **452** funções `def test_` em `tests/` (o ORM tem 453; falta `test_modelos_orm.py`).
- **Atenção:** o ramo ORM **não contém** o commit `8d97acf` do u4 ("corrige regressoes do calculo integrado: turma_nome, permissoes do boletim, semestre do estado, CSV, aprovacao e migracao"), que altera `db.py`, `regras.py` e 5 arquivos de teste (verificado com `git merge-base --is-ancestor`). Também faltam lá os commits `2020829` e `cd34968` (o `connect_timeout` de 15 s existe no `db.py` do ORM em `connect_args`). CONFERIR: rode a suíte nos dois ramos antes de decidir.
- O cabeçalho do `db.py` do u4 (linhas 1 a 22) ainda é o do esqueleto do curso ("ESQUELETO, implemente você mesmo"); não leia essa parte em voz alta.
- No u4, o `db.py` usa `psycopg2` direto: `ThreadedConnectionPool` (`db.py:30`, `:88-90`), `conectar()` (`:79-104`) e os helpers `consultar` (`:111`), `executar` (`:121`) e `executar_retornando` (`:132`). Os valores sempre vão como `%s` com uma tupla, nunca concatenados no texto SQL (proteção contra SQL injection). Há 8 travas de linha (`SELECT ... FOR UPDATE`, linhas 724, 905, 1244, 1294, 1355, 1413, 1436 e 1987).

### A.1 O que muda no documento se o ORM não entrar

| Onde | Versão ORM (principal) | Plano B |
|---|---|---|
| Cabeçalho | back com ORM em `gestao-alunos-orm` | back em SQL puro em `gestao-alunos-u4` |
| 0.3, linha Banco | "PostgreSQL 16, SQLAlchemy 2 (ORM) sobre psycopg2" e `models.py`, `db.py` | "PostgreSQL 16 e psycopg2 (SQL puro, sem ORM)" e `db.py` |
| Seção 1, tabela | linha "SQLAlchemy 2 (ORM)"; psycopg2 como driver "por baixo" | apagar a linha do SQLAlchemy; psycopg2 vira a biblioteca com que o `db.py` escreve SQL (`db.py:27`, `:30`, `:79-141`); pytest: 452 funções |
| 1.2 (parágrafo e subseção de ORM) | "ORM: o que é e como aparece neste projeto", com `sessao()` | trocar por "SQL puro e ORM": manter a analogia tabela = classe (para a pergunta "o que é ORM") e a comparação lado a lado, mas dizendo que o projeto usa a primeira coluna; sem `sessao()`, sem `models.py`, sem `test_modelos_orm` |
| 1.3, diagrama | `db.lancar_nota()` (`db.py:1543`) abre a Session do ORM | `db.lancar_nota()` (`db.py:1489`) pega uma conexão do pool com `conectar()`, executa `INSERT ... ON CONFLICT DO UPDATE` com `cursor.execute` e faz `commit` |
| Seção 2, tabela | camada Banco: `db.py`, `models.py` | só `db.py` (não existe `models.py`) |
| Seção 2, "por que separar", item 3 | "Trocar o banco não tocou nas rotas" | "Se um dia migrarmos para ORM, as rotas não mudam: o ramo `fase12-orm` prova isso" |
| Seção 2, armadilhas | só `main.py` e `schemas.py` têm "ESQUELETO" | acrescente `db.py` (linhas 1 a 22) |
| Seção 3 | citações `db.py:linha`, `models.py:34` e `models.py:162` | números da tabela A.2; o índice único parcial está em `db.py:179-182` e o `UNIQUE (disciplina_id, data)` das aulas em `db.py:278`; `regras.py` +6 linhas depois da 46 |
| Seção 4, trecho 4 | `regras.py:92-104` | `regras.py:98-110` |
| Seção 4, trechos 6, 7 e 8 | `models.py:30-42`, `db.py:524-535`, `db.py:710-727` | trechos da seção A.3 (SQL puro) e falas trocadas |
| Seção 6, perguntas 1 e 2 | ORM e SQL puro | respostas da seção A.4; pergunta 8: 452 testes; pergunta 7 e 18: citar `FOR UPDATE` e não `with_for_update` |
| Seção 7 | termos ORM e Session | manter ORM (você pode ser perguntado); troque Session por "Cursor: o objeto que executa um comando SQL e lê o resultado" |
| Seção 5 (Swagger), rotas, regras | igual | igual |

### A.2 Linhas do `db.py`: ORM e u4

| Função | ORM | u4 | Função | ORM | u4 |
|---|---|---|---|---|---|
| `sessao()` / `conectar()` | 135 | 79 | `buscar_regra_avaliacao` | 1237 | 1204 |
| `consultar` | 160 | 111 | `_sincronizar_avaliacoes` | 1281 | 1241 |
| `executar` | 170 | 121 | `gravar_regra_avaliacao` | 1338 | 1290 |
| `executar_retornando` | 181 | 132 | `criar_avaliacao_extra` | 1370 | 1323 |
| `listar_paginado` | 193 | 144 | `publicar_avaliacoes` | 1419 | 1376 |
| `criar_tabelas` | 221 | 155 | `lancar_nota` | 1543 | 1489 |
| `inserir_semestre` | 524 | 458 | `atualizar_aula` | 1705 | 1638 |
| `semestre_ativo` | 533 | 465 | `registrar_chamada` | 1723 | 1654 |
| `encerrar_semestre` | 548 | 477 | `frequencia_da_turma` | 1777 | 1718 |
| `salvar_grade` | 663 | 577 | `linhas_frequencia_aluno` | 1805 | 1737 |
| `inserir_aluno` (R1) | 710 | 634 | `listar_eventos` | 1902 | 1825 |
| `_alunos_com_media` | 736 | 672 | `responder_pedido` | 2093 | 1971 |
| `atualizar_aluno` (R2) | 797 | 719 | `aprovar_pedido` | 2103 | 1982 |
| `historico_do_aluno` | 866 | 790 | `feriados_do_dia` | 2145 | 2034 |
| `inserir_disciplina` (R3) | 897 | 830 | `matricular` | 1055 | 1002 |
| `atualizar_disciplina` (R4) | 953 | 901 | `desmatricular` | 1062 | 1020 |
| `disciplina_tem_historico` | 991 | 942 | `import psycopg2` | 16 | 27 |

### A.3 Trechos de código equivalentes em SQL puro e falas trocadas

**Trecho 6 (no lugar de `models.py:30-42`): a tabela em SQL (`gestao-alunos-u4/db.py:169-182`).** Não existe `models.py`; a "classe" é o `CREATE TABLE`, e a regra do semestre ativo é o índice único parcial logo abaixo.

```python
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS semestres (
            id           SERIAL PRIMARY KEY,
            nome         VARCHAR(40) NOT NULL,
            inicio       DATE NOT NULL,
            fim          DATE NOT NULL CHECK (fim > inicio),
            encerrado_em TIMESTAMP NULL
        )
    """)

    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS semestres_unico_ativo
        ON semestres ((true)) WHERE encerrado_em IS NULL
    """)
```

- **Fala:** "Aqui a tabela é escrita em SQL, dentro de `criar_tabelas()`. O semestre tem id, nome, datas e `encerrado_em`, e o banco já garante que o fim vem depois do início. O índice único parcial garante que só exista um semestre ativo, porque só vale para as linhas em que `encerrado_em` é vazio."
- **Aponte:** o `CHECK (fim > inicio)`, o `WHERE encerrado_em IS NULL` e o `IF NOT EXISTS` (que permite rodar de novo sem quebrar).
- **Pergunta provável:** "E se mudar a tabela depois?" Resposta: acrescentamos `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` no mesmo `criar_tabelas()`, sem apagar dados.

**Trecho 7 (no lugar de `db.py:524-535`): as duas funções em SQL (`gestao-alunos-u4/db.py:458-466`).**

```python
def inserir_semestre(nome, inicio, fim):
    return executar_retornando(
        "INSERT INTO semestres (nome, inicio, fim) VALUES (%s, %s, %s) RETURNING *",
        (nome, inicio, fim),
    )


def semestre_ativo():
    return consultar("SELECT * FROM semestres WHERE encerrado_em IS NULL", um=True)
```

- **Fala:** "Estas duas funções são o SQL escrito à mão. `inserir_semestre` manda um `INSERT` e pede o registro de volta com `RETURNING`. `semestre_ativo` faz um `SELECT` onde `encerrado_em` é nulo. Os valores vão separados do texto, com `%s` e uma tupla, nunca colados na frase."
- **Aponte:** o `%s` com a tupla `(nome, inicio, fim)` e o `RETURNING *`.
- **Pergunta provável:** "Isso é seguro contra SQL injection?" Resposta: sim, porque os dados vão como parâmetros e o driver os trata como valor, nunca como comando. O helper é este:

```python
def consultar(sql, valores=(), um=False):
    conexao = conectar()
    try:
        cursor = conexao.cursor()
        cursor.execute(sql, valores)
        return cursor.fetchone() if um else cursor.fetchall()
    finally:
        conexao.close()
```

**Trecho 8 (no lugar de `db.py:710-727`): a matrícula automática em SQL (`gestao-alunos-u4/db.py:634-656`).**

```python
def inserir_aluno(nome, idade, matricula, media=0, email=None, senha_hash=None, turma_id=None):
    conexao = conectar()
    try:
        cursor = conexao.cursor()
        cursor.execute(
            """
            INSERT INTO alunos (nome, idade, matricula, media, turma_id)
            VALUES (%s, %s, %s, 0, %s)
            RETURNING *, (SELECT nome FROM turmas WHERE id = alunos.turma_id) AS turma_nome
            """,
            (nome, idade, matricula, turma_id),
        )
        aluno = cursor.fetchone()
        # R1: aluno novo ainda nao tem notas; media recebida e ignorada.
        if turma_id is not None:
            cursor.execute("""
                INSERT INTO matriculas (aluno_id, disciplina_id)
                SELECT %s, d.id FROM disciplinas d
                JOIN semestres s ON s.id = d.semestre_id
                WHERE d.turma_id = %s AND s.encerrado_em IS NULL
                ORDER BY d.id
                ON CONFLICT DO NOTHING
            """, (aluno["id"], turma_id))
```

- **Fala:** "Esta é a matrícula automática. A mesma conexão cria o aluno e, se ele tem turma, roda um `INSERT ... SELECT` que cria uma matrícula para cada disciplina daquela turma no semestre ativo. O `ON CONFLICT DO NOTHING` evita duplicar, e só o `commit` no fim grava tudo: se algo falhar, nada fica."
- **Aponte:** o `RETURNING`, o `JOIN semestres` com `encerrado_em IS NULL`, o `ON CONFLICT DO NOTHING` e o comentário `R1`.
- **Pergunta provável:** igual à do ORM (troca de turma, R2 em `atualizar_aluno`, `db.py:719`).

Os trechos 1 a 5 não mudam; só o 4 muda de linha: `regras.py:98-110` no u4.

### A.4 Respostas prontas

**"Por que não usou ORM?" / "Por que SQL puro?"**
> "Usei SQL puro de propósito. Várias consultas do sistema têm muitas junções e travas de linha, como o `SELECT ... FOR UPDATE` ao trocar a turma ou aprovar um pedido, e eu queria controlar exatamente o SQL que vai ao banco. Os valores sempre vão como parâmetros (`%s` e uma tupla), então não há SQL injection. O custo é escrever mais texto repetido."

**Mostre que sabe o que é ORM e a diferença:**
> "Um ORM, como o SQLAlchemy, trata cada tabela como uma classe e cada linha como um objeto: em vez de escrever `SELECT * FROM semestres WHERE encerrado_em IS NULL`, escreve-se `select(Semestre).where(Semestre.encerrado_em.is_(None))`. Ele escreve menos SQL repetido e confere nomes de coluna pelo Python; em troca, esconde o SQL que gera. O próximo passo é migrar para o SQLAlchemy, e isso já foi iniciado em outro ramo (`fase12-orm`), ainda em validação: as rotas e os schemas não mudam, só o `db.py`."

CONFERIR: antes de dizer que a migração "já foi iniciada", confirme o estado do ramo `fase12-orm` (quando escrevi isto, a suíte dele ainda tinha falhas); se preferir, diga só "o próximo passo é migrar para o SQLAlchemy".
