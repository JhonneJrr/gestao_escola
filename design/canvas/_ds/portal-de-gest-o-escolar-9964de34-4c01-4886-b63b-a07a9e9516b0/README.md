# Portal de Gestão Escolar — convenções para quem constrói com estas peças

Sistema escolar em português (professor lança notas, chamada e avisos; aluno acompanha). Tema de **papel escrito**: fundo creme, tinta preta, serifa itálica nos títulos, bordas de 1px, raio 2px. Todo texto de interface em pt-br com acentos.

## Setup
- Carregue `styles.css` (importa as fontes Newsreader e Space Grotesk e todo o CSS). **Não existe Provider**: as peças são independentes e as exportadas ficam em `window.PortalEscolar.*`.
- Peças controladas por props e callbacks em português (`aoMudar`, `aoExcluir`, `aoAbrir`, `aoCriarAluno`...). Dados: `Aluno {id, nome, idade, matricula}`, `Disciplina {id, nome, carga_horaria}`.
- `AlunoCard` busca a situação na API ao montar; sem rede ele mostra "sem dados" (esperado em protótipos).

## Idioma de estilo: CSS global + tokens (sem Tailwind, sem utilitárias)
Use `var(--token)`, nunca cor solta: `--fundo` (creme), `--superficie` (cartões), `--sunken` (item ativo/rebaixado), `--borda`, `--borda-fraca`, `--texto`, `--texto-suave`, `--texto-fraco`, `--aviso` e `--aviso-suave` (marrom, só para valor baixo, risco e erro), `--primaria` (= tinta), `--raio` (2px), `--espaco` (16px). Movimento: `--dur-rapida`, `--dur-media`, `--ease-saida`.
- Títulos em Newsreader (itálico nos grandes); corpo em Space Grotesk 400/500/600. Rótulos pequenos: caixa alta, `letter-spacing` .08em, `--texto-fraco`.
- Botão primário preto (`botao-primario`); secundários com borda de 1px. Sem gradiente, sem sombra forte, sem cor de destaque nova.
- Vocabulário que já existe (use estes nomes): `grade-alunos`, `card-aluno`, `card-disciplina`, `form-cadastro`, `campo` (rótulo + input), `campo-erro`, `rotulo-secao`, `mensagem-vazia`, `paginacao`, `botao-pagina`, `roster-lista`.

## Onde está a verdade
Leia `styles.css` e o `_ds_bundle.css` importado por ele antes de estilizar; a API de cada peça está em `components/general/<Nome>/<Nome>.d.ts` e o uso em `<Nome>.prompt.md`.

## Exemplo mínimo
```jsx
const { Filtros, ListaAlunos, Paginacao } = window.PortalEscolar;
function Alunos() {
  const [q, setQ] = React.useState("");
  const alunos = [{ id: 1, nome: "Ana Souza", idade: 20, matricula: "2026001" }];
  return (
    <main style={{ padding: "var(--espaco)" }}>
      <h2>Gestão de Alunos</h2>
      <Filtros q={q} idadeMinima="" mediaMinima="" aoMudarQ={setQ} aoMudarIdadeMinima={() => {}} aoMudarMediaMinima={() => {}} aoLimpar={() => setQ("")} />
      <ListaAlunos alunos={alunos} mensagemVazia="Nenhum aluno encontrado." aoAbrir={() => {}} aoExcluir={() => {}} />
      <Paginacao pagina={1} tamanho={10} total={alunos.length} aoMudar={() => {}} />
    </main>
  );
}
```

# PortalEscolar (portal-escolar-trabalho@0.0.0)

This design system is the published portal-escolar-trabalho React library, bundled as a single
browser global. All 10 components are the real upstream code.

## Where things are

- `_ds_bundle.js` — the whole-DS bundle at the project root; loads every component to `window.PortalEscolar`. First line is a `/* @ds-bundle: … */` metadata header.
- `styles.css` — the single stylesheet entry: it `@import`s the tokens, fonts, and component styles (`_ds_bundle.css`). Link this one file.
- `components/<group>/<Name>/<Name>.prompt.md` (example JSX + variants), `<Name>.d.ts` (types), `<Name>.html` (variant grid).
- `tokens/*.css` — CSS custom properties, names verbatim from upstream.
- `fonts/` — `@font-face` files + `fonts.css` (when the package ships fonts).
- `guidelines/` — the design system's own usage guidance (1 doc(s), see `guidelines/index.md`). Read these before composing larger layouts.

For a specific component, `read_file("components/<group>/<Name>/<Name>.prompt.md")`.

## Loading

Add these two lines to your page once (React must be on the page first):

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
```

Components are then available at `window.PortalEscolar.*`. Mount into a dedicated child node (e.g. `<div id="ds-root">`), not the host page's own React root, so the two trees don't collide:

```jsx
const { AlunoCard } = window.PortalEscolar;
ReactDOM.createRoot(document.getElementById('ds-root')).render(<AlunoCard />);
```

## Tokens

16 CSS custom properties from portal-escolar-trabalho. Names are
preserved verbatim from upstream. They are declared inside `_ds_bundle.css` (this DS ships one compiled stylesheet rather than separate token files).

- **other** (16): `--fundo`, `--superficie`, `--sunken`, …

## Components

### general
- `AlunoCard`
- `Avatar`
- `CampoBusca`
- `DisciplinaCard`
- `Filtros`
- `FormAluno`
- `FormDisciplina`
- `ListaAlunos`
- `Paginacao`
- `SeletorAlunos`
