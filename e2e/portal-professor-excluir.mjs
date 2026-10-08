// Excluir professor na tela Professores da escola. Usa API e Vite já em execução.
// Enquanto a API não tem DELETE /professores/{id}, o 204 e o 409 são simulados com page.route.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = process.env.API_URL || 'http://localhost:8000', FRONT = process.env.FRONT_URL || 'http://localhost:5173';
const sufixo = Date.now(), nome = 'Professor Excluir ' + sufixo, email = `excluir-${sufixo}@escola.com`;
const DETALHE_409 = 'Professor tem disciplinas; troque o professor delas antes de excluir.';
let browser, token;
async function api(caminho, method = 'GET', corpo) {
  const resposta = await fetch(API + caminho, {
    method, headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { status: resposta.status, corpo: resposta.status === 204 ? null : await resposta.json().catch(() => null) };
}
async function conferir(titulo, fn) {
  try { await fn(); console.log('OK ' + titulo); }
  catch (erro) { console.error('FALHOU ' + titulo + '\n' + erro.stack); erro.jaRelatado = true; throw erro; }
}
try {
  token = (await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' })).corpo.access_token;
  assert.ok(token, 'login da escola pela API');
  const prof = (await api('/professores', 'POST', { nome, email })).corpo;
  assert.ok(prof && prof.id, 'professor criado pela API');
  // A rota existe se o 404 de um id inexistente vier com a mensagem do servidor e não o "Not Found" do roteador.
  const sonda = await api('/professores/999999999', 'DELETE');
  const rotaReal = !(sonda.status === 404 && sonda.corpo?.detail === 'Not Found') && sonda.status !== 405;
  console.log(rotaReal ? 'API tem DELETE /professores/{id}: exclusão real' : 'API ainda sem DELETE /professores/{id}: 204 simulado com page.route');

  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  const botao = n => page.getByRole('button', { name: n, exact: true }).filter({ visible: true });
  const linha = () => page.locator('[data-linha-professor]').filter({ hasText: email });
  const form = () => page.locator('form').filter({ visible: true });

  let simulado = false, removido = false, deletes = 0;
  // Enquanto a rota não existe, depois do 204 simulado o estado volta sem o professor, como o servidor faria.
  await page.route(API + '/portal/estado', async rota => {
    const r = await rota.fetch();
    if (!removido) return rota.fulfill({ response: r });
    const dados = await r.json();
    dados.professores = dados.professores.filter(p => p.id !== prof.id);
    return rota.fulfill({ response: r, json: dados });
  });

  await page.goto(FRONT + '/login');
  await form().getByLabel('E-mail', { exact: true }).fill('escola@escola.com');
  await form().getByLabel('Senha', { exact: true }).fill('escola123');
  await form().getByRole('button', { name: 'Entrar', exact: true }).click();
  await botao('Menu do usuário').waitFor({ state: 'visible' });
  await page.keyboard.press('Alt+3');
  await linha().waitFor({ state: 'visible' });

  await conferir('o botão Excluir fica na linha do professor e pede confirmação em linha', async () => {
    assert.equal(await linha().getByRole('button', { name: 'Excluir', exact: true }).count(), 1);
    assert.equal(await linha().getByRole('button', { name: 'Redefinir senha', exact: true }).count(), 1);
    await linha().getByRole('button', { name: 'Excluir', exact: true }).click();
    await linha().getByText(`Excluir ${nome}? Esta ação não pode ser desfeita.`, { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await linha().getByRole('button', { name: 'Excluir de vez', exact: true }).count(), 1);
    assert.equal(await linha().getByRole('button', { name: 'Cancelar', exact: true }).count(), 1);
    assert.equal(await page.getByRole('dialog').count() + await page.getByRole('alertdialog').count(), 0, 'sem modal: a confirmação é em linha');
  });

  await conferir('cancelar fecha a confirmação sem chamar a API', async () => {
    page.on('request', r => { if (r.method() === 'DELETE' && r.url() === API + `/professores/${prof.id}`) deletes++; });
    await linha().getByRole('button', { name: 'Cancelar', exact: true }).click();
    await linha().getByRole('button', { name: 'Excluir de vez', exact: true }).waitFor({ state: 'detached' });
    assert.equal(deletes, 0);
  });

  await conferir('o 409 do servidor aparece em linha, com o detalhe, e o professor continua na lista', async () => {
    await page.route(API + `/professores/${prof.id}`, rota => rota.request().method() === 'DELETE'
      ? rota.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: DETALHE_409 }) }) : rota.continue());
    await linha().getByRole('button', { name: 'Excluir', exact: true }).click();
    await linha().getByRole('button', { name: 'Excluir de vez', exact: true }).click();
    const alerta = linha().getByRole('alert');
    await alerta.waitFor({ state: 'visible' });
    assert.equal((await alerta.innerText()).trim(), DETALHE_409);
    assert.equal(await linha().count(), 1);
    assert.equal(await linha().getByRole('button', { name: 'Excluir de vez', exact: true }).isEnabled(), true, 'botão volta a ficar habilitado');
    await linha().getByRole('button', { name: 'Cancelar', exact: true }).click();
    await linha().getByRole('alert').waitFor({ state: 'detached' });
    await page.unroute(API + `/professores/${prof.id}`);
  });

  await conferir('exclui pela tela: "Excluindo…" desabilitado, professor some e aparece "Professor excluído."', async () => {
    await page.route(API + `/professores/${prof.id}`, async rota => {
      if (rota.request().method() !== 'DELETE') return rota.continue();
      await new Promise(r => setTimeout(r, 500));
      if (rotaReal) return rota.continue();
      simulado = true; removido = true;
      return rota.fulfill({ status: 204 });
    });
    await linha().getByRole('button', { name: 'Excluir', exact: true }).click();
    const resp = page.waitForResponse(r => r.url() === API + `/professores/${prof.id}` && r.request().method() === 'DELETE');
    await linha().getByRole('button', { name: 'Excluir de vez', exact: true }).click();
    const ocupado = linha().getByRole('button', { name: 'Excluindo…', exact: true });
    await ocupado.waitFor({ state: 'visible' });
    assert.equal(await ocupado.isDisabled(), true);
    assert.equal((await resp).status(), 204);
    await linha().waitFor({ state: 'detached' });
    await page.getByText('Professor excluído.', { exact: true }).filter({ visible: true }).waitFor({ state: 'visible' });
    if (rotaReal) assert.ok(!(await api('/professores')).corpo.some(p => p.id === prof.id), 'o servidor também não lista mais');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
  if (simulado) console.log('professor de teste fica no banco (exclusão simulada): ' + email);
} catch (erro) {
  process.exitCode = 1;
  if (!erro?.jaRelatado) console.error('FALHOU\n' + (erro?.stack || erro));
} finally {
  await browser?.close();
}
