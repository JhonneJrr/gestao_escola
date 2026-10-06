// Teste de fumaca: login real contra a API local, rotas protegidas e Bearer indo na rede.
// Pre-requisitos: API em :8000 com seed aplicado e front em :5173 (npm run dev).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const FRONT = process.env.FRONT_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:8000";

async function api(metodo, caminho, corpo, token) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, corpo: resposta.status === 204 ? null : await resposta.json().catch(() => null) };
}
const login = await api("POST", "/auth/login", { email: "prof@escola.com", senha: "escola123" });
const tokenProfessor = login.corpo.access_token;
const extras = [];

mkdirSync("e2e/saida", { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const chamadas = [];
page.on("request", (r) => {
  if (r.url().startsWith(API)) {
    chamadas.push({ metodo: r.method(), url: r.url(), auth: r.headers()["authorization"] ?? null });
  }
});
const errosDeConsole = [];
page.on("console", (m) => {
  // 401/403 esperados aparecem como "Failed to load resource"
  if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
    errosDeConsole.push(m.text());
  }
});
const errosDaPagina = [];
page.on("pageerror", (erro) => {
  errosDaPagina.push(`pageerror: ${erro.message}`);
});
const errosDaApi = [];
page.on("response", (resposta) => {
  if (resposta.url().startsWith(API) && resposta.status() >= 500) {
    errosDaApi.push(`API ${resposta.status()}: ${resposta.url()}`);
  }
});

function conferir(condicao, mensagem) {
  if (!condicao) {
    throw new Error(`FALHOU: ${mensagem}`);
  }
  console.log(`ok - ${mensagem}`);
}

async function logar(email, senha) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

try {
  for (let i = 1; i <= 6; i++) {
    const r = await api("POST", "/alunos", { nome: `Aluno Fumaça ${i}`, idade: 20, matricula: `S3-00${i}` }, tokenProfessor);
    conferir(r.status === 201, `preparacao: aluno extra ${i} criado`);
    extras.push(r.corpo.id);
  }

  // 1) sem sessao, rota protegida manda para o login
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(true, "sem sessao, /alunos redireciona para /login");

  // 2) senha errada: mensagem de erro e continua no login
  await logar("prof@escola.com", "errada");
  await page.getByRole("alert").waitFor();
  conferir(page.url().endsWith("/login"), "senha errada continua em /login");
  conferir((await page.getByRole("alert").innerText()).length > 0, "senha errada mostra mensagem");

  // 3) login do professor chega em / e /alunos lista com Bearer
  await page.getByLabel("Senha").fill("escola123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${FRONT}/`);
  const login = chamadas.filter((c) => c.metodo === "POST" && c.url.endsWith("/auth/login")).pop();
  conferir(login && login.auth === null, "POST /auth/login vai SEM Authorization");
  await page.goto(`${FRONT}/alunos`);
  await page.getByText("Ana Souza").first().waitFor();
  const listagem = chamadas.filter((c) => c.metodo === "GET" && c.url.includes("/alunos")).pop();
  conferir(listagem && listagem.auth?.startsWith("Bearer "), "GET /alunos vai com Authorization: Bearer");
  await page.screenshot({ path: "e2e/saida/alunos-professor.png" });

  // 9) paginacao e busca em Alunos (12 alunos: 6 do seed + 6 extras)
  await page.goto(`${FRONT}/alunos`);
  await page.getByText("Mostrando 1–10 de 12").waitFor();
  conferir(true, "alunos: pagina 1 mostra 1-10 de 12");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await page.getByText("Mostrando 11–12 de 12").waitFor();
  conferir(true, "alunos: pagina 2 mostra 11-12 de 12");
  await page.getByLabel("Buscar por nome ou matrícula").fill("S3-003");
  await page.getByText("Mostrando 1–1 de 1").waitFor();
  await page.getByText("Aluno Fumaça 3").first().waitFor();
  const busca = chamadas.filter((c) => c.metodo === "GET" && c.url.includes("/alunos?")).pop();
  conferir(busca.url.includes("q=S3-003") && busca.url.includes("pagina=1"), "busca por matricula vai ao servidor com q e pagina=1");
  await page.screenshot({ path: "e2e/saida/alunos-paginado.png" });

  await page.getByLabel("Buscar por nome ou matrícula").fill("");
  await page.getByText("Mostrando 1–10 de 12").waitFor();
  const pagina2 = page.waitForResponse((r) => r.url().startsWith(`${API}/alunos?`) && r.request().method() === "GET" && new URL(r.url()).searchParams.get("pagina") === "2");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await page.getByText("Mostrando 11–12 de 12").waitFor();
  const alunosUltimaPagina = (await (await pagina2).json()).itens;
  conferir(alunosUltimaPagina.length === 2 && alunosUltimaPagina.every((aluno) => extras.includes(aluno.id)), "alunos: pagina 2 contem os dois extras a excluir");
  for (const [i, aluno] of alunosUltimaPagina.entries()) {
    const card = page.locator(".card-aluno").filter({ has: page.getByRole("heading", { name: aluno.nome, exact: true }) });
    await card.waitFor();
    const exclusaoAluno = page.waitForResponse((r) => r.url() === `${API}/alunos/${aluno.id}` && r.request().method() === "DELETE");
    await card.getByRole("button", { name: `Excluir ${aluno.nome}`, exact: true }).click();
    conferir((await exclusaoAluno).status() === 204, `alunos: ${aluno.nome} excluido pelo card`);
    extras.splice(extras.indexOf(aluno.id), 1);
    await page.getByText(i === 0 ? "Mostrando 11–11 de 11" : "Mostrando 1–10 de 10").waitFor();
  }
  conferir(await page.getByText("Mostrando 1–10 de 10").isVisible(), "alunos: excluir os dois ultimos volta automaticamente para a pagina anterior");

  // 10) painel: uma chamada ao /dashboard, com Bearer, sem situacao por aluno
  const antes = chamadas.length;
  await page.goto(`${FRONT}/`);
  await page.waitForURL(`${FRONT}/`);
  await page.getByRole("heading", { name: "Painel" }).waitFor();
  await page.getByText("Ranking — top 5").waitFor();
  const novas = chamadas.slice(antes);
  const painel = novas.filter((c) => c.url.endsWith("/dashboard"));
  // StrictMode executa o efeito duas vezes em desenvolvimento.
  conferir(painel.length >= 1 && painel.length <= 2 && painel.every((c) => c.auth?.startsWith("Bearer ")), "painel: /dashboard chamado (1x em producao, 2x sob StrictMode) sempre com Bearer");
  conferir(!novas.some((c) => c.url.includes("/situacao")), "painel: nenhuma chamada /situacao por aluno");
  conferir(await page.getByText("Ana Souza").first().isVisible(), "painel: ranking mostra Ana Souza");
  await page.screenshot({ path: "e2e/saida/painel-professor.png" });

  // 11) avisos: criar pela UI com data AAAA-MM-DD, busca e exclusao
  await page.goto(`${FRONT}/avisos`);
  await page.getByLabel("Título").fill("Aviso de fumaça");
  await page.getByLabel("Mensagem").fill("Criado pelo teste de fumaça.");
  const criacao = page.waitForResponse((r) => r.url().endsWith("/avisos") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Publicar aviso" }).click();
  const respostaAviso = await criacao;
  conferir(respostaAviso.status() === 201, "avisos: POST /avisos com data valida responde 201");
  await page.getByText("Aviso de fumaça").first().waitFor();
  const hoje = new Date();
  const dataHoje = `${String(hoje.getDate()).padStart(2, "0")}/${String(hoje.getMonth() + 1).padStart(2, "0")}/${hoje.getFullYear()}`;
  const cardAviso = page.locator(".card-aviso").filter({ has: page.getByRole("heading", { name: "Aviso de fumaça", exact: true }) });
  await cardAviso.getByText(dataHoje, { exact: true }).waitFor();
  conferir(await cardAviso.getByText(dataHoje, { exact: true }).isVisible(), "avisos: aviso criado pela UI mostra a data de hoje em DD/MM/AAAA");

  await page.getByLabel("Título").fill("Tema diferente");
  await page.getByLabel("Mensagem").fill("Outro tema para conferir a busca.");
  const criacaoTema = page.waitForResponse((r) => r.url().endsWith("/avisos") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Publicar aviso" }).click();
  conferir((await criacaoTema).status() === 201, "avisos: segundo aviso criado pela UI");
  await page.getByText("Tema diferente").waitFor();
  conferir(await page.getByText("Tema diferente").isVisible(), "avisos: tema diferente visivel antes da busca");
  const buscaAvisos = page.waitForResponse((r) => r.url().startsWith(`${API}/avisos?`) && r.request().method() === "GET" && new URL(r.url()).searchParams.get("q") === "fuma");
  await page.getByLabel("Buscar aviso").fill("fuma");
  conferir((await buscaAvisos).status() === 200, "avisos: busca por titulo vai ao servidor");
  await page.getByText("Tema diferente").waitFor({ state: "hidden" });
  await page.getByText("Aviso de fumaça").first().waitFor();
  conferir(await page.getByText("Aviso de fumaça").first().isVisible(), "avisos: busca 'fuma' mantem aviso de fumaca");
  conferir(!await page.getByText("Tema diferente").isVisible(), "avisos: busca 'fuma' esconde tema diferente");
  for (const tituloAviso of ["Aviso de fumaça", "Tema diferente"]) {
    const avisoCriado = (await api("GET", `/avisos?q=${encodeURIComponent(tituloAviso)}`, null, tokenProfessor)).corpo.itens[0];
    const exclusao = await api("DELETE", `/avisos/${avisoCriado.id}`, null, tokenProfessor);
    conferir(exclusao.status === 204, `avisos: ${tituloAviso} achado pela busca e removido`);
  }

  // 12) disciplinas: busca no servidor
  await page.goto(`${FRONT}/disciplinas`);
  await page.getByText("Banco de Dados").first().waitFor();
  const buscaDisciplinas = page.waitForResponse((r) => r.url().startsWith(`${API}/disciplinas?`) && r.request().method() === "GET" && new URL(r.url()).searchParams.get("q") === "Pyth");
  await page.getByLabel("Buscar disciplina").fill("Pyth");
  conferir((await buscaDisciplinas).status() === 200, "disciplinas: busca 'Pyth' vai ao servidor");
  await page.getByText("Banco de Dados").waitFor({ state: "hidden" });
  await page.getByText("Python").first().waitFor();
  conferir(await page.getByText("Python").first().isVisible(), "disciplinas: busca 'Pyth' mostra Python");
  conferir(await page.getByText("Banco de Dados").count() === 0, "disciplinas: busca 'Pyth' esconde as outras");

  // 13) barra superior: intencao, itens, contador e navegacao
  await page.goto(`${FRONT}/`);
  const barra = page.locator("header.topnav");
  const nomeTela = barra.locator(".topnav-atual");
  const menu = page.getByRole("navigation", { name: "Menu principal", includeHidden: true });
  await nomeTela.waitFor();
  await page.mouse.move(640, 300);
  const caixaBarra = await barra.boundingBox();
  await page.mouse.move(40, caixaBarra.y + caixaBarra.height / 2);
  await page.mouse.move(640, 300);
  await page.waitForTimeout(500);
  conferir(await nomeTela.isVisible(), "barra: nome da tela visivel depois da passagem rapida");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: passar rapido nao expande");
  await page.mouse.move(40, caixaBarra.y + caixaBarra.height / 2);
  await page.waitForTimeout(500);
  await menu.getByRole("link", { name: "Painel" }).waitFor();
  conferir(await nomeTela.getAttribute("aria-expanded") === "true", "barra: permanencia do mouse expande");
  for (const rotulo of ["Alunos", "Disciplinas", "Matrículas", "Boletim", "Frequência", "Avisos"]) {
    conferir(await menu.getByRole("link", { name: new RegExp(`^${rotulo}`) }).isVisible(), `barra: item ${rotulo} visivel`);
  }
  conferir(await menu.locator('[aria-current="page"]').count() === 1 && await menu.getByRole("link", { name: "Painel" }).getAttribute("aria-current") === "page", "barra: apenas Painel ativo em /");
  await page.mouse.move(640, 300);
  await menu.waitFor({ state: "hidden" });
  conferir(await nomeTela.isVisible(), "barra: nome continua visivel ao sair com o mouse");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: sair com o mouse encolhe");
  await nomeTela.click();
  await menu.waitFor();
  conferir(await nomeTela.getAttribute("aria-expanded") === "true", "barra: clique no nome expande");
  await menu.getByRole("link", { name: /^Alunos/ }).click();
  await page.waitForURL("**/alunos");
  await nomeTela.click();
  await menu.getByRole("link", { name: /^Alunos/ }).locator(".nav-contador").waitFor();
  conferir(await menu.getByRole("link", { name: /^Alunos/ }).getAttribute("aria-current") === "page", "barra: clicar em Alunos navega e ativa /alunos");
  conferir((await menu.getByRole("link", { name: /^Alunos/ }).locator(".nav-contador").innerText()).trim() === "10", "barra: contador mostra os 10 alunos restantes");
  await page.mouse.move(640, 300);
  await page.mouse.wheel(0, 400);
  await menu.waitFor({ state: "hidden" });
  conferir(await nomeTela.isVisible(), "barra: nome continua visivel ao rolar");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: rolar encolhe");
  await nomeTela.click();
  await menu.waitFor();
  await page.getByRole("heading", { name: "Gestão de Alunos" }).click();
  await menu.waitFor({ state: "hidden" });
  conferir(await page.getByRole("heading", { name: "Gestão de Alunos" }).isVisible(), "barra: conteudo visivel depois do clique fora");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: clicar fora encolhe");
  await page.keyboard.press("Alt+m");
  await menu.waitFor();
  conferir(await menu.getByRole("link", { name: /^Alunos/ }).evaluate((el) => el === document.activeElement), "barra: Alt+M abre e foca a tela atual");
  await page.mouse.move(40, 28);
  await page.mouse.move(640, 300);
  await page.waitForTimeout(600);
  conferir(await menu.isVisible(), "barra: foco de teclado dentro impede encolher ao sair com o mouse");
  await page.keyboard.press("Alt+m");
  await menu.waitFor({ state: "hidden" });
  conferir(await nomeTela.evaluate((el) => el === document.activeElement), "barra: Alt+M devolve foco ao nome");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: Alt+M fecha sem reabrir por foco");
  await page.keyboard.press("Tab");
  await menu.waitFor();
  conferir(await nomeTela.getAttribute("aria-expanded") === "true", "barra: foco vindo do teclado expande");
  await page.keyboard.press("Escape");
  await menu.waitFor({ state: "hidden" });
  conferir(await nomeTela.evaluate((el) => el === document.activeElement), "barra: Esc devolve foco ao nome");
  conferir(await nomeTela.getAttribute("aria-expanded") === "false", "barra: Esc fecha sem reabrir por foco");
  const destinos = [
    ["Painel", "/"], ["Alunos", "/alunos"], ["Disciplinas", "/disciplinas"],
    ["Matrículas", "/matriculas"], ["Boletim", "/boletim"], ["Frequência", "/frequencia"], ["Avisos", "/avisos"],
  ];
  for (const [i, [rotulo, caminho]] of destinos.entries()) {
    await page.keyboard.press(`Alt+${i + 1}`);
    await page.waitForURL(`${FRONT}${caminho}`);
    await nomeTela.filter({ hasText: rotulo }).waitFor({ timeout: 3000 });
    conferir(await nomeTela.innerText() === rotulo, `barra: Alt+${i + 1} navega para ${rotulo}`);
  }
  await page.getByRole("button", { name: "Próxima tela", exact: true }).click();
  await page.waitForURL(`${FRONT}/`);
  await nomeTela.filter({ hasText: "Painel" }).waitFor({ timeout: 3000 });
  conferir(await nomeTela.innerText() === "Painel", "barra: proxima tela cicla de Avisos para Painel");
  await page.getByRole("button", { name: "Tela anterior", exact: true }).click();
  await page.waitForURL(`${FRONT}/avisos`);
  await nomeTela.filter({ hasText: "Avisos" }).waitFor({ timeout: 3000 });
  conferir(await nomeTela.innerText() === "Avisos", "barra: tela anterior cicla de Painel para Avisos");
  await page.goto(`${FRONT}/dashboard`);
  await page.waitForURL(`${FRONT}/`);
  conferir(true, "/dashboard redireciona para /");

  // 14) paleta: foco contido, Enter durante busca e painel do aluno
  await page.goto(`${FRONT}/alunos`);
  await page.getByRole("heading", { name: "Gestão de Alunos" }).waitFor();
  const botaoBusca = page.getByRole("button", { name: "Buscar (Ctrl K)" });
  await botaoBusca.click();
  const dialogo = page.getByRole("dialog", { name: "Busca global" });
  const campoGlobal = dialogo.getByRole("combobox", { name: "Buscar alunos, disciplinas e avisos" });
  await dialogo.waitFor();
  conferir(await campoGlobal.evaluate((el) => el === document.activeElement), "paleta: abrir foca o campo de busca");
  conferir(await dialogo.getByRole("option").count() === 7, "paleta: estado vazio mostra os sete atalhos de paginas");
  const focaveisPaleta = dialogo.locator("input, button");
  for (let i = 1; i <= 8; i++) {
    await page.keyboard.press("Tab");
    conferir(await focaveisPaleta.nth(i % 8).evaluate((el) => el === document.activeElement), `paleta: Tab ${i} cicla dentro do dialogo`);
  }
  await page.keyboard.press("Shift+Tab");
  conferir(await dialogo.getByRole("option", { name: /^Avisos/ }).evaluate((el) => el === document.activeElement), "paleta: Shift+Tab cicla para a ultima opcao");
  await page.keyboard.press("Escape");
  await dialogo.waitFor({ state: "hidden" });
  conferir(await botaoBusca.evaluate((el) => el === document.activeElement), "paleta: Esc devolve foco ao botao de busca");
  conferir(await dialogo.count() === 0, "paleta: Esc fecha o dialogo");
  await page.keyboard.press("Control+K");
  await dialogo.waitFor();
  conferir(await dialogo.getByRole("option", { name: /Alunos/ }).count() >= 1, "paleta: estado vazio mostra atalhos de paginas");
  const painelAna = page.getByRole("complementary", { name: "Detalhes de Ana Souza" });
  let liberarBusca;
  const buscaPendente = new Promise((resolve) => { liberarBusca = resolve; });
  const segurarBusca = async (rota) => {
    if (new URL(rota.request().url()).searchParams.get("q") === "Ana") {
      await buscaPendente;
    }
    await rota.continue();
  };
  await page.route(`${API}/alunos?**`, segurarBusca);
  try {
    await campoGlobal.fill("Ana");
    await dialogo.getByText("Buscando…", { exact: true }).waitFor();
    conferir(await campoGlobal.inputValue() === "Ana", "paleta: termo Ana presente enquanto busca");
    conferir(await dialogo.getByRole("option").count() === 0, "paleta: resultados anteriores nao sao selecionaveis durante busca");
    await page.keyboard.press("Enter");
    conferir(await dialogo.getByText("Buscando…", { exact: true }).isVisible() && page.url() === `${FRONT}/alunos`, "paleta: Enter antes do resultado mantem a busca e a rota");
    conferir(await painelAna.count() === 0, "paleta: Enter antes do resultado nao abre painel");
  } finally {
    liberarBusca();
  }
  await dialogo.getByRole("option", { name: /Ana Souza/ }).waitFor();
  await page.unroute(`${API}/alunos?**`, segurarBusca);
  const buscaGlobalChamada = chamadas.filter((c) => c.url.includes("/alunos?") && c.url.includes("q=Ana")).pop();
  conferir(buscaGlobalChamada?.auth?.startsWith("Bearer "), "paleta: busca vai ao servidor com q=Ana e Bearer");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/alunos\?aluno=\d+/);
  await painelAna.getByText("2026001", { exact: true }).waitFor();
  conferir(true, "paleta: Enter em Ana Souza abre /alunos?aluno=ID com o painel do aluno");
  await page.screenshot({ path: "e2e/saida/alunos-painel-aberto.png" });
  const urlPainelAna = page.url();
  await page.keyboard.press("Control+K");
  await dialogo.waitFor();
  conferir(await campoGlobal.evaluate((el) => el === document.activeElement), "paleta: Ctrl+K sobre o painel foca a busca");
  await page.keyboard.press("Escape");
  await dialogo.waitFor({ state: "hidden" });
  conferir(await painelAna.getByText("2026001", { exact: true }).isVisible() && page.url() === urlPainelAna, "paleta: Esc preserva o painel do aluno e sua URL");
  conferir(await dialogo.count() === 0, "paleta: Esc sobre o painel fecha somente a paleta");
  await page.goBack();
  await page.waitForURL(`${FRONT}/alunos`);
  await painelAna.waitFor({ state: "hidden" });
  conferir(await page.getByRole("heading", { name: "Gestão de Alunos" }).isVisible(), "historico: voltar mostra a lista sem parametro aluno");
  conferir(await painelAna.count() === 0, "historico: remover ?aluno= fecha o painel");
  await botaoBusca.click();
  await dialogo.waitFor();
  await campoGlobal.fill("Ana");
  await dialogo.getByRole("option", { name: /Ana Souza/ }).waitFor();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/alunos\?aluno=\d+/);
  await painelAna.getByText("2026001", { exact: true }).waitFor();
  await painelAna.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForURL(`${FRONT}/alunos`);

  // 15) Esc fecha a paleta; busca sem resultado
  await botaoBusca.click();
  await dialogo.waitFor();
  await page.getByLabel("Buscar alunos, disciplinas e avisos").fill("zzzzzz");
  await dialogo.getByText(/Nada encontrado/).waitFor();
  conferir(await dialogo.getByText(/Nada encontrado/).isVisible(), "paleta: busca sem resultado mostra mensagem");
  await page.keyboard.press("Escape");
  await dialogo.waitFor({ state: "hidden" });
  conferir(await botaoBusca.evaluate((el) => el === document.activeElement), "paleta: busca sem resultado devolve foco ao botao depois de Esc");
  conferir(await dialogo.count() === 0, "paleta: busca sem resultado e Esc fecha");

  await page.goto(`${FRONT}/disciplinas?q=Python`);
  await page.getByText("Python", { exact: true }).first().waitFor();
  conferir(await page.getByLabel("Buscar disciplina").inputValue() === "Python", "disciplinas: ?q=Python preenche o filtro");
  await nomeTela.click();
  await menu.getByRole("link", { name: /^Disciplinas/ }).click();
  await page.waitForURL(`${FRONT}/disciplinas`);
  await page.getByText("Banco de Dados", { exact: true }).first().waitFor();
  conferir(await page.getByText("Banco de Dados", { exact: true }).first().isVisible() && await page.getByText("Python", { exact: true }).first().isVisible(), "disciplinas: clicar na aba restaura a lista sem filtro");
  conferir(await page.getByLabel("Buscar disciplina").inputValue() === "", "disciplinas: clicar em Disciplinas remove ?q= e limpa o campo");

  // 16) celular: abas embaixo e folha Mais com foco contido
  const celular = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await celular.goto(`${FRONT}/login`);
  await celular.getByLabel("E-mail").fill("prof@escola.com");
  await celular.getByLabel("Senha").fill("escola123");
  await celular.getByRole("button", { name: "Entrar" }).click();
  await celular.waitForURL(`${FRONT}/`);
  const menuCelular = celular.getByRole("navigation", { name: "Menu principal" });
  const mais = menuCelular.getByRole("button", { name: "Mais", exact: true });
  const folha = celular.getByRole("dialog", { name: "Mais telas", includeHidden: true });
  await menuCelular.waitFor();
  for (const rotulo of ["Painel", "Alunos", "Disciplinas", "Matrículas"]) {
    conferir(await menuCelular.getByRole("link", { name: new RegExp(`^${rotulo}`) }).isVisible(), `celular: aba ${rotulo} visivel`);
  }
  const caixaAbas = await menuCelular.boundingBox();
  conferir(Math.abs(caixaAbas.y + caixaAbas.height - 800) <= 1, "celular: abas fixas embaixo");
  conferir(await mais.isVisible(), "celular: botao Mais visivel");
  conferir(!(await folha.isVisible()), "celular: folha Mais comeca fechada");
  await menuCelular.getByRole("link", { name: /^Alunos/ }).click();
  await celular.waitForURL("**/alunos");
  await celular.getByRole("heading", { name: "Gestão de Alunos" }).waitFor();
  conferir(await celular.getByRole("heading", { name: "Gestão de Alunos" }).isVisible(), "celular: navegacao mostra a tela de alunos");
  conferir(await menuCelular.getByRole("link", { name: /^Disciplinas/ }).isVisible(), "celular: abas continuam visiveis ao navegar");
  await celular.screenshot({ path: "e2e/saida/celular-alunos.png" });
  await mais.click();
  await folha.waitFor();
  conferir(await folha.getByRole("link", { name: "Boletim", exact: true }).evaluate((el) => el === document.activeElement), "celular: Mais foca o primeiro link, Boletim");
  const itensMais = folha.locator("a[href], button");
  conferir(await itensMais.count() === 4, "celular: Mais contem Boletim, Frequencia, Avisos e Sair");
  for (const rotulo of ["Boletim", "Frequência", "Avisos"]) {
    conferir(await folha.getByRole("link", { name: new RegExp(`^${rotulo}`) }).isVisible(), `celular: Mais mostra ${rotulo}`);
  }
  for (let i = 1; i <= 4; i++) {
    await celular.keyboard.press("Tab");
    conferir(await itensMais.nth(i % 4).evaluate((el) => el === document.activeElement), `celular: Tab ${i} cicla dentro de Mais`);
  }
  await celular.keyboard.press("Shift+Tab");
  conferir(await folha.getByRole("button", { name: "Sair", exact: true }).evaluate((el) => el === document.activeElement), "celular: Shift+Tab cicla para Sair");
  await celular.keyboard.press("Escape");
  await folha.waitFor({ state: "hidden" });
  conferir(await mais.evaluate((el) => el === document.activeElement), "celular: Esc devolve foco a Mais");
  conferir(!(await folha.isVisible()), "celular: Esc fecha a folha Mais");
  await mais.click();
  await folha.waitFor();
  await celular.locator(".mais-fundo").click({ position: { x: 10, y: 100 } });
  await folha.waitFor({ state: "hidden" });
  conferir(await mais.evaluate((el) => el === document.activeElement), "celular: clique no fundo devolve foco a Mais");
  conferir(!(await folha.isVisible()), "celular: clique no fundo fecha Mais");
  await mais.click();
  await folha.getByRole("link", { name: "Boletim", exact: true }).click();
  await celular.waitForURL(`${FRONT}/boletim`);
  await folha.waitFor({ state: "hidden" });
  conferir(await mais.evaluate((el) => el === document.activeElement), "celular: navegar por Mais devolve foco ao botao");
  conferir(!(await folha.isVisible()), "celular: ativar link fecha Mais");
  await mais.click();
  await folha.getByRole("link", { name: "Boletim", exact: true }).click();
  await folha.waitFor({ state: "hidden" });
  conferir(celular.url() === `${FRONT}/boletim` && await mais.evaluate((el) => el === document.activeElement), "celular: link da rota atual mantem Boletim e devolve foco");
  conferir(!(await folha.isVisible()), "celular: ativar link da rota atual tambem fecha Mais");
  await mais.click();
  await folha.getByRole("button", { name: "Sair", exact: true }).click();
  await celular.waitForURL(`${FRONT}/login`);
  conferir(await celular.getByRole("button", { name: "Entrar" }).isVisible(), "celular: Sair na folha Mais encerra a sessao");
  await celular.close();

  await page.goto(`${FRONT}/alunos`);
  await page.getByText("Ana Souza").first().waitFor();

  // 4) F5 mantem sessao e rota
  await page.reload();
  await page.getByText("Ana Souza").first().waitFor();
  conferir(page.url().endsWith("/alunos"), "F5 em /alunos mantem sessao e rota");

  // 5) Sair limpa a sessao
  await barra.getByRole("button", { name: "Sair", exact: true }).click();
  await page.waitForURL("**/login");
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(true, "depois de Sair, /alunos volta a pedir login");

  // 6) localStorage com lixo: cai no login, sem tela branca
  await page.evaluate(() => localStorage.setItem("portal-escolar-sessao", "{lixo"));
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(await page.getByRole("button", { name: "Entrar" }).isVisible(), "sessao corrompida cai no login");

  // 7) API fora do ar: mensagem legivel
  await page.route(`${API}/**`, (rota) => rota.abort());
  await logar("prof@escola.com", "escola123");
  await page.getByRole("alert").waitFor();
  const msg = await page.getByRole("alert").innerText();
  conferir(msg.includes("servidor"), `API fora do ar mostra mensagem legivel (${msg})`);
  await page.unroute(`${API}/**`);

  // 8) aluno: vai para /meu-painel e nao abre rota de professor
  await page.reload();
  await page.getByLabel("E-mail").fill("ana@escola.com");
  await page.getByLabel("Senha").fill("escola123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/meu-painel");
  await page.getByText("Ana Souza").first().waitFor();
  await page.locator(".card-aviso").getByText("28/09/2026", { exact: true }).waitFor();
  conferir(await page.locator(".card-aviso").getByText("28/09/2026", { exact: true }).isVisible(), "aluna Ana: aviso do seed mostra 28/09/2026 no mural");
  conferir(await barra.getByText("Meu painel", { exact: true }).isVisible(), "aluna: Meu painel visivel no topo");
  conferir(await page.getByRole("button", { name: "Buscar (Ctrl K)" }).count() === 0, "aluna: sem botao de busca");
  conferir(await barra.getByRole("button", { name: "Sair", exact: true }).isVisible(), "aluna: Sair visivel no topo");
  conferir(await barra.getByRole("button", { name: /^(Tela anterior|Próxima tela)$/ }).count() === 0, "aluna: sem setas");
  conferir(await barra.getByText("Meu painel", { exact: true }).isVisible(), "aluna: titulo visivel sem expansao");
  conferir(await barra.locator("[aria-expanded]").count() === 0 && await page.getByRole("navigation", { name: "Menu principal", includeHidden: true }).count() === 0, "aluna: sem expansao nem abas de professor");
  const historicoAluna = await page.evaluate(() => history.length);
  await page.keyboard.press("Control+K");
  conferir(await page.getByText("Ana Souza").first().isVisible(), "aluna: painel continua visivel depois de Ctrl+K");
  conferir(await page.getByRole("dialog", { name: "Busca global" }).count() === 0, "aluna: Ctrl+K nao abre a paleta");
  await page.keyboard.press("Alt+m");
  conferir(await barra.getByText("Meu painel", { exact: true }).isVisible(), "aluna: Alt+M mantem o topo minimo");
  conferir(await barra.locator("[aria-expanded]").count() === 0, "aluna: Alt+M nao abre abas");
  for (let i = 1; i <= 7; i++) {
    await page.keyboard.press(`Alt+${i}`);
    conferir(page.url() === `${FRONT}/meu-painel` && await page.getByText("Ana Souza").first().isVisible(), `aluna: Alt+${i} mantem Meu painel`);
    conferir(await page.evaluate(() => history.length) === historicoAluna, `aluna: Alt+${i} nao cria navegacao no historico`);
  }
  await page.screenshot({ path: "e2e/saida/painel-aluno.png" });
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/meu-painel");
  conferir(true, "aluno em /alunos e redirecionado para /meu-painel");

  const erros = [...errosDeConsole, ...errosDaPagina, ...errosDaApi];
  conferir(erros.length === 0, `console sem erros (${erros.join(" | ")})`);
  console.log("SMOKE OK");
} catch (erro) {
  await page.screenshot({ path: "e2e/saida/falha.png" }).catch(() => {});
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  for (const id of extras) await api("DELETE", `/alunos/${id}`, null, tokenProfessor);
  await browser.close();
}
