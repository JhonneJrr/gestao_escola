// Assistente de grade com a API do Gemini fora do ar: o erro vira texto legível em português, o painel destrava e dá para tentar de novo.
// Usa API e Vite já em execução, mas NÃO chama o assistente real: toda chamada a POST /ia/grade é interceptada no navegador
// (page.route) e respondida pelo teste, então não gasta cota do Gemini e não depende da chave. Não escreve nada no banco: sem resíduo.
// O caminho feliz com o Gemini de verdade só se confere em produção, depois da chave na Render (conferência do dono).
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173';
let browser;
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (erro) { console.error('FALHOU ' + nome + '\n' + erro.stack); throw erro; }
}
const LIMITE = 'O assistente atingiu o limite de uso. Tente de novo em alguns minutos.';
const FALHA = 'Não consegui falar com o assistente. Tente de novo.';
const OFF = 'O assistente não está configurado neste servidor.';
try {
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  // O que o servidor "responderia" a cada chamada do assistente; cada passo do teste troca isto.
  let resposta = null;
  const chamadas = [];
  await page.route(API + '/ia/grade', route => {
    chamadas.push(route.request().postDataJSON());
    if (resposta === 'rede') return route.abort('failed');
    // O fetch do front vem de outra origem (5173 para 8000): a resposta simulada precisa dos cabeçalhos de CORS.
    return route.fulfill({ status: resposta.status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(resposta.corpo) });
  });
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  async function entrar(email) {
    await page.goto(FRONT + '/login');
    const f = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await f.getByLabel('E-mail', { exact: true }).fill(email);
    await f.getByLabel('Senha', { exact: true }).fill('escola123');
    await f.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  // Nenhum pedaço da resposta crua pode vazar para a tela.
  async function semJsonCru() {
    const texto = await page.evaluate(() => document.body.innerText);
    assert.ok(!/"detail"|\{"|detail:|\[object Object\]/i.test(texto), 'JSON cru na tela: ' + texto.match(/.{0,40}("detail"|\{"|detail:|\[object Object\]).{0,60}/i)?.[0]);
  }
  // As duas telas do assistente (Disciplinas e Quadro semanal) têm o mesmo contrato; cada uma abre de um jeito.
  const telas = {
    'Disciplinas (/disciplinas)': {
      async abrir() {
        await page.goto(FRONT + '/disciplinas');
        // Espera os dados carregarem: a recarga inicial refaz o estado e apagaria a mensagem digitada no assistente.
        await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).getByText('Python', { exact: true }).first().waitFor({ state: 'visible' });
        await page.getByRole('button', { name: 'Assistente de grade', exact: true }).click();
        await page.locator('[data-assistente-grade]').waitFor({ state: 'visible' });
      },
      painel: () => page.locator('[data-assistente-grade]'),
    },
    'Quadro semanal (/agenda)': {
      async abrir() {
        await page.goto(FRONT + '/agenda');
        const grade = page.locator('[data-sc-name="GradeAgenda"]');
        await grade.getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
        await grade.getByRole('button', { name: 'Assistente de grade', exact: true }).click();
        await page.getByLabel('Mensagem para o assistente', { exact: true }).waitFor({ state: 'visible' });
      },
      painel: () => page.locator('[data-sc-name="GradeAgenda"]'),
    },
  };
  const cenarios = [
    ['429 com o texto do servidor', { status: 429, corpo: { detail: LIMITE } }, LIMITE],
    ['429 sem detail (cai no texto padrão do front)', { status: 429, corpo: {} }, LIMITE],
    ['503 sem chave configurada', { status: 503, corpo: { detail: OFF } }, OFF],
    ['rede caiu (sem resposta)', 'rede', FALHA],
  ];
  await entrar('escola@escola.com');
  for (const [nomeTela, tela] of Object.entries(telas)) for (const [nome, simulada, texto] of cenarios) {
    await conferir(`${nomeTela}: ${nome} vira texto legível, nada de JSON cru e o painel destrava`, async () => {
      await tela.abrir();
      resposta = simulada; chamadas.length = 0;
      const campo = page.getByLabel('Mensagem para o assistente', { exact: true });
      await campo.fill('Tem algum choque na grade atual?');
      await campo.press('Enter');
      // Âncora positiva: o texto de erro aparece (e a pergunta continua na conversa); só então valem as ausências.
      await visivel(texto).waitFor({ state: 'visible' });
      await visivel('Tem algum choque na grade atual?').waitFor({ state: 'visible' });
      assert.equal(chamadas.length, 1);
      assert.deepEqual(chamadas[0], { mensagens: [{ papel: 'usuario', texto: 'Tem algum choque na grade atual?' }] });
      await semJsonCru();
      assert.ok(await page.getByRole('alert').filter({ hasText: texto }).count(), 'o erro precisa estar num aviso (role=alert)');
      // Destravou: o campo aceita texto, o envio liga de novo e "Tentar de novo" está ativo.
      assert.equal(await campo.isDisabled(), false);
      await campo.fill('outra pergunta');
      const painel = tela.painel();
      assert.equal(await painel.getByRole('button', { name: 'Enviar', exact: true }).isEnabled(), true);
      assert.equal(await painel.getByRole('button', { name: 'Tentar de novo', exact: true }).isEnabled(), true);
      await campo.fill('');
    });
  }
  for (const [nomeTela, tela] of Object.entries(telas)) {
    await conferir(`${nomeTela}: "Tentar de novo" reenvia a conversa e, com o serviço de volta, mostra a resposta e some com o erro`, async () => {
      await tela.abrir();
      resposta = { status: 429, corpo: { detail: LIMITE } }; chamadas.length = 0;
      const campo = page.getByLabel('Mensagem para o assistente', { exact: true });
      await campo.fill('Explique a grade da 1º A.');
      await campo.press('Enter');
      await visivel(LIMITE).waitFor({ state: 'visible' });
      resposta = { status: 200, corpo: { resposta: 'A 1º A tem aulas de terça a quinta, sem choques.', proposta: [], recusados: [] } };
      await tela.painel().getByRole('button', { name: 'Tentar de novo', exact: true }).click();
      await visivel('A 1º A tem aulas de terça a quinta, sem choques.').waitFor({ state: 'visible' });
      // A conversa reenviada é a mesma, sem duplicar a pergunta.
      assert.equal(chamadas.length, 2);
      assert.deepEqual(chamadas[1], chamadas[0]);
      assert.deepEqual(chamadas[1], { mensagens: [{ papel: 'usuario', texto: 'Explique a grade da 1º A.' }] });
      assert.equal(await visivel(LIMITE).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Tentar de novo', exact: true }).filter({ visible: true }).count(), 0);
      await semJsonCru();
    });
  }
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  await browser?.close();
}
