// Arraste real (page.mouse) das aulas no Quadro semanal do Acadêmico (GradeAgenda.tsx, blocoDown/podeArrastar), como a escola.
// Usa API e Vite já em execução. Cria quatro disciplinas próprias (sem professor nem turma, todas no Auditório, que o seed não usa)
// e as apaga no finally; as aulas delas somem junto. Nada fica no banco: não há resíduo para o reseed limpar.
// A chamada NÃO é lançada em aula própria de propósito: disciplina com chamada não se apaga (409) e deixaria resíduo até o reseed.
// O caso "com chamada" usa por isso uma aula do seed, só lida e nunca alterada (o teste confere que o estado do seed volta igual).
// Viewport alto (1500 px): o mouse do Playwright só alcança o que está dentro da janela, e o fim da tarde fica no pé do quadro.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173', sufixo = Date.now();
let browser, token, inicial;
const discs = {};
async function api(caminho, method = 'GET', corpo) {
  const r = await fetch(API + caminho, {
    method, headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
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
const PX = 1.05; // altura de um minuto no quadro (GradeAgenda.tsx)
const hm = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
try {
  const login = await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' });
  assert.equal(login.status, 200); token = login.corpo.access_token;
  inicial = (await api('/portal/estado')).corpo;
  const hoje = iso(new Date());
  const salaAud = (await api('/salas')).corpo.find(s => s.nome === 'Auditório'); assert.ok(salaAud, 'sala Auditório do seed');
  const feriadoEm = data => inicial.eventos.find(e => e.tipo === 'feriado' && e.data <= data && data <= (e.fim || e.data));
  const feriadoFuturo = inicial.eventos.filter(e => e.tipo === 'feriado' && e.todas_turmas && e.data > hoje && dsem(e.data) <= 5).sort((a, b) => a.data.localeCompare(b.data))[0];
  const criar = async (chave, grade) => {
    const d = await api('/disciplinas', 'POST', { nome: `Quadro F9${chave} ${sufixo}`, carga_horaria: 40, sala_id: salaAud.id });
    if (d.status === 201) discs[chave] = d.corpo;
    assert.equal(d.status, 201, JSON.stringify(d.corpo));
    if (grade) assert.equal((await api(`/disciplinas/${d.corpo.id}/grade`, 'PUT', { itens: grade })).status, 200);
    return d.corpo;
  };
  // A: terça 13:30 (a que se arrasta). B: quarta 13:30 (a que sofre choque). C: sem grade, injeta o choque pela API. D: dia do feriado.
  const A = await criar('A', [{ dia_semana: 2, hora_inicio: '13:30', hora_fim: '15:10', sala_id: null }]);
  const B = await criar('B', [{ dia_semana: 3, hora_inicio: '13:30', hora_fim: '15:10', sala_id: null }]);
  const C = await criar('C', null);
  const D = feriadoFuturo ? await criar('D', [{ dia_semana: dsem(feriadoFuturo.data), hora_inicio: '15:30', hora_fim: '17:10', sala_id: null }]) : null;
  // Semana de trabalho: terça de A no futuro, com a terça seguinte também existindo (essa será cancelada) e sem feriado de terça a sexta.
  const aulasA = (await api(`/disciplinas/${A.id}/aulas`)).corpo.sort((x, y) => x.data.localeCompare(y.data));
  const k = aulasA.findIndex((a, i) => a.data > hoje && aulasA[i + 1]?.data === somar(a.data, 7) && [0, 1, 2, 3].every(n => !feriadoEm(somar(a.data, n))));
  assert.ok(k >= 0, 'semestre precisa ter duas terças seguidas no futuro, sem feriado na semana');
  const aulaA = aulasA[k], aulaAcancelada = aulasA[k + 1];
  const terca = aulaA.data, semana = segunda(terca), quarta = somar(terca, 1), quinta = somar(terca, 2), sexta = somar(terca, 3);
  const aulaB = (await api(`/disciplinas/${B.id}/aulas`)).corpo.find(a => a.data === quarta); assert.ok(aulaB, 'B tem aula na quarta da semana de trabalho');
  assert.equal((await api('/aulas/' + aulaAcancelada.id, 'PATCH', { status: 'cancelada' })).status, 200);
  // Aula do seed com chamada feita, a mais recente: só leitura.
  const doSeed = inicial.aulas.filter(a => a.chamada && a.status === 'agendada' && a.origem === 'grade' && a.data <= hoje && !a.remarcada_de).sort((x, y) => y.data.localeCompare(x.data) || y.hora_inicio.localeCompare(x.hora_inicio))[0];
  assert.ok(doSeed, 'seed precisa ter aula passada com chamada');
  const discSeed = inicial.disciplinas.find(d => d.id === doSeed.disciplina_id);

  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [], escritas = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('request', r => { if (r.url().startsWith(API) && r.method() !== 'GET') escritas.push(r.method() + ' ' + new URL(r.url()).pathname); });
  const grade = page.locator('[data-sc-name="GradeAgenda"]');
  const botao = nome => grade.getByRole('button', { name: nome, exact: true }).filter({ visible: true });
  // O quadro é uma grade CSS: 6 células de cabeçalho e depois a coluna de horas e uma coluna por dia (seg=1 ... sex=5).
  const coluna = dia => page.locator('[data-quadro-dias] > div').nth(6 + dia);
  const bloco = (disc, dia, ini) => coluna(dia).locator(`[data-bloco][aria-label^="${disc.nome} · "][aria-label*="· ${ini}–"]`);
  async function entrar() {
    await page.goto(FRONT + '/login');
    const f = page.locator('form').filter({ has: page.locator('input[type=email]') });
    await f.getByLabel('E-mail', { exact: true }).fill('escola@escola.com');
    await f.getByLabel('Senha', { exact: true }).fill('escola123');
    await f.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  // Vai à semana (segunda-feira em ISO) clicando em "Semana anterior"/"Próxima semana" a partir da que a tela mostra.
  async function irSemana(alvo) {
    await grade.getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
    const texto = await grade.getByText(/^Semana de \d\d\/\d\d a \d\d\/\d\d$/).first().innerText();
    const [dd, mm] = texto.match(/^Semana de (\d\d)\/(\d\d)/).slice(1);
    const atual = alvo.slice(0, 4) + `-${mm}-${dd}`;
    const n = Math.round((Date.parse(alvo) - Date.parse(atual)) / (7 * 86400000));
    for (let i = 0; i < Math.abs(n); i++) await botao(n > 0 ? 'Próxima semana' : 'Semana anterior').click();
    await grade.getByText(`Semana de ${ddmm(alvo)} a ${ddmm(somar(alvo, 4))}`, { exact: true }).waitFor({ state: 'visible' });
  }
  // Arrasta pelo ponteiro de verdade: pressiona no centro do bloco, passa do limiar de 5 px e anda `dias` colunas e `minutos` linhas.
  // O quadro calcula a coluna pela largura da coluna de origem e o horário a 1,05 px por minuto, em passos de 10 min.
  async function arrastar(alvoBloco, { dias, minutos }) {
    const caixa = await alvoBloco.boundingBox(), larguraColuna = (await alvoBloco.locator('xpath=..').boundingBox()).width;
    const x = caixa.x + caixa.width / 2, y = caixa.y + caixa.height / 2;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + 12, y + 12, { steps: 3 });
    await page.mouse.move(x + dias * larguraColuna, y + minutos * PX, { steps: 12 });
    const arrastando = await alvoBloco.evaluate(e => e.style.zIndex === '8' && e.style.transform !== '');
    await page.mouse.up();
    return arrastando;
  }
  // Posição do bloco dentro da própria coluna: avisos acima do quadro empurram a página, mas não mudam o lugar da aula na grade.
  const lugar = async b => { const [bb, cb] = await Promise.all([b.boundingBox(), b.locator('xpath=..').boundingBox()]); return { x: bb.x - cb.x, y: bb.y - cb.y, w: bb.width, h: bb.height }; };
  const avisoMover = () => grade.getByText(/^Mover /).first();

  await entrar();
  await page.goto(FRONT + '/agenda');
  await irSemana(semana);

  await conferir('arrastar para um slot com choque de sala (semana e grade) mostra o motivo, não pede confirmação e não escreve nada', async () => {
    // Âncora positiva: B está na quarta e A na terça, 13:30 no Auditório; B solta em cima de A.
    await bloco(B, 3, '13:30').waitFor({ state: 'visible' }); await bloco(A, 2, '13:30').waitFor({ state: 'visible' });
    const antes = escritas.length, caixa = await lugar(bloco(B, 3, '13:30'));
    assert.equal(await arrastar(bloco(B, 3, '13:30'), { dias: -1, minutos: 0 }), true, 'o arraste de uma aula futura de grade precisa começar');
    const motivo = `Não dá para mover: Auditório já está com ${A.nome} · Sem turma neste horário (terça ${ddmm(terca)}, 13:30–15:10).`;
    await grade.getByText(motivo, { exact: true }).waitFor({ state: 'visible' });
    // Choque nas duas leituras (só esta semana e na grade): a tela nem oferece os botões de confirmar.
    assert.equal(await avisoMover().count(), 0);
    assert.equal(await botao('Só nesta semana').count() + await botao('Na grade do semestre').count(), 0);
    await botao('Ok').click();
    await grade.getByText(motivo, { exact: true }).waitFor({ state: 'hidden' });
    assert.equal(escritas.length, antes, 'recusa local: nada chega à API');
    // A aula voltou ao lugar: mesma caixa, mesma coluna.
    assert.deepEqual(await lugar(bloco(B, 3, '13:30')), caixa);
    assert.equal((await api('/portal/estado')).corpo.aulas.find(a => a.id === aulaB.id).data, quarta);
  });

  await conferir('arrastar a aula de terça para outro slot livre remarca só nesta semana (PATCH /aulas/{id}) e o bloco muda de lugar', async () => {
    const dMin = hm('10:00') - hm('13:30');
    assert.equal(await arrastar(bloco(A, 2, '13:30'), { dias: 2, minutos: dMin }), true);
    await avisoMover().waitFor({ state: 'visible' });
    assert.equal(await avisoMover().innerText(), `Mover ${A.nome} · Sem turma de terça ${ddmm(terca)}, 13:30 para quinta ${ddmm(quinta)}, 10:00?`);
    assert.equal(await botao('Só nesta semana').isEnabled(), true);
    const resp = page.waitForResponse(r => r.url() === API + '/aulas/' + aulaA.id && r.request().method() === 'PATCH');
    await botao('Só nesta semana').click();
    const r = await resp;
    assert.equal(r.status(), 200);
    assert.deepEqual(r.request().postDataJSON(), { data: quinta, hora_inicio: '10:00', hora_fim: '11:40' });
    await grade.getByText(`${A.nome} · Sem turma remarcada só nesta semana: quinta ${ddmm(quinta)}, 10:00.`, { exact: true }).waitFor({ state: 'visible' });
    // Âncora positiva: o bloco está na quinta, 10:00, marcado como remarcado; o negativo é a terça ter ficado sem ele.
    await bloco(A, 4, '10:00').waitFor({ state: 'visible' });
    assert.match(await bloco(A, 4, '10:00').getAttribute('aria-label'), / · Remarcada$/);
    assert.equal(await bloco(A, 2, '13:30').count(), 0);
    const aula = (await api('/portal/estado')).corpo.aulas.find(a => a.id === aulaA.id);
    assert.deepEqual([aula.data, aula.hora_inicio, aula.hora_fim, aula.remarcada_de], [quinta, '10:00', '11:40', terca]);
  });

  await conferir('erro da API ao confirmar (choque criado por outra pessoa no meio do caminho) aparece em linha e a aula fica onde estava', async () => {
    const antes = await lugar(bloco(B, 3, '13:30'));
    assert.equal(await arrastar(bloco(B, 3, '13:30'), { dias: 2, minutos: 0 }), true);
    await avisoMover().waitFor({ state: 'visible' });
    assert.equal(await avisoMover().innerText(), `Mover ${B.nome} · Sem turma de quarta ${ddmm(quarta)}, 13:30 para sexta ${ddmm(sexta)}, 13:30?`);
    assert.equal(await botao('Só nesta semana').isEnabled(), true, 'a tela ainda não sabe do choque');
    // Outra pessoa ocupa o Auditório na sexta às 13:30 (aula extra de C, criada pela API) depois de o quadro ter sido carregado.
    const extra = await api(`/disciplinas/${C.id}/aulas`, 'POST', { data: sexta, hora_inicio: '13:30', hora_fim: '15:10' });
    assert.equal(extra.status, 201, JSON.stringify(extra.corpo));
    const resp = page.waitForResponse(r => r.url() === API + '/aulas/' + aulaB.id && r.request().method() === 'PATCH');
    await botao('Só nesta semana').click();
    const r = await resp, corpo = await r.json();
    assert.equal(r.status(), 409);
    assert.match(corpo.detail, new RegExp('^Auditório já está com ' + C.nome));
    // A mensagem da API aparece na própria barra de confirmação, sem JSON cru, e o botão da semana trava.
    await grade.getByText('Só nesta semana não dá: ' + corpo.detail, { exact: true }).waitFor({ state: 'visible' });
    assert.ok(!/"detail"|\{"/.test(await grade.innerText()), 'sem JSON cru');
    assert.equal(await botao('Só nesta semana').isDisabled(), true);
    await botao('Cancelar').click();
    await avisoMover().waitFor({ state: 'hidden' });
    assert.deepEqual(await lugar(bloco(B, 3, '13:30')), antes);
    assert.equal(await bloco(B, 5, '13:30').count(), 0);
    assert.equal((await api('/portal/estado')).corpo.aulas.find(a => a.id === aulaB.id).data, quarta);
  });

  // Quatro aulas que não podem iniciar arraste. O gesto é o mesmo (pressionar, andar, soltar): sem arraste, soltar abre o painel da aula,
  // e esse painel é a âncora positiva de que o gesto chegou até o bloco.
  async function naoArrasta(alvoBloco, rotulo, textoPainel) {
    await alvoBloco.waitFor({ state: 'visible' });
    const antes = escritas.length, caixa = await lugar(alvoBloco);
    assert.equal(await arrastar(alvoBloco, { dias: 1, minutos: -60 }), false, rotulo + ' não deveria iniciar arraste');
    assert.equal(await avisoMover().count(), 0);
    await grade.getByRole('dialog').getByText(textoPainel, { exact: true }).waitFor({ state: 'visible' });
    assert.equal(escritas.length, antes, 'nenhuma escrita na API');
    assert.deepEqual(await lugar(alvoBloco), caixa);
    await page.keyboard.press('Escape');
    await grade.getByRole('dialog').waitFor({ state: 'hidden' });
  }
  await conferir('aula cancelada não inicia arraste (painel mostra "Aula cancelada")', async () => {
    await irSemana(somar(semana, 7));
    const alvo = bloco(A, 2, '13:30');
    await alvo.waitFor({ state: 'visible' });
    assert.match(await alvo.getAttribute('aria-label'), / · Cancelada$/);
    await naoArrasta(alvo, 'aula cancelada', 'Aula cancelada');
  });
  if (D) await conferir('aula em feriado não inicia arraste: a camada do feriado recebe o ponteiro; o painel abre pelo teclado com "Sem aula: <feriado>"', async () => {
    await irSemana(segunda(feriadoFuturo.data));
    const dia = dsem(feriadoFuturo.data), alvo = bloco(D, dia, '15:30');
    await alvo.waitFor({ state: 'visible' });
    assert.match(await alvo.getAttribute('aria-label'), / · Feriado$/);
    // Âncora positiva: o nome do feriado está escrito na coluna. Depois o gesto do mouse: nada arrasta, nada abre, nada escreve.
    await coluna(dia).getByText(feriadoFuturo.titulo + ' · sem aula', { exact: true }).waitFor({ state: 'visible' });
    const antes = escritas.length, caixa = await lugar(alvo);
    assert.equal(await arrastar(alvo, { dias: 1, minutos: -60 }), false, 'aula em feriado não deveria iniciar arraste');
    assert.equal(await avisoMover().count(), 0);
    assert.equal(await grade.getByRole('dialog').count(), 0);
    assert.equal(escritas.length, antes, 'nenhuma escrita na API');
    assert.deepEqual(await lugar(alvo), caixa);
    await alvo.focus(); await page.keyboard.press('Enter');
    await grade.getByRole('dialog').getByText('Sem aula: ' + feriadoFuturo.titulo, { exact: true }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await grade.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  else console.log('NÃO FEITO feriado: o seed não tem feriado futuro de segunda a sexta.');
  await conferir('aula passada com chamada feita (do seed) não inicia arraste e só abre o painel com "Revisar chamada"', async () => {
    await irSemana(segunda(doSeed.data));
    const ini = doSeed.hora_inicio.slice(0, 5);
    const alvo = bloco(discSeed, dsem(doSeed.data), ini);
    await alvo.waitFor({ state: 'visible' });
    await naoArrasta(alvo, 'aula passada com chamada', 'Aula dada');
    // Âncora do painel já conferida acima; aqui a chamada feita: o painel oferece revisar, não fazer.
    await alvo.click();
    await grade.getByRole('dialog').getByText('Revisar chamada', { exact: true }).first().waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  if (token) {
    for (const d of Object.values(discs)) {
      try {
        const r = await api('/disciplinas/' + d.id, 'DELETE');
        if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza da disciplina ' + d.id + ': ' + JSON.stringify(r)); }
      } catch (erro) { limpou = false; console.error('FALHOU limpeza da disciplina ' + d.id + '\n' + erro.stack); }
    }
    if (inicial) {
      try {
        const final = (await api('/portal/estado')).corpo;
        for (const k of ['disciplinas', 'aulas', 'pedidos', 'eventos', 'matriculas', 'notas']) assert.deepEqual(final[k], inicial[k], 'o teste precisa devolver ' + k + ' ao que encontrou');
        console.log('OK estado do seed preservado (disciplinas, aulas, pedidos, eventos, matrículas e notas)');
      } catch (erro) { limpou = false; console.error('FALHOU estado do seed preservado\n' + erro.stack); }
    }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API das disciplinas de teste');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
