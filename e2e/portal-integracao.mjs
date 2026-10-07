// Usa os serviços já em execução. Só cria uma conta nova para testar troca de senha.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const FRONT = 'http://localhost:5173';
const API = 'http://localhost:8000';
async function api(caminho, corpo, token) {
  const resposta = await fetch(API + caminho, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: JSON.stringify(corpo),
  });
  return { status: resposta.status, corpo: await resposta.json() };
}
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (erro) { console.error('FALHOU ' + nome + '\n' + erro.stack); throw erro; }
}
let browser, tokenEscola, alunoCriado;
try {
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const chamadas = [], erros = [];
  page.on('request', r => {
    if (r.url().startsWith(API)) chamadas.push({ caminho: new URL(r.url()).pathname, auth: r.headers().authorization });
  });
  page.on('pageerror', e => erros.push(e.message));
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  async function login(email, senha) {
    await page.goto(FRONT + '/portal.html?inicio=Login');
    const form = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill(senha);
    const resposta = page.waitForResponse(r => r.url() === API + '/auth/login');
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    return await resposta;
  }
  async function entrou() { await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' }); }
  async function saiu() {
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await page.locator('input[type=email]').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), null);
  }
  async function identidade(email, nome) {
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await visivel(email).first().waitFor({ state: 'visible' });
    await visivel(nome).first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
  }

  await conferir('senha errada exibe o detalhe real e permanece no login', async () => {
    const resposta = await login('escola@escola.com', 'errada');
    assert.equal(resposta.status(), 401);
    const { detail } = await resposta.json();
    await page.getByRole('alert').filter({ hasText: detail }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('input[type=email]').isVisible(), true);
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
  });

  const contas = [
    { email: 'escola@escola.com', disciplinas: ['Redes', 'Python', 'Banco de Dados', 'Algoritmos'] },
    { email: 'prof@escola.com', disciplinas: ['Python', 'Banco de Dados'], ausente: 'Algoritmos' },
    { email: 'marta@escola.com', disciplinas: ['Algoritmos'], ausente: 'Python' },
    { email: 'ana@escola.com', aluno: true },
  ];
  for (const conta of contas) {
    await conferir(conta.email + ': login real e recorte do seed', async () => {
      assert.equal((await login(conta.email, 'escola123')).status(), 200);
      await entrou();
      const token = await page.evaluate(() => localStorage.getItem('portal.token'));
      assert.ok(token);
      const resposta = await fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const usuario = await resposta.json();
      await identidade(conta.email, usuario.nome);
      if (conta.aluno) {
        await visivel('Meu painel').waitFor({ state: 'visible' });
        await visivel('Ana Souza').first().waitFor({ state: 'visible' });
        assert.equal(await page.getByRole('button', { name: 'Professores', exact: true }).filter({ visible: true }).count(), 0);
      } else {
        await page.keyboard.press('Alt+3');
        for (const disciplina of conta.disciplinas) await visivel(disciplina).first().waitFor({ state: 'visible' });
        if (conta.ausente) {
          assert.ok(await visivel(conta.disciplinas[0]).count());
          assert.equal(await visivel(conta.ausente).count(), 0);
        }
      }
    });
    await conferir(conta.email + ': recarregar restaura a sessão', async () => {
      await page.reload(); await entrou();
      await page.getByRole('button', { name: 'Menu do usuário' }).click();
      await visivel(conta.email).first().waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Menu do usuário' }).click();
    });
    await conferir(conta.email + ': sair e recarregar volta ao início', async () => {
      await saiu(); await page.goto(FRONT + '/portal.html');
      await page.getByRole('button', { name: 'Entrar no portal', exact: true }).first().waitFor({ state: 'visible' });
      assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
    });
  }

  let contaNova, provisoria;
  await conferir('primeiro acesso: cria aluno novo com senha provisória, sem alterar o seed', async () => {
    const escola = await api('/auth/login', { email: 'escola@escola.com', senha: 'escola123' });
    assert.equal(escola.status, 200);
    tokenEscola = escola.corpo.access_token;
    const id = Date.now();
    contaNova = { nome: 'Aluno Integração F2 ' + id, email: 'f2-' + id + '@escola.com', idade: 20, matricula: 'F2-' + id };
    const criado = await api('/alunos', contaNova, escola.corpo.access_token);
    assert.equal(criado.status, 201);
    alunoCriado = criado.corpo.id;
    assert.ok(criado.corpo.senha_provisoria_texto);
    provisoria = criado.corpo.senha_provisoria_texto;
    console.log('Conta criada para o teste: ' + contaNova.email);
    assert.equal((await login(contaNova.email, provisoria)).status(), 200);
    await page.getByRole('heading', { name: 'Troque sua senha' }).waitFor({ state: 'visible' });
    await page.getByText('Primeiro acesso · ' + contaNova.email, { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
  });
  await conferir('recarregar senha provisória continua no Primeiro acesso', async () => {
    await page.reload();
    await page.getByRole('heading', { name: 'Troque sua senha' }).waitFor({ state: 'visible' });
    await page.getByText('Primeiro acesso · ' + contaNova.email, { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
    // A senha digitada no login precisa existir em memória para enviar senha_atual.
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await login(contaNova.email, provisoria);
    await page.getByRole('heading', { name: 'Troque sua senha' }).waitFor({ state: 'visible' });
  });
  const novaSenha = 'integracaoF2-123';
  await conferir('Primeiro acesso troca a senha real e entra com a identidade do novo aluno', async () => {
    const form = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Troque sua senha' }) });
    await form.getByLabel('Nova senha', { exact: true }).fill(novaSenha);
    await form.getByLabel('Confirmar nova senha', { exact: true }).fill(novaSenha);
    await form.locator('button[type=submit]').click();
    await entrou(); await visivel('Meu painel').waitFor({ state: 'visible' });
    await identidade(contaNova.email, contaNova.nome);
    const correto = await api('/auth/login', { email: contaNova.email, senha: novaSenha });
    assert.equal(correto.status, 200);
    const anterior = await api('/auth/login', { email: contaNova.email, senha: provisoria });
    assert.equal(anterior.status, 401);
  });
  await conferir('troca com senha atual errada mostra detalhe e preserva sessão', async () => {
    await page.getByRole('button', { name: 'Menu do usuário' }).click();
    await page.getByRole('menuitem', { name: 'Trocar senha' }).click();
    const form = page.locator('form').filter({ has: page.getByLabel('Senha atual', { exact: true }) });
    await form.getByLabel('Senha atual', { exact: true }).fill('errada');
    await form.getByLabel(/^Nova senha/).fill('integracaoF2-456');
    await form.getByLabel('Confirmar nova senha', { exact: true }).fill('integracaoF2-456');
    const resposta = page.waitForResponse(r => r.url() === API + '/auth/trocar-senha');
    await form.getByRole('button', { name: 'Trocar senha', exact: true }).click();
    const erro = await resposta; assert.equal(erro.status(), 401);
    await form.getByRole('alert').filter({ hasText: (await erro.json()).detail }).waitFor({ state: 'visible' });
    assert.ok(await page.evaluate(() => localStorage.getItem('portal.token')));
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).isVisible(), true);
  });
  await conferir('troca no avatar salva a senha real e confirma sucesso', async () => {
    const form = page.locator('form').filter({ has: page.getByLabel('Senha atual', { exact: true }) });
    await form.getByLabel('Senha atual', { exact: true }).fill(novaSenha);
    await form.getByRole('button', { name: 'Trocar senha', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Senha alterada.' }).waitFor({ state: 'visible' });
    assert.equal((await api('/auth/login', { email: contaNova.email, senha: 'integracaoF2-456' })).status, 200);
  });
  await conferir('401 de login não apaga uma sessão existente', async () => {
    const antes = await page.evaluate(() => localStorage.getItem('portal.token'));
    assert.ok(antes);
    const erro = await page.evaluate(async () => {
      // Use a mesma instância carregada pelo Portal, incluindo a query do Vite.
      const url = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === '/src/portal/rede.ts').name;
      const rede = await import(url);
      try { await rede.login('escola@escola.com', 'errada'); } catch (e) { return e; }
    });
    assert.deepEqual(erro, { status: 401, detalhe: 'E-mail ou senha incorretos' });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), antes);
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).isVisible(), true);
  });
  await conferir('lista de validação é normalizada com status e mensagens da API', async () => {
    const erro = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === '/src/portal/rede.ts').name;
      const rede = await import(url);
      try { await rede.trocarSenha('', 'curta'); } catch (e) { return e; }
    });
    assert.equal(erro.status, 422);
    assert.equal(erro.detalhe, 'String should have at least 1 character; String should have at least 8 characters');
    assert.ok(await page.evaluate(() => localStorage.getItem('portal.token')));
  });
  await conferir('401 durante uso expira a sessão e mostra login vazio', async () => {
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).isVisible(), true);
    const erro = await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === '/src/portal/rede.ts').name;
      const rede = await import(url);
      rede.guardarToken('invalido');
      try { await rede.estado(); } catch (e) { return e; }
    });
    assert.equal(erro.status, 401);
    await page.locator('input[type=email]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('input[type=password]').inputValue(), '');
    const visitante = await page.evaluate(() => {
      const host = document.querySelector('[data-sc-name="Portal Escolar"]');
      const chave = Object.keys(host).find(k => k.startsWith('__reactFiber$'));
      let fiber = host[chave];
      while (!fiber.stateNode?.logic) fiber = fiber.return;
      const st = fiber.stateNode.logic.state;
      return {
        logado: st.logado, tela: st.tela, usuario: st.usuario, papel: st.papel, semestre: st.semestre,
        colecoes: Object.fromEntries(['profs', 'alunos', 'discs', 'historico', 'avisos', 'mats', 'avals', 'notas', 'aulas', 'metricas'].map(k => [k, st[k]])),
      };
    });
    assert.deepEqual(visitante, {
      logado: false, tela: 'login', usuario: null, papel: null, semestre: null,
      colecoes: { profs: [], alunos: [], discs: [], historico: [], avisos: [], mats: {}, avals: [], notas: {}, aulas: [], metricas: [] },
    });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), null);
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
  });
  await conferir('token inválido ao recarregar é apagado e fica no início', async () => {
    await page.evaluate(() => localStorage.setItem('portal.token', 'invalido'));
    const resposta = page.waitForResponse(r => r.url() === API + '/auth/me');
    await page.goto(FRONT + '/portal.html');
    assert.equal((await resposta).status(), 401);
    await page.getByRole('button', { name: 'Entrar no portal', exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => localStorage.getItem('portal.token')), null);
    assert.equal(await page.getByRole('button', { name: 'Menu do usuário' }).count(), 0);
  });
  await conferir('rede usa só me/estado para ler os dados, sempre com Bearer; login sem Bearer', async () => {
    assert.ok(chamadas.some(c => c.caminho === '/auth/me'));
    assert.ok(chamadas.some(c => c.caminho === '/portal/estado'));
    for (const chamada of chamadas) {
      assert.ok(['/auth/login', '/auth/me', '/portal/estado', '/auth/trocar-senha'].includes(chamada.caminho));
      if (chamada.caminho === '/auth/login') assert.equal(chamada.auth, undefined);
      else assert.match(chamada.auth, /^Bearer .+/);
    }
    assert.deepEqual(erros, []);
  });
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  if (alunoCriado != null) {
    try {
      const resposta = await fetch(API + '/alunos/' + alunoCriado, { method: 'DELETE', headers: { Authorization: 'Bearer ' + tokenEscola } });
      console.log(resposta.ok ? 'OK limpeza: aluno ' + alunoCriado + ' apagado pela API como escola' : 'LIMPEZA não realizada: aluno ' + alunoCriado + ', HTTP ' + resposta.status);
    } catch (erro) { console.log('LIMPEZA não realizada: aluno ' + alunoCriado + ', ' + erro.message); }
  }
  await browser?.close();
}
