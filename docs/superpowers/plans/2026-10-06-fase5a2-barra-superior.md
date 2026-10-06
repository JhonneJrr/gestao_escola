# Fase 5A2 — Barra superior que encolhe (substitui o menu lateral) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o menu lateral da 5A pela **proposta B** aprovada nos mocks (barra superior compacta que expande por intenção; abas embaixo no celular), com movimento cuidadoso, e corrigir os achados da revisão da 5A (paleta e navegação por URL).

**Architecture:** `LayoutPortal` passa a compor `TopNav` (desktop) / `AbasMoveis` (celular) + `<Outlet/>` + `CommandPalette`. A lista de destinos com ícones sai do `Sidebar` para `src/destinos.tsx`. O comportamento é portado do mock B (`montarB`) para React. Movimento só com `transform`/`opacity`.

**Tech Stack:** React 19, Vite, TypeScript, react-router-dom 7, Playwright (`playwright-core` + Edge) no smoke.

**Spec:** `docs/superpowers/specs/2026-10-06-fase5-interface-design.md` (a decisão de navegação por barra superior substitui o "menu lateral" da seção 5A; o resto vale).
**Referência viva do comportamento e do visual:** `.superpowers/brainstorm/850-1791247915/content/navegacao-mocks-v2.html` — função `montarB` (desktop e celular) e CSS `.b-*`. É referência de design; reescrever em React/TypeScript, não colar.

## Global Constraints

- Tema de papel atual: tokens do `:root` do `src/index.css`; Newsreader nos títulos, Space Grotesk no corpo; sem cor nova, sem gradiente, sem sombra forte (sombra suave só nos overlays).
- **Movimento:** animar SÓ `transform` e `opacity` (nunca `width`, `height`, `padding`, `margin`, `top`). Tokens novos em `:root`: `--ease-saida: cubic-bezier(.22,1,.36,1)`, `--dur-rapida: 140ms`, `--dur-media: 220ms`. Com `prefers-reduced-motion: reduce`: sem transform nem deslocamento (no máximo troca de opacidade instantânea).
- Primitivos em `src/ui/`; destinos em `src/destinos.tsx`; um arquivo por componente; props tipadas por `interface`, sem `any`.
- Nenhuma chamada de rede fora de `api.ts`/`http.ts`/`AuthContext`.
- Acessibilidade: landmark `<nav aria-label="Menu principal">`; botão do nome da tela com `aria-expanded`/`aria-controls`; botão de busca `aria-label="Buscar (Ctrl K)"`; `‹`/`›` com `aria-label="Tela anterior"`/`"Próxima tela"`; alvos ≥44px (celular) e ≥36px (desktop); foco visível de 3px; nada depende de hover; `aria-current="page"` no destino ativo.
- Perfis: professor vê a barra completa, busca e atalhos; aluno vê só a marca, "Meu painel", avatar e "Sair" (sem setas, sem busca, sem expansão, sem atalhos).
- Breakpoint: ≥900px barra superior; <900px topo mínimo + abas embaixo.
- Atalhos (professor): `Alt+M` abre/fecha a barra e foca a tela atual / devolve o foco ao nome; `Alt+1…7` navegam; `Ctrl/Cmd+K` abre a paleta (já existe); `Esc` fecha a barra.
- Lógica de intenção (igual ao mock B v2): expande por permanência do mouse na barra por 350 ms (ignora botão pressionado), por clique no nome, por Alt+M, ou por foco vindo do TECLADO; encolhe ao sair (500 ms), ao rolar a página, ao clicar fora, com Esc; nunca encolhe enquanto o foco de teclado está dentro; depois de fechar por Esc/Alt+M o foco volta ao botão do nome SEM reabrir.
- Texto de UI em pt-br com acentos. Comentários só onde o "porquê" não é óbvio.
- Commits: 1 linha, sem acento, **sem Co-Authored-By nem menção a IA**. Sem push.
- Execução pelo Codex (decisão do dono); o orquestrador VÊ as capturas (1280 e 390) antes de aceitar.
- Ambiente: API `http://localhost:8000` com `python seed.py --apagar-tudo`; front `http://localhost:5175`; smoke: `FRONT_URL=http://localhost:5175 npm run smoke`. O Codex não alcança API nem navegador: roda só `npx tsc -b`, `npm run build`, `node --check`.

## Direção visual e de movimento (vai no briefing das Tasks 1 e 2)

