// Usa os serviços em execução e as contas do seed, sem alterar dados.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const FRONT = process.env.FRONT_URL || 'http://localhost:5173';
const API = process.env.API_URL || 'http://localhost:8000';
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
  // A escola tem seis telas; Disciplinas e Grade agora vivem dentro do Acadêmico (/agenda).
  for (const [rotulo, caminho] of [
    ['Semestre', '/semestre'], ['Professores', '/professores'],
    ['Alunos', '/alunos'], ['Acadêmico', '/agenda'], ['Avisos', '/avisos'], ['Painel', '/painel'],
  ]) {
    await conferir('menu da escola: ' + rotulo + ' usa ' + caminho, () => menu(rotulo, caminho));
  }
  await conferir('menu da escola tem exatamente as seis telas, na ordem dos atalhos Alt+N', async () => {
    const nomes = await nav().getByRole('button').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label') || b.textContent.trim()));
    const esperado = ['Painel', 'Semestre', 'Professores', 'Alunos', 'Acadêmico', 'Avisos'];
    assert.deepEqual(esperado.map(n => nomes.some(x => x.startsWith(n))), esperado.map(() => true));
    assert.equal(nomes.length, 6);
    assert.equal(await nav().getByRole('button', { name: /^(Disciplinas|Matrículas|Grade e agenda)(?:\s|$)/ }).count(), 0);
    for (const [i, [rotulo, caminho]] of [['Semestre', '/semestre'], ['Professores', '/professores'], ['Alunos', '/alunos'], ['Acadêmico', '/agenda'], ['Avisos', '/avisos']].entries()) {
      await page.keyboard.press('Alt+' + (i + 2)); await telaMenu(rotulo, caminho);
    }
    await page.keyboard.press('Alt+1'); await telaMenu('Painel', '/painel');
  });
  await conferir('Acadêmico abre o quadro semanal em /agenda e tem as quatro abas da escola', async () => {
    await menu('Acadêmico', '/agenda');
    const grade = page.locator('[data-sc-name="GradeAgenda"]');
    const abas = grade.getByRole('tablist', { name: 'Seções', exact: true });
    await abas.waitFor({ state: 'visible' });
    for (const aba of ['Quadro semanal', 'Ano letivo', 'Disciplinas']) await abas.getByRole('tab', { name: aba, exact: true }).waitFor({ state: 'visible' });
    await abas.getByRole('tab', { name: /^Pedidos de aula extra/ }).waitFor({ state: 'visible' });
    assert.equal(await abas.getByRole('tab', { name: 'Quadro semanal', exact: true }).getAttribute('aria-selected'), 'true');
  });
  await conferir('escola abre /grade e conserva a rota após recarga', async () => {
    await page.goto(FRONT + '/grade'); await page.locator('[data-sc-name="GradeAgenda"]').waitFor({ state: 'visible' });
    await url('/grade'); await page.reload(); await page.locator('[data-sc-name="GradeAgenda"]').waitFor({ state: 'visible' }); await url('/grade');
  });
  await conferir('aba Disciplinas do Acadêmico abre a página da disciplina em /disciplinas e o voltar leva à aba', async () => {
    await menu('Acadêmico', '/agenda');
    const grade = page.locator('[data-sc-name="GradeAgenda"]');
    await grade.getByRole('tab', { name: 'Disciplinas', exact: true }).click();
    await grade.getByText('Algoritmos', { exact: true }).first().click();
    await telaMenu('Acadêmico', '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('tablist', { name: 'Seções da disciplina', exact: true }).waitFor({ state: 'visible' });
    await page.goBack(); await telaMenu('Acadêmico', '/agenda');
    await grade.getByRole('tablist', { name: 'Seções', exact: true }).waitFor({ state: 'visible' });
  });
  await conferir('recarregar /disciplinas mantém a tela, a sessão e os dados', async () => {
    await page.goto(FRONT + '/disciplinas');
    const token = await page.evaluate(() => localStorage.getItem('portal.token'));
    assert.ok(token);
    await telaMenu('Acadêmico', '/disciplinas');
    await page.reload();
    await telaMenu('Acadêmico', '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).waitFor({ state: 'visible' });
    await visivel('Python').first().waitFor({ state: 'visible' });
    await visivel('Algoritmos').first().waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), token);
  });
  await conferir('escola em /matriculas cai no hub de turmas em /alunos', async () => {
    await page.goto(FRONT + '/matriculas');
    await telaMenu('Alunos', '/alunos');
    for (const turma of ['1º A', '2º A', '3º A']) await page.getByRole('button', { name: new RegExp('^' + turma) }).filter({ visible: true }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Nova turma', exact: true }).waitFor({ state: 'visible' });
  });
  await conferir('voltar e avançar no navegador restauram a tela anterior sem nova navegação', async () => {
    await page.goto(FRONT + '/disciplinas'); await telaMenu('Acadêmico', '/disciplinas');
    await menu('Professores', '/professores');
    await page.goBack(); await telaMenu('Acadêmico', '/disciplinas');
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
    assert.equal(await nav().getByRole('button', { name: /^Acadêmico(?:\s|$)/ }).count(), 1);
    assert.equal(await nav().getByRole('button', { name: /^Professores(?:\s|$)/ }).count(), 0);
  });
  await conferir('Carlos tem quatro telas (Painel, Acadêmico, Minhas turmas, Avisos) e recarrega /agenda', async () => {
    assert.equal(await nav().getByRole('button').count(), 4);
    for (const rotulo of ['Painel', 'Acadêmico', 'Minhas turmas', 'Avisos']) assert.equal(await nav().getByRole('button', { name: new RegExp('^' + rotulo + '(?:\\s|$)') }).count(), 1, rotulo);
    await menu('Acadêmico', '/agenda'); await page.reload(); await telaMenu('Acadêmico', '/agenda');
    const abas = page.locator('[data-sc-name="GradeAgenda"]').getByRole('tablist', { name: 'Seções', exact: true });
    for (const aba of ['Minha semana', 'Ano letivo', 'Disciplinas', 'Aulas extras']) await abas.getByRole('tab', { name: aba, exact: true }).waitFor({ state: 'visible' });
  });
  await conferir('Carlos em /matriculas abre a sub-aba de notas da disciplina em /disciplinas', async () => {
    await page.goto(FRONT + '/matriculas');
    await telaMenu('Acadêmico', '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('tab', { name: /^Avaliações e notas/ }).and(page.locator('[aria-selected="true"]')).waitFor({ state: 'visible' });
    await page.getByLabel('Nota de Ana Souza em P1', { exact: true }).waitFor({ state: 'visible' });
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
