# Portar o canvas do Claude Design para o front real

Data: 06/10/2026. Ramo `fase7-portal-canvas` (saiu de `fase5-interface`). O dono exige o **visual EXATO** do canvas `design/canvas/Portal Escolar.dc.html`. Por isso o template é convertido **por script**, nunca redesenhado à mão.

## Decisões fechadas (não reabrir)

- O canvas é um protótipo DC: um `<x-dc>` com template (`<sc-if>`, `<sc-for>`, `{{ variável }}`, estilos inline) e um `<script data-dc-script>` com a classe `Component extends DCLogic` (estado mock + animações + `renderVals()`). O **runtime de referência** é `design/canvas/support.js` (compile.ts, expr.ts, pseudo.ts): o conversor precisa se comportar IGUAL a ele.
- Template = **gerado** por `scripts/converter-canvas.mjs` (reexecutável se o dono mudar o design). Lógica = **copiada uma vez** para `src/portal/Portal.tsx` e daí em diante é código nosso (recebe a camada de dados real).
- O portal novo é uma **segunda entrada Vite** (`portal.html` + `src/portal/main.tsx`), isolada do app antigo (CSS não vaza). Só na fase F4 ela vira o `index.html`.
- A Apresentação (landing com anéis e espiral de funções), o Login (com mergulho), o Primeiro acesso e todas as telas de Escola/Professor/Aluno entram **como estão no canvas**.
- Em produção valem `dispositivo = Desktop` (a largura vem do `ResizeObserver`; abaixo de 720px o layout vira celular sozinho), `estado = Normal`, `vista = Protótipo`, `fonte = Apple · SF + New York`, `movimento = Seguir o sistema`.
- Prova de fidelidade da F1: o **DOM** do porte é igual ao do canvas original, estado a estado (não "parecido": igual).

## Fases

- **F1 (este brief):** conversor + `Portal` rodando fiel, ainda com os dados fictícios do canvas, + comparador de DOM.
- **F2:** login real (JWT), `/auth/me` → perfil, camada de dados (`src/portal/dados.ts`) que carrega a API para a forma de estado do canvas; telas só de leitura com dados reais; primeiro acesso/trocar senha.
- **F3:** escritas ligadas à API (semestre, disciplinas+grade, professores, alunos, matrículas, avaliações/notas, chamada, aulas, avisos, CSV, senhas) com estados de carregando/erro.
- **F4:** URLs reais por tela, `portal.html` vira `index.html`, remove o app antigo, README, build, merge. Deploy só com a palavra do dono.

---

## F1 — Casca fiel (tarefa do Codex)

**Meta verificável:** `npm run build` passa, `npm run dev` serve `/portal.html` igual ao canvas, e `npm run comparar` imprime `IGUAL` para todos os estados listados abaixo.

### F1.1 Conversor `scripts/converter-canvas.mjs`

Entrada: `design/canvas/Portal Escolar.dc.html` e, recursivamente, cada componente que ele (ou outro) importa com `<dc-import name="X">` → arquivo `design/canvas/X.dc.html` (hoje: `EstadoLista`, `FuncaoPrevia`, `DemoPortal`; `Funções Espiral.dc.html` NÃO é importado, ignore). Saídas (arquivos .tsx começam com `// GERADO por scripts/converter-canvas.mjs — não edite`; arquivos .css com `/* GERADO por scripts/converter-canvas.mjs — não edite */`):

- Raiz: `src/portal/template.tsx` (`export default function Template(v: any)`: o JSX do conteúdo de `<x-dc>`, menos `<helmet>`), `src/portal/portal.css` (o `<style>` do `<helmet>`) e `src/portal/pseudo.css` (uma regra por par `style-hover|style-active|style-focus` distinto, ver regra 6; compartilhado por raiz e subcomponentes).
- Para cada subcomponente `X`: `src/portal/componentes/X.tsx`, que contém o Template do componente, o `<script data-dc-script>` do componente copiado verbatim (classe `Component extends DCLogic`, quando existir) e `export default criarDC('X', Template, Component)` (ver F1.2); e, se o componente tiver `<helmet><style>`, `src/portal/componentes/X.css` importado por `X.tsx`. `<link>` de helmet é ignorado.