- **Estrutura:** `.portal` vira coluna. `.topnav` é `position: sticky; top: 0; z-index: 30`, fundo `var(--fundo)`, borda-inferior 1px `--borda-fraca`. Linha 1 (altura 56px, `padding: 0 20px`, `display:flex; align-items:center; gap:8px`): marca (quadrado 32px, borda 1.5px `--texto`, ícone de capelo) · `‹` · botão do nome (Newsreader itálico 20px + chevron) · `›` · espaço flexível · botão de busca (altura 36px, `min-width:240px`, borda 1px `--borda`, fundo `--superficie`, lupa + "Buscar..." + chips `Ctrl` `K`) · e-mail (13px `--texto-suave`, ellipsis, some em <1100px) · avatar 32px · botão "Sair" (`.botao-sair`).
- **Linha 2 (abas):** `position:absolute; left:0; right:0; top:100%`, fundo `--superficie`, borda-inferior 1px `--borda`, sombra suave `0 12px 24px rgba(0,0,0,.07)`, `padding: 10px 20px 14px`, grade de 7 colunas. Cada aba (altura mín. 60px): ícone 20px, rótulo 12px/600, dica `Alt+N` (9px `--texto-fraco`), contador (11px, caixinha no canto); ativa: fundo `--sunken` + borda 1px `--borda-fraca` + cor `--texto`; hover: fundo `--sunken`.
- **Reserva de espaço:** a barra ocupa o próprio espaço no fluxo (sticky); a linha 2 sobrepõe o conteúdo apenas enquanto aberta. O conteúdo nunca fica coberto com a barra recolhida.
- **Movimento (todos só transform/opacity):**
  1. *Abrir/fechar a linha 2:* `transform: translateY(-6px) scaleY(.96)` + `opacity:0` + `visibility:hidden` → `translateY(0) scaleY(1)` + `opacity:1`, `transform-origin: top`, `var(--dur-media) var(--ease-saida)`; `visibility` troca no fim do fechamento (transition de `visibility` com delay = duração).
  2. *Entrada escalonada das abas:* cada aba usa `--i` (0–6): `opacity:0; transform: translateY(6px)` → normal com `transition-delay: calc(var(--i) * 24ms)` só ao abrir; ao fechar, sem delay.
  3. *Chevron* gira 180° (`var(--dur-rapida)`) conforme `aria-expanded`.
  4. *Marcador da aba ativa:* um traço de 2px sob a aba ativa que desliza entre abas ao trocar de tela (`transform: translateX(...)` + `scaleX(...)` a partir de medidas por `getBoundingClientRect`; base de largura 1px; `var(--dur-media) var(--ease-saida)`).
  5. *Troca de tela:* o `.portal-conteudo` entra com `opacity 0→1` e `translateY(8px)→0` em `var(--dur-media)`; reiniciar a animação a cada mudança de `pathname` (key no wrapper) — SEM atrasar a interação (não bloquear cliques).
  6. *Botões ‹ ›:* ao clicar, o ícone dá um deslocamento de 3px na direção e volta (`var(--dur-rapida)`).
  7. *Celular:* a folha "Mais" sobe com `translateY(100%)→0` + o fundo escurece com `opacity 0→1`; o item ativo das abas ganha o marcador de 2px no topo com a mesma transição do item 4.
  8. *Paleta Ctrl+K:* fundo com `opacity 0→1` em `var(--dur-rapida)` e caixa com `opacity 0→1` + `scale(.98)→1` + `translateY(-6px)→0` em `var(--dur-media)`.
- Nada de bounce, elástico ou animação em loop.

## Review Focus

- Mouse que só passa pela barra não expande; parar 350 ms expande; sair encolhe; rolar encolhe; clicar fora encolhe; Esc encolhe e devolve o foco SEM reabrir; foco de teclado dentro impede o encolher por saída do mouse.
- Aluno: nenhuma seta/busca/expansão/atalho; `Alt+1…7` e `Ctrl+K` não fazem nada para ele.
- Celular: folha "Mais" contém o foco (Tab/Shift+Tab ciclam dentro), foca o primeiro link ao abrir, fecha com Esc, clique no fundo e ao ativar QUALQUER link (inclusive o da rota atual), e devolve o foco ao botão "Mais".
- `Alt+1…7` não dispara quando o foco está num campo de texto com `Alt` usado pelo sistema de acentos (ignorar se `e.target` for input/textarea/select).
- Item ativo correto em `/` (só "Painel") e em rotas aninhadas; contadores atualizam a cada troca de rota; `/dashboard` redireciona para `/`.
- Reduced motion: nenhum transform/deslocamento; tudo ainda funciona.
- Nada órfão: `Sidebar`, `Topbar`, `.sidebar*`, `.topbar`, `.botao-menu`, `.sidebar-fundo`, gaveta lateral saem sem import quebrado nem CSS morto.

---

### Task 1: Barra superior no lugar do menu lateral (UI — Codex, direção acima)

