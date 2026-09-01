# Roteiro de Apresentação — Portal de Gestão Escolar

Hoje, 19:30. Duração total sugerida: ~15 min (demo 6-8 min + código 5 min + margem pra perguntas).

---

## 1. Abertura (30 s)

"Portal de Gestão Escolar é um frontend React/TypeScript que simula a gestão acadêmica de uma turma: alunos, disciplinas, matrículas, notas, chamada e avisos — sem backend real, a API é simulada em memória (`src/api.ts`) a partir de dados mockados (`src/mock.ts`), mas com as mesmas regras de negócio que um sistema real teria."

A tese: "Isso não é um CRUD de alunos. É um motor de cálculo — média ponderada por avaliação, frequência por chamada real, e uma regra de aprovação que cruza os dois. Nada disso é armazenado: tudo é recalculado na hora, a partir dos dados brutos."

---

## 2. Roteiro da demo ao vivo (~6-8 min)

Ordem de cliques. Dados concretos abaixo — use-os, não improvise.

### Passo 0 — Entry
Tela inicial tem dois botões: **"Entrar no portal"** e **"Ver como aluno"**. Diga: "o mesmo dado serve pros dois públicos — o professor edita, o aluno só lê." Clique em **"Entrar no portal"** → tela de carregando → Home.

### Passo 1 — Home
7 cards: Gestão de Alunos, Disciplinas, Matrículas, Painel, Boletim, Frequência, Mural de Avisos. Diga: "cada card é uma função, sem menu escondido."

### Passo 2 — Gestão de Alunos (drawer)
Clique no card **Gestão de Alunos**. Na lista, clique em **"Carlos Eduardo Lima"**.
- Abre o `AlunoDrawer` pela direita.
- Ele está matriculado só em **Python**. Nota de P1 = 4.5 (peso 40), P2 sem nota ainda → média mostra **"4.5 (parcial)"**.
- Frequência de Python: **50%**.
- Selo no topo: **"Reprovado"**.
- Fale: "reprovado porque nem a média nem a frequência batem o corte — vamos consertar a média já já, e depois quebrar a frequência de propósito, pra mostrar que os dois critérios são independentes."
- Feche o drawer (X ou clique fora).

### Passo 3 — Disciplinas (avaliações e validação de peso)
Clique em **Disciplinas**. Clique no card **Python** — expande as avaliações (`FormAvaliacao`): **P1 (peso 40)**, **P2 (peso 60)**, soma = 100.
- Tente cadastrar uma 3ª avaliação com peso > 0 (ex.: "P3", peso 10). O sistema recusa: *"A soma dos pesos não pode passar de 100 (já soma 100)"*.
- Fale: "os pesos são configurados por disciplina, não por aluno — isso evita pesos inconsistentes entre alunos da mesma turma."

### Passo 4 — Boletim (lançar nota e ver a média recalcular)
Clique em **Boletim**. No seletor de alunos, escolha **Carlos Eduardo Lima**.
- No formulário: Avaliação = **"Python — P2 (peso 60)"**, Nota = **8.0**. Clique **"Lançar nota"**.
- **Resultado esperado na tela**: a média de Python do Carlos sobe de **"4.5 (parcial)"** para **"6.6"** (deixa de ser parcial — as duas avaliações da matéria já têm nota).
- Fale: "a média é ponderada: (4.5×40 + 8.0×60) / 100 = 6.6. Enquanto falta nota, ela reponderam só o que já foi lançado — por isso aparecia 'parcial'."

### Passo 5 — Frequência (calendário, marcar falta, turma muda)
Clique em **Frequência**. O calendário abre automaticamente no mês da última aula registrada da disciplina — pro mock, **agosto/2026**. Os dias com aula aparecem com um pontinho (dias 20 e 27, para Python). Se por algum motivo abrir em setembro, clique em **"‹"** (mês anterior).
- Disciplina selecionada: **Python**. Clique no dia **20**.
- Abre o painel de chamada do dia (`PainelChamadaDoDia`), já pré-carregado com quem estava presente. Carlos aparece como **"Presente"**.
- Clique no botão de presença do Carlos pra virar **"Ausente"**. Clique **"Salvar chamada"**.
- **Resultado esperado**: no quadro "Frequência da turma" ao lado, o Carlos passa de **50% para 0%** (ele já estava ausente no dia 27; agora também no dia 20 — 0 presenças em 2 aulas).
- Fale: "reabrir um dia já registrado carrega o que já foi salvo, não reseta todo mundo pra presente — isso era um bug real que corrigi nesta reforma."

### Passo 6 — Painel (visão de risco)
Clique em **Painel**. Mostra 4 números (alunos, média<6, frequência<75%, avaliações sem nota) e 3 listas.
- Antes do Passo 4, Carlos aparecia na lista **"Média abaixo de 6"**. Depois de lançar a nota (Passo 4), ele **saiu** dessa lista (6.6 ≥ 6).
- Mas ele **continua** na lista **"Frequência abaixo de 75%"** — agora com 0%, por causa do Passo 5.
- Fale: "aqui dá pra ver o cruzamento das duas regras acontecendo ao vivo — subir a nota tirou ele de uma lista de risco, mas não da outra. Situação dele continua reprovado."
- Aponte também **"Avaliações sem nenhuma nota lançada"**: mostra **Desenvolvimento Web — P2**, peso 60 — ninguém lançou nota nessa avaliação ainda.

### Passo 7 — Modo Aluno
Do lado do professor não há botão pra voltar à Entry: **recarregue a página (F5)** — isso também zera o mock, então o Carlos volta a 4.5 / 50% (diga isso em voz alta, é uma boa deixa pra "tudo em memória"). Clique **"Ver como aluno"**. Selecione **Carlos Eduardo Lima** no seletor.
- Mesma tela de boletim/frequência/avisos, mas **somente leitura** — reaproveita os mesmos dados e o mesmo `SeletorAlunos` da tela do professor.
- Mostra o Mural de Avisos: 3 avisos cadastrados (Feriado, Reunião de pais, Prova de Python).
- Fale: "é o mesmo motor de dados, só filtrado pra visão do aluno — sem tela nova de cálculo, sem duplicar lógica."

---

## 3. Tour pelo código (~5 min)

Abra os arquivos nesta ordem.

### `src/types.ts`
Fale: "o modelo de dados é a espinha dorsal. `Nota` não aponta pra `Disciplina` — aponta pra `Avaliacao`, que é quem carrega o peso."
```ts
export interface Avaliacao {
  id: number;
  disciplina_id: number;
  nome: string;
  peso: number;
}

export interface Nota {
  aluno_id: number;
  avaliacao_id: number;
  valor: number;
}
```
Repare também: `Aluno` não tem campo `media`. Junto com `Aula`/`Presenca` — chamada de verdade, não um contador solto.

### `src/api.ts` — as funções de cálculo
Este é o coração do projeto. Mostre `calcularBoletim` (média ponderada com renormalização):
```ts
const lancadas = notas.filter((nota) => nota.valor !== null);

let media: number | null = null;
if (lancadas.length > 0) {
  const somaPesos = lancadas.reduce((soma, nota) => soma + nota.avaliacao.peso, 0);
  const somaPonderada = lancadas.reduce((soma, nota) => soma + nota.valor! * nota.avaliacao.peso, 0);
  media = somaPonderada / somaPesos;
}
```
Fale: "só entra na conta quem já tem nota lançada, e o peso é renormalizado pelo que sobrou — por isso a bandeira 'parcial' quando falta alguma nota."

Depois mostre a regra de aprovação, em `situacaoDoAluno`:
```ts
let aprovado: boolean | null = null;
if (mediaGeral !== null && frequenciaGeral !== null) {
  aprovado = mediaGeral >= 6 && frequenciaGeral >= 75;
}
```
Fale: "aprovado exige as duas coisas — média ≥ 6 **e** frequência ≥ 75%. É por isso que dá pra ter média 6.0 e reprovar (caso do Bruno Martins, no mock: média 6.0 exata, frequência 0%)."

Por fim, `registrarChamada` — mostre que ele procura a aula existente antes de criar, e faz upsert por aluno:
```ts
let aula = bancoAulas.find((aula) => aula.disciplina_id === disciplinaId && aula.data === data);
if (!aula) {
  const novoId = Math.max(0, ...bancoAulas.map((aula) => aula.id)) + 1;
  aula = { id: novoId, disciplina_id: disciplinaId, data };
  bancoAulas = [...bancoAulas, aula];
}
```
Fale: "isso é o fix do bug real que resolvi nesta reforma — reabrir um dia registrado carrega a presença salva em vez de resetar todo mundo."

### `src/App.tsx` — navegação por estado
```ts
const [tela, setTela] = useState<Tela>("entry");
...
{tela === "home" && <TelaHome aoAbrirTela={abrirComTransicao} />}
{tela === "alunos" && <PainelAlunos aoVoltar={() => setTela("home")} />}
```
Fale: "sem roteador. `Tela` é um union type, e cada tela é só um `if`/render condicional. Pra um app de uma página só, isso é mais simples de ler que configurar rotas — e o TypeScript garante que só existe um conjunto fechado de telas válidas."