Dependência permitida: `htmlparser2` (devDependency). Parser com `lowerCaseAttributeNames: false` (o template tem `onClick`, `viewBox`, `inputMode`, `tabIndex` em caixa mista e também `tabindex` minúsculo) e sem decodificar de forma que quebre o texto: preserve o texto exatamente.

Regras de conversão (espelham `support.js`: `walkText`, `walkFor`, `walkIf`, `walkElement`, `collectProps`, `compileAttr`, `resolve`, `cssToObj`, `importantify`):

1. **Expressão** `{{ e }}`: só existem identificador, caminho (`a.b`, `a[0]`, `a[expr]`), `!`, `===`, `!==`, `==`, `!=`, literais (`true`, `false`, `null`, `undefined`, número, string com aspas simples/duplas) e parênteses. Compile para JS com encadeamento opcional (`v.a?.b`): caminho inexistente vira `undefined`, nunca exceção. O identificador inicial resolve para a variável do `sc-for` mais interna que o declara, ou, senão, para `v.<id>`. `$index` existe dentro de `sc-for`.
2. **`<sc-if value="{{ e }}">`**: `{ e ? <>…</> : null }` (ternário, não `&&`, para `0` não imprimir). Ignore `hint-placeholder-val`.
3. **`<sc-for list="{{ e }}" as="x">`**: `{ (Array.isArray(L) ? L : []).map((x, $index) => <Fragment key={$index}>…</Fragment>) }`. Ignore `hint-placeholder-count`.
4. **Texto**: nó sem `{{`: emita como expressão de string literal `{"…"}` (`JSON.stringify`, preserva espaço e quebra de linha); descarte só o nó que é só espaço em branco SEM nenhum caractere de espaço (`!t.trim() && !t.includes(" ")`). Nó com `{{`: parta por `{{…}}`; trechos de texto viram strings; cada interpolação passa por `I(valor)` (helper em `src/portal/runtime.ts`) com a mesma regra do runtime: `undefined`/`null`/booleano → nada; elemento React ou array → Fragment; senão `<span className="sc-interp">{String(valor)}</span>` (o `span` é parte do DOM e tem que existir).
5. **Atributos**: `class`→`className`, `for`→`htmlFor`, `onclick`/`onClick` etc. → camelCase React (`onClick`, `onChange`, `onSubmit`, `onKeyDown`, `onPointerDown`, `onMouseEnter`, `onMouseLeave`, `onBlur`); `tabindex`→`tabIndex`, `inputmode`→`inputMode`, `autocomplete`→`autoComplete`, `stroke-width`→`strokeWidth` e demais atributos SVG/HTML para o nome React correto (liste os atributos distintos do template e mapeie todos); `data-*` e `aria-*` ficam como estão. Atributo cujo valor é um único `{{ e }}` passa o valor cru (função, objeto, ref: `ref={…}`); com interpolação no meio de texto, vira template string (`undefined`/`null` → `""`). `value`/`checked` indefinidos viram `""`/`false`. Ignore `hint-size`.
6. **`style`**: string estática → objeto no momento da conversão; string com `{{ }}` → `css(\`…\`)` (helper `cssToObj` copiado de `support.js`, em `runtime.ts`, depois da interpolação). Propriedades `--x` ficam como estão; as demais em camelCase. **`style-hover`/`style-active`/`style-focus`** (63/45/46 ocorrências, todas estáticas): gere uma classe `scpN` por par (pseudo, css) distinto, com a regra `.scpN:hover{…}` onde cada declaração ganha ` !important` (mesma regra de `importantify` do `support.js`), em `pseudo.css`, e acrescente a classe ao `className` do elemento (junto de qualquer `className` existente).
7. Tags void (`input`, `br`, `img`, `hr`) saem autofechadas; SVG (`path`, `circle`, `rect`, `svg`) mantém os atributos.
8. **`<dc-import name="X" a="…" b-c="…" hint-size="…">`** (20 ocorrências; espelha `walkComponent` e `collectProps` com kind "dc-import" em `support.js`): vira `<X a={…} bC={…} />` com `X` importado de `./componentes/X` (ou `./X` a partir de `componentes/`). Atributos: o nome do prop é o atributo em camelCase (`b-c` → `bC`), o valor segue a regra 5 (um `{{ e }}` único passa o valor cru); `name`, `component` e `hint-size` não são props; `style` não vira prop de estilo: vira o prop `__hostStyle` com SÓ as propriedades `position, left, right, top, bottom, inset, width, height, z-index, transform` (`hostPositionStyle` do runtime); nenhum uso atual tem `style`, então implemente e anote no relatório que não foi exercitado. Filhos do `dc-import` viram `children`.
9. `<helmet>`: o `<link>` do design system NÃO é gerado (o CSS entra por `import` em `main.tsx`, ver F1.3); o `<style>` vai para `portal.css`.

