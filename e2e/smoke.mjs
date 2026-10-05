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
  await page.getByRole("button", { name: "Próxima" }).click();
  await page.getByText("Mostrando 11–12 de 12").waitFor();
  conferir(true, "alunos: pagina 2 mostra 11-12 de 12");
  await page.getByLabel("Buscar por nome ou matrícula").fill("S3-003");
  await page.getByText("Mostrando 1–1 de 1").waitFor();
  await page.getByText("Aluno Fumaça 3").first().waitFor();
  const busca = chamadas.filter((c) => c.metodo === "GET" && c.url.includes("/alunos?")).pop();
  conferir(busca.url.includes("q=S3-003") && busca.url.includes("pagina=1"), "busca por matricula vai ao servidor com q e pagina=1");
  await page.screenshot({ path: "e2e/saida/alunos-paginado.png" });

  // 10) painel: uma chamada ao /dashboard, com Bearer, sem situacao por aluno
  const antes = chamadas.length;
  await page.goto(`${FRONT}/dashboard`);
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
  const buscaAvisos = page.waitForResponse((r) => r.url().startsWith(`${API}/avisos?`) && r.request().method() === "GET" && new URL(r.url()).searchParams.get("q") === "fumaça");
  await page.getByLabel("Buscar aviso").fill("fumaça");
  conferir((await buscaAvisos).status() === 200, "avisos: busca por titulo vai ao servidor");
  await page.getByText("Aviso de fumaça").first().waitFor();
  const avisoCriado = (await api("GET", "/avisos?q=fuma%C3%A7a", null, tokenProfessor)).corpo.itens[0];
  const exclusao = await api("DELETE", `/avisos/${avisoCriado.id}`, null, tokenProfessor);
  conferir(exclusao.status === 204, "avisos: criado, achado pela busca e removido");

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

  await page.goto(`${FRONT}/alunos`);
  await page.getByText("Ana Souza").first().waitFor();

  // 4) F5 mantem sessao e rota
  await page.reload();
  await page.getByText("Ana Souza").first().waitFor();
  conferir(page.url().endsWith("/alunos"), "F5 em /alunos mantem sessao e rota");

  // 5) Sair limpa a sessao
  await page.getByRole("button", { name: "Sair" }).click();
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