### Um componente de tela — `TelaFrequencia.tsx` + `CalendarioChamada.tsx`
Mostre a composição: `TelaFrequencia` busca a lista de disciplinas e a frequência da turma; delega o calendário inteiro pro componente `CalendarioChamada`, que por sua vez abre `PainelChamadaDoDia` quando um dia é clicado.
```tsx
<CalendarioChamada
  disciplinaId={disciplinaSelecionada.id}
  aoAtualizarFrequencia={() => carregarTurma(disciplinaId)}
/>
```
Fale: "cada componente tem uma responsabilidade — o calendário não sabe calcular frequência, só sabe navegar mês e abrir o painel do dia; quem recalcula é a tela pai, via callback."

### `src/index.css` — tokens do Zenith
```css
:root {
  --fundo: oklch(98.2% 0.003 90);
  --superficie: oklch(100% 0 0);
  --borda: oklch(72% 0.004 90);
  --texto: oklch(16% 0.005 90);
  --aviso: oklch(42% 0.09 55);
  --raio: 2px;
}
```
Fale: "design system Zenith: monocromático, só uma cor de destaque isolada (aviso), tipografia serifada nos títulos (Newsreader) e sans no corpo (Space Grotesk), bordas quase retas. Decisão estética, não falta de tempo."

---

## 4. Decisões de design/arquitetura que valem citar

- **Sem roteador.** App de tela única, navegação por `useState<Tela>`. Menos dependência, menos configuração, e o TypeScript já garante o conjunto fechado de telas.
- **Média nunca é armazenada, sempre calculada.** `Aluno` não tem campo `media`. Isso elimina a classe inteira de bug "nota mudou mas média ficou desatualizada".
- **Avaliações são por disciplina, não por aluno.** Pesos configurados uma vez por matéria, todo aluno da turma usa os mesmos critérios — evita inconsistência entre alunos.
- **Calendário de chamada é por disciplina, não por aluno.** Reflete como a chamada acontece na vida real (o professor chama a turma inteira de uma matéria, não aluno por aluno).
- **Drawer em vez de modal** para os detalhes do aluno — decisão validada com 3 alternativas num canvas de design; drawer permite ver a lista de alunos ao fundo sem perder contexto.
- **Aprovação exige média E frequência**, não só nota — modela a regra real de qualquer instituição de ensino, e cria casos interessantes (média 6.0 exata + frequência baixa = reprovado).
- **Média "parcial"** quando falta alguma nota lançada, com peso renormalizado — evita mostrar uma média artificialmente baixa só porque a prova final ainda não foi lançada.
- **Monocromático (Zenith).** Uma cor de destaque isolada só pro "aviso". Escolha estética deliberada, não ausência de paleta.

---

## 5. Perguntas prováveis e respostas curtas