### F1.2 Runtime mínimo

- `src/portal/runtime.ts`: exporta `I` (regra 4) e `css` (regra 6).
- `src/portal/dc.tsx`: **réplica do host do runtime** (`StreamableLogic` em logic.ts e `StreamableComponent` em component.ts de `support.js`). O ponto crítico: no runtime a lógica é um objeto SEPARADO do componente React e o `setState` dela é **síncrono**: `__setLogicState(update, cb)` calcula o patch (objeto, ou função recebendo o estado anterior), faz `logic.state = {...prev, ...patch}` NA HORA e só então pede o re-render do host (`setState(s => ({__v: s.__v + 1}), cb)`). O código do protótipo lê `this.state` logo depois de `this.setState(...)`; um `React.Component` comum atrasaria a leitura e mudaria o comportamento, então NÃO use `React.Component` como base da lógica. Exporte: `class DCLogic` (campos `props`, `state = {}`, `__host`; métodos `setState`, `forceUpdate`, `componentDidMount`, `componentDidUpdate`, `componentWillUnmount`, `renderVals` devolvendo `{}`) e `criarDC(nome, Template, Logic?)`, que devolve a classe React host: instancia `new (Logic ?? DCLogic)(propsDoUsuario)`, `logic.__host = this`; `propsDoUsuario` = props sem `__tplId`, `__hostStyle`, `__hintSize`, `__name`; no `render`: `logic.props = propsDoUsuario`, `vals = { ...propsDoUsuario, ...logic.renderVals() }` e devolve `<div className="sc-host" style={__hostStyle} data-sc-name={nome}>{Template(vals)}</div>`; `componentDidMount`/`componentDidUpdate(prevProps)` (atualiza `logic.props` antes)/`componentWillUnmount` repassam para a lógica. Omita o tratamento de erro/placeholder/streaming do runtime (não se aplica).

### F1.3 `Portal` e entrada

