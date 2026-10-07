**Mapeamento de integração — protótipo × API**

Documento baseado na leitura dos arquivos atuais, com HEAD do frontend confirmado em `7f8dda891eebe26e2eb30689fc52d78adfaac6d0`. Nenhum arquivo foi alterado; as respostas HTTP descritas abaixo são contratos encontrados no código, sem execução da API.

**Convenção das referências**

- **P** = [design/canvas/Portal Escolar.dc.html](</C:/Users/Administrator/Documents/gestao-alunos-frontend/design/canvas/Portal Escolar.dc.html>).
- **B/** = arquivos em `C:\Users\Administrator\Documents\gestao-alunos`: [README.md](/C:/Users/Administrator/Documents/gestao-alunos/README.md), [schemas.py](/C:/Users/Administrator/Documents/gestao-alunos/schemas.py), [main.py](/C:/Users/Administrator/Documents/gestao-alunos/main.py), [auth.py](/C:/Users/Administrator/Documents/gestao-alunos/auth.py), [db.py](/C:/Users/Administrator/Documents/gestao-alunos/db.py), [regras.py](/C:/Users/Administrator/Documents/gestao-alunos/regras.py) e `routers/*.py`.
- **F/** = arquivos do frontend atual: [src/api.ts](/C:/Users/Administrator/Documents/gestao-alunos-frontend/src/api.ts), [src/http.ts](/C:/Users/Administrator/Documents/gestao-alunos-frontend/src/http.ts), [src/types.ts](/C:/Users/Administrator/Documents/gestao-alunos-frontend/src/types.ts) e `src/auth/*.tsx|ts`.
- Assim, **P:1533** identifica precisamente `design/canvas/Portal Escolar.dc.html`, linha 1533. Intervalos indicam o trecho que sustenta a afirmação.

**1. Tabela de dados**

Nas rotas abaixo, `a` significa `aluno_id`; `d`, `disciplina_id`; `v`, `avaliacao_id`; `s`, `semestre_id`. Escola, professor e aluno são abreviados como **E**, **P**, **A**. As restrições efetivas por perfil estão nas dependências das rotas; a variável chamada `professor` em `main.py` e `routers/semestres.py` exige **escola**, apesar do nome. [B/main.py:52–53; B/routers/semestres.py:12; B/auth.py:58–77]

| Campo/coleção | Forma exata no protótipo | Endpoint e correspondência | Ausência ou adaptação necessária |
|---|---|---|---|
| `alunos` | Array de `{id,nome,mat,idade,media,email?,hist?,provisoria?}`. [P:1400–1406,2001,2015] | E/P: `GET /alunos` → `itens[]`; E/P/A: `GET /alunos/{a}` → `{id,nome,idade,matricula,media}`. [B/main.py:93–112; B/schemas.py:48–53] | Renomear `matricula → mat`; a resposta não contém `email`, `hist`, `provisoria`. |
| `alunos[].id` | Número; cadastros novos usam `Date.now()`. [P:1401,2015] | `AlunoSaida.id`; criação devolve ID do banco. [B/schemas.py:49; B/db.py:416–422] | Usar o ID retornado; não preservar o ID fictício. |
| `alunos[].nome` | String. [P:1401] | `nome`. [B/schemas.py:50] | Correspondência direta. |
| `alunos[].mat` | String de sete dígitos no formulário. [P:1401,1991] | `matricula`, string de 1–20 caracteres. [B/schemas.py:28,52] | Nome e restrição de formato diferentes. |
| `alunos[].idade` | Número; formulário exige 1–120. [P:1988–1990] | Entrada 0–120; saída permite `null`. [B/schemas.py:27,51] | Tratar idade nula; a API aceita zero. |
| `alunos[].media` | Valor inicial fictício; a interface recalcula a média em `resumo()`. [P:1401–1406,2051–2064] | `media` em listas/detalhe; `media_geral` em `/situacao`; `media` por disciplina no boletim. [B/schemas.py:53,270–274,401–404] | Não confundir a média armazenada do cadastro com a média calculada do boletim; sem notas, o cadastro pode devolver zero e `/situacao`, `null`. [B/db.py:798–805; B/regras.py:11–15] |
| `alunos[].email` | String ou `null`; determina existência de acesso e habilita redefinição. [P:1401–1406,2950–2952] | Aceito em `POST /alunos`; o próprio usuário recebe `email` em `/auth/me`. [B/schemas.py:30,226–232] | Não há leitura do email de acesso dos demais alunos nem atualização dele por `PATCH /alunos/{a}`. [B/schemas.py:33–53] |
| `alunos[].hist` | Nome do semestre encerrado, por exemplo `'2026.1'`; bloqueia exclusão local. [P:1401–1402,2105] | A exclusão consulta matrículas em disciplinas de semestres encerrados. [B/main.py:129–134] | A regra existe, mas a API não devolve o indicador nem o nome do semestre no aluno. |
| `alunos[].provisoria` | Booleano adicionado ao criar/alterar acesso ou redefinir senha. [P:2001,2015,2951] | `/auth/me.senha_provisoria`, somente da própria conta. [B/schemas.py:226–232] | Ausente em `AlunoSaida`; usar o flag de `/auth/me` para o login, sem depender da lista de alunos. |
| `alunos[].fixo` | Objeto de métricas sintéticas para “Muitos itens”; pode conter `media,freq,linha,presencas,faltas,comNota`. [P:2507; P:2052] | Nenhum. | Exclusivo da demonstração; não é dado de domínio da API. |
| `discs` | Array de `{id,nome,carga_horaria,professor_id,grade}`. [P:1432–1436] | `GET /disciplinas` → `itens[]`; `GET /alunos/{a}/disciplinas` → array. Campos públicos: `id,nome,carga_horaria,professor_id,professor_nome`. [B/main.py:162–166,218–224; B/schemas.py:93–101] | `grade` precisa de chamada separada; `semestre_id` existe no banco, mas não no schema público. [B/db.py:549–565; B/schemas.py:93–101] |
| `discs[].id,nome,carga_horaria` | Número, string, número. [P:1433] | Mesmos nomes. [B/schemas.py:93–97] | Correspondência direta. |
| `discs[].professor_id` | Número ou `null`; opção “Sem professor”. [P:1436,2812] | Campo de saída e atualização admite `null`. [B/schemas.py:77–80,99–101] | Na criação, **omitir** o campo aceita o padrão `None`; enviar explicitamente `null` dispara o validador. [B/schemas.py:64–74] |
| `discs[].grade` | Array de `{dia_semana:1..7,hora_inicio:'HH:MM',hora_fim:'HH:MM'}`. [P:1433–1435] | `GET /disciplinas/{d}/grade` → array com esses nomes; `PUT` recebe `{itens:[...]}` e devolve `{itens,aulas_geradas}`. [B/routers/semestres.py:85–101; B/schemas.py:153–177] | Anexar o array à disciplina; o GET não vem envelopado em `itens`. |
| `mats` | Objeto `{'alunoId-disciplinaId':true}`; ausência da chave significa não matriculado. [P:1482,1487,1492,1919] | `GET /disciplinas/{d}/alunos` → IDs de alunos; alternativa: `/alunos/{a}/disciplinas` → IDs de disciplinas. [B/main.py:169–173,218–224] | Não há GET global de matrículas; construir as chaves. `/frequencia` da turma também entrega os alunos matriculados. [B/db.py:1008–1011] |
| `avals` | Array de `{id,did,nome,peso}`. [P:1484] | E/P: `GET /disciplinas/{d}/avaliacoes` → `{id,disciplina_id,nome,peso}[]`. A recebe avaliações aninhadas no boletim. [B/routers/avaliacoes.py:42–50,94–99; B/schemas.py:254–267] | Renomear `disciplina_id → did`; deduplicar pelo ID ao juntar boletins de alunos. |
| `notas` | Objeto `{'alunoId-avaliacaoId':number}`; nota ausente pode ser chave inexistente ou `null`. [P:1489–1490,2098,2801] | `GET /alunos/{a}/boletim` → `notas[].avaliacao.id` e `notas[].valor`. [B/schemas.py:265–274; B/regras.py:38–42] | Construir a chave com o aluno da URL; não há GET global de notas. |
| `aulas` | Array de `{aula_id,disciplina_id,data,hora_inicio,hora_fim,status,origem,chamada,remarcada_de?}`. [P:1429,1506,1945] | E/P: `/disciplinas/{d}/aulas`, `/agenda?data=...`, `/agenda/mes?mes=...`; POST/PATCH retornam detalhe da aula. [B/routers/frequencia.py:46–50; B/routers/agenda.py:16–35,38–67] | Nenhum desses GETs devolve sozinho a estrutura completa. |
| `aulas[].aula_id` | ID numérico. [P:1429] | `/disciplinas/{d}/aulas` e POST/PATCH usam `id`; agenda usa `aula_id`. [B/schemas.py:296–299,325–343] | Normalizar `id → aula_id`. |
| `aulas[].disciplina_id,data` | Número e data ISO. [P:1429] | Mesmos nomes nos contratos de aula e agenda. [B/schemas.py:296–299,332–336] | Correspondência direta. |
| `aulas[].hora_inicio,hora_fim` | Strings ou `null`. [P:1958] | `/agenda` e POST/PATCH incluem horários. [B/schemas.py:325–338] | O GET `/disciplinas/{d}/aulas` usa `AulaSaida` e **suprime** esses campos, embora `db.listar_aulas()` faça `SELECT *`. [B/routers/frequencia.py:46; B/schemas.py:296–299; B/db.py:982–983] |
| `aulas[].status` | `'agendada' \| 'cancelada'`; “chamada feita” é derivado de `chamada`, não é status persistido. [P:1429,2554–2555] | Status em `/agenda`, `/agenda/mes` e POST/PATCH. [B/schemas.py:328,339,350] | Ausente no GET simples de aulas. |
| `aulas[].origem` | `'grade' \| 'extra'`. [P:1429,1958] | `/agenda` e detalhe POST/PATCH. [B/schemas.py:329,340] | Ausente no GET simples e na agenda mensal. [B/schemas.py:296–299,346–352] |
| `aulas[].chamada` | `null` ou objeto `{'alunoId':boolean}`. [P:1502–1503,1928–1929] | `GET /disciplinas/{d}/chamada?data=...` → `[{aluno_id,presente}]`; agenda oferece apenas `chamada_feita,presentes,total`. [B/routers/frequencia.py:39–43; B/schemas.py:286–288,341–343] | Buscar por disciplina/data e converter em mapa. Agenda mensal oferece apenas o flag. [B/schemas.py:346–352] |
| `aulas[].remarcada_de` | Data original, preservada entre remarcações; pode ser `null`. [P:1945] | Nenhum campo correspondente no detalhe, agenda ou tabela de aulas. [B/schemas.py:296–352; B/db.py:234–241] | Não pode ser reconstruído após recarregar. |
| `avisos` | Array de `{id,titulo,data,msg,disciplina_id,autor_id,autor_nome}`. [P:1545–1548] | `GET /avisos` → `itens[]` com `{id,titulo,mensagem,data,disciplina_id,disciplina_nome,autor_nome}`. [B/routers/avisos.py:13–17; B/schemas.py:368–394] | Renomear `mensagem → msg`; `autor_id` não é exposto. |
| `avisos[].autor_id` | ID do professor ou string `'escola'`; professor edita/exclui quando o ID coincide com o dele. [P:1546–1548,2593] | Existe no banco e é usado na autorização de PATCH/DELETE. [B/db.py:268–270; B/routers/avisos.py:35–36,50–51] | Falta no schema público; o cliente não consegue reproduzir `podeMexer` com precisão. |
| `avisos[].autor_nome` | String; fallback visual `'Secretaria'`. [P:2593] | `autor_nome`, anulável. [B/schemas.py:394] | Correspondência direta com tratamento de `null`. |
| `profs` | Array de `{id,nome,email,provisoria?}`. [P:1445,2009] | E: `GET /professores` → `{id,nome,email,disciplinas:[{id,nome}]}[]`. Professor obtém sua identidade em `/auth/me`. [B/routers/professores.py:28–30; B/schemas.py:114–118,226–232] | Listagem não inclui `provisoria`; `nome` pode ser nulo. P/A não podem listar todos os professores. |
| `semestre` | `{id,nome,inicio,fim,encerrado_em}` ou ausência; depois de encerrar, mantém o objeto encerrado. [P:1438,1826,1985] | Todos: `GET /semestres/atual`; E: `GET /semestres`, POST e encerrar. [B/routers/semestres.py:25–56] | `/atual` devolve 404 quando não há ativo; não devolve o último encerrado. [B/routers/semestres.py:43–45] |
| `semestre.encerrado_em` | Data curta, como `'2026-10-06'`; `br()` aceita somente `YYYY-MM-DD`. [P:1452,1984–1985] | `datetime` anulável, gravado com `CURRENT_TIMESTAMP`. [B/schemas.py:144–146; B/db.py:315–318] | Cortar a parte da data para apresentação; o timestamp bruto não passa na regex de `br()`. |
| `historico` / `HIST0` | Array de semestres encerrados, cada um com `resumo[]`. [P:1477–1479,1544] | E: `GET /semestres`, filtrar `encerrado_em != null`; depois `/semestres/{s}/resumo`. [B/routers/semestres.py:36–38,59–82] | O resumo não vem junto da lista; uma chamada adicional por semestre consultado. |
| `historico[].resumo` | `{disc,alunos,media,mediaCor,freq,freqCor,aprov,reprov,reprovCor}`; valores já formatados como strings. [P:1479,1967] | `{disciplina:{id,nome,carga_horaria},total_alunos,media_turma,frequencia_media,aprovados,reprovados}[]`. [B/routers/semestres.py:65–82] | Mapear nomes, percentuais e formatação; cores ficam no cliente. |
| `senhaProv` | `null` ou `{email,senha,copiado,criado?,redef?}`. [P:2009,2016,2906,2946] | Criação de aluno/professor e redefinição devolvem `senha_provisoria_texto`. [B/schemas.py:56–57,121–125,201–202] | `senha` vem do servidor; email/nome podem vir do formulário. `copiado`, `criado`, `redef` são apresentação local. |
| `cham` | Rascunho `{'alunoId':true|false}` da chamada aberta. [P:1921,2925–2932] | Inicializar a partir do GET de chamada. [B/routers/frequencia.py:39–43] | Rascunho local; não confundir com chamada confirmada. |
| `gnDraft` | Rascunhos de notas `{'alunoId-avaliacaoId':string}`. [P:2795–2799] | Nenhum endpoint de rascunho; salvar usa PUT de nota. [B/routers/avaliacoes.py:69–80] | Exclusivamente local. |

**Demais campos do `state`: uma linha por campo**

“Local” significa que o campo representa navegação, formulário, filtro ou feedback do protótipo, e não exige persistência própria na API.

| Campo | Forma e vínculo com a integração |
|---|---|
| `logado` | Booleano, inicialmente `false`; hoje alterado localmente. No front real deve acompanhar a sessão autenticada. [P:1543,1661,2649; F/src/auth/AuthContext.tsx:14–31] |
| `papel` | `null \| 'escola' \| 'prof' \| 'aluno'`; adaptar `perfil:'professor'` da API para `'prof'`. [P:1543,1661; B/schemas.py:229] |
| `profId` | Número ou `null`; deve ser `/auth/me.id` quando `perfil==='professor'`. [P:1544,1661; B/schemas.py:227–231] |
| `tela` | String; inicia `'inicio'`; destinos definidos em `TELAS_POR`, mais login/primeiro acesso/meu painel. Local. [P:1439–1442,1543,1661] |
| `papelEscolhido` | Inicial `'prof'`; seleção da apresentação/login de demonstração. Não é autorização real. [P:1543,2419,2717] |
| `faqAberta` | Índice numérico; `-1` fecha. Local. [P:1543,2479] |
| `loginEmail` | String; corpo real `/auth/login.email`. [P:1543,2714–2721; B/schemas.py:184–186] |
| `loginSenha` | String; corpo real `/auth/login.senha`. Hoje não é conferida. [P:1543,2716–2720; B/routers/auth.py:13–15] |
| `loginErro` | String; deve receber falha de login/carga. [P:1543,2714; B/routers/auth.py:15] |
| `funcSel` | Índice da função selecionada na apresentação. Local. [P:1544,2337,2474] |
| `navAberta` | Booleano do menu de navegação. Local. [P:1544,2650–2651] |
| `discProfF` | `''`, ID em string ou `'sem'`; filtro local por professor/sem professor. [P:1544,2597] |
| `fProf` | ID de professor em string ou `''`; adaptar para `professor_id` no POST/PATCH de disciplina. [P:1544,1884–1885,1901; B/schemas.py:64–80] |
| `matDisc` | ID de disciplina em string; seleção da matrícula por aluno. [P:1544,2837–2838] |
| `agProfF` | `''`, ID em string ou `'sem'`; filtro local da agenda. [P:1544,2550] |
| `agDiscF` | ID em string ou `''`; filtro local da agenda. [P:1544,2550] |
| `agErro` | String de erro da agenda. Local; pode receber `detail` de PATCH de aula. [P:1544,2561,2858; B/routers/agenda.py:57–67] |
| `avDestino` | ID em string ou `''`; adaptar para `disciplina_id` ou `null`. [P:1544,2880–2885; B/schemas.py:372] |
| `subAba` | `'alunos' \| 'chamada' \| 'notas' \| 'avisos'`; inicialmente `'alunos'`. Local. [P:1544,2778–2780] |
| `gnMsg` | `null` ou `{erro:boolean,t:string}`; feedback da grade de notas. [P:1544,1531–1533,2803] |
| `semPerm` | `null` ou ID de disciplina; demonstra tela de falta de permissão. [P:1544,1614,2776] |
| `rotaAviso` | String; aviso ao acessar tela fora do perfil. Local. [P:1544,1791,2859] |
| `alunoErro` | String; erro de exclusão/detalhe. [P:1544,2105,2947] |
| `q` | String; busca de aluno por nome/matrícula. Corresponde a `GET /alunos?q=`. [P:1550,2510–2511; B/main.py:97] |
| `idadeMin` | String do formulário; adaptar para `idade_minima:number`. [P:1550,2512; B/main.py:95] |
| `mediaMin` | String; filtro usa média calculada `a.s.media`; API recebe `media_minima` sobre a média da consulta. [P:1550,2513; B/main.py:96; B/db.py:467–469] |
| `ordem` | `'nome' \| 'media' \| 'freq' \| 'idade'`; local, API lista alunos por ID. [P:1550,2516–2517; B/db.py:473] |
| `pagina` | Inteiro, inicialmente 1; paginação local de dez alunos. [P:1550,2518–2519] |
| `painel` | `null` ou objeto `{tipo,id? ,did?}` para aluno, novoAluno, disc, chamada, remarcar, extra, aviso, senha, mais ou prof. Local. [P:1551,1818,2900] |
| `painelUlt` | Último objeto de painel; mantém conteúdo durante fechamento visual. Local. [P:1551,1818,2628] |
| `fNome` | String compartilhada entre nome de aluno/professor/disciplina e título de aviso. [P:1551,1997–2026] |
| `fIdade` | String; idade do aluno ou carga horária da disciplina. [P:1551,1894,1988] |
| `fMat` | String de matrícula; adaptar para `matricula`. [P:1551,1991,2015; B/schemas.py:28] |
| `fErro` | String de erro do painel/formulário. [P:1551,1818] |
| `fEmail` | String de email de aluno/professor; criação tem suporte, edição de aluno não. [P:1552,2001,2009,2015; B/schemas.py:30,33–37,104–106] |
| `fOk` | String de sucesso, especialmente geração de aulas. [P:1552,1908–1909] |
| `fGrade` | Array de `{k,dia_semana:string,hora_inicio,hora_fim}`; remover `k` e converter dia para número antes do PUT. [P:1552,1884,1898; B/schemas.py:153–166] |
| `fData` | String ISO; usada em remarcação, aula extra e edição de aviso. [P:1552,1938–1945,1953–1958,2023–2026] |
| `fIni` | String de horário inicial. [P:1552,1940–1945,1955–1958] |
| `fFim` | String de horário final. [P:1552,1940–1945,1955–1958] |
| `fDisc` | ID de disciplina em string para aula extra. [P:1552,1947,1952] |
| `fTexto` | String da mensagem ao editar aviso; adaptar para `mensagem`. [P:1552,2024–2026; B/schemas.py:377] |
| `editando` | Booleano do editor de aluno. Local. [P:1552,2952] |
| `confDesm` | `null` ou `'alunoId-disciplinaId'`; confirmação de desmatrícula. Local. [P:1552,2602–2605] |
| `desmErro` | `null` ou `{k,t}`; erro vinculado à matrícula composta. [P:1552,1917] |
| `chamErro` | String; exige todos os alunos marcados antes de salvar. [P:1553,1925–1927] |
| `sAtual` | String; adaptar para `senha_atual` em troca de senha. [P:1553,2031; B/schemas.py:189–191] |
| `sNova` | String; adaptar para `senha_nova`. [P:1553,2032; B/schemas.py:191] |
| `sConf` | String de confirmação; validação somente no cliente. [P:1553,2034,2041] |
| `senhaOk` | Booleano de sucesso da troca. [P:1553,2035,2940] |
| `menuUser` | Booleano do menu do avatar. Local. [P:1553,2645] |
| `menuAula` | ID de aula ou `null`. Local. [P:1553,2564,2569] |
| `limpar` | Chave de nota composta ou `null`; confirmação de limpeza no boletim. [P:1553,2090–2098] |
| `exportando` | `null` ou identificador `'disc'/'bol'/'me'`; progresso local. [P:1553,1844–1852,2618,2842,2896] |
| `exportOk` | Mesmo identificador da exportação ou `null`; feedback temporário. [P:1553,1851–1852] |
| `semConfirm` | Booleano da confirmação de encerramento. [P:1554,2871–2872] |
| `semMsg` | String de feedback do semestre. [P:1554,1980,1985] |
| `nsNome` | String; corpo `/semestres.nome`. [P:1554,1974; B/schemas.py:132–135] |
| `nsInicio` | String ISO; corpo `/semestres.inicio`. [P:1554,1977; B/schemas.py:134] |
| `nsFim` | String ISO; corpo `/semestres.fim`. [P:1554,1977–1978; B/schemas.py:135] |
| `nsErro` | String de erro de abertura. [P:1554,1972] |
| `discQ` | String; busca de disciplina. Corresponde a `GET /disciplinas?q=`. [P:1555,2597; B/main.py:163] |
| `selAluno` | ID numérico, inicialmente 1; seleção local. Deve usar IDs carregados. [P:1555,2533,2830] |
| `selDisc` | ID numérico, inicialmente 1; seleção local. [P:1555,2599] |
| `matAluno` | ID em string ou `''`; matrícula na disciplina selecionada. [P:1555,2832] |
| `matMsg` | `null` ou `{erro,t}`; feedback de matrícula/desmatrícula. [P:1555,1919,2832] |
| `notaDisc` | ID, inicialmente 1; disciplina do formulário de avaliação/nota. [P:1556,2536] |
| `notaAval` | ID, inicialmente 11, ou `''`; não deve assumir IDs derivados da disciplina na API. [P:1556,1484,2845] |
| `notaValor` | String; converter vírgula decimal para número em `{valor}`. [P:1556,2847; B/schemas.py:261–262] |
| `notaMsg` | `null` ou `{erro,t}`; feedback da nota. [P:1556,2847–2848] |
| `avalNome` | String; corpo de criação de avaliação `nome`. [P:1556,2852; B/schemas.py:249–250] |
| `avalPeso` | String; converter para inteiro `peso`. [P:1556,2852; B/schemas.py:251] |
| `avalMsg` | `null` ou `{erro,t}`; feedback da avaliação. [P:1556,2852–2853] |
| `agDia` | Data ISO, inicialmente `HOJE`; query `/agenda?data=`. [P:1557,1863; B/routers/agenda.py:16–19] |
| `agMes` | String `YYYY-MM`; query `/agenda/mes?mes=`. [P:1557,1871; B/routers/agenda.py:22–35] |
| `avisoQ` | String; busca local por título; corresponde a `/avisos?q=`. [P:1558,2591; B/db.py:1064–1066] |
| `avisoPagina` | Inteiro, inicialmente 1; paginação local de dez avisos. [P:1558,2592–2593] |
| `avTitulo` | String; corpo de publicação `titulo`. [P:1558,2885; B/schemas.py:369] |
| `avData` | Data ISO, inicialmente `'2026-10-05'`; corpo `data`. [P:1558,2885; B/schemas.py:371] |
| `avMsg` | String; adaptar para `mensagem`. [P:1558,2885; B/schemas.py:370] |
| `avErro` | String de erro da publicação. [P:1558,2885] |
| `largura` | Número, inicialmente 1280; medição local para responsividade. [P:1559,1576] |
| `altura` | Número adicionado por `ResizeObserver`. Local. [P:1576] |
| `funcNaoCabe` | Booleano adicionado dinamicamente; controla layout da apresentação. Local. [P:1576,2321,2418] |
| `primeiroEmail` | String adicionada no login provisório; preencher com `/auth/me.email`. [P:2719,2944; B/schemas.py:228] |
| `primeiroPapel` | Papel adicionado no login provisório; preencher com o perfil autenticado adaptado. [P:2719,2042; B/schemas.py:229] |
| `mg` | Objeto de geometria/fase da animação de entrada, ou `null`. Local. [P:1627,2234,2302–2304,2703–2708] |
| `saindo` | Booleano da transição de entrada. Local. [P:1623,1627,1650] |
| `veu` | Booleano da camada de transição. Local. [P:1650–1656] |

Constantes como `HOJE`, `MESES`, nomes dos dias, textos de apresentação, opções de tela e parâmetros de animação não são coleções da API. `HOJE` está fixado em `'2026-10-06'`; deve virar data atual para manter corretos agenda, geração de aulas e bloqueio de chamada futura. [P:1408–1411,1439–1475,1901,2554–2559]

**2. Tabela de ações**

**Erros compartilhados das rotas**

Estas regras complementam os erros específicos de cada linha da tabela:

| Identificador | Código e `detail` real | Aplicação |
|---|---|---|
| **AUTH** | 401 `"Não autenticado"`. [B/auth.py:37–54] | Rotas protegidas sem token válido. |
| **PERFIL** | 403 `"Sem permissão"`. [B/auth.py:58–67,80–88] | Perfil sem permissão para a operação ou aluno fora do acesso permitido. |
| **DISC** | 404 `"Disciplina não encontrada"`; 403 `"Sem permissão para esta disciplina"`. [B/auth.py:70–77] | Rotas que verificam professor da disciplina. |
| **SEM** | 404 `"Disciplina não encontrada"`; 409 `"Semestre encerrado"`. [B/routers/semestres.py:15–21] | Escritas vinculadas à disciplina/semestre. |
| **VAL** | 422 de validação; não há um único texto fixo de negócio para tipos, campos obrigatórios, limites e padrões. Os schemas definem essas restrições. [B/schemas.py:25–44,64–89,132–172,184–197,249–262,291–322,368–387] | Corpos/query inválidos. Os textos explícitos dos validadores estão discriminados abaixo. |

O cliente HTTP atual aproveita `detail` textual; quando é array de validação, junta `item.msg`. Entretanto, transforma a falha em `Error` e perde o status HTTP para o consumidor. Também encerra a sessão em **qualquer 401 fora de `/auth/login`**, inclusive `"Senha atual incorreta"` de troca de senha. [F/src/http.ts:14–39; B/routers/auth.py:31–36]

| Método/ação do protótipo | Endpoint, HTTP, corpo → resposta | Erros específicos, além dos compartilhados | Resultado usado hoje |
|---|---|---|---|
| `entrar` | `POST /auth/login` `{email,senha}` → 200 `{access_token,token_type,perfil,aluno_id}`; depois `GET /auth/me` → `{id,email,perfil,nome,aluno_id,senha_provisoria}`. [B/routers/auth.py:11–28; B/schemas.py:205–232] | 401 `"E-mail ou senha incorretos"`; VAL. [B/routers/auth.py:15] | Deduz o papel pelo email cadastrado ou `papelEscolhido`; ignora a senha; entra ou abre primeiro acesso. [P:2716–2720] |
| `preCarregar` | Deve executar a sequência da seção 5; hoje não chama endpoint. [P:1617–1619] | Hoje não implementa falha HTTP nem retentativa; a animação só acompanha resolução da Promise. [P:1631–1638] | Espera 450 ms. [P:1619] |
| `entrarComo` | Nenhuma chamada própria; deve consumir a identidade já confirmada por `/auth/me`. [B/routers/auth.py:24–28] | Sem erro HTTP próprio. | Define `logado,papel,profId,selDisc,tela`; professor pode cair no ID fictício 1. [P:1661] |
| `ir` | Nenhum endpoint próprio; troca de tela pode disparar cargas sob demanda. | Sem erro HTTP próprio. | Confere telas permitidas de E/P; redireciona para primeira tela e mostra `rotaAviso`. [P:1789–1805] |
| `salvarAluno` | E: `PATCH /alunos/{a}` `{nome?,idade?,matricula?,media?}` → 200 aluno `{id,nome,idade,matricula,media}`. [B/main.py:115–126; B/schemas.py:33–53] | 404 `"Aluno não encontrado"`; 409 `"Matrícula já cadastrada"`; 422 `"Informe ao menos um campo"`; validadores `"nome não pode ser nulo"`, `"matricula não pode ser nulo"`, `"media não pode ser nulo"` em VAL. [B/main.py:119–126; B/schemas.py:39–44] | Atualiza também email; quando muda, gera senha local e marca provisória. Essa parte não corresponde ao PATCH. [P:1997–2001] |
| `cadastrarAluno` | E: `POST /alunos` `{nome,idade,matricula,media?:0,email?}` → 201 `{id,nome,idade,matricula,media,senha_provisoria_texto?}`. [B/main.py:68–82; B/schemas.py:25–30,48–57] | 409 `"E-mail já cadastrado"` ou `"Matrícula já cadastrada"`; VAL. [B/main.py:76–79] | Insere aluno com `Date.now()`. Com email, mostra senha criada localmente; sem email, fecha painel. [P:2011–2016] |
| `cadastrarProf` | E: `POST /professores` `{nome,email}` → 201 `{id,nome,email,senha_provisoria_texto}`. [B/routers/professores.py:14–25; B/schemas.py:104–106,121–125] | 409 `"E-mail já cadastrado"`; VAL. [B/routers/professores.py:22–23] | Acrescenta professor com ID e senha locais, `provisoria:true`. [P:2003–2009] |
| `salvarDisc` — criar | E: `POST /disciplinas` `{nome,carga_horaria,professor_id?}` → 201 `{id,nome,carga_horaria,professor_id,professor_nome}`; depois PUT de grade. [B/main.py:150–159; B/schemas.py:64–74,93–101] | 404 `"Professor não encontrado"`; 422 `"Usuário não é professor"`; 409 `"Disciplina já cadastrada"` ou `"Crie um semestre antes"`; `professor_id:null` gera VAL com `"professor_id não pode ser nulo"`. [B/main.py:142–159; B/db.py:529–531; B/schemas.py:69–74] | Cria disciplina e aulas em uma alteração local; valida choque de horários antes. [P:1890–1909] |
| `salvarDisc` — editar | E: `PATCH /disciplinas/{d}` `{nome?,carga_horaria?,professor_id?}` → 200 disciplina; depois PUT de grade. [B/main.py:176–184; B/schemas.py:77–101] | SEM; 404 professor; 422 perfil de usuário; 409 `"Disciplina já cadastrada"`; VAL `"Informe ao menos um campo"` e campos não nulos. [B/main.py:178–184; B/schemas.py:82–89] | Substitui o objeto da disciplina e recompõe aulas. [P:1901–1909] |
| `salvarDisc` — grade | E: `PUT /disciplinas/{d}/grade` `{itens:[{dia_semana,hora_inicio,hora_fim}]}` → 200 `{itens,aulas_geradas}`. [B/routers/semestres.py:85–89] | SEM; VAL com `"O fim deve ser depois do início"` e `"Itens duplicados na grade"`. Não há erro de choque entre disciplinas. [B/schemas.py:153–172; B/db.py:358–399] | Gera aulas localmente e mostra quantidade; preserva extras, chamadas, passadas, remarcadas e cancelamentos identificados. [P:1902–1909] |
| `excluirDisc` | E: `DELETE /disciplinas/{d}` → 204, sem corpo. [B/main.py:187–192] | SEM; 404 `"Disciplina não encontrada"`. | Remove disciplina e suas aulas; deixa chaves de matrículas/notas/avaliações no estado. [P:1911] |
| `matricular` | E: `POST /alunos/{a}/matricular/{d}`, sem corpo → 201 `{"mensagem":"Matrícula realizada"}`. [B/main.py:197–204] | 404 `"Aluno não encontrado"`; SEM. Matrícula repetida não gera 409: banco usa `ON CONFLICT DO NOTHING`. [B/db.py:610–617] | Verifica duplicidade e escreve `mats[a+'-'+d]=true`, limpa seleção e mostra mensagem. [P:2832] |
| `matricularAluno` | Mesma rota/corpo/resposta de `matricular`. [B/main.py:197–204] | Mesmos erros. | Matrícula pela seleção de disciplina no aluno; atualiza a mesma chave composta. [P:2837–2838] |
| `desmatricular` | E: `DELETE /alunos/{a}/matricular/{d}` → 204, sem corpo. [B/main.py:207–215] | SEM; 404 `"Aluno não matriculado"`; 409 `"aluno já tem notas ou frequência"`. [B/main.py:213–215; B/db.py:638–649] | Recusa se houver qualquer nota/presença do aluno na disciplina; senão apaga chave e mostra sucesso. [P:1912–1919] |
| `abrirChamada` | E/P: `GET /disciplinas/{d}/chamada?data=YYYY-MM-DD`, sem corpo → 200 `[{aluno_id,presente}]`. [B/routers/frequencia.py:39–43] | AUTH, PERFIL, DISC; VAL para data. | Copia `au.chamada` já existente para `cham`; abre painel por `aula_id`. [P:1921] |
| `salvarChamada` | E/P: `PUT /disciplinas/{d}/chamada` `{data,presencas:[{aluno_id,presente}]}` → 204, sem corpo. [B/routers/frequencia.py:26–36; B/schemas.py:286–293] | DISC, SEM; 409 `"Aula cancelada"`; 404 `"Aluno não encontrado"`; VAL. | Exige todos marcados, substitui mapa da aula e fecha painel; métricas recalculam localmente. [P:1922–1929] |
| `setStatus` | E/P: `PATCH /aulas/{id}` `{status:'agendada'|'cancelada'}` → 200 `{id,disciplina_id,data,hora_inicio,hora_fim,status,origem}`. [B/routers/agenda.py:53–67; B/schemas.py:325–329] | 404 `"Aula não encontrada"`; DISC, SEM; 409 `"Aula já tem presenças"` ao cancelar; VAL. | Muda status local e fecha menu; a ação de cancelar verifica chamada antes. [P:1931,2561] |
| `abrirRemarcar` | Nenhuma chamada obrigatória se detalhe da aula estiver carregado. | Sem erro HTTP próprio. | Preenche data/horários e erro se já há chamada. [P:1932] |
| `salvarRemarcar` | E/P: `PATCH /aulas/{id}` `{data,hora_inicio,hora_fim,status:'agendada'}` → 200 detalhe da aula. [B/routers/agenda.py:53–67; B/schemas.py:308–329] | 404 `"Aula não encontrada"`; DISC, SEM; 409 `"Aula já tem presenças"` se mudar data; 409 `"Já existe aula nessa data"`; VAL. **Não há validação de data dentro do semestre nesse PATCH.** [B/routers/agenda.py:55–67] | Valida período, horários e duplicidade; grava `remarcada_de`, fecha e navega para nova data. [P:1933–1945] |
| `abrirExtra` | Nenhum endpoint próprio. | Sem erro HTTP próprio. | Preenche data selecionada e primeira disciplina disponível. [P:1947] |
| `salvarExtra` | E/P: `POST /disciplinas/{d}/aulas` `{data,hora_inicio?,hora_fim?}` → 201 detalhe da aula. [B/routers/agenda.py:38–50; B/schemas.py:302–305,325–329] | DISC, SEM; 422 `"Data fora do semestre"`; 409 `"Já existe aula nessa data"`; VAL. | Acrescenta aula com ID local, `origem:'extra'`, `chamada:null`; fecha e abre o dia. [P:1948–1959] |
| `abrirSemestre` | E: `POST /semestres` `{nome,inicio,fim}` → 201 `{id,nome,inicio,fim,encerrado_em}`. [B/routers/semestres.py:25–33; B/schemas.py:132–146] | 409 `"Já existe um semestre ativo"`; VAL `"O fim deve ser depois do início"`. [B/routers/semestres.py:33; B/schemas.py:137–140] | Recusa nome já usado; cria semestre local e esvazia disciplinas, avaliações, notas, matrículas e aulas. [P:1970–1980] |
| `encerrarSemestre` | E: `POST /semestres/{s}/encerrar`, sem corpo → 200 semestre; resumo por `GET /semestres/{s}/resumo`. [B/routers/semestres.py:49–82] | 404 `"Semestre não encontrado"`; 409 `"Semestre encerrado"`. [B/routers/semestres.py:51–55,61–62] | Tira snapshot do resumo local, marca `encerrado_em:HOJE` e acrescenta no histórico. [P:1982–1985] |
| `salvarAvisoEd` | E/P: `PATCH /avisos/{id}` `{titulo?,mensagem?,data?}` → 200 aviso com campos da tabela de dados. [B/routers/avisos.py:30–42; B/schemas.py:375–394] | 404 `"Aviso não encontrado"`; professor sem autoria: 403 `"Sem permissão"`; SEM para aviso de disciplina; VAL `"Informe ao menos um campo"` e campos não nulos. [B/routers/avisos.py:33–41; B/schemas.py:380–387] | Valida também título duplicado na mesma data; atualiza `msg` e fecha painel. [P:2018–2026] |
| `publicarAviso` | E/P: `POST /avisos` `{titulo,mensagem,data,disciplina_id?}` → 201 aviso. [B/routers/avisos.py:20–27; B/schemas.py:368–394] | Professor tentando aviso geral: 403 `"Sem permissão para esta disciplina"`; DISC, SEM; VAL. | Prependa aviso com ID/autor locais; limpa título/mensagem, volta para primeira página. [P:2885] |
| `avisosPagina[].excluir` | E/P: `DELETE /avisos/{id}` → 204, sem corpo. [B/routers/avisos.py:45–55] | 404 `"Aviso não encontrado"`; professor sem autoria: 403 `"Sem permissão"`; SEM para aviso de disciplina. | Remove aviso imediatamente do array. [P:2593] |
| `avisosPagina[].editar` | Nenhuma chamada própria: inicializa formulário usando aviso carregado. | Sem erro HTTP próprio. | Abre painel com título, data e mensagem. [P:2593] |
| `criarAvalSel` | E/P: `POST /disciplinas/{d}/avaliacoes` `{nome,peso}` → 201 `{id,disciplina_id,nome,peso}`. [B/routers/avaliacoes.py:23–39] | DISC, SEM; 409 `"A soma dos pesos não pode passar de 100 (já soma {soma})"`; VAL. [B/routers/avaliacoes.py:33–37] | Cria na disciplina selecionada, com ID local; limpa campos e mostra sucesso. [P:2806] |
| `criarAval` | Mesma rota/corpo/resposta, usando `avalDisc.id`. [B/routers/avaliacoes.py:23–39] | Mesmos erros. | Cria pelo formulário de matrículas/boletim. [P:2852] |
| `avsSel[].excluir` | E/P: `DELETE /avaliacoes/{v}` → 204, sem corpo. [B/routers/avaliacoes.py:53–65] | 404 `"Avaliação não encontrada"`; DISC, SEM; 409 `"Não é possível excluir: já existem notas lançadas nessa avaliação"`. | Desabilita se houver notas/semestre bloqueado; remove avaliação e mostra sucesso. [P:2805] |
| `avalLista[].excluir` | Mesma rota DELETE. [B/routers/avaliacoes.py:53–65] | Mesmos erros. | O objeto marca `bloqueado` quando há notas, mas o callback remove diretamente se invocado. [P:2850] |
| `salvarNotaGrade` | E/P: `PUT /avaliacoes/{v}/notas/{a}` `{valor}` → 204, sem corpo. [B/routers/avaliacoes.py:69–80] | 404 `"Avaliação não encontrada"` / `"Aluno não encontrado"`; DISC, SEM; 409 `"O aluno não está matriculado nessa disciplina"`; VAL. | Valida uma casa decimal, arredonda, atualiza `notas`, apaga rascunho e mostra sucesso. Campo vazio apenas descarta rascunho. [P:1527–1533] |
| `lancarNota` | Mesma rota PUT e corpo `{valor}`. [B/routers/avaliacoes.py:69–80] | Mesmos erros. | Faz `parseFloat`, arredonda para uma casa, distingue nota nova/atualizada, limpa campo. [P:2847] |
| `gnLinhas[].cels[].limpar` | E/P: `DELETE /avaliacoes/{v}/notas/{a}` → 204, sem corpo. [B/routers/avaliacoes.py:83–91] | 404 `"Nota não encontrada"`; DISC, SEM. | Guarda `notas[key]=null` e mensagem de sucesso, sem confirmação. [P:2801] |
| `boletim().confirmarLimpar` | Mesmo DELETE de nota. [B/routers/avaliacoes.py:83–91] | Mesmos erros. | Depois de confirmação, apaga a chave, fecha confirmação e mostra feedback. [P:2093–2098] |
| `profsLista[].redefinir` | E: `POST /professores/{id}/redefinir-senha`, sem corpo → 200 `{senha_provisoria_texto}`. [B/routers/professores.py:33–38] | 404 `"Professor não encontrado"`. | Marca provisória no array e mostra senha gerada localmente. [P:2906] |
| `pa.redefinir` | E: `POST /alunos/{a}/redefinir-senha`, sem corpo → 200 `{senha_provisoria_texto}`. [B/main.py:85–90] | 404 `"Aluno sem login"`. | Marca provisória e mostra senha local; botão só aparece quando `email` existe. [P:2950–2951,1172–1177] |
| `trocarSenha` | E/P/A: `POST /auth/trocar-senha` `{senha_atual,senha_nova}` → 200 `{"mensagem":"Senha alterada"}`. [B/routers/auth.py:31–36] | 401 `"Senha atual incorreta"`; VAL: mínimo oito caracteres e `"A senha não pode passar de 72 bytes em UTF-8"`. [B/schemas.py:189–197] | Valida campos, diferença e confirmação; **não confere a senha atual**; marca sucesso e limpa strings. [P:2028–2035] |
| `salvarPrimeiro` | Mesma rota de troca; `senha_atual` precisa ser a senha provisória usada no login. [B/routers/auth.py:31–36] | Mesmo 401 e VAL. | Valida nova/confirmada, desmarca provisória nos arrays e entra. Não envia senha anterior. [P:2037–2044] |
| `excluirAluno` | E: `DELETE /alunos/{a}` → 204, sem corpo. [B/main.py:129–137] | 409 `"Aluno tem historico em semestre encerrado"`; 404 `"Aluno não encontrado"`. | Bloqueia com `al.hist`; senão remove aluno, fecha painel e ajusta seleção. [P:2103–2106] |
| `exportar` | Pode permanecer local. Alternativas reais: `GET /alunos/{a}/boletim.csv` ou `/disciplinas/{d}/frequencia.csv` → 200 arquivo CSV, `Content-Disposition`. [B/routers/avaliacoes.py:102–120; B/routers/frequencia.py:64–76] | CSV de aluno: 404 `"Aluno não encontrado"`/PERFIL; CSV de disciplina: DISC/PERFIL. | Gera Blob UTF-8 com BOM, separador `;`, baixa arquivo e mostra sucesso temporário. Não trata falha do download. [P:1844–1853] |
| `exportarBol` | GET do CSV do aluno ou `exportar()` local. [B/routers/avaliacoes.py:102–120] | Conforme linha anterior. | Nome local `boletim-{mat}-{semNome}.csv`. [P:2842] |
| `exportarMe` | A pode usar GET do próprio CSV. [B/routers/avaliacoes.py:102–104; B/auth.py:80–82] | AUTH/PERFIL/404 aluno. | Mesmo gerador local, com o aluno que o protótipo escolhe como `me`. [P:2896,2622] |
| `dd.exportar` | GET de frequência CSV ou geração local. [B/routers/frequencia.py:64–76] | AUTH/PERFIL/DISC. | CSV inclui também média por disciplina; o CSV da API tem outro conjunto de colunas. [P:2618] |
| `senhaNova` | Nenhum endpoint próprio: substituir a geração local pelo `senha_provisoria_texto` das criações/redefinições. [B/main.py:80–90; B/routers/professores.py:24,38] | Sem erro HTTP próprio. | Gera dez caracteres aleatórios, exibidos com dois hífens; backend gera oito caracteres. [P:1842; B/auth.py:17–19] |
| `copiar` | Clipboard local. | Sem erro HTTP. | Copia senha e marca `copiado:true`, inclusive quando não consegue confirmar a cópia. [P:1843] |
| `sair` | Não há rota de logout entre as rotas de autenticação implementadas; limpeza local da sessão. [B/routers/auth.py:11–51; F/src/auth/AuthContext.tsx:29–31] | Sem erro HTTP próprio. | Só muda estado local e limpa `loginSenha`; no real, limpar token/sessão. [P:2649] |
| `abrirPainel` | Local; dados faltantes podem ser buscados antes/depois da abertura. | Sem erro HTTP próprio. | Inicializa painel e limpa formulários, mensagens, senha temporária e menus. [P:1818] |
| `fecharPainel` | Local. | Sem erro HTTP próprio. | Limpa painel, senha exibida, menu de aula e confirmação de desmatrícula. [P:1817] |
| `abrirDisc` | Local, após GET da grade quando necessário. [B/routers/semestres.py:92–101] | Erros do GET de grade se usado. | Copia disciplina/grade para formulário ou inicia nova disciplina. [P:1883–1885] |
| `addLinha` | Local. | Sem erro HTTP. | Acrescenta linha de grade com chave local e horários copiados. [P:1887] |
| `setLinha` | Local. | Sem erro HTTP. | Altera campo da linha de grade. [P:1888] |
| `remLinha` | Local. | Sem erro HTTP. | Remove linha do rascunho de grade. [P:1889] |
| `setSub` | Local; pode disparar carga específica da subaba no real. | Sem erro HTTP próprio. | Troca subaba e limpa feedback da grade de notas. [P:1525] |
| `irDia` | No real, `GET /agenda?data=...` → `AgendaItem[]`. [B/routers/agenda.py:16–19; B/schemas.py:332–343] | AUTH/PERFIL/VAL. | Hoje apenas altera `agDia/agMes` e anima conteúdo. [P:1860–1869] |
| `moverMes` | No real, `GET /agenda/mes?mes=...` → `[{data,aulas:[{aula_id,disciplina_id,disciplina_nome,status,chamada_feita}]}]`. [B/routers/agenda.py:22–35; B/schemas.py:346–356] | 422 `"Mês inválido"` ou VAL do padrão; AUTH/PERFIL. [B/routers/agenda.py:23–27] | Hoje apenas calcula o novo mês. [P:1871] |
| `pa.editar` | Local, mas depende de obter email de acesso que o aluno público não contém. [B/schemas.py:48–53] | Sem erro HTTP próprio. | Copia dados para formulário. [P:2952] |
| `ch.todos` / marcar presença/falta | Local; persistência só em `salvarChamada`. | Sem erro HTTP próprio. | Preenche `cham` ou altera um aluno. [P:2927,2932] |
| `pedirEncerrar` / `cancelarEncerrar` | Local; resumo pode usar GET `/semestres/{s}/resumo`. [B/routers/semestres.py:59–82] | AUTH/PERFIL; 404 `"Semestre não encontrado"` se buscar. | Abre/fecha confirmação; resumo atual é calculado no cliente. [P:2871–2872] |

**Métodos de leitura/cálculo incluídos na classe**

| Método | Correspondência HTTP ou ausência | Uso atual |
|---|---|---|
| `ativo` | `/semestres/atual` corresponde ao semestre ativo, com 404 quando ausente. [B/routers/semestres.py:41–46] | Retorna `semestre` se não encerrado. [P:1826] |
| `idx` | Não há GET global equivalente; precisa das chamadas por disciplina/data. [B/routers/frequencia.py:39–43] | Indexa presença por aluno/disciplina, com cache por referência de `aulas`. [P:1827–1839] |
| `fr` | `/alunos/{a}/frequencia` oferece percentual, sem `p,t,linha`. [B/schemas.py:359–361] | Lê índice ou retorna zeros e linha vazia. [P:1841] |
| `discMedia` | `/alunos/{a}/boletim.media/parcial`. [B/schemas.py:270–274] | Média ponderada das notas lançadas. [P:2046–2049] |
| `resumo` | `/alunos/{a}/situacao` oferece média/frequência/aprovação; não oferece contagens e histórico de presenças. [B/schemas.py:401–404] | Calcula métricas gerais, disciplinas, contagens e linha temporal. [P:2051–2064] |
| `situacao` | `/situacao.aprovado`. [B/routers/dashboard.py:11–18] | Traduz métricas em tags/cores. [P:2066–2068] |
| `vis` | Não há contrato visual equivalente. | Formata aluno, barras, motivo de risco, minigráficos e callbacks. [P:2070–2084] |
| `boletim` | GET `/alunos/{a}/boletim`. [B/routers/avaliacoes.py:94–99] | Monta linhas visuais e ações de limpeza. [P:2087–2100] |
| `resumoSemestre` | E: GET `/semestres/{s}/resumo`. [B/routers/semestres.py:59–82] | Calcula resumo por disciplina. [P:1961–1968] |
| `linhasBoletim` | GET `/alunos/{a}/boletim.csv` é alternativa, com colunas diferentes. [B/routers/avaliacoes.py:107–116] | Monta matriz para CSV local. [P:1855–1858] |
| `escopo` | Backend já filtra por identidade do professor. [B/main.py:102–103,164–166; B/routers/dashboard.py:15–25] | Filtra disciplinas, aulas, avaliações, matrículas, alunos e avisos; mantém outros campos do estado original. [P:1536–1540] |
| `gradeNoDia` | GETs de grade por disciplina fornecem matéria-prima. [B/routers/semestres.py:92–101] | Monta horários de todas as disciplinas visíveis em determinado dia semanal. [P:1872] |
| `conflitoGrade` | Não há rota de verificação de conflito. [B/routers/semestres.py:85–89; B/db.py:358–399] | Valida intervalo, uma aula por dia e sobreposição entre disciplinas. [P:1873–1881] |
| `validarAluno` | Validação parcialmente correspondente aos schemas. [B/schemas.py:25–44] | Nome, idade, sete dígitos, matrícula/email duplicados e formato de email. [P:1987–1995] |
| `notaOk` | Correspondência parcial a `NotaEntrada.valor` de 0–10. [B/schemas.py:261–262] | Exige no máximo uma casa decimal na grade. [P:1526] |
| `telas` | Não é rota HTTP. | Seleciona menu pelo papel. [P:1535,1439–1442] |

Seletores, filtros, paginação, confirmações e menus restantes são alterações locais dos campos inventariados na seção 1; seus callbacks estão em `renderVals()`. A busca global **não executa ação no protótipo**: o botão não tem handler, e Ctrl+K apenas chama `preventDefault()`. [P:40–41,1761,2650–2655,2760–2767,2811–2819,2835–2838,2886–2889]

**3. Cálculos no cliente**

| Cálculo | Regra exata do protótipo | Regra da API | Correspondência/divergência |
|---|---|---|---|
| Média por disciplina | `Σ(nota×peso)/Σ(peso das notas lançadas)`; ignora notas ausentes; retorna `null` se nenhuma lançada. [P:2047–2049] | Mesmo cálculo em `media_ponderada`; boletim separa somente notas não nulas. [B/regras.py:4–8,44–47] | **Equivalente**, para mesmas notas/avaliações. |
| Indicador parcial | `falta>0` quando há algum peso lançado. [P:2048–2049] | `0 < len(lancadas) < len(materia["notas"])`. [B/regras.py:47] | **Equivalente** no caso com alguma nota; sem notas, protótipo retorna `null`, API retorna `media:null,parcial:false`. |
| Média geral do aluno | Média simples das médias das disciplinas matriculadas com nota. [P:2054–2057,2064] | Média simples das médias não nulas do boletim. [B/routers/dashboard.py:16–18; B/regras.py:11–15,51–55] | **Equivalente no mesmo recorte de disciplinas**; a API não restringe essas consultas ao semestre ativo. [B/db.py:857–870] |
| Denominador de frequência por aluno/disciplina | `idx()` incrementa `t` somente quando **aquele aluno** possui valor não nulo no mapa da aula; ignora canceladas. [P:1832–1836] | Conta toda aula agendada da disciplina com **qualquer presença registrada**, mesmo sem registro para aquele aluno. [B/db.py:1021–1025] | **Diverge** para ingresso tardio, chamada parcial ou aluno omitido. Ex.: aluno marcado presente em uma de dez aulas: protótipo pode mostrar 100%; API, 10%. |
| Numerador de frequência | Incrementa `p` somente em aulas não canceladas com marcação verdadeira. [P:1832–1836] | Conta presença verdadeira do aluno sem filtro `au.status='agendada'` no numerador. [B/db.py:1024–1025; B/db.py:1006–1007] | A regra SQL é diferente. A rota normal impede cancelar aula com presença, reduzindo a possibilidade de observar essa diferença por operações regulares. [B/routers/agenda.py:61–63] |
| Unidade da frequência | Razão `p/t` no intervalo 0–1. [P:1965,2064] | Percentual `presentes/aulas*100`. [B/regras.py:18–21] | Converter `/100` antes de alimentar barras e limites do protótipo. |
| Frequência geral do aluno | Soma presenças e marcações entre disciplinas: `Σp/Σt`. [P:2055,2058–2059,2064] | Média simples dos percentuais por disciplina. [B/routers/dashboard.py:17–18; B/regras.py:53] | **Diverge mesmo com chamadas completas.** Ex.: 1/1 em uma disciplina e 0/9 em outra → protótipo 10%; API 50%. |
| Situação | Sem dados se média **ou** frequência nula; aprovado se média ≥6 **e** frequência ≥0,75; senão reprovado. [P:2067–2068] | `None` se qualquer métrica nula; aprovado se média ≥6 e frequência ≥75. [B/regras.py:24–27] | Limites **equivalentes após conversão de unidade**; resultado pode divergir pela frequência geral. |
| Aluno “em risco” no painel | `motivo` existe se média <6 **ou** frequência <75%, independentemente de faltar a outra métrica. [P:2072,2082,2525] | Dashboard inclui somente quem tem `aprovado is False`; com uma métrica nula, aprovado é `None`. [B/regras.py:25–26,72] | **Diverge:** média 4 sem chamada aparece no risco do protótipo, mas não no `alunos_em_risco` da API. |
| Média da turma | Média simples das médias gerais não nulas dos alunos. [P:2527–2528] | Mesmo tipo de média no dashboard. [B/regras.py:70] | Equivalente se recorte e médias forem os mesmos. |
| Frequência média da turma | Média simples das frequências gerais calculadas por aluno. [P:2527,2529] | Média simples das frequências gerais da API. [B/regras.py:71] | Fórmula externa igual; valores internos divergem pelo cálculo geral. |
| Ranking | Alunos com média, ordem decrescente, cinco primeiros. [P:2737] | Mesmo critério e limite de cinco. [B/regras.py:67,73] | Equivalente no mesmo recorte. O protótipo esconde ranking para professor, embora API o devolva. [P:2726] |
| Avaliações sem nota | Avaliação sem nenhuma chave de nota não nula em `notas`. [P:2530] | Avaliação sem registro em `notas`. [B/db.py:874–882] | Equivalente com estado completo e notas ausentes realmente apagadas no servidor. Não significa “algum aluno ainda sem nota”. |
| Frequência do cabeçalho da disciplina | `Σp/Σt` entre os alunos da disciplina. [P:2610–2611] | Não há valor agregado da disciplina nessa rota; `/frequencia` devolve percentual por aluno. [B/schemas.py:364–365; B/routers/frequencia.py:53–61] | Não dá para preservar a ponderação por quantidade de marcações usando somente percentuais. |
| Resumo do semestre: média | Média simples das médias por aluno na disciplina, excluindo ausentes. [P:1964–1967] | Média simples dos valores não nulos. [B/routers/semestres.py:72,80; B/regras.py:11–15] | Equivalente no mesmo semestre. |
| Resumo do semestre: frequência | Média simples dos `p/t` individuais. [P:1965–1967] | Média simples dos percentuais individuais calculados com denominador global da disciplina. [B/routers/semestres.py:70,73,81; B/db.py:329–333] | Diferença de unidade e denominador. |
| Resumo: aprovados/reprovados | Só contabiliza aluno se tiver média e frequência; exige 6/75%. [P:1965] | `regras.aprovado`; só conta `True` ou `False`. [B/routers/semestres.py:74–78] | Mesma exclusão de “sem dados”; depende das divergências de frequência. |
| Presenças, faltas e linha temporal | `presencas=Σp`, `faltas=Σt−Σp`; junta registros ordenados por data. [P:2058–2064] | Rotas JSON públicas de frequência não expõem contagens nem sequência individual. [B/schemas.py:359–365] | **Não há dado equivalente suficiente** para `spark`, `sparkG`, contagens e tooltips. |
| Minigráfico sem registros | `vis()` fabrica doze barras a partir do ID e frequência quando não há linha. [P:2073,2079–2080] | Nenhum equivalente. | É simulação visual; não deve ser interpretada como histórico real. |
| Escopo do professor | Disciplinas com `professor_id===pid`, matrículas dessas disciplinas, união de alunos, aulas/avaliações/avisos compatíveis. [P:1537–1540] | Listas e consultas passam `usuario.id` como professor e filtram no SQL. [B/main.py:102–103,164–173; B/db.py:459–463,552–554; B/routers/avaliacoes.py:98–99] | Backend já fornece o recorte. O protótipo não remove notas/professores/histórico do objeto retornado por `escopo`, mas usa as disciplinas filtradas nas métricas. [P:1540,2053–2061] |
| Total de alunos e pendências | Conta arrays e chaves locais; identifica sem professor, sem grade e semestre sem matrículas. [P:2739,2746–2751] | Dashboard oferece totais, mas sem objeto de pendências. [B/schemas.py:414–420] | Pendências podem ser derivadas de disciplinas+grades+matrículas; somente se o semestre estiver corretamente delimitado. |
| Contagens de aulas/chamadas | Exclui canceladas para total do semestre; conta chamada pelo mapa; calcula semana do período. [P:2585–2587,2869] | Agenda oferece flags por dia/mês; não há resumo de contagens de todo semestre nessas respostas. [B/schemas.py:332–356] | Exige percorrer aulas/meses ou acrescentar agregados. |
| Geração de aulas | Grade semanal do início escolhido ao fim; gera IDs locais; na edição preserva canceladas/remarcadas. [P:1427–1430,1901–1906] | Banco gera de `max(inicio,date.today())` até fim; apaga aulas futuras de grade sem presenças antes de gerar. [B/db.py:377–398] | **Diverge na preservação:** cancelamento e remarcação sem presença podem ser descartados; veja seção 4. |
| Arredondamento de nota | Grade aceita até uma casa; formulário arredonda com `Math.round(n*10)/10`. [P:1526–1533,2847] | `NotaEntrada` aceita float 0–10; banco guarda `NUMERIC(4,2)`. [B/schemas.py:261–262; B/db.py:176–180] | API admite notas com duas casas persistidas; protótipo trabalha com uma. |
| Arredondamento de média | Cálculo não arredonda; apresentação usa `toFixed(1)`. [P:1449,2049,2064] | Boletim/situação calculam sem arredondamento explícito. Média do cadastro usa coluna de duas casas; média de professor é convertida para `numeric(4,2)`. [B/regras.py:8,15; B/db.py:107,450,798–805] | Para as regras, usar valor bruto do boletim/situação. A apresentação pode mostrar 6,0 enquanto o valor usado para aprovação ainda é <6. |
| Arredondamento de frequência | Exibição `Math.round(f*100)+'%'`. [P:1450] | API devolve percentual sem `round`. [B/regras.py:21] | Exibição arredondada não deve alterar o limite de 75%. |

**Validações de domínio que também diferem**

| Regra | Protótipo | API |
|---|---|---|
| Matrícula | Exatamente sete dígitos. [P:1991] | String de 1–20 caracteres. [B/schemas.py:28] |
| Idade | 1–120. [P:1990] | 0–120; saída anulável. [B/schemas.py:27,51] |
| Email | Regex de email e checagem local contra alunos/professores conhecidos. [P:1993–1994,2007–2008] | Strings de 3–120 caracteres; unicidade em `usuarios.email`; não usa schema de email. [B/schemas.py:30,106; B/db.py:157–162] |
| Nome de disciplina | Unicidade local sem diferença de maiúsculas/minúsculas. [P:1896] | `UNIQUE(semestre_id,nome)` no banco. [B/db.py:127–132] |
| Nome de semestre | Recusa nome já existente no atual/histórico. [P:1976] | Tabela não tem unicidade de nome; índice único controla apenas semestre ativo. [B/db.py:112–123] |
| Aviso duplicado | Edição recusa mesmo título, sem diferença de caixa, na mesma data. [P:2025] | PATCH não executa essa verificação; tabela não define essa unicidade. [B/routers/avisos.py:31–42; B/db.py:203–208] |
| Nova senha igual à atual | Recusa na troca comum. [P:2033] | Rota confere senha atual, mas não compara nova/atual. [B/routers/auth.py:32–36] |
| Datas | Várias ações usam regex ISO e comparação de strings. [P:1417,1938–1939,1977–1978] | Campos são `date`; validação de calendário vem do schema. [B/schemas.py:134–135,303,310,371] |

**4. Lacunas do backend, por impacto**

As sugestões são alterações mínimas de contrato, não implementação.

| Impacto | O que o protótipo mostra/faz e tela dependente | Lacuna confirmada | Sugestão mínima |
|---|---|---|---|
| **1 — Todo o portal: recorte por semestre** | Abrir semestre limpa disciplinas, matrículas, notas, avaliações e aulas; telas rotulam dados como pertencentes ao semestre atual. [P:1980,2755,2771,2861] | Listas de disciplinas, boletim, frequência, dashboard, professores e avisos não recebem filtro de semestre; várias consultas incluem disciplinas encerradas. `semestre_id` é removido da resposta pública da disciplina. [B/main.py:163; B/db.py:549–565,674–687,857–870,1017–1032,1055–1072,1109–1123; B/schemas.py:93–101] | Expor `DisciplinaSaida.semestre_id` e acrescentar `semestre_id` nas consultas acadêmicas, totais e agenda; definir padrão explícito para semestre atual. |
| **2 — Meu painel do aluno: próximas aulas reais** | Mostra cinco próximas aulas com horário, cancelamento e selo Extra. [P:2624–2625,2895] | A não pode acessar `/agenda`, `/agenda/mes` nem `/disciplinas/{d}/aulas`; grade semanal não revela cancelamentos, extras ou remarcações. [B/routers/agenda.py:13–23; B/routers/frequencia.py:16,46–49; B/routers/semestres.py:92–101] | `GET /alunos/{a}/agenda?de=&ate=` ou permitir agenda filtrada pela matrícula para A, com `AgendaItem` adequado à leitura. |
| **3 — Frequência: histórico e contagens individuais** | Painel/lista/detalhe mostram barras recentes, presenças, faltas e tooltips por aula. [P:2079–2081,2949] | JSON de frequência entrega apenas `percentual`; aluno não acessa chamada da turma. [B/schemas.py:359–365; B/routers/frequencia.py:39–43,80–90] | Acrescentar `presentes,aulas,faltas` e `GET /alunos/{a}/presencas?disciplina_id=&semestre_id=` com `{aula_id,disciplina_id,data,presente}`. |
| **4 — Aprovação e risco** | Situação e alertas dependem das regras locais de frequência e de risco com dados parciais. [P:2064–2082,2525] | API calcula outra frequência geral/denominador e exclui de risco aluno sem uma das métricas. [B/db.py:1021–1025; B/regras.py:53,72] | Escolher a regra oficial; para preservar o aprovado, ajustar cálculo da API e devolver `em_risco`/motivos independentemente de `aprovado`. |
| **5 — Administração de acesso do aluno** | Detalhe mostra email, “sem email” e redefinição; editar email cria nova senha provisória. [P:1130,2000–2001,2950–2952] | `AlunoSaida` não informa login/email; `AlunoAtualizacao` não aceita email. `/usuarios` cria acesso com senha fornecida e não replica a geração provisória do fluxo. [B/schemas.py:33–57,212–232; B/routers/auth.py:39–51; B/db.py:699–704] | Campo `email_acesso`/`tem_login` no aluno e rota E `PUT /alunos/{a}/acesso` com `{email}` → `{email,senha_provisoria_texto}`; definir atualização/remoção de acesso. |
| **6 — Agenda e chamada: detalhe de todas as aulas** | Subaba Chamada, total de aulas, lista por horário, canceladas e extras. [P:2612,2782–2790] | GET de aulas suprime horário/status/origem; exige combinar lista, agenda diária e mensal. [B/routers/frequencia.py:46; B/schemas.py:296–299,332–352] | Usar `AulaDetalheSaida` no GET de aulas e acrescentar `chamada_feita,presentes,total`, com filtro de período. |
| **7 — Autoria do aviso** | Professor só vê editar/excluir nos avisos próprios. [P:2593] | Backend possui/verifica `autor_id`, mas não o devolve em `AvisoSaida`. [B/routers/avisos.py:35–36,50–51; B/schemas.py:391–394] | Expor `autor_id:int|null`, ou `pode_editar,pode_excluir` calculados pelo servidor. |
| **8 — Remarcação persistida** | Agenda mostra “Remarcada de DD/MM”; grade preserva aula remarcada. [P:1945,1903–1905,2566] | Não há campo de origem da remarcação; PATCH só altera aula. [B/db.py:234–241,946–954; B/schemas.py:325–340] | Persistir/expor `remarcada_de:date|null`; preservar primeira data original. |
| **9 — Alteração da grade desfaz exceções** | Editor promete preservar o ocorrido; implementação preserva extras, remarcadas e cancelamentos futuros. [P:1902–1906,2911] | Banco apaga toda aula futura de grade sem presença, inclusive cancelada ou remarcada ainda de origem grade; depois recria agendada. [B/db.py:380–394] | Excluir da regeneração canceladas/remarcadas, usando o campo anterior e status; devolver quantidade efetiva gerada. |
| **10 — Primeiro acesso obrigatório** | Tela afirma que usuário deve criar senha antes de continuar. [P:217–224] | `/auth/me` oferece flag, mas `usuario_atual` e dependências não bloqueiam acesso enquanto `senha_provisoria` é verdadeiro. [B/schemas.py:232; B/auth.py:45–88] | Dependência que permita apenas `/auth/me` e troca de senha enquanto provisória; manter navegação obrigatória no cliente. |
| **11 — Cadastro sem professor** | “Sem professor” é opção normal e vira pendência. [P:2812,2746–2749] | POST com `professor_id:null` é rejeitado; omissão do campo funciona. PATCH permite null. [B/schemas.py:64–80] | Remover a rejeição de null na criação; até lá, adapter omite campo quando não escolhido. |
| **12 — Chamada completa** | Exige marcação de todos e substitui o mapa integral da aula. [P:1925–1929] | PUT faz upsert apenas dos itens enviados; aceita chamada parcial e não elimina itens anteriores omitidos. Não verifica matrícula no SQL da gravação. [B/db.py:958–975] | Validar lista completa contra matriculados ou distinguir “substituir chamada” de “atualizar presenças”; devolver chamada consolidada/contagens. |
| **13 — Remarcação e horários** | Recusa fora do semestre, horários vazios/invertidos e qualquer remarcação de aula com chamada. [P:1937–1943] | PATCH não valida período nem ordem entre horários; bloqueio por presença ocorre ao cancelar ou mudar data, não numa alteração só de horário. POST extra também não valida o par/ordem dos horários. [B/routers/agenda.py:42–67; B/schemas.py:302–322] | Validar período, par de horários e `hora_fim>hora_inicio`; uniformizar bloqueio de alteração com presença. |
| **14 — Choques de grade** | Escola recebe erro de choque entre disciplinas; uma aula por dia na mesma disciplina. [P:1875–1879] | Grade valida só horários e duplicidade `(dia_semana,hora_inicio)`; aceita dois horários no mesmo dia, mas geração usa unicidade `(disciplina_id,data)` e descarta conflito. [B/schemas.py:153–172; B/db.py:189,371–394] | Validar uma aula por dia e sobreposição antes do PUT; devolver 409 com disciplina/horário conflitante. |
| **15 — Histórico do aluno para excluir** | Detalhe pode explicar que aluno tem histórico em determinado semestre. [P:2105] | DELETE bloqueia, mas devolve só mensagem genérica; aluno público não possui indicador de histórico. [B/main.py:131–134; B/schemas.py:48–53] | `possui_historico_encerrado` e `semestres_com_historico:[{id,nome}]`, ou detalhe estruturado no erro. |
| **16 — Último semestre após encerramento** | Mantém semestre encerrado e dados visíveis, inclusive após fechar. [P:1985,2644,2870] | `/semestres/atual` passa a devolver 404; P/A não podem listar semestres para recuperar o último. [B/routers/semestres.py:36–45] | Rota de leitura do semestre de referência por perfil ou exposição do semestre nas disciplinas/boletim; para E, usar a lista existente. |
| **17 — Resumo antes de encerrar para professor** | Texto da apresentação diz que professor vê resumo antes de encerrar. [P:1472] | Menu real do professor não tem Semestre; API de resumo exige E. [P:1441; B/routers/semestres.py:12,59] | Se essa promessa fizer parte da entrega, permitir resumo filtrado pelas disciplinas do professor. O comportamento operacional atual não depende dessa tela. |
| **18 — Unicidades prometidas pela UI** | Impede nome de semestre repetido, disciplina com diferença apenas de caixa e aviso duplicado na edição. [P:1976,1896,2025] | Banco não implementa as mesmas unicidades. [B/db.py:112–123,127–132,203–208] | Acrescentar validações de negócio equivalentes e 409 específicos, se as regras forem preservadas. |
| **19 — CSV com o formato aprovado** | Boletim tem cinco colunas; frequência inclui aluno/matrícula/presenças/aulas/frequência/média, com formatação brasileira. [P:1856–1857,2618] | CSV de boletim inclui `Parcial`; CSV de frequência não inclui média e tem ordem/cabeçalhos próprios. [B/routers/avaliacoes.py:107–116; B/routers/frequencia.py:69–72] | Manter exportação local com dados completos ou acrescentar formato/versionamento ao CSV da API. |
| **20 — Salvar disciplina e grade como uma ação** | Uma ação local modifica metadados e aulas conjuntamente. [P:1909] | API usa POST/PATCH de disciplina seguido de PUT separado de grade. [B/main.py:150–184; B/routers/semestres.py:85–89] | Adapter pode executar em sequência e comunicar falha parcial; se atomicidade for requisito, aceitar `grade` na criação/edição transacional. |

**Ajustes necessários no cliente reaproveitado, sem mudança no backend**

| Ponto | Evidência e consequência |
|---|---|
| Perfis E/P/A | `Sessao` e `ProtectedRoute` só tipam professor/aluno; validação de sessão rejeita `'escola'` ao ler o storage. [F/src/auth/sessao.ts:1–5,22–28; F/src/auth/ProtectedRoute.tsx:4–15] |
| Identidade completa | `AuthContext.entrar()` guarda token, perfil, aluno_id e email do formulário; não chama `/auth/me`, nem guarda ID de professor, nome ou flag provisório. [F/src/auth/AuthContext.tsx:16–26] |
| Tipos antigos incompletos | `Aluno` não tipa media/email/acesso; `Disciplina` não tipa professor/grade; `Aviso` não tipa destino/autor; `Aula` só tipa ID/disciplina/data. [F/src/types.ts:1–23,53–75] |
| Métodos HTTP adicionais | `api.ts` cobre listas básicas, criação/exclusão, matrícula, notas, chamadas, frequência, avisos e dashboard; não oferece as operações de semestre/grade/professores/troca e redefinição de senha/edições necessárias ao protótipo. [F/src/api.ts:81–267,270–365] |
| Status de erro | Interceptor converte toda falha em `Error`, impedindo distinguir 404 esperado de `/semestres/atual`, 403 de escopo e 409 de conflito pelo status. [F/src/http.ts:30–39] |
| Troca de senha | 401 por senha atual errada dispara logout automático no HTTP atual. [F/src/http.ts:34–37; B/routers/auth.py:34] |
| Reuso útil | Há percurso de todas as páginas, construção de mapa de chamada e conversão dos campos de situação/dashboard. [F/src/api.ts:56–68,213–222,237–245,288–322] |
| Busca global | Cliente antigo já faz três GETs paginados de busca; protótipo não implementa essa interação. Não é uma rota faltante do backend. [F/src/api.ts:353–364; P:40–41,1761] |

**5. Estratégia de carga**

**Limite confirmado:** não existe sequência de GETs capaz de reconstruir integralmente o estado aprovado para todos os perfis. Faltam email/acesso dos alunos, autor de avisos, origem de remarcação e agenda do aluno; frequências resumidas não recompõem os mapas/históricos de `idx()`. [B/schemas.py:48–57,296–365,391–394; B/routers/agenda.py:13–23; P:1827–1841,2593,2624–2625,2950]

A proposta abaixo monta **coleções acadêmicas disponíveis, métricas oficiais e agenda inicial**, deixando histórico detalhado e consultas por aula sob demanda. Exige adaptar os cálculos/renderização para aceitar os dados agregados da API, em vez de fabricar chamadas a partir de percentuais. [P:1827–1841,2051–2064; B/schemas.py:359–365,401–420]

**Escola — sequência ordenada**

| Etapa | Chamadas | Paralelismo e montagem |
|---|---|---|
| 1 | `GET /auth/me`. [B/routers/auth.py:24–28] | Confirmar identidade/perfil antes de escolher carga. |
| 2 | `GET /semestres/atual`; `GET /semestres`; `GET /alunos?tamanho=100`; `GET /disciplinas?tamanho=100`; `GET /avisos?tamanho=100`; `GET /professores`; `GET /dashboard`; `GET /avaliacoes/pendentes`; `GET /agenda?data=hoje`; `GET /agenda/mes?mes=atual`. [B/main.py:93–103,162–166; B/routers/semestres.py:36–46; B/routers/avisos.py:13–17; B/routers/professores.py:28–30; B/routers/dashboard.py:21–28; B/routers/avaliacoes.py:124–132; B/routers/agenda.py:16–35] | Dez chamadas independentes em paralelo. 404 de semestre ativo representa ausência, não falha geral. Lista de semestres permite recuperar último encerrado e cabeçalhos do histórico. |
| 3 | Para cada disciplina: `GET /disciplinas/{d}/grade`; `/avaliacoes`; `/frequencia`. [B/routers/semestres.py:92–101; B/routers/avaliacoes.py:42–50; B/routers/frequencia.py:53–61] | Em paralelo após obter IDs. Frequência da turma fornece roster e percentual; construir `mats` sem repetir `/alunos`. [B/db.py:1008–1011] |
| 4 | Para cada aluno: `GET /alunos/{a}/boletim`; `/situacao`. [B/routers/avaliacoes.py:94–99; B/routers/dashboard.py:11–18] | Em paralelo após lista de alunos. Montar `notas`/avaliações aninhadas e métricas gerais oficiais. |

**Contagem:** `11 + 3D + 2A`. Com **6 alunos e 4 disciplinas: 35 GETs após login**; **36 requisições contando POST de login**. A contagem pressupõe uma página por lista e não inclui resumos históricos nem chamadas por aula. É uma carga conservadora: dashboard/pendentes fornecem contratos oficiais mesmo quando alguns dados poderiam ser derivados dos demais GETs. [Rotas citadas nas etapas; paginação: B/main.py:98–99,163; B/routers/avisos.py:14]

**Professor — sequência ordenada**

| Etapa | Chamadas | Paralelismo e montagem |
|---|---|---|
| 1 | `GET /auth/me`. [B/routers/auth.py:24–28] | `profId=me.id`; não chamar `/professores`. |
| 2 | `GET /semestres/atual`; `/alunos?tamanho=100`; `/disciplinas?tamanho=100`; `/avisos?tamanho=100`; `/dashboard`; `/avaliacoes/pendentes`; `/agenda?data=hoje`; `/agenda/mes?mes=atual`. [B/main.py:93–103,162–166; B/routers/semestres.py:41–46; B/routers/avisos.py:13–17; B/routers/dashboard.py:21–28; B/routers/avaliacoes.py:124–132; B/routers/agenda.py:16–35] | Oito chamadas em paralelo. Todas as consultas acadêmicas já usam a identidade autenticada para filtrar o professor. |
| 3 | Por disciplina recebida: `/grade`, `/avaliacoes`, `/frequencia`. [B/routers/semestres.py:92–101; B/routers/avaliacoes.py:42–50; B/routers/frequencia.py:53–61] | Em paralelo; montar disciplinas, matrículas e percentuais visíveis. |
| 4 | Por aluno recebido: `/boletim`, `/situacao`. [B/routers/avaliacoes.py:94–99; B/routers/dashboard.py:11–18] | Em paralelo; respostas também ficam restritas às disciplinas do professor. |

**Contagem:** `9 + 3Dp + 2Ap`, usando apenas disciplinas/alunos devolvidos ao professor.

| Cenário | GETs após login | Com POST de login |
|---|---:|---:|
| Professor com as 4 disciplinas e os 6 alunos | 33 | 34 |
| Carlos, com 2 disciplinas e os 6 alunos do protótipo | 27 | 28 |
| Marta, com 1 disciplina e os 6 alunos do protótipo | 24 | 25 |
| Professor sem disciplina/aluno | 9 | 10 |

Carlos/Marta têm esses vínculos e matrículas no protótipo; não se deve inferir a distribuição de um banco real apenas pelo total de seis alunos/quatro disciplinas. [P:1433–1436,1445,1485–1492]

Para preservar `renderVals()` com pouca adaptação, a identidade do professor pode alimentar um `profs` contendo apenas ele; o backend oferece nome/email/ID em `/auth/me`, enquanto a listagem completa é exclusiva da escola. [P:2485–2486; B/schemas.py:226–232; B/routers/professores.py:28]

**Aluno — sequência ordenada**

| Etapa | Chamadas | Paralelismo e montagem |
|---|---|---|
| 1 | `GET /auth/me`. [B/routers/auth.py:24–28] | Obter `aluno_id`; verificar senha provisória. |
| 2 | `GET /semestres/atual`; `GET /alunos/{aluno_id}`; `GET /alunos/{aluno_id}/disciplinas`; `GET /avisos?tamanho=100`; `GET /alunos/{aluno_id}/boletim`; `/frequencia`; `/situacao`. [B/main.py:106–112,218–224; B/routers/semestres.py:41–46; B/routers/avisos.py:13–17; B/routers/avaliacoes.py:94–99; B/routers/frequencia.py:80–90; B/routers/dashboard.py:11–18] | Sete chamadas em paralelo. `alunos=[próprio aluno]`; montar matrículas pelas disciplinas; avaliações/notas pelo boletim. |
| 3 | Por disciplina recebida, `GET /disciplinas/{d}/grade`. [B/routers/semestres.py:92–101] | Paralelo após disciplinas. Oferece grade semanal; não substitui agenda real de próximas aulas. |

**Contagem:** `8 + Da`. Aluno matriculado nas **4 disciplinas: 12 GETs após login**, ou **13 contando login**. Se grade não for consumida pelo painel final, a base é **8 GETs**. O painel atual usa aulas reais para próximas aulas; os 12 GETs não resolvem esse bloco. [P:2624–2625; B/routers/agenda.py:13–23]

**Carga sob demanda**

| Gatilho | Chamadas adicionais | Justificativa |
|---|---|---|
| Abrir uma chamada | **1 GET** `/disciplinas/{d}/chamada?data=...`. [B/routers/frequencia.py:39–43] | Só então obter o mapa de presença; flags da agenda bastam para lista/calendário. |
| Trocar dia da agenda | **1 GET** `/agenda?data=...`, se não estiver em cache. [B/routers/agenda.py:16–19] | Horários/status/contagens daquele dia. |
| Trocar mês | **1 GET** `/agenda/mes?mes=...`, se não estiver em cache. [B/routers/agenda.py:22–35] | Datas/flags do calendário. |
| Abrir histórico de semestre | **1 GET por semestre** `/semestres/{s}/resumo`. [B/routers/semestres.py:59–82] | A lista de semestres não inclui resumo. |
| Abrir confirmação de encerramento | **1 GET** de resumo do semestre atual. [B/routers/semestres.py:59–82] | Usar números oficiais para confirmar a operação. |
| Abrir subaba Chamada | `/disciplinas/{d}/aulas`; complementar com agenda dos dias necessários. [B/routers/frequencia.py:46–50; B/routers/agenda.py:16–19] | O GET simples fornece IDs/datas, mas não todos os metadados usados na subaba. |
| Exportar boletim/frequência | **1 GET CSV** se optar pelo arquivo do servidor. [B/routers/avaliacoes.py:102–120; B/routers/frequencia.py:64–76] | Não precisa entrar na carga inicial. |
| Histórico individual/minigráficos | Atualmente, E/P precisariam de chamadas por aula; A não consegue obter o histórico pelas rotas existentes. [B/routers/frequencia.py:39–49; P:2079–2081] | Preferir rota individual proposta na seção 4. |

**Custo de tentar reconstruir `aulas[].chamada` integralmente**

| Informação | Custo atual |
|---|---|
| Aulas de todas as disciplinas | `D` GETs de `/aulas`; ainda sem horário/status/origem no JSON. [B/routers/frequencia.py:46–50; B/schemas.py:296–299] |
| Descobrir chamadas feitas ao longo do período | Um GET mensal por mês ou GET diário pelas datas; agenda mensal fornece flag e IDs. [B/routers/agenda.py:22–35; B/schemas.py:346–356] |
| Reconstruir mapa de cada chamada feita | Um GET por par disciplina/data com chamada. [B/routers/frequencia.py:39–43] |
| Completar horários/origem de aulas já existentes | GET diário por data pertinente, porque o GET simples e o mensal não fornecem todos esses campos. [B/schemas.py:296–299,332–352] |

Portanto, **6 alunos e 4 disciplinas não determinam o número total de chamadas da reconstrução integral**: o custo também depende de meses, datas com aulas e quantidade de chamadas realizadas. Além disso, as lacunas de contrato continuam mesmo após esse percurso. [P:1427–1430,1500–1506; contratos citados na tabela]

**Paginação**

| Endpoint | Contrato e percurso |
|---|---|
| `/alunos` | `pagina>=1`, `1<=tamanho<=100`, padrão dez; filtros `q,idade_minima,media_minima`. Resposta `{itens,total,pagina,tamanho}`. [B/main.py:93–103; B/schemas.py:238–242] |
| `/disciplinas` | Mesma paginação; filtro `q`; recorte por professor/aluno feito no servidor. [B/main.py:162–166; B/db.py:549–565] |
| `/avisos` | Mesma paginação; filtro `q`; ordem `data DESC,id DESC`. [B/routers/avisos.py:13–17; B/db.py:1064–1071] |
| Percurso | Pedir `tamanho=100,pagina=1`, acumular `itens`, incrementar página até acumulado ≥`total`; interromper também se página vazia. Cliente antigo já faz isso. [F/src/api.ts:56–68] |
| Demais listas | Professores, semestres, avaliações, roster, aulas, boletim, frequência, agenda e resumo retornam arrays sem parâmetros de paginação nas rotas atuais. [B/routers/professores.py:28–30; B/routers/semestres.py:36–38,59–82,92–101; B/routers/avaliacoes.py:42–50,94–99; B/main.py:169–173,218–224; B/routers/frequencia.py:39–61,80–90; B/routers/agenda.py:16–35] |
| Custo com mais itens | Substituir cada GET paginado da contagem por `max(1,ceil(total/100))`; páginas de uma lista podem ser sequenciais como no cliente atual. [F/src/api.ts:59–67] |
| Ordenação da UI | API de alunos/disciplinas ordena por ID; protótipo ordena nome/média/frequência/idade antes de paginar. Para preservar o comportamento, carregar conjunto completo ou acrescentar ordenação ao backend. [B/db.py:473,564; P:2516–2519] |

**Invalidar dados após ações**

| Alteração | Recarregar/invalidar |
|---|---|
| Nota lançada/limpa | Boletim e situação do aluno; dashboard; pendentes; dados/resumo da disciplina afetada. A API recalcula média armazenada ao lançar/apagar. [B/db.py:812–839; P:2530,2616,2737] |
| Chamada salva | Chamada do dia; agenda diária/mensal; frequência da turma e situação dos alunos; dashboard/resumo. [B/routers/frequencia.py:26–60; B/routers/dashboard.py:16–26] |
| Matrícula/desmatrícula | Roster/`mats`, disciplinas do aluno, boletim/frequência/situação e totais pertinentes. [B/main.py:197–224; B/db.py:857–867,1026–1029] |
| Grade/extra/remarcação/status | Agenda do dia e mês afetados, lista de aulas e contagens. Remarcação afeta data anterior e nova. [B/routers/agenda.py:38–67; B/routers/semestres.py:85–89] |
| Encerrar/abrir semestre | Semestre atual/lista/histórico e todo recorte acadêmico; não usar o flag de existência de um novo ativo para liberar disciplina antiga encerrada. [P:1980–1985; B/routers/semestres.py:15–21] |

**6. Perfil e rota**

| Assunto | Protótipo atual | Ligação correta com autenticação real |
|---|---|---|
| Escolha de papel | Email da escola → `'escola'`; email em `profs` → `'prof'`; email em `alunos` → `'aluno'`; desconhecido → `papelEscolhido`. [P:2716–2718] | Papel deve vir da identidade autenticada: `escola→escola`, `professor→prof`, `aluno→aluno`. `/auth/login` já fornece perfil; `/auth/me` confirma identidade completa. [B/routers/auth.py:16–28] |
| ID do professor | Busca professor pelo email; usa ID 1 como fallback. [P:2720,1661] | `/auth/me.id` é ID do usuário professor e coincide com `disciplinas.professor_id`; backend compara esses IDs. [B/schemas.py:227; B/auth.py:75; B/db.py:264–265] |
| ID do aluno | `me` escolhe aluno ID 1, primeiro da lista ou Ana fictícia; não usa o email autenticado para esse painel. [P:2622] | Usar `/auth/me.aluno_id`; o ID do usuário não substitui o ID do aluno. [B/schemas.py:227–232; B/auth.py:81] |
| Nome/email no avatar | Escola e aluno têm valores fixos; professor vem de `profs`. [P:2646–2647] | Usar `/auth/me.email/nome`; para aluno, `/auth/me` busca nome no cadastro. [B/routers/auth.py:25–28] |
| Token | Não há token no estado inicial nem no handler de login. [P:1542–1560,2716–2720] | POST login fornece `access_token`; enviá-lo como Bearer. HTTP atual já injeta token da sessão. [B/routers/auth.py:16–20; F/src/http.ts:6–11] |
| Conteúdo do JWT | Protótipo não o consome. | JWT contém `sub` do usuário e `exp`, com validade de oito horas; não contém perfil nem `profId`. Backend carrega usuário pelo `sub`. [B/auth.py:32–34,45–55] |
| Menu por perfil | Escola: painel, semestre, disciplinas, professores, alunos, matrículas, agenda, avisos. Professor: painel, agenda, minhas disciplinas, meus alunos, avisos. Aluno: sem menu de equipe. [P:1439–1442] | Preservar menus e resolver permissão com perfil de `/auth/me`; não usar o seletor da apresentação como autorização. |
| Entrada por perfil | `entrarComo()` manda aluno para `'meu-painel'`; E/P para `'painel'`. [P:1661] | Após autenticação e tratamento de primeiro acesso, aplicar o mesmo destino usando perfil real. |
| Tela fora do perfil | `ir()` verifica apenas E/P e volta à primeira tela com aviso. [P:1791] | Proteger também rotas reais de aluno; backend já recusa consultas de outro aluno/perfil. [B/auth.py:80–88] |
| Professor sem permissão | Demonstração força `semPerm:3`; `renderVals()` mostra estado específico. [P:1614,2776] | Transformar 403 `"Sem permissão para esta disciplina"` no mesmo estado de UX; manter status acessível no cliente. [B/auth.py:77; F/src/http.ts:39] |
| Professor sem disciplina | `escopo` produz listas vazias e mensagem para falar com secretaria. [P:1536–1540,2734] | Listas já filtradas podem legitimamente estar vazias; não fazer fallback para disciplinas/ID de outro professor. [B/main.py:164–166; B/db.py:552–554] |
| URLs | `ir()` muda `state.tela`; não implementa navegação de URL no método. [P:1789–1805] | Mapear IDs de tela para rotas do app real; `ProtectedRoute` antigo precisa incorporar escola e primeiro acesso. [F/src/auth/ProtectedRoute.tsx:4–17] |
| Sair | Só desloga estado local do protótipo. [P:2649] | Limpar sessão/token em memória e armazenamento; rotina antiga existe. [F/src/auth/AuthContext.tsx:29–31; F/src/auth/sessao.ts:46–51] |

**Fluxo de senha provisória**

| Passo | Comportamento confirmado e integração |
|---|---|
| 1. Criar aluno com email | Backend gera senha provisória, cria usuário aluno com `senha_provisoria=TRUE` e devolve `senha_provisoria_texto` somente na criação. Sem email, não cria usuário. [B/main.py:70–81; B/db.py:423–429] |
| 2. Criar professor | Backend gera senha e usuário professor provisório, devolvendo o texto. [B/routers/professores.py:15–25] |
| 3. Mostrar/copiar | Alimentar `senhaProv.senha` com o texto retornado, mantendo email/nome do formulário; fechar painel limpa essa caixa. Não chamar `senhaNova()` no cliente. [P:1817,2946; B/schemas.py:57,125] |
| 4. Redefinir | Rotas atualizam hash e marcam provisória; retornam nova senha. [B/main.py:85–90; B/routers/professores.py:33–38; B/db.py:724–735] |
| 5. Login | Validar email e senha por POST `/auth/login`; guardar token; chamar `/auth/me`. Resposta do login **não inclui** `senha_provisoria` nem ID do professor. [B/routers/auth.py:11–28; B/schemas.py:205–232] |
| 6. Decidir primeiro acesso | Se `/auth/me.senha_provisoria===true`, abrir `primeiro-acesso`; identidade vem de `/auth/me`, não dos arrays carregados. Hoje o protótipo verifica `pf.provisoria/al.provisoria`. [P:2719; B/schemas.py:232] |
| 7. Guardar senha provisória para a troca | Tela pede apenas nova senha e confirmação; API exige também `senha_atual`. Manter a senha usada no login transitoriamente em memória para compor o POST. [P:226–227; B/schemas.py:189–191] |
| 8. Salvar nova senha | `POST /auth/trocar-senha` `{senha_atual:senhaDoLogin,senha_nova:sNova}`; conferir confirmação localmente; só entrar após sucesso. [B/routers/auth.py:31–36; P:2040–2044] |
| 9. Atualizar flag | Banco marca `senha_provisoria=FALSE`; novo `/auth/me` confirma. A rota não emite novo token. [B/db.py:739–742; B/routers/auth.py:35–36] |
| 10. Limpar segredo transitório | Depois da troca/saída, limpar senha do login e strings de formulário; protótipo já limpa nova/confirmada, mas seu primeiro acesso não faz a chamada real. [P:2043,2649] |
| 11. Restrição no servidor | Hoje o token provisório pode acessar as demais rotas, pois dependências não verificam o flag. A obrigatoriedade existe apenas como fluxo a implementar no cliente, salvo a mudança sugerida na seção 4. [B/auth.py:45–88] |
| 12. Acesso direto de demonstração | Prop “Primeiro acesso” abre a tela sem login/identidade; `primeiroEmail` cai no fallback Ana e `primeiroPapel` no fallback aluno. Isso não fornece credenciais suficientes para o POST real. [P:1610,2042,2944] |

**Suspeitas não confirmadas**

- **Respostas efetivas em execução:** não foram chamados endpoints; não foram confirmados cabeçalhos/status de falhas inesperadas além dos explicitamente definidos nas rotas.
- **Estado do banco:** seis alunos/quatro disciplinas são premissas de dimensionamento; não foi confirmado que o banco em uso contém exatamente esses registros ou os mesmos semestres/aulas do canvas.
- **Tratamento global de exceções de infraestrutura:** não foi confirmado comportamento de proxy/servidor diante de falha de conexão, erro SQL não traduzido ou configuração de produção.
- **Atualização simultânea por vários usuários:** os GETs propostos não formam um snapshot transacional único; consistência observada durante edições concorrentes não foi testada.

**A maior incompatibilidade é o recorte por semestre: o protótipo trabalha com um estado acadêmico isolado por período, enquanto consultas da API podem misturar períodos e omitem `semestre_id` da disciplina pública, afetando listas, médias, frequência, pendências e bloqueios. [P:1980; B/db.py:549–565,857–870,1017–1032; B/schemas.py:93–101]**