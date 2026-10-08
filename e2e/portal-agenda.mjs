// Update 4 na Grade e agenda e no hub: aula extra direta da escola, cancelar e reativar aula, excluir disciplina
// (confirmação, bloqueio e 409 do servidor) e "Matricular todos". Usa os serviços em execução (API_URL e FRONT_URL;
// padrão 8000 e 5173) e escreve em registros próprios. Turma, alunos com nota e a disciplina com histórico ficam até o reseed.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = process.env.API_URL || 'http://localhost:8000', FRONT = process.env.FRONT_URL || 'http://localhost:5173', sufixo = Date.now();
let browser, token, discA, discB, discT, turma, alunoB, alunoT1, alunoT2, carlos;
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
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
try {
  await conferir('prepara disciplinas, turma e alunos próprios pela API', async () => {
    token = (await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' }, null)).corpo.access_token;
    carlos = (await api('/professores')).corpo.find(p => p.email === 'prof@escola.com'); assert.ok(carlos);
    const salas = (await api('/salas')).corpo; assert.ok(salas.length);
    const nova = async (nome, extra = {}) => { const d = await api('/disciplinas', 'POST', { nome, carga_horaria: 40, professor_id: carlos.id, sala_id: salas[0].id, ...extra }); assert.equal(d.status, 201, JSON.stringify(d.corpo)); return d.corpo; };
    discA = await nova('Agenda A ' + sufixo); discB = await nova('Agenda B ' + sufixo);
    alunoB = (await api('/alunos', 'POST', { nome: 'Aluno Agenda ' + sufixo, idade: 20, matricula: 'AG-' + sufixo })).corpo;
    assert.equal((await api(`/alunos/${alunoB.id}/matricular/${discB.id}`, 'POST')).status, 201);
    // disciplina B com nota: o histórico segura a exclusão
    const aval = (await api(`/disciplinas/${discB.id}/avaliacoes`)).corpo.find(a => a.tipo === 'obrigatoria');
    assert.equal((await api(`/avaliacoes/${aval.id}/notas/${alunoB.id}`, 'PUT', { valor: 5 })).status, 204);
    // turma com dois alunos e uma disciplina; os dois saem da disciplina para sobrar "Matricular todos"
    turma = (await api('/turmas', 'POST', { nome: 'Turma Agenda ' + sufixo })).corpo;
    for (const [i, nome] of ['Todos Um', 'Todos Dois'].entries()) {
      const a = (await api('/alunos', 'POST', { nome: nome + ' ' + sufixo, idade: 20, matricula: 'AT' + i + '-' + sufixo, turma_id: turma.id })).corpo;
      if (i === 0) alunoT1 = a; else alunoT2 = a;
    }
    discT = await nova('Agenda Turma ' + sufixo, { turma_id: turma.id });
    for (const a of [alunoT1, alunoT2]) { const r = await api(`/alunos/${a.id}/matricular/${discT.id}`, 'DELETE'); assert.ok([204, 404].includes(r.status), String(r.status)); }
    const mats = (await api('/portal/estado')).corpo.matriculas;
    assert.equal(mats.filter(m => m.disciplina_id === discT.id).length, 0);
  });

  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [], respostas = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('response', r => { if (r.url().startsWith(API)) respostas.push({ caminho: new URL(r.url()).pathname, metodo: r.request().method(), status: r.status() }); });
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  const grade = () => page.locator('[data-sc-name="GradeAgenda"]');
  async function logic(codigo, arg) {
    return page.evaluate(async ({ codigo, arg }) => {
      const host = document.querySelector('[data-sc-name="Portal Escolar"]');
      let fiber = host[Object.keys(host).find(k => k.startsWith('__reactFiber$'))];
      while (!fiber.stateNode?.logic) fiber = fiber.return;
      return await new Function('logic', 'arg', 'return (async () => {' + codigo + '})();')(fiber.stateNode.logic, arg);
    }, { codigo, arg });
  }
  async function escrever(caminho, metodo, status, executar) {
    const resposta = page.waitForResponse(r => r.url() === API + caminho && r.request().method() === metodo);
    resposta.catch(() => {});
    await executar();
    const r = await resposta;
    if (r.status() !== status) assert.fail(metodo + ' ' + caminho + ' respondeu ' + r.status() + ' em vez de ' + status + ': ' + (await r.text().catch(() => '')).slice(0, 200));
    return r.request().postDataJSON();
  }
  async function entrar(email) {
    await page.goto(FRONT + '/login');
    const form = page.locator('form').filter({ visible: true });
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill('escola123');
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  const aulasDe = async id => (await api('/portal/estado')).corpo.aulas.filter(a => a.disciplina_id === id);
  let aula, data;
  await conferir('aula extra direta: a escola cria pela aba de pedidos e a aula nasce na API, na sala da disciplina', async () => {
    await entrar('escola@escola.com');
    await page.goto(FRONT + '/agenda');
    await grade().getByRole('tab', { name: /^Pedidos de aula extra/ }).click();
    await page.getByRole('button', { name: 'Nova aula extra', exact: true }).click();
    // primeiro dia útil depois de hoje e o primeiro horário que o quadro diz estar livre para o professor, a turma e a sala
    const d = new Date(); d.setDate(d.getDate() + 1); while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
    data = iso(d);
    const sel = grade().locator('form').filter({ hasText: 'Disciplina' });
    await sel.locator('select').first().selectOption({ label: 'Agenda A ' + sufixo + ' · Sem turma' });
    await sel.getByLabel('Data', { exact: true }).fill(data);
    let achou = null;
    for (const [ini, fim] of [['14:00', '15:40'], ['15:30', '17:10'], ['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10']]) {
      await sel.getByLabel('Início', { exact: true }).fill(ini); await sel.getByLabel('Fim', { exact: true }).fill(fim);
      if (await grade().getByText('Horário livre para o professor, a turma e a sala.', { exact: true }).count()) { achou = [ini, fim]; break; }
    }
    assert.ok(achou, 'algum horário livre no dia ' + data);
    // a sala é a da disciplina: mexer no campo não muda o que o servidor guarda
    const corpo = await escrever(`/disciplinas/${discA.id}/aulas`, 'POST', 201, () => sel.getByRole('button', { name: 'Criar aula extra', exact: true }).click());
    assert.deepEqual(corpo, { data, hora_inicio: achou[0], hora_fim: achou[1] });
    await visivel(`Aula extra criada: Agenda A ${sufixo} em ${data.slice(8)}/${data.slice(5, 7)}, ${achou[0]}. Já está no Quadro.`).waitFor({ state: 'visible' });
    aula = (await aulasDe(discA.id)).find(a => a.data === data); assert.ok(aula); assert.equal(aula.origem, 'extra'); assert.equal(aula.status, 'agendada');
  });
  await conferir('cancelar e reativar a aula pelo painel gravam o status e recarregam', async () => {
    await grade().getByRole('tab', { name: 'Quadro semanal', exact: true }).click();
    const alvo = new Date(data + 'T12:00:00'), hoje = new Date(); const segunda = d => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); };
    if (segunda(alvo) !== segunda(hoje)) await grade().getByRole('button', { name: 'Próxima semana', exact: true }).click();
    await grade().getByRole('button', { name: new RegExp('^Agenda A ' + sufixo) }).first().click();
    const painel = page.getByRole('dialog', { name: 'Aula', exact: true });
    await painel.waitFor({ state: 'visible' });
    const cancelada = await escrever(`/aulas/${aula.id}`, 'PATCH', 200, () => painel.getByRole('button', { name: 'Cancelar aula', exact: true }).click());
    assert.deepEqual(cancelada, { status: 'cancelada' });
    assert.equal((await aulasDe(discA.id)).find(a => a.id === aula.id).status, 'cancelada');
    await painel.getByRole('button', { name: 'Reativar aula', exact: true }).waitFor({ state: 'visible' });
    const reativada = await escrever(`/aulas/${aula.id}`, 'PATCH', 200, () => painel.getByRole('button', { name: 'Reativar aula', exact: true }).click());
    assert.deepEqual(reativada, { status: 'agendada' });
    assert.equal((await aulasDe(discA.id)).find(a => a.id === aula.id).status, 'agendada');
    await painel.getByRole('button', { name: 'Cancelar aula', exact: true }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
  });
  await conferir('excluir disciplina: com nota o diálogo bloqueia sem chamar a API e o servidor também recusa (409)', async () => {
    await grade().getByRole('tab', { name: 'Disciplinas', exact: true }).click();
    await grade().getByRole('button', { name: new RegExp('Agenda B ' + sufixo) }).first().click();
    const antes = respostas.length;
    await page.getByRole('button', { name: 'Excluir disciplina', exact: true }).click();
    const bloqueio = page.getByRole('alertdialog', { name: 'Não dá para excluir Agenda B ' + sufixo, exact: true });
    await bloqueio.waitFor({ state: 'visible' });
    await bloqueio.getByText('Disciplina já tem notas ou chamadas: não dá para excluir. O histórico do semestre precisa ficar.').waitFor({ state: 'visible' });
    assert.equal(respostas.slice(antes).some(r => r.metodo === 'DELETE'), false, 'o bloqueio local não escreve na API');
    await bloqueio.getByRole('button', { name: 'Entendi', exact: true }).click(); await bloqueio.waitFor({ state: 'hidden' });
    // tela desatualizada: a decisão final é do servidor, que recusa com o 409 e a mensagem aparece no diálogo
    await logic('logic.pedirExcluirDisc(arg); logic.setState(s => ({ confExc: { ...s.confExc, bloq: false } }));', discB.id);
    const dialogo = page.getByRole('alertdialog', { name: 'Excluir Agenda B ' + sufixo + '?', exact: true });
    await escrever(`/disciplinas/${discB.id}`, 'DELETE', 409, () => dialogo.getByRole('button', { name: 'Excluir de vez', exact: true }).click());
    await page.getByRole('alertdialog', { name: 'Não dá para excluir Agenda B ' + sufixo, exact: true }).waitFor({ state: 'visible' });
    assert.ok((await api('/portal/estado')).corpo.disciplinas.some(d => d.id === discB.id));
    await logic('logic.setState({ confExc: null });');
  });
  await conferir('excluir disciplina sem histórico: confirma, o DELETE sai e a disciplina some com a aula extra', async () => {
    await page.goto(FRONT + '/agenda'); await grade().getByRole('tab', { name: 'Disciplinas', exact: true }).waitFor({ state: 'visible' });
    await grade().getByRole('tab', { name: 'Disciplinas', exact: true }).click();
    await grade().getByRole('button', { name: new RegExp('Agenda A ' + sufixo) }).first().click();
    await page.getByRole('button', { name: 'Excluir disciplina', exact: true }).click();
    const dialogo = page.getByRole('alertdialog', { name: 'Excluir Agenda A ' + sufixo + '?', exact: true });
    await dialogo.waitFor({ state: 'visible' });
    await dialogo.getByText(/^Saem junto 1 aula do semestre e 0 matrículas\./).waitFor({ state: 'visible' });
    await escrever(`/disciplinas/${discA.id}`, 'DELETE', 204, () => dialogo.getByRole('button', { name: 'Excluir de vez', exact: true }).click());
    assert.equal((await api('/portal/estado')).corpo.disciplinas.some(d => d.id === discA.id), false);
    assert.equal((await aulasDe(discA.id)).length, 0);
    discA = null;
  });
  await conferir('Matricular todos: uma matrícula por aluno que falta, na API, com a mensagem da turma inteira', async () => {
    await page.goto(FRONT + '/alunos');
    await page.getByRole('button', { name: new RegExp('^Turma Agenda ' + sufixo) }).click();
    const linha = page.locator('[data-matriculas-turma] > div').filter({ has: page.getByRole('button', { name: discT.nome, exact: true }) });
    await visivel('Fora (2): ').waitFor({ state: 'visible' });
    const antes = respostas.length;
    await linha.getByRole('button', { name: 'Matricular todos', exact: true }).click();
    await visivel('Turma inteira matriculada em ' + discT.nome + '.').waitFor({ state: 'visible' });
    const posts = respostas.slice(antes).filter(r => r.metodo === 'POST' && /^\/alunos\/\d+\/matricular\/\d+$/.test(r.caminho));
    assert.deepEqual(posts.map(r => r.caminho).sort(), [`/alunos/${alunoT1.id}/matricular/${discT.id}`, `/alunos/${alunoT2.id}/matricular/${discT.id}`].sort());
    assert.ok(posts.every(r => r.status === 201));
    const mats = (await api('/portal/estado')).corpo.matriculas.filter(m => m.disciplina_id === discT.id).map(m => m.aluno_id).sort();
    assert.deepEqual(mats, [alunoT1.id, alunoT2.id].sort());
    await linha.getByText('· turma inteira', { exact: true }).waitFor({ state: 'visible' });
  });
  await conferir('semestre encerrado (resposta simulada, sem escrita no banco): aviso somente leitura e nada para criar', async () => {
    await page.route(API + '/portal/estado', async route => {
      const r = await route.fetch(), corpo = await r.json();
      await route.fulfill({ response: r, json: { ...corpo, semestre: { ...corpo.semestre, encerrado_em: '2026-10-01 12:00:00' } } });
    });
    await page.goto(FRONT + '/agenda');
    await page.locator('[data-somente-leitura]').getByText('Semestre encerrado em 01/10/2026: somente leitura.', { exact: true }).waitFor({ state: 'visible' });
    await grade().getByRole('tab', { name: 'Disciplinas', exact: true }).click();
    await grade().getByRole('button', { name: 'Nova disciplina', exact: true }).waitFor({ state: 'hidden' });
    await grade().getByRole('tab', { name: /^Pedidos de aula extra/ }).click();
    await page.getByRole('button', { name: 'Nova aula extra', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Criar aula extra', exact: true }).isDisabled(), true);
    await page.unroute(API + '/portal/estado');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser && discB) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  const apagar = [];
  for (const d of [discA, discT, discB]) if (d) apagar.push('/disciplinas/' + d.id);
  for (const a of [alunoB, alunoT1, alunoT2]) if (a) apagar.push('/alunos/' + a.id);
  for (const caminho of apagar) {
    try {
      const r = await api(caminho, 'DELETE');
      if (r.status === 409) { console.log('Fica até o reseed (tem nota ou chamada): ' + caminho); if (caminho.startsWith('/disciplinas/')) await api(caminho, 'PATCH', { professor_id: null }); }
      else if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
    } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
  }
  if (turma) console.log('Turma de teste criada (reseed limpa): ' + turma.nome);
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API dos registros próprios');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
