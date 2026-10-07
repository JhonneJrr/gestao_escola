// Usa os serviços em execução e as contas do seed, sem alterar dados.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const FRONT = process.env.FRONT_URL || 'http://localhost:5173';
const API = 'http://localhost:8000';
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (erro) { console.error('FALHOU ' + nome + '\n' + erro.stack); throw erro; }
}
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [], chamadas = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('request', r => {
    if (r.url().startsWith(API)) chamadas.push({ caminho: new URL(r.url()).pathname, metodo: r.method() });
  });
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  const usuario = () => page.getByRole('button', { name: 'Menu do usuário' });
  const nav = () => page.getByRole('navigation', { name: 'Telas', exact: true });
  async function url(caminho) { await page.waitForURL(FRONT + caminho); assert.equal(new URL(page.url()).pathname, caminho); }
  async function apresentacao() {
    await page.getByRole('button', { name: 'Entrar no portal', exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await usuario().count(), 0);
  }
  async function formularioLogin() {
    const form = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await form.getByLabel('E-mail', { exact: true }).waitFor({ state: 'visible' });
    await form.getByLabel('Senha', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await usuario().count(), 0);
    return form;
  }
  async function entrar(email, destino) {
    const form = await formularioLogin();
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill('escola123');
    const resposta = page.waitForResponse(r => r.url() === API + '/auth/login');
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    assert.equal((await resposta).status(), 200);
    await usuario().waitFor({ state: 'visible' });
    await url(destino);
    await usuario().click();
    await visivel(email).first().waitFor({ state: 'visible' });
    await usuario().click();
    assert.ok(await page.evaluate(() => localStorage.getItem('portal.token')));
  }
  async function telaMenu(rotulo, caminho) {
    await nav().locator('button[aria-current="true"]').filter({ has: page.getByText(rotulo, { exact: true }) }).waitFor({ state: 'visible' });
    await url(caminho);
    assert.equal(await usuario().isVisible(), true);
  }
  async function menu(rotulo, caminho) {
    await page.mouse.move(0, 700);
    await usuario().hover();
    await nav().getByRole('button', { name: new RegExp('^' + rotulo + '(?:\\s|$)') }).click();
    await telaMenu(rotulo, caminho);
  }
  async function sair() {
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await url('/'); await apresentacao();
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), null);
  }

  await conferir('visitante em /grade vê login e não vê a tela protegida', async () => {
    await page.goto(FRONT + '/grade');
    await formularioLogin(); await url('/login');
    assert.equal(await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).count(), 0);
  });
  await conferir('sessão inválida em rota protegida é apagada e mostra login', async () => {
    await page.evaluate(() => localStorage.setItem('portal.token', 'invalido'));
    const resposta = page.waitForResponse(r => r.url() === API + '/auth/me');
    await page.goto(FRONT + '/disciplinas');
    assert.equal((await resposta).status(), 401);
    await formularioLogin(); await url('/login');
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), null);
    assert.equal(await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).count(), 0);
  });
  await conferir('login em rota protegida leva escola à primeira tela do perfil', async () => {
    await entrar('escola@escola.com', '/painel');
    await telaMenu('Painel', '/painel');
  });
  for (const [rotulo, caminho] of [
    ['Semestre', '/semestre'], ['Disciplinas', '/disciplinas'], ['Professores', '/professores'],
    ['Alunos', '/alunos'], ['Matrículas', '/matriculas'], ['Grade e agenda', '/agenda'], ['Avisos', '/avisos'], ['Painel', '/painel'],
  ]) {
    await conferir('menu da escola: ' + rotulo + ' usa ' + caminho, () => menu(rotulo, caminho));
  }
  await conferir('escola abre /grade e conserva a rota após recarga', async () => {
    await page.goto(FRONT + '/grade'); await page.locator('[data-sc-name="Grade e Agenda"]').waitFor({ state: 'visible' });
    await url('/grade'); await page.reload(); await page.locator('[data-sc-name="Grade e Agenda"]').waitFor({ state: 'visible' }); await url('/grade');
  });
  await conferir('recarregar /disciplinas mantém a tela, a sessão e os dados', async () => {
    await menu('Disciplinas', '/disciplinas');
    const token = await page.evaluate(() => localStorage.getItem('portal.token'));
    assert.ok(token);
    await page.reload();
    await telaMenu('Disciplinas', '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).waitFor({ state: 'visible' });
    await visivel('Python').first().waitFor({ state: 'visible' });
    await visivel('Algoritmos').first().waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), token);
  });
  await conferir('voltar e avançar no navegador restauram a tela anterior sem nova navegação', async () => {
    await menu('Professores', '/professores');
    await page.goBack(); await telaMenu('Disciplinas', '/disciplinas');
    await visivel('Python').first().waitFor({ state: 'visible' });
    await page.goForward(); await telaMenu('Professores', '/professores');
    await visivel('Prof. Carlos').first().waitFor({ state: 'visible' });
  });
  await conferir('raiz e caminho desconhecido logados levam escola ao painel', async () => {
    for (const caminho of ['/', '/xyz']) {
      await page.goto(FRONT + caminho); await telaMenu('Painel', '/painel');
    }
  });
  await conferir('sair volta à raiz; /painel deslogado mostra o login', async () => {
    await sair();
    await page.goto(FRONT + '/painel'); await formularioLogin(); await url('/login');
    assert.equal(await nav().count(), 0);
  });
  await conferir('Carlos em /professores vê o aviso e volta ao painel dele', async () => {
    await entrar('prof@escola.com', '/painel');
    await page.goto(FRONT + '/professores');
    await visivel('Essa tela não faz parte do perfil Professor. Você voltou ao início.').waitFor({ state: 'visible' });
    await telaMenu('Painel', '/painel');
    await usuario().click(); await visivel('prof@escola.com').first().waitFor({ state: 'visible' }); await usuario().click();
    assert.equal(await nav().getByRole('button', { name: /^Professores(?:\s|$)/ }).count(), 0);
  });
  await conferir('Carlos recarrega /agenda e mantém a tela permitida', async () => {
    await menu('Grade e agenda', '/agenda'); await page.reload(); await telaMenu('Grade e agenda', '/agenda');
  });
  await conferir('Ana em /alunos vê o aviso e volta ao próprio painel', async () => {
    await sair(); await page.goto(FRONT + '/login'); await entrar('ana@escola.com', '/meu-painel');
    await page.goto(FRONT + '/alunos');
    await visivel('Essa tela não faz parte do perfil Aluno. Você voltou ao início.').waitFor({ state: 'visible' });
    await url('/meu-painel');
    await visivel('Meu painel').first().waitFor({ state: 'visible' });
    await visivel('Ana Souza').first().waitFor({ state: 'visible' });
    assert.equal(await nav().count(), 0);
  });
  await conferir('caminho desconhecido logado leva Ana à primeira tela do perfil', async () => {
    await page.goto(FRONT + '/xyz'); await url('/meu-painel');
    await visivel('Meu painel').first().waitFor({ state: 'visible' });
    await visivel('Ana Souza').first().waitFor({ state: 'visible' });
  });
  await conferir('caminho desconhecido visitante mostra a apresentação na raiz', async () => {
    await sair(); await page.goto(FRONT + '/xyz'); await url('/'); await apresentacao();
  });
  await conferir('abrir login pela apresentação e voltar pelo histórico sincroniza a URL', async () => {
    await page.getByRole('button', { name: 'Entrar no portal', exact: true }).first().click();
    await formularioLogin(); await url('/login');
    await page.goBack(); await url('/'); await apresentacao();
    await page.locator('input[type=email]').waitFor({ state: 'hidden' });
    await page.goForward(); await formularioLogin(); await url('/login');
  });
  await conferir('/primeiro-acesso abre a troca de senha e Sair volta à raiz', async () => {
    await page.goto(FRONT + '/primeiro-acesso');
    await page.getByRole('heading', { name: 'Troque sua senha' }).waitFor({ state: 'visible' });
    await page.getByLabel('Nova senha', { exact: true }).waitFor({ state: 'visible' });
    await url('/primeiro-acesso');
    assert.equal(await usuario().count(), 0);
    await sair();
  });
  await conferir('portal na raiz sem erros e sem escritas de dados na API', async () => {
    assert.equal(await page.locator('#dc-root > [data-sc-name="Portal Escolar"]').count(), 1);
    assert.ok(chamadas.some(c => c.caminho === '/auth/me' && c.metodo === 'GET'));
    assert.ok(chamadas.some(c => c.caminho === '/portal/estado' && c.metodo === 'GET'));
    assert.deepEqual(chamadas.filter(c => c.metodo !== 'GET' && c.caminho !== '/auth/login'), []);
    assert.deepEqual(erros, []);
  });
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  await browser?.close();
}
