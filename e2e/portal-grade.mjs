// Usa o seed e os serviços locais. Ocupações e evento são limpos no finally.
// O pedido criado fica no banco (não há DELETE); o reseed limpa esse pedido.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173';
let browser, token, carlos, originais, eventoId, pedidoId;
const tituloEvento = 'Conferência F5b ' + Date.now();
async function api(caminho, method = 'GET', corpo, tokenReq = token) {
  const r = await fetch(API + caminho, {
    method, headers: { ...(tokenReq ? { Authorization: 'Bearer ' + tokenReq } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { status: r.status, corpo: r.status === 204 ? null : await r.json() };
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
  const rt = await api('/turmas'), rs = await api('/salas');
  assert.equal(rt.status, 200); assert.equal(rs.status, 200);
  const turmaReal = rt.corpo.find(t => t.nome === '1º A'), salaReal = rs.corpo.find(s => s.nome === 'Sala 101');
  assert.ok(turmaReal, 'turma conhecida do seed'); assert.ok(salaReal, 'sala conhecida do seed');
  const independencia = seed.eventos.find(e => e.tipo === 'feriado' && e.titulo === 'Independência do Brasil' && e.data === '2026-09-07');
  assert.ok(independencia, 'feriado real do seed');
  const anaLogin = await api('/auth/login', 'POST', { email: 'ana@escola.com', senha: 'escola123' });
  assert.equal(anaLogin.status, 200);
  const anaEstado = await api('/portal/estado', 'GET', undefined, anaLogin.corpo.access_token);
  assert.equal(anaEstado.status, 200);
  const turmasAna = new Set(anaEstado.corpo.disciplinas.map(d => d.turma_id).filter(id => id != null));
  const outraTurma = rt.corpo.find(t => !turmasAna.has(t.id));
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
  async function abrirSetembro() {
    await grade().getByRole('tab', { name: 'Ano letivo', exact: true }).click();
    await grade().getByRole('group', { name: 'Visão', exact: true }).getByRole('button', { name: 'Ano', exact: true }).click();
    await grade().getByText('Setembro', { exact: true }).click();
    await grade().getByText('setembro de 2026', { exact: true }).waitFor({ state: 'visible' });
    await grade().getByText('Independência do Brasil', { exact: true }).waitFor({ state: 'visible' });
  }
  await conferir('escola abre /grade com disciplinas reais e ocupação de Carlos na segunda', async () => {
    await entrar('escola@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: 'Quadro semanal', exact: true }).waitFor({ state: 'visible' });
    const nomes = await grade().locator('select').filter({ has: page.locator('option', { hasText: 'Python' }) }).locator('option').allTextContents();
    for (const d of seed.disciplinas) assert.ok(nomes.some(n => n.startsWith(d.nome + ' · ')), d.nome);
    assert.ok(nomes.some(n => n.startsWith('Python · ')));
    assert.equal(await grade().locator('select').filter({ has: page.locator('option', { hasText: new RegExp('^' + turmaReal.nome + '$') }) }).first().locator('option', { hasText: new RegExp('^' + turmaReal.nome + '$') }).first().textContent(), turmaReal.nome);
    assert.equal(await grade().locator('select').filter({ has: page.locator('option', { hasText: new RegExp('^' + salaReal.nome + '$') }) }).first().locator('option', { hasText: new RegExp('^' + salaReal.nome + '$') }).first().textContent(), salaReal.nome);
    const quadro = grade().locator('[data-quadro-professores]');
    await quadro.getByText(carlos.nome, { exact: true }).waitFor({ state: 'visible' });
    await quadro.locator('[title]').filter({ hasText: '' }).evaluateAll((els, esperado) => {
      if (!els.some(el => el.getAttribute('title') === esperado)) throw new Error('Ocupação real ausente no Quadro');
    }, carlos.nome + ' · ' + (segunda.motivo || 'ocupado') + ' · ' + segunda.hora_inicio + '–' + segunda.hora_fim);
    const ds = seed.disciplinas.filter(d => d.grade.length && d.professor_id != null);
    assert.ok(ds.length);
    for (const d of ds) assert.ok(await quadro.getByRole('button', { name: new RegExp('^' + d.nome + ' · ') }).count(), d.nome);
  });
  await conferir('Ano letivo mostra Independência em setembro e publica evento pela API', async () => {
    await abrirSetembro();
    await grade().getByRole('button', { name: 'Novo evento', exact: true }).click();
    const f = grade().getByRole('dialog');
    await f.locator('select').first().selectOption('evento');
    await f.getByPlaceholder('P2 de Python').fill(tituloEvento);
    await f.locator('input[type=date]').first().fill('2026-09-07');
    if (outraTurma) {
      await f.getByRole('button', { name: 'Turmas específicas', exact: true }).click();
      await f.getByRole('button', { name: outraTurma.nome, exact: true }).click();
    }
    const resp = page.waitForResponse(r => r.url() === API + '/eventos' && r.request().method() === 'POST');
    await f.getByRole('button', { name: 'Publicar no calendário', exact: true }).click();
    const salvo = await resp, corpo = await salvo.json();
    if (salvo.status() === 201) eventoId = corpo.id;
    assert.equal(salvo.status(), 201, JSON.stringify(corpo)); assert.ok(eventoId);
    assert.equal(corpo.titulo, tituloEvento);
    assert.deepEqual(corpo.turma_ids, outraTurma ? [outraTurma.id] : []);
    await f.getByText(tituloEvento, { exact: true }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    await grade().getByText(tituloEvento, { exact: true }).waitFor({ state: 'visible' });
    assert.ok((await api('/eventos')).corpo.some(e => e.id === eventoId && e.titulo === tituloEvento));
  });
  if (outraTurma) await conferir('Ana vê o feriado geral e não vê o evento publicado só para outra turma', async () => {
    await sair(); await entrar('ana@escola.com'); await abrirGrade(); await abrirSetembro();
    assert.ok(await grade().getByText('Independência do Brasil', { exact: true }).count());
    assert.equal(await grade().getByText(tituloEvento, { exact: true }).count(), 0);
    const eventosAna = await api('/eventos', 'GET', undefined, anaLogin.corpo.access_token);
    assert.equal(eventosAna.status, 200);
    assert.ok(eventosAna.corpo.some(e => e.id === independencia.id));
    assert.equal(eventosAna.corpo.some(e => e.id === eventoId), false);
    await sair(); await entrar('escola@escola.com'); await abrirGrade();
  });
  else console.log('NÃO FEITO negativo de Ana: seed sem turma fora das matrículas; evento geral serve como âncora positiva.');
  await conferir('escola exclui pelo formulário o evento publicado', async () => {
    await abrirSetembro();
    await grade().getByText(tituloEvento, { exact: true }).click();
    const resp = page.waitForResponse(r => r.url() === API + `/eventos/${eventoId}` && r.request().method() === 'DELETE');
    await grade().getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();
    assert.equal((await resp).status(), 204);
    await grade().getByText('Evento removido do calendário.', { exact: true }).waitFor({ state: 'visible' });
    assert.ok(await grade().getByText('Independência do Brasil', { exact: true }).count());
    assert.equal(await grade().getByText(tituloEvento, { exact: true }).count(), 0);
    const eventos = await api('/eventos'); assert.equal(eventos.status, 200);
    assert.ok(eventos.corpo.some(e => e.id === independencia.id));
    assert.equal(eventos.corpo.some(e => e.id === eventoId), false); eventoId = null;
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
  const motivoPedido = 'Conferência F5b aula extra ' + Date.now(), motivoRecusa = 'Conferência F5b: não haverá reposição nessa data.';
  await conferir('Marta envia pela tela um pedido real num horário livre de terça a quinta', async () => {
    const marta = seed.professores.find(p => p.email === 'marta@escola.com'); assert.ok(marta);
    const atuais = await api('/portal/estado'); assert.equal(atuais.status, 200);
    const st = atuais.corpo, minhas = st.disciplinas.filter(d => d.professor_id === marta.id); assert.ok(minhas.length);
    let livre;
    const sobrepoe = (ini, fim, o) => ini < o.hora_fim && o.hora_inicio < fim;
    for (let data = st.semestre.inicio; data <= st.semestre.fim && !livre;) {
      const dia = new Date(data + 'T00:00:00Z').getUTCDay();
      const feriado = st.eventos.some(e => e.tipo === 'feriado' && e.data <= data && data <= (e.fim || e.data));
      if ([2, 3, 4].includes(dia) && !feriado) for (const d of minhas) {
        const sala_id = d.sala_id ?? salaReal.id;
        if (st.aulas.some(x => x.disciplina_id === d.id && x.data === data)) continue; // o servidor guarda no máximo uma aula por disciplina e dia
        for (const [ini, fim] of [['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10'], ['15:30', '17:10']]) {
          if ((marta.ocupacoes || []).some(o => o.dia_semana === dia && sobrepoe(ini, fim, o))) continue;
          const conflito = (outra, sala) => outra.professor_id === marta.id || (d.turma_id != null && outra.turma_id === d.turma_id) || sala === sala_id;
          if (st.aulas.some(a => {
            const outra = st.disciplinas.find(x => x.id === a.disciplina_id);
            const g = outra?.grade.find(g => g.dia_semana === dia && g.hora_inicio === a.hora_inicio);
            return outra && a.data === data && a.status !== 'cancelada' && sobrepoe(ini, fim, a) && conflito(outra, g?.sala_id ?? outra.sala_id);
          })) continue;
          if (st.pedidos.some(p => {
            const outra = st.disciplinas.find(x => x.id === p.disciplina_id);
            return outra && p.status === 'aprovada' && p.data === data && sobrepoe(ini, fim, p) && conflito(outra, p.sala_id ?? outra.sala_id);
          })) continue;
          // Evita também o choque imediato do canvas com a grade semanal.
          if (st.disciplinas.some(outra => outra.grade.some(g => g.dia_semana === dia && sobrepoe(ini, fim, g) && conflito(outra, g.sala_id ?? outra.sala_id)))) continue;
          livre = { disciplina_id: d.id, data, hora_inicio: ini, hora_fim: fim, sala_id, motivo: motivoPedido }; break;
        }
        if (livre) break;
      }
      const proxima = new Date(data + 'T00:00:00Z'); proxima.setUTCDate(proxima.getUTCDate() + 1); data = proxima.toISOString().slice(0, 10);
    }
    assert.ok(livre, 'seed precisa ter um horário livre válido para Marta');
    await sair(); await entrar('marta@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: /^Aulas extras/ }).click();
    const emAnaliseAntes = await grade().getByText('Em análise', { exact: true }).count();
    const f = grade().locator('form').filter({ has: page.getByRole('button', { name: 'Enviar para análise', exact: true }) });
    await f.locator('select').nth(0).selectOption(String(livre.disciplina_id));
    await f.locator('input[type=date]').fill(livre.data);
    await f.locator('input[type=time]').nth(0).fill(livre.hora_inicio);
    await f.locator('input[type=time]').nth(1).fill(livre.hora_fim);
    await f.locator('select').nth(1).selectOption(String(livre.sala_id));
    await f.locator('textarea').fill(motivoPedido);
    const resp = page.waitForResponse(r => r.url() === API + '/pedidos' && r.request().method() === 'POST');
    await f.getByRole('button', { name: 'Enviar para análise', exact: true }).click();
    const salvo = await resp, pedido = await salvo.json();
    if (salvo.status() === 201) pedidoId = pedido.id;
    assert.equal(salvo.status(), 201, JSON.stringify(pedido)); assert.ok(pedidoId);
    assert.deepEqual(salvo.request().postDataJSON(), livre);
    assert.equal(pedido.professor_id, marta.id); assert.equal(pedido.status, 'pendente');
    await grade().getByText('Pedido enviado. A escola analisa e você vê a resposta aqui.', { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await grade().getByText('Em análise', { exact: true }).count(), emAnaliseAntes + 1);
    console.log('Pedido F5b criado: ' + pedidoId + ' (reseed limpa)');
  });
  await conferir('escola recusa o pedido real com motivo e Marta vê a resposta', async () => {
    await sair(); await entrar('escola@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: /^Pedidos de aula extra/ }).click();
    const cartao = grade().locator('article').filter({ hasText: motivoPedido });
    await cartao.getByRole('button', { name: 'Recusar', exact: true }).click();
    await cartao.getByLabel('Motivo da recusa', { exact: true }).fill(motivoRecusa);
    const resp = page.waitForResponse(r => r.url() === API + `/pedidos/${pedidoId}/recusar` && r.request().method() === 'POST');
    await cartao.getByRole('button', { name: 'Recusar pedido', exact: true }).click();
    const recusado = await resp, corpo = await recusado.json();
    assert.equal(recusado.status(), 200, JSON.stringify(corpo));
    assert.deepEqual(recusado.request().postDataJSON(), { motivo: motivoRecusa });
    assert.equal(corpo.id, pedidoId); assert.equal(corpo.status, 'recusada'); assert.equal(corpo.resposta, motivoRecusa);
    await grade().getByText('Pedido recusado. O professor vê o motivo.', { exact: true }).waitFor({ state: 'visible' });
    await sair(); await entrar('marta@escola.com'); await abrirGrade();
    await grade().getByRole('tab', { name: /^Aulas extras/ }).click();
    await grade().getByText(motivoRecusa, { exact: true }).waitFor({ state: 'visible' });
    const pedido = (await api('/pedidos')).corpo.find(p => p.id === pedidoId);
    assert.ok(pedido); assert.equal(pedido.status, 'recusada'); assert.equal(pedido.resposta, motivoRecusa);
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
  try {
    // A consulta pelo título recupera o id mesmo se a tela falhar após o POST.
    const eventos = await api('/eventos'); assert.equal(eventos.status, 200);
    for (const e of eventos.corpo.filter(e => e.id === eventoId || e.titulo === tituloEvento)) {
      assert.equal((await api(`/eventos/${e.id}`, 'DELETE')).status, 204);
      console.log('OK evento de teste removido: ' + e.id);
    }
  } catch (er) { process.exitCode = 1; console.error('FALHOU limpeza do evento\n' + er.stack); }
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