- `src/portal/Portal.tsx`: `// @ts-nocheck` na primeira linha (é o código do protótipo, migrado sem tipos) + o conteúdo do `<script data-dc-script>` do canvas copiado **verbatim** (tudo antes e dentro de `class Component extends DCLogic`, incluindo constantes e funções soltas), com só estes ajustes: imports de `React`, `DCLogic` e `criarDC`, e `import Template from './template'`; no fim `export default criarDC('Portal Escolar', Template, Component)`. Não "melhore" nada da lógica. As cópias dos scripts dos subcomponentes são geradas pelo conversor (F1.1), não à mão.
- Copie `design/canvas/_ds/portal-de-gest-o-escolar-9964de34-4c01-4886-b63b-a07a9e9516b0/` (`styles.css` e `_ds_bundle.css`) para `src/portal/ds/` sem alterar.
- `portal.html` (raiz, irmão do `index.html`, mesma `<head>` de `index.html`, `lang="pt-BR"`, `<title>Portal de Gestão Escolar</title>`, `<div id="dc-root">` — o mesmo id que o runtime cria —, `src/portal/main.tsx`). Em `portal.css` entra também, depois do conteúdo do helmet, a regra do runtime `html,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}` (FULL_PAGE_CSS do `support.js`).
- `src/portal/main.tsx`: importa `./ds/styles.css`, `./portal.css`, `./pseudo.css`; monta `<Portal inicio dispositivo estado vista fonte movimento />` com os padrões da seção "Decisões fechadas". Para o comparador (e só nele), aceita `?inicio=`, `?dispositivo=`, `?movimento=` na URL; valores = os `options` do `data-props` do script. Sem `StrictMode` (o protótipo cria listeners e `ResizeObserver` em `componentDidMount` e não foi escrito para montar duas vezes).
- `vite.config.ts`: `build.rollupOptions.input = { main: 'index.html', portal: 'portal.html' }`. O app antigo continua intacto e funcionando em `/`.
- `package.json`: scripts `"converter": "node scripts/converter-canvas.mjs"` e `"comparar": "node scripts/comparar-canvas.mjs"`.

### F1.4 Comparador `scripts/comparar-canvas.mjs`

Usa `playwright-core` com `chromium.launch({ channel: "msedge" })` (como `e2e/smoke.mjs`).

- **Referência:** servidor estático em Node que serve `design/canvas/` e responde `Portal Escolar.dc.html` com o `default` da prop `inicio` (e `movimento`) reescrito no `data-props` para o estado pedido. O runtime (`support.js`, `cdn.ts`) busca **React 18.3.1 em `https://unpkg.com/...`** e o design system pede fontes ao Google; o sandbox NÃO tem rede, então já deixei os arquivos em `scripts/referencia/` (`react.production.min.js`, `react-dom.production.min.js`, ambos 18.3.1). No Playwright, use `page.route` para: servir `https://unpkg.com/react@18.3.1/umd/react.production.min.js` e `https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js` desses arquivos; abortar `fonts.googleapis.com` e `fonts.gstatic.com` nas DUAS páginas (referência e porte), para as fontes caírem igual dos dois lados. Se o canvas pedir Babel (`@babel/standalone`) ou outra URL externa, reporte qual e pare. O porte usa React 19 e a referência React 18: diferenças de DOM causadas só por isso devem ser relatadas, não escondidas na normalização.
- **Porte:** `http://localhost:5173/portal.html?inicio=…&movimento=Reduzido` (o script sobe `vite` se a porta estiver livre e derruba ao fim).
- Estados: `inicio` ∈ {Apresentação, Login, Primeiro acesso, Escola, Professor, Professor · sem permissão, Aluno} × viewport {1280×800, 390×844}, `movimento=Reduzido` nos dois lados, esperando `networkidle` + 1500 ms.
- Compare o `outerHTML` de `#dc-root` inteiro (nos dois lados existe `div#dc-root > div.sc-host[data-sc-name]`, e cada `dc-import` vira outro `div.sc-host`) depois de normalizar: remover `data-dc-tpl`; trocar cada classe `scp*` pelo texto da regra CSS que ela aplica (o canvas gera `scpN` em runtime e o porte vem de `pseudo.css`; os números podem divergir, o conteúdo não); ignorar o conteúdo de `<canvas>`.
- Depois da carga inicial, para `Escola` e `Professor` percorra TODAS as abas com `Alt+1…Alt+8`/`Alt+1…Alt+5` e compare de novo em cada uma.
- Saída: uma linha por estado, `IGUAL` ou `DIFERENTE`. Em `DIFERENTE`, grave o diff de texto em `e2e/saida/comparar-<estado>.diff` e imprima as 5 primeiras linhas. Saia com código 1 se algum for `DIFERENTE`.
- Bônus não bloqueante: capturas lado a lado (`e2e/saida/*-canvas.png` e `*-porte.png`) nos estados Login, Escola/Painel e Aluno.

### Conferência

`npx tsc -b && npm run build && npm run comparar`