**Files:**
- Create: `src/destinos.tsx`, `src/components/TopNav.tsx`, `src/components/AbasMoveis.tsx`
- Modify: `src/App.tsx` (`LayoutPortal`), `src/index.css`
- Delete: `src/components/Sidebar.tsx`, `src/components/Topbar.tsx`

**Interfaces:**
- Produces (`destinos.tsx`): `interface Destino { rotulo: string; caminho: string; icone: ReactNode; contador?: keyof ContadoresDoMenu }`; `DESTINOS_PROFESSOR: Destino[]` na ordem Painel, Alunos, Disciplinas, Matrículas, Boletim, Frequência, Avisos (contadores em Alunos/Disciplinas/Avisos; ícones copiados do `Sidebar.tsx` ANTES de apagá-lo); `DESTINO_ALUNO: Destino` ("Meu painel", `/meu-painel`).
- Produces: `TopNav({ aoAbrirBusca, aoSair })` (lê `sessao` de `useAuth`; professor/aluno); `AbasMoveis({ aoAbrirBusca, aoSair })` (só <900px, professor; aluno vê o topo mínimo sem abas).
- Consumes: `contadoresDoMenu`, `Avatar`, `useAuth`, `CommandPalette` (já montada em `LayoutPortal`).

- [ ] **Step 1: `src/destinos.tsx`** com os destinos e ícones (copiados do `Sidebar.tsx`).
- [ ] **Step 2: `TopNav.tsx`** (desktop): estado `aberta`, `fixada`; `teclado` (flag: `keydown` captura → true, `pointerdown` captura → false); `suprimir` (ignora o `focusin` ao devolver o foco); timers de permanência (350 ms) e de saída (500 ms); efeitos: `mouseenter`/`mouseleave` da `<header>`, `focusin`/`focusout`, `wheel` e `scroll` da janela (fecham), `pointerdown` fora (fecha), `keydown` global (Alt+M, Esc, Alt+1…7 com `navigate`, ignorando alvos de texto). Setas ‹ › navegam para o destino vizinho (cíclico) via `useNavigate`. Marcador deslizante e escalonamento conforme "Movimento". Contadores via `contadoresDoMenu()` a cada `pathname`. Aluno: renderiza só a linha 1 com marca, nome "Meu painel", avatar, e-mail e Sair.
- [ ] **Step 3: `AbasMoveis.tsx`** (celular): topo mínimo (marca, nome da tela, busca, avatar) e abas fixas embaixo (Painel, Alunos, Disciplinas, Matrículas + "Mais"); folha "Mais" (Boletim, Frequência, Avisos, Sair) com foco contido e devolvido, fecha ao ativar qualquer link, ao clicar no fundo e com Esc.
- [ ] **Step 4: `App.tsx`** — `LayoutPortal` troca `Sidebar`+`Topbar` por `TopNav` (≥900px) e `AbasMoveis` (<900px, via `matchMedia('(min-width: 900px)')` num hook local); mantém o atalho `Ctrl/Cmd+K` e a `CommandPalette`; envolve o `<Outlet/>` num `div` com `key={pathname}` e a classe da animação de entrada; `.portal-conteudo` ganha `padding-bottom` extra no celular para as abas.
- [ ] **Step 5: CSS** conforme "Direção" e "Movimento"; REMOVER o CSS do menu lateral e do topo antigo (confirmar cada classe com `Select-String -Path src -Pattern "<classe>" -Recurse` antes de apagar); `@media (prefers-reduced-motion: reduce)` zerando transform e transições.
- [ ] **Step 6: Verificar** — `npx tsc -b` e `npm run build` limpos; `Select-String -Path src -Pattern "Sidebar|Topbar|sidebar-|botao-menu" -Recurse` sem ocorrências fora de comentários de histórico.
- [ ] **Step 7: Commit** — `git add -A src && git commit -m "Troca o menu lateral pela barra superior que encolhe"`.

---

### Task 2: Corrigir paleta e navegação por URL (achados da revisão da 5A)

**Files:** `src/components/CommandPalette.tsx`, `src/components/PainelAlunos.tsx`, `src/components/AlunoDrawer.tsx`, `src/components/TelaDisciplinas.tsx`, `src/components/TelaAvisos.tsx`, `src/index.css` (só a animação de entrada da paleta)