1. **"Por que não usou Redux/Context/Zustand?"** — App pequeno, um nível de navegação, poucos estados compartilhados. `useState` local em cada tela já resolve sem a complexidade de um gerenciador global.
2. **"Isso conecta no backend? Como conectaria?"** — Hoje não: é tudo em memória (`api.ts` + `mock.ts`), sem nenhum `fetch`. Mas `api.ts` já imita a interface de uma API (funções `async`, erros via `throw`), então trocar o corpo das funções por `fetch` não muda nenhum componente. Pra **alunos, disciplinas e matrículas** o contrato é o mesmo do backend `gestao-alunos` (FastAPI/PG) que já existe. **Avaliações, notas, aulas/presenças e avisos** ainda não existem lá — o frontend foi além do backend, e esse modelo de dados é a proposta do que o backend precisaria ganhar (4 tabelas, ~10 rotas). Detalhe honesto: no backend o aluno ainda tem `media` gravada; aqui ela é sempre calculada — na integração, esse campo seria ignorado ou removido.
3. **"O que acontece se os pesos de uma disciplina não somarem 100?"** — Não é permitido: `criarAvaliacao` rejeita se `somaAtual + peso > 100`. A soma pode ficar abaixo de 100 temporariamente (aí a matéria fica "parcial" até completar), mas nunca passa de 100.
4. **"Como é calculada a média parcial?"** — Soma ponderada só das notas já lançadas, dividida pela soma dos pesos já lançados (renormalização). Não conta como se a nota faltante fosse zero.
5. **"Por que média 6.0 pode dar reprovado?"** — Aprovação exige média ≥ 6 **e** frequência ≥ 75%. Média alta não compensa frequência baixa (caso real no mock: Bruno Martins, média 6.0, frequência 0%, reprovado).
6. **"Por que não usa roteador (React Router)?"** — Não há URLs a compartilhar nem histórico de navegador a preservar — é um app de uso interno, tela única. Roteador seria complexidade sem benefício aqui.
7. **"Os dados persistem entre recarregamentos?"** — Não, é tudo em memória (`src/api.ts`/`src/mock.ts`). Recarregar a página volta ao estado inicial do mock — decisão consciente para focar no frontend, sem precisar de backend/banco.
8. **"Por que drawer e não modal para o aluno?"** — Testado com 3 alternativas num canvas de design (modal, drawer, expansão do card); drawer ganhou por manter a lista visível ao fundo.
9. **"Dá pra excluir um aluno/disciplina com dados vinculados?"** — Excluir aluno remove matrículas/notas/presenças dele em cascata. Excluir avaliação é bloqueado se já tem nota lançada (`excluirAvaliacao` lança erro).
10. **"Em que mês o calendário de chamada abre?"** — No mês da última aula registrada da disciplina (`CalendarioChamada.tsx`, no `useEffect`); se a disciplina ainda não tem aula nenhuma, abre no mês atual. Assim o professor cai direto onde está trabalhando, e uma disciplina nova começa em "hoje".

---

## 6. Checklist de 5 minutos antes

- [ ] Rodar `npm run dev` no terminal, dentro de `C:\Users\felip\Documents\gestao-alunos-frontend`.
- [ ] Abrir `http://localhost:5173` num navegador limpo (sem outras abas do projeto abertas, pra não confundir estado).
- [ ] Zoom do navegador em 100% (ou ajustar pra o que ficar legível no telão/compartilhamento de tela).
- [ ] Deixar a aba na **Entry** (tela inicial) antes de começar a falar — não começar já dentro de uma tela.
- [ ] Conferir que a Frequência abre já em **agosto/2026** com pontinhos nos dias 20 e 27 (Python). Se abrir em setembro, é só clicar "‹".
- [ ] Fechar abas/apps que possam gerar notificação/popup durante a demo.
- [ ] Ter os arquivos do Passo 3 (`types.ts`, `api.ts`, `App.tsx`, `TelaFrequencia.tsx`, `CalendarioChamada.tsx`, `index.css`) já abertos em tabs do editor, na ordem do tour, pra não perder tempo navegando.
- [ ] Testar uma vez o fluxo completo do Passo 4 (lançar nota do Carlos) e do Passo 5 (marcar falta do Carlos no dia 20) — depois, se quiser repetir a demo ao vivo sem recarregar a página, os números não vão bater mais com o roteiro (já vai estar em 6.6/0%). Recarregar a página (F5) volta tudo ao mock original antes de apresentar de verdade.

---

## 7. Plano B

Se o `npm run dev` travar, a demo ao vivo quebrar, ou faltar internet pra fontes do Google Fonts:

- Screenshots de todas as telas já existem em:
  `C:\Users\felip\AppData\Local\Temp\claude\C--Users-felip\aa94c4dc-4ead-4c5f-a0cc-5d076f5eab3a\scratchpad\shots\out\`
  Arquivos relevantes pra essa apresentação: `01-entry.png`, `03-home.png`, `04-gestao-alunos-lista.png`, `05-gestao-alunos-drawer.png`, `06-disciplinas.png`, `07-disciplinas-expandido.png`, `09-painel.png`, `10-boletim.png`, `11-boletim-aluno.png`, `12-frequencia.png`, `13-frequencia-calendario.png`, `14-mural-avisos.png`, `15-modo-aluno.png`.
- Se der tempo antes das 19:30, copiar os principais desses PNGs pra `docs/screenshots/` neste repo, pra abrir localmente sem depender da pasta temporária — não é obrigatório, só facilita se a pasta temp sumir.
- Sem tempo/sem screenshots: narrar a demo em cima do código mesmo (abrir `TelaFrequencia.tsx` e `api.ts` e descrever o fluxo em voz alta) — o tour de código (seção 3) funciona como apresentação autônoma se a demo ao vivo cair por completo.
- Se travar no meio da demo (ex.: no Passo 5), não tentar debugar ao vivo: recarregar a página (F5) volta ao estado inicial do mock e dá pra retomar do Passo 2.
