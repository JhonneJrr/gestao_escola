// Ciclo da aula extra e as regras de cancelar, reativar e remarcar, vistos pela escola no Acadêmico (Quadro semanal).
//
// ATENÇÃO, LIMITE CONHECIDO: a Agenda do dia do Portal.tsx (menu da aula com "Cancelar aula", "Reativar aula", "Remarcar" e o botão
// "Aula extra", Portal.tsx ~1589-1600) NÃO aparece na tela: o template só a monta com agendaLegado, que o Portal.tsx fixa em false
// (renderVals, ~1903), e o Acadêmico da att 3 é o GradeAgenda. Não há botão para clicar, então este teste não finge que clica:
//  - a aula extra nasce pelo caminho que existe na tela: a professora pede (pela API, o pedido pela tela já é coberto no portal-grade)
//    e a ESCOLA APROVA CLICANDO em "Aprovar" na aba "Pedidos de aula extra";
//  - cancelar, reativar e remarcar a aula são escritas feitas pela API (PATCH /aulas/{id}) e o teste confere o que a tela MOSTRA:
//    "Cancelada", de volta como extra e "Remarcada só nesta semana" no painel da aula, e o bloco no novo dia e horário;
//  - o segundo caso lê uma aula do seed com chamada feita: a API recusa cancelar e remarcar (409 "Aula já tem presenças") e a tela
//    oferece "Revisar chamada", sem arraste.
// O achado está em docs/brief-ui-pendencias.md ("### e2e (08/10)"). Se a Agenda voltar a ter botões, o roteiro de cliques entra aqui.
//
// Usa API e Vite já em execução. Cria uma disciplina própria (professora Marta, Auditório, sem turma) e a apaga no finally: o pedido e as
// aulas dela somem junto. Nada fica no banco e não há resíduo para o reseed. Nenhuma chamada é lançada em aula própria de propósito
// (disciplina com chamada não se apaga: 409). A aula do seed do segundo caso é só lida e nunca alterada.
// Viewport alto (1500 px) para o quadro caber inteiro na janela.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173', sufixo = Date.now();
let browser, token, tokenMarta, inicial, disc;
async function api(caminho, method = 'GET', corpo, credencial = token) {
  const r = await fetch(API + caminho, {
    method, headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(credencial ? { Authorization: 'Bearer ' + credencial } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
}
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (erro) { console.error('FALHOU ' + nome + '\n' + erro.stack); throw erro; }
}
// Datas na hora local, como o front (agora() usa o relógio do navegador).
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const somar = (data, n) => { const d = new Date(data + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const dsem = data => { const g = new Date(data + 'T12:00:00').getDay(); return g === 0 ? 7 : g; };
const segunda = data => somar(data, 1 - dsem(data));
const ddmm = data => data.slice(8, 10) + '/' + data.slice(5, 7);
try {
  const login = await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' });
  assert.equal(login.status, 200); token = login.corpo.access_token;
  const loginMarta = await api('/auth/login', 'POST', { email: 'marta@escola.com', senha: 'escola123' });
  assert.equal(loginMarta.status, 200); tokenMarta = loginMarta.corpo.access_token;
  inicial = (await api('/portal/estado')).corpo;
  const hoje = iso(new Date());
  const marta = inicial.professores.find(p => p.email === 'marta@escola.com'); assert.ok(marta);
  const salaAud = (await api('/salas')).corpo.find(s => s.nome === 'Auditório'); assert.ok(salaAud, 'sala Auditório do seed');
  const feriadoEm = data => inicial.eventos.find(e => e.tipo === 'feriado' && e.data <= data && data <= (e.fim || e.data));
  const d = await api('/disciplinas', 'POST', { nome: 'Agenda F9 ' + sufixo, carga_horaria: 40, professor_id: marta.id, sala_id: salaAud.id });
  if (d.status === 201) disc = d.corpo;
  assert.equal(d.status, 201, JSON.stringify(d.corpo));
  // Pedido da professora para uma data futura (terça a sexta, sem feriado): a API só aceita data futura e sem choque; tenta até uma servir.
  const motivo = 'Agenda F9 reposição ' + sufixo;
  let pedido, T;
  for (let n = 7; n < 70 && !pedido; n++) {
    const data = somar(hoje, n);
    if (dsem(data) < 2 || dsem(data) > 5 || feriadoEm(data) || data < inicial.semestre.inicio || data > inicial.semestre.fim) continue;
    const r = await api('/pedidos', 'POST', { disciplina_id: disc.id, data, hora_inicio: '15:30', hora_fim: '17:10', sala_id: salaAud.id, motivo }, tokenMarta);
    if (r.status === 201) { pedido = r.corpo; T = data; }
  }
  assert.ok(pedido, 'achar uma data futura livre para o pedido');
  assert.equal(pedido.status, 'pendente');
  const R = dsem(T) < 5 ? somar(T, 1) : somar(T, -1); // outro dia da mesma semana, para a remarcação
  assert.ok(!feriadoEm(R), 'dia da remarcação sem feriado');

  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [], escritas = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('request', r => { if (r.url().startsWith(API) && r.method() !== 'GET') escritas.push(r.method() + ' ' + new URL(r.url()).pathname); });
  const grade = page.locator('[data-sc-name="GradeAgenda"]');
  const botao = nome => grade.getByRole('button', { name: nome, exact: true }).filter({ visible: true });
  const coluna = dia => page.locator('[data-quadro-dias] > div').nth(6 + dia);
  const bloco = (dia, ini) => coluna(dia).locator(`[data-bloco][aria-label^="${disc.nome} · "][aria-label*="· ${ini}–"]`);
  async function entrar() {
    await page.goto(FRONT + '/login');
    const f = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await f.getByLabel('E-mail', { exact: true }).fill('escola@escola.com');
    await f.getByLabel('Senha', { exact: true }).fill('escola123');
    await f.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  async function irSemana(alvo) {
    await grade.getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
    const texto = await grade.getByText(/^Semana de \d\d\/\d\d a \d\d\/\d\d$/).first().innerText();
    const [dd, mm] = texto.match(/^Semana de (\d\d)\/(\d\d)/).slice(1);
    const n = Math.round((Date.parse(alvo) - Date.parse(alvo.slice(0, 4) + `-${mm}-${dd}`)) / (7 * 86400000));
    for (let i = 0; i < Math.abs(n); i++) await botao(n > 0 ? 'Próxima semana' : 'Semana anterior').click();
    await grade.getByText(`Semana de ${ddmm(alvo)} a ${ddmm(somar(alvo, 4))}`, { exact: true }).waitFor({ state: 'visible' });
  }
  // Recarrega a tela (a escrita foi feita fora dela) e abre a semana da aula.
  async function abrirQuadro(semana) { await page.goto(FRONT + '/agenda'); await irSemana(semana); }
  const painel = () => grade.getByRole('dialog');
  async function abrirPainel(alvo, status) {
    await alvo.click();
    await painel().getByText(status, { exact: true }).waitFor({ state: 'visible' });
  }
  const fecharPainel = async () => { await page.keyboard.press('Escape'); await painel().waitFor({ state: 'hidden' }); };

  await entrar();
  // Sonda informativa (não falha): avisa se a Agenda do dia voltar à tela, para trocar os casos de API por cliques.
  await conferir('sonda: procura a Agenda do dia (menu Cancelar/Reativar/Remarcar e botão Aula extra) nas telas do Acadêmico', async () => {
    await page.goto(FRONT + '/agenda');
    await grade.getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
    for (const rota of ['/agenda', '/disciplinas']) {
      await page.goto(FRONT + rota);
      await grade.or(page.getByRole('listbox', { name: 'Disciplinas', exact: true })).first().waitFor({ state: 'visible' });
      const achou = await page.getByText(/^(Cancelar aula|Reativar aula|Remarcar)$/).filter({ visible: true }).count() + await page.getByRole('button', { name: /^Aula extra$/ }).count();
      if (achou) console.log('ATENÇÃO: a Agenda voltou a ter botões em ' + rota + '; troque este caso por cliques (ver cabeçalho do arquivo).');
    }
    console.log('NÃO FEITO por clique: cancelar, reativar, remarcar pelo menu e aula extra direta (sem porta de entrada na tela; ver cabeçalho).');
  });

  await conferir('escola aprova o pedido clicando em Aprovar e a aula extra entra no quadro da semana (POST /pedidos/{id}/aprovar)', async () => {
    await page.goto(FRONT + '/agenda');
    await grade.getByRole('tab', { name: /^Pedidos de aula extra/ }).click();
    const cartao = grade.locator('article').filter({ hasText: motivo });
    await cartao.waitFor({ state: 'visible' });
    const antes = escritas.length;
    const resp = page.waitForResponse(r => r.url() === API + `/pedidos/${pedido.id}/aprovar` && r.request().method() === 'POST');
    await cartao.getByRole('button', { name: 'Aprovar', exact: true }).click();
    const r = await resp, corpo = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(corpo));
    assert.equal(corpo.status, 'aprovada'); assert.ok(corpo.aula_id);
    assert.equal(escritas.length - antes, 1, 'uma escrita só');
    await grade.getByText('Aula extra aprovada. Ela entra no quadro e na semana dos alunos.', { exact: true }).waitFor({ state: 'visible' });
    const aula = (await api('/portal/estado')).corpo.aulas.find(a => a.id === corpo.aula_id);
    assert.deepEqual([aula.disciplina_id, aula.data, aula.hora_inicio, aula.hora_fim, aula.origem, aula.status, aula.remarcada_de], [disc.id, T, '15:30', '17:10', 'extra', 'agendada', null]);
    pedido = corpo;
    await grade.getByRole('tab', { name: 'Quadro semanal', exact: true }).click();
    await irSemana(segunda(T));
    const b = bloco(dsem(T), '15:30');
    await b.waitFor({ state: 'visible' });
    assert.match(await b.getAttribute('aria-label'), new RegExp(`^${disc.nome} · Sem turma · Auditório · Profa\\. Marta · 15:30–17:10 · Extra$`));
    await coluna(dsem(T)).waitFor({ state: 'visible' });
    await abrirPainel(b, 'Aula extra aprovada');
    await painel().getByText(`${disc.nome}`, { exact: true }).first().waitFor({ state: 'visible' });
    await fecharPainel();
  });

  await conferir('aula cancelada (PATCH pela API) aparece como "Cancelada" no quadro e o painel diz "Aula cancelada"', async () => {
    const c = await api('/aulas/' + pedido.aula_id, 'PATCH', { status: 'cancelada' });
    assert.equal(c.status, 200); assert.equal(c.corpo.status, 'cancelada');
    await abrirQuadro(segunda(T));
    const b = bloco(dsem(T), '15:30');
    await b.waitFor({ state: 'visible' });
    assert.match(await b.getAttribute('aria-label'), / · Cancelada$/);
    await abrirPainel(b, 'Aula cancelada');
    // Aula cancelada não aceita chamada: o painel avisa em vez de oferecer a chamada.
    await painel().getByText(/Aula cancelada\./).first().waitFor({ state: 'visible' });
    await fecharPainel();
  });

  await conferir('aula reativada (PATCH pela API) volta a "Extra" e o painel volta a "Aula extra aprovada"', async () => {
    const c = await api('/aulas/' + pedido.aula_id, 'PATCH', { status: 'agendada' });
    assert.equal(c.status, 200); assert.equal(c.corpo.status, 'agendada');
    await abrirQuadro(segunda(T));
    const b = bloco(dsem(T), '15:30');
    await b.waitFor({ state: 'visible' });
    assert.match(await b.getAttribute('aria-label'), / · Extra$/);
    assert.doesNotMatch(await b.getAttribute('aria-label'), /Cancelada/);
    await abrirPainel(b, 'Aula extra aprovada');
    await fecharPainel();
  });

  await conferir('aula remarcada (PATCH pela API) aparece no novo dia e horário e o painel diz "Remarcada só nesta semana"', async () => {
    const r = await api('/aulas/' + pedido.aula_id, 'PATCH', { data: R, hora_inicio: '13:30', hora_fim: '15:10' });
    assert.equal(r.status, 200, JSON.stringify(r.corpo));
    assert.deepEqual([r.corpo.data, r.corpo.hora_inicio, r.corpo.hora_fim, r.corpo.remarcada_de, r.corpo.status], [R, '13:30', '15:10', T, 'agendada']);
    await abrirQuadro(segunda(T));
    const novo = bloco(dsem(R), '13:30');
    await novo.waitFor({ state: 'visible' });
    // Âncora positiva: o bloco está no dia e horário novos; o negativo é o horário antigo ter ficado vazio.
    assert.equal(await bloco(dsem(T), '15:30').count(), 0);
    await abrirPainel(novo, 'Remarcada só nesta semana');
    await fecharPainel();
  });

  await conferir('aula com chamada feita (do seed): API recusa cancelar e remarcar (409 "Aula já tem presenças") e a tela só oferece revisar a chamada', async () => {
    const doSeed = inicial.aulas.filter(a => a.chamada && a.status === 'agendada' && a.origem === 'grade' && a.data <= hoje && !a.remarcada_de).sort((x, y) => y.data.localeCompare(x.data) || y.hora_inicio.localeCompare(x.hora_inicio))[0];
    assert.ok(doSeed, 'seed precisa ter aula passada com chamada');
    const discSeed = inicial.disciplinas.find(x => x.id === doSeed.disciplina_id), ini = doSeed.hora_inicio.slice(0, 5), fim = doSeed.hora_fim.slice(0, 5);
    const antes = escritas.length;
    const canc = await api('/aulas/' + doSeed.id, 'PATCH', { status: 'cancelada' });
    assert.equal(canc.status, 409); assert.equal(canc.corpo.detail, 'Aula já tem presenças');
    const rem = await api('/aulas/' + doSeed.id, 'PATCH', { data: somar(hoje, 7), hora_inicio: '15:30', hora_fim: '17:10' });
    assert.equal(rem.status, 409); assert.equal(rem.corpo.detail, 'Aula já tem presenças');
    await abrirQuadro(segunda(doSeed.data));
    const b = coluna(dsem(doSeed.data)).locator(`[data-bloco][aria-label^="${discSeed.nome} · "][aria-label*="· ${ini}–${fim}"]`);
    await b.waitFor({ state: 'visible' });
    assert.doesNotMatch(await b.getAttribute('aria-label'), /Cancelada|Remarcada/);
    await abrirPainel(b, 'Aula dada');
    // Âncora positiva: o painel mostra "Revisar chamada"; o negativo é não haver "Fazer chamada".
    await painel().getByText('Revisar chamada', { exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await painel().getByText('Fazer chamada', { exact: true }).count(), 0);
    await fecharPainel();
    assert.equal(escritas.length, antes, 'a tela não escreveu nada');
    const aula = (await api('/portal/estado')).corpo.aulas.find(a => a.id === doSeed.id);
    assert.deepEqual(aula, doSeed, 'a aula do seed continua igual');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  if (token) {
    if (disc) {
      try {
        const r = await api('/disciplinas/' + disc.id, 'DELETE');
        if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza da disciplina ' + disc.id + ': ' + JSON.stringify(r)); }
      } catch (erro) { limpou = false; console.error('FALHOU limpeza da disciplina ' + disc.id + '\n' + erro.stack); }
    }
    if (inicial) {
      try {
        const final = (await api('/portal/estado')).corpo;
        for (const k of ['disciplinas', 'aulas', 'pedidos', 'eventos', 'matriculas', 'notas']) assert.deepEqual(final[k], inicial[k], 'o teste precisa devolver ' + k + ' ao que encontrou');
        console.log('OK estado do seed preservado (disciplinas, aulas, pedidos, eventos, matrículas e notas)');
      } catch (erro) { limpou = false; console.error('FALHOU estado do seed preservado\n' + erro.stack); }
    }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API da disciplina de teste (leva o pedido e as aulas junto)');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
