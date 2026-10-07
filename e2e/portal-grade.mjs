// Usa o seed e os serviços locais. A ocupação é restaurada no finally.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173';
let browser, token, carlos, originais;
async function api(caminho, method = 'GET', corpo) {
  const r = await fetch(API + caminho, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { status: r.status, corpo: await r.json() };
}
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (er) { console.error('FALHOU ' + nome + '\n' + er.stack); throw er; }
}
try {
  const login = await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' });
  assert.equal(login.status, 200); token = login.corpo.access_token;
  const r = await api('/portal/estado'); assert.equal(r.status, 200);
  const seed = r.corpo;
  carlos = seed.professores.find(p => p.email === 'prof@escola.com'); assert.ok(carlos);
  const ocup = await api(`/professores/${carlos.id}/ocupacoes`); assert.equal(ocup.status, 200);
  originais = ocup.corpo;
  const segunda = originais.find(o => o.dia_semana === 1); assert.ok(segunda, 'seed de Carlos deve ter ocupação na segunda');
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(15000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [];
  page.on('pageerror', er => erros.push(er.message));
  const grade = () => page.locator('[data-sc-name="Grade e Agenda"]');
  const visivel = t => page.getByText(t, { exact: true }).filter({ visible: true });
  async function entrar(email) {
    await page.goto(FRONT + '/login');
    const f = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await f.getByLabel('E-mail', { exact: true }).fill(email);
    await f.getByLabel('Senha', { exact: true }).fill('escola123');
    const resp = page.waitForResponse(r => r.url() === API + '/auth/login');
    await f.getByRole('button', { name: 'Entrar', exact: true }).click(); assert.equal((await resp).status(), 200);
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  async function abrirGrade() {
    await page.goto(FRONT + '/grade');
    await grade().getByRole('tablist', { name: 'Seções' }).waitFor({ state: 'visible' });
    assert.equal(new URL(page.url()).pathname, '/grade');
  }
  async function sair() {
    await page.goto(FRONT + '/painel');
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.getByRole('button', { name: 'Entrar no portal', exact: true }).first().waitFor({ state: 'visible' });
  }
  await conferir('escola abre /grade com disciplinas reais e ocupação de Carlos na segunda', async () => {
    await entrar('escola@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
    const nomes = await grade().locator('select').filter({ has: page.locator('option', { hasText: 'Python' }) }).locator('option').allTextContents();
    for (const d of seed.disciplinas) assert.ok(nomes.some(n => n.startsWith(d.nome + ' · ')), d.nome);
    assert.ok(nomes.some(n => n.startsWith('Python · ')));
    const quadro = grade().locator('[data-quadro-professores]');
    await quadro.getByText(carlos.nome, { exact: true }).waitFor({ state: 'visible' });
    await quadro.locator('[title]').filter({ hasText: '' }).evaluateAll((els, esperado) => {
      if (!els.some(el => el.getAttribute('title') === esperado)) throw new Error('Ocupação real ausente no Quadro');
    }, carlos.nome + ' · ' + (segunda.motivo || 'ocupado') + ' · ' + segunda.hora_inicio + '–' + segunda.hora_fim);
    const ds = seed.disciplinas.filter(d => d.grade.length && d.professor_id != null);
    assert.ok(ds.length);
    for (const d of ds) assert.ok(await quadro.getByRole('button', { name: new RegExp('^' + d.nome + ' · ') }).count(), d.nome);
  });
  await conferir('ficha mostra ocupações, salva e conserva a lista real', async () => {
    await page.goto(FRONT + '/professores');
    await page.getByRole('button', { name: 'Abrir ficha de ' + carlos.nome, exact: true }).getByText(carlos.nome, { exact: true }).click();
    const f = page.locator('[data-ficha-professor]');
    await f.getByRole('button', { name: 'Salvar horários', exact: true }).waitFor({ state: 'visible' });
    assert.equal(await f.getByLabel('Dia da semana', { exact: true }).count(), originais.length);
    for (const [i, o] of originais.entries()) {
      assert.equal(await f.getByLabel('Dia da semana', { exact: true }).nth(i).inputValue(), String(o.dia_semana));
      assert.equal(await f.getByLabel('Início', { exact: true }).nth(i).inputValue(), o.hora_inicio);
      assert.equal(await f.getByLabel('Fim', { exact: true }).nth(i).inputValue(), o.hora_fim);
      assert.equal(await f.getByLabel('Motivo', { exact: true }).nth(i).inputValue(), o.motivo);
    }
    const mudados = originais.map((o, i) => ({ ...o, motivo: i === 0 ? 'Conferência F5a' : o.motivo }));
    await f.getByLabel('Motivo', { exact: true }).first().fill(mudados[0].motivo);
    const resp = page.waitForResponse(r => r.url() === API + `/professores/${carlos.id}/ocupacoes` && r.request().method() === 'PUT');
    await f.getByRole('button', { name: 'Salvar horários', exact: true }).click();
    const salvo = await resp; assert.equal(salvo.status(), 200);
    assert.deepEqual(salvo.request().postDataJSON(), { itens: mudados });
    await f.getByRole('status').filter({ hasText: 'Horários salvos.' }).waitFor({ state: 'visible' });
    assert.deepEqual((await api(`/professores/${carlos.id}/ocupacoes`)).corpo, mudados);
    assert.equal((await api(`/professores/${carlos.id}/ocupacoes`, 'PUT', { itens: originais })).status, 200);
    assert.deepEqual((await api(`/professores/${carlos.id}/ocupacoes`)).corpo, originais);
  });
  await conferir('assistente envia conversa inteira ao servidor e mantém o resultado na tela', async () => {
    await page.goto(FRONT + '/disciplinas');
    await page.getByRole('button', { name: 'Assistente de grade', exact: true }).click();
    const painel = page.locator('[data-assistente-grade]');
    const mensagem = 'Tem algum choque na grade atual?';
    await painel.getByLabel('Mensagem para o assistente', { exact: true }).fill(mensagem);
    const resp = page.waitForResponse(r => r.url() === API + '/ia/grade' && r.request().method() === 'POST', { timeout: 90000 });
    await painel.locator('button[type=submit]').click();
    const recebido = await resp, corpo = await recebido.json();
    assert.deepEqual(recebido.request().postDataJSON(), { mensagens: [{ papel: 'usuario', texto: mensagem }] });
    await painel.getByText(mensagem, { exact: true }).waitFor({ state: 'visible' });
    if (recebido.status() === 200) await painel.getByText(corpo.resposta, { exact: true }).waitFor({ state: 'visible' });
    else {
      assert.ok([429, 502, 503].includes(recebido.status()), JSON.stringify(corpo));
      await painel.getByRole('alert').filter({ hasText: corpo.detail }).waitFor({ state: 'visible' });
    }
    // Não aplica propostas: este teste preserva as grades do seed.
  });
  await conferir('Carlos abre /grade e o Quadro mostra só disciplinas dele', async () => {
    await sair(); await entrar('prof@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: 'Minha semana', exact: true }).waitFor({ state: 'visible' });
    const opcoes = await grade().locator('select').filter({ has: page.locator('option', { hasText: 'Python' }) }).locator('option').allTextContents();
    const minhas = seed.disciplinas.filter(d => d.professor_id === carlos.id); assert.ok(minhas.length);
    for (const d of minhas) assert.ok(opcoes.some(n => n.startsWith(d.nome + ' · ')), d.nome);
    for (const d of seed.disciplinas.filter(d => d.professor_id !== carlos.id)) {
      assert.ok(opcoes.some(n => n.startsWith(minhas[0].nome + ' · ')));
      assert.equal(opcoes.some(n => n.startsWith(d.nome + ' · ')), false);
      assert.equal(await grade().locator('[data-bloco]').getByText(d.nome, { exact: true }).count(), 0);
    }
    assert.ok(await grade().locator('[data-bloco]').count());
    assert.equal(await grade().getByRole('button', { name: 'Assistente de grade', exact: true }).count(), 0);
  });
  await conferir('Ana abre /grade em leitura sem controles de edição', async () => {
    await sair(); await entrar('ana@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: 'Minha semana', exact: true }).waitFor({ state: 'visible' });
    assert.ok(await grade().locator('[data-bloco]').count());
    for (const nome of ['Assistente de grade', 'Nova disciplina', 'Novo evento']) assert.equal(await grade().getByRole('button', { name: nome, exact: true }).count(), 0);
    await grade().locator('[data-bloco]').first().press('Enter');
    await grade().getByRole('dialog').waitFor({ state: 'visible' });
    await grade().getByText('Aula', { exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await grade().getByRole('button', { name: 'Editar disciplina', exact: true }).count(), 0);
    assert.deepEqual(erros, []);
    await visivel('Meu painel').first().waitFor({ state: 'visible' });
  });
} catch (er) {
  process.exitCode = 1;
  if (!browser) console.error(er.stack);
} finally {
  if (originais && carlos) {
    try {
      const r = await api(`/professores/${carlos.id}/ocupacoes`, 'PUT', { itens: originais });
      assert.equal(r.status, 200);
      assert.deepEqual((await api(`/professores/${carlos.id}/ocupacoes`)).corpo, originais);
      console.log('OK ocupações originais restauradas');
    } catch (er) { process.exitCode = 1; console.error('FALHOU restauração\n' + er.stack); }
  }
  await browser?.close();
}