- [ ] **Step 1: Paleta — foco.** Ao abrir: foca o campo; `Tab`/`Shift+Tab` ciclam DENTRO do diálogo; ao fechar (Esc, clique no fundo, escolher item) devolve o foco ao elemento que a abriu (guardar `document.activeElement` ao montar e restaurar ao desmontar, exceto quando a navegação já moveu a tela).
- [ ] **Step 2: Paleta — teclado.** `Esc` chama `evento.stopPropagation()` (e `nativeEvent.stopImmediatePropagation()`) para NÃO fechar o painel do aluno por baixo; `Enter` abre o item ATIVO e a seleção ativa acompanha o foco (`onFocus` de cada opção atualiza `ativo`); campo com `role="combobox"`, `aria-expanded`, `aria-controls` da lista e `aria-activedescendant` apontando o `id` da opção ativa; cada opção com `id` estável.
- [ ] **Step 3: Paleta — resultados.** Ao digitar, invalidar a lista anterior: enquanto `q.trim() !== qAtrasado` ou carregando, não há opção selecionável e `Enter` não faz nada (mostrar "Buscando…"); respostas fora de ordem já são descartadas (manter).
- [ ] **Step 4: Paleta — movimento.** Entrada da paleta conforme "Movimento" item 8 (só opacity/transform; reduced-motion sem transform).
- [ ] **Step 5: `PainelAlunos` e `AlunoDrawer`.** Quando `?aluno=` some da URL (voltar no histórico, clicar em Alunos), fechar o painel (`setAlunoAberto(null)`); ao trocar `?aluno=`, limpar o erro anterior antes da nova busca e, se a nova busca FALHAR, fechar o painel anterior e mostrar o erro; o `AlunoDrawer` recebe `key={aluno.id}` e descarta respostas de outro aluno (flag `cancelado` por efeito, ou checagem do id).
- [ ] **Step 6: `TelaDisciplinas` e `TelaAvisos`.** Quando `?q=` some da URL, limpar o filtro (`setQ("")`, `setPagina(1)`); manter o comportamento atual quando `?q=` existe.
- [ ] **Step 7: Verificar** — `npx tsc -b` e `npm run build` limpos.
- [ ] **Step 8: Commit** — `git add -A src && git commit -m "Corrige foco e teclado da paleta e a navegacao de aluno por URL"`.

---

### Task 3: Smoke, capturas e fecho

**Files:** `e2e/smoke.mjs`, `README.md` (uma linha)

- [ ] **Step 1: Ajustar o smoke** ao layout novo (menu lateral sai): `nav` "Menu principal" na barra; abrir a linha 2 com permanência do mouse (parar na barra ≥400 ms), clique no nome e `Alt+M`; `Alt+1…7`; ‹ ›; contador em Alunos; barra encolhe ao rolar e ao clicar fora; passar rápido pela barra NÃO expande; aluno sem setas/busca/atalhos; celular: abas embaixo, folha "Mais" (foco no primeiro link, Tab cicla, Esc fecha e devolve o foco ao "Mais", ativar link da rota atual também fecha).
- [ ] **Step 2: Contratos de foco/teclado da paleta no smoke:** Esc devolve o foco ao botão de busca; `Tab` não escapa do diálogo; digitar "Ana" e `Enter` antes do resultado NÃO abre nada; com o painel do aluno aberto, `Ctrl+K` e `Esc` fecham só a paleta; voltar no histórico de `/alunos?aluno=ID` fecha o painel; `/disciplinas?q=Python` → clicar em Disciplinas limpa o filtro.
- [ ] **Step 3: Rodar** `FRONT_URL=http://localhost:5175 npm run smoke` → `SMOKE OK`.
- [ ] **Step 4: Commit** — `git add e2e README.md && git commit -m "Atualiza o smoke para a barra superior e os contratos de foco"`.
- [ ] **Step 5: Fecho (orquestrador):** capturas (1280 e 390) vistas por mim; revisão ampla do Codex; correções; a Fase 5 inteira só vai a `main` no fim da 5C.

---

## Self-review (feito)

- **Cobertura:** proposta B inteira (T1), movimento especificado item a item (T1 "Movimento"), achados da revisão 5A: foco/Tab/restauração da paleta, Enter≠focado, Esc em cascata, resultados antigos, acessibilidade da combobox, `?aluno=` ao voltar, troca de aluno com erro/stale, `?q=` limpando, gaveta com foco e fechamento na rota atual (agora na folha "Mais"), smoke de foco e teclado (T2/T3).
- **Consistência de nomes:** `DESTINOS_PROFESSOR`, `DESTINO_ALUNO`, `TopNav`, `AbasMoveis`, `aoAbrirBusca`, `aoSair` iguais entre tasks; tokens de movimento definidos em Global Constraints e usados na "Direção".
- **Placeholders:** nenhum; o comportamento fino está no mock B (`montarB`), referenciado por caminho.
- **Risco aberto:** o marcador deslizante usa medidas do DOM (`getBoundingClientRect`) — recalcular ao redimensionar a janela e ao abrir a linha 2.
