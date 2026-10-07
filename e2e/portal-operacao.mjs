// Usa os serviços em execução e escreve apenas em registros próprios, apagados no finally.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173', sufixo = Date.now();
let browser, token, disc, aluno, colega, seed;
const avisos = new Set();
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
try {
  await conferir('prepara disciplina de Carlos, dois alunos e matrículas próprios pela API', async () => {
    const r = await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' });
    assert.equal(r.status, 200); token = r.corpo.access_token;
    const estado = await api('/portal/estado'); assert.equal(estado.status, 200); seed = estado.corpo;
    const professores = await api('/professores'); assert.equal(professores.status, 200);
    const carlos = professores.corpo.find(p => p.email === 'prof@escola.com'); assert.ok(carlos);
    const d = await api('/disciplinas', 'POST', { nome: 'Operação F3b ' + sufixo, carga_horaria: 40, professor_id: carlos.id });
    if (d.status === 201) disc = d.corpo;
    assert.equal(d.status, 201);
    for (const [i, nome] of ['Aluno', 'Colega'].entries()) {
      const a = await api('/alunos', 'POST', { nome: nome + ' F3b ' + sufixo, idade: 20, matricula: 'F3b-' + sufixo + '-' + i });
      if (a.status === 201) { if (i === 0) aluno = a.corpo; else colega = a.corpo; }
      assert.equal(a.status, 201);
      assert.equal((await api(`/alunos/${a.corpo.id}/matricular/${disc.id}`, 'POST')).status, 201);
    }
  });
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const respostas = [], erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('response', r => {
    if (r.url().startsWith(API)) respostas.push({ caminho: new URL(r.url()).pathname, metodo: r.request().method(), status: r.status(), pedido: r.request().postDataJSON() });
  });
  page.on('response', async r => {
    if (r.url() === API + '/avisos' && r.request().method() === 'POST' && r.status() === 201) avisos.add((await r.json()).id);
  });
  async function logic(codigo, arg) {
    return page.evaluate(async ({ codigo, arg }) => {
      const host = document.querySelector('[data-sc-name="Portal Escolar"]');
      let fiber = host[Object.keys(host).find(k => k.startsWith('__reactFiber$'))];
      while (!fiber.stateNode?.logic) fiber = fiber.return;
      return await new Function('logic', 'arg', 'return (async () => {' + codigo + '})();')(fiber.stateNode.logic, arg);
    }, { codigo, arg });
  }
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  async function entrar(email) {
    await page.goto(FRONT + '/portal.html?inicio=Login');
    const form = page.locator('form').filter({ visible: true });
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill('escola123');
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  async function agir(caminho, metodo, codigo, arg, status = 204) {
    const inicio = respostas.length;
    await logic(codigo, arg);
    const novas = respostas.slice(inicio), escritas = novas.filter(r => r.caminho === caminho && r.metodo === metodo);
    assert.equal(escritas.length, 1, 'a ação precisa escrever na API: ' + metodo + ' ' + caminho);
    assert.equal(escritas[0].status, status);
    const cargas = novas.filter(r => r.caminho === '/portal/estado' && r.metodo === 'GET');
    assert.equal(cargas.length, status < 300 ? 1 : 0, 'recarregar somente após sucesso');
    if (status < 300) {
      const credencial = await page.evaluate(() => localStorage.getItem('portal.token'));
      const dados = await api('/portal/estado', 'GET', undefined, credencial); assert.equal(dados.status, 200);
      assert.equal(await logic(`
        const url = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === '/src/portal/adaptador.ts').name;
        const { montarEstado } = await import(url), recebido = montarEstado(logic.state.usuario, arg);
        return ['alunos', 'discs', 'mats', 'avals', 'notas', 'aulas', 'avisos', 'profs', 'semestre', 'historico'].every(k => JSON.stringify(logic.state[k]) === JSON.stringify(recebido[k]));
      `, dados.corpo), true, 'coleções precisam corresponder ao estado do servidor');
    }
    return escritas[0];
  }
  const preparar = codigo => logic(codigo, { disc, aluno, colega });
  async function boletim() {
    const r = await api(`/alunos/${aluno.id}/boletim`); assert.equal(r.status, 200);
    return r.corpo.find(b => b.disciplina.id === disc.id);
  }
  let p1, p2, aula, outra, dia, novoDia;
  await conferir('escola entra pela tela e cria avaliações pelos dois formulários (50/50)', async () => {
    await entrar('escola@escola.com');
    await preparar("logic.setState({ tela: 'disciplinas', selDisc: arg.disc.id, selAluno: arg.aluno.id, notaDisc: arg.disc.id, subAba: 'notas', avalNome: 'P1 F3b', avalPeso: '50' });");
    await agir(`/disciplinas/${disc.id}/avaliacoes`, 'POST', 'await logic.renderVals().criarAvalSel({ preventDefault() {} });', undefined, 201);
    await visivel('Avaliação criada.').waitFor({ state: 'visible' });
    await preparar("logic.setState({ tela: 'boletim', avalNome: 'P2 F3b', avalPeso: '50' });");
    await agir(`/disciplinas/${disc.id}/avaliacoes`, 'POST', 'await logic.renderVals().criarAval({ preventDefault() {} });', undefined, 201);
    const r = await api(`/disciplinas/${disc.id}/avaliacoes`); assert.equal(r.status, 200);
    assert.deepEqual(r.corpo.map(a => [a.nome, a.peso]), [['P1 F3b', 50], ['P2 F3b', 50]]);
    [p1, p2] = r.corpo;
    assert.equal(await logic('return logic.state.selDisc;'), disc.id);
  });
  await conferir('grade e boletim lançam notas reais e média ponderada 7,0', async () => {
    const key = aluno.id + '-' + p1.id;
    await preparar("logic.setState({ tela: 'disciplinas', subAba: 'notas' });");
    await logic('logic.setState({ gnDraft: { [arg]: "6,0" } });', key);
    const r = await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, logic.state.alunos.find(a => a.id === +arg.split("-")[0]).nome, "P1 F3b");', key);
    assert.deepEqual(r.pedido, { valor: 6 });
    await visivel('Nota de ' + aluno.nome + ' em P1 F3b: 6,0.').waitFor({ state: 'visible' });
    await logic("logic.setState({ tela: 'boletim', notaAval: arg, notaValor: '8,0' });", p2.id);
    await agir(`/avaliacoes/${p2.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });');
    const b = await boletim(); assert.deepEqual(b.notas.map(n => n.valor), [6, 8]);
    assert.equal(b.media, 7); assert.equal(b.parcial, false);
  });
  await conferir('exclusão de avaliação com notas mostra o 409 real e preserva ambas as avaliações', async () => {
    assert.deepEqual((await boletim()).notas.map(n => n.valor), [6, 8]);
    await agir('/avaliacoes/' + p1.id, 'DELETE', 'await logic.renderVals().avalLista.find(a => a.nome === "P1 F3b").excluir();', undefined, 409);
    const detalhe = 'Não é possível excluir: já existem notas lançadas nessa avaliação';
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.deepEqual(await logic('return logic.state.avalMsg;'), { erro: true, t: detalhe });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo.map(a => a.id), [p1.id, p2.id]);
  });
  await conferir('uma casa decimal é validada localmente nos dois caminhos, com nota válida como âncora', async () => {
    assert.equal((await boletim()).notas[0].valor, 6);
    const antes = respostas.length, key = aluno.id + '-' + p1.id;
    await logic('logic.setState({ gnDraft: { [arg]: "6,25" } }); await logic.salvarNotaGrade(arg, "Aluno", "P1 F3b");', key);
    assert.match(await logic('return logic.state.gnMsg.t;'), /até uma casa decimal/);
    await logic("logic.setState({ notaValor: '8,25' }); await logic.renderVals().lancarNota({ preventDefault() {} });");
    assert.deepEqual(await logic('return logic.state.notaMsg;'), { erro: true, t: 'Use um valor de 0 a 10, com até uma casa decimal.' });
    assert.equal(respostas.slice(antes).filter(r => r.metodo === 'PUT').length, 0);
    assert.deepEqual((await boletim()).notas.map(n => n.valor), [6, 8]);
    await logic('logic.setState({ gnDraft: {} });');
  });
  await conferir('limpa notas pela grade e pela confirmação do boletim, preservando a outra nota', async () => {
    await preparar("logic.setState({ tela: 'disciplinas', subAba: 'notas' });");
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'DELETE', 'await logic.renderVals().gnLinhas.find(l => l.nome === arg).cels[0].limpar();', aluno.nome);
    assert.deepEqual((await boletim()).notas.map(n => n.valor), [null, 8]);
    await logic("logic.setState({ tela: 'boletim', limpar: arg });", aluno.id + '-' + p2.id);
    await agir(`/avaliacoes/${p2.id}/notas/${aluno.id}`, 'DELETE', 'await logic.boletim(arg)[0].confirmarLimpar();', aluno.id);
    assert.deepEqual((await boletim()).notas.map(n => n.valor), [null, null]);
    assert.equal(await logic('return logic.state.limpar;'), null);
  });
  await conferir('erro real de nota sem matrícula aparece em notaMsg e gnMsg, ao lado de lançamento válido', async () => {
    await logic("logic.setState({ notaAval: arg, notaValor: '7' });", p1.id);
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });');
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'DELETE', 'await logic.boletim(arg)[0].avs[0].pedirLimpar(); await logic.boletim(arg)[0].confirmarLimpar();', aluno.id);
    assert.equal((await api(`/alunos/${aluno.id}/matricular/${disc.id}`, 'DELETE')).status, 204);
    // O estado da tela fica deliberadamente anterior à desmatrícula concorrente.
    await logic("logic.setState({ notaValor: '7' });");
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });', undefined, 409);
    const detalhe = 'O aluno não está matriculado nessa disciplina';
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.deepEqual(await logic('return logic.state.notaMsg;'), { erro: true, t: detalhe });
    await logic('logic.setState({ tela: "disciplinas", subAba: "notas", gnDraft: { [arg]: "7" } });', aluno.id + '-' + p1.id);
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, "Aluno", "P1 F3b");', aluno.id + '-' + p1.id, 409);
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.equal((await boletim()), undefined);
    assert.equal((await api(`/alunos/${aluno.id}/matricular/${disc.id}`, 'POST')).status, 201);
    await logic('await logic.recarregar(); logic.setState({ gnDraft: {} });');
  });
  await conferir('aulas extras, cancelar/reativar, chamada completa e erro 409 de cancelamento', async () => {
    const sem = (await api('/semestres/atual')).corpo;
    dia = sem.inicio; novoDia = new Date(Date.parse(dia) + 2 * 86400000).toISOString().slice(0, 10);
    await logic('logic.setState({ tela: "frequencia", agDiscF: String(arg.disc.id), agDia: arg.dia }); logic.abrirExtra(); logic.setState({ fDisc: String(arg.disc.id), fData: arg.dia, fIni: "08:00", fFim: "09:40" });', { disc, dia });
    const r = await agir(`/disciplinas/${disc.id}/aulas`, 'POST', 'await logic.salvarExtra({ preventDefault() {} });', undefined, 201);
    assert.deepEqual(r.pedido, { data: dia, hora_inicio: '08:00', hora_fim: '09:40' });
    aula = (await api(`/disciplinas/${disc.id}/aulas`)).corpo.find(a => a.data === dia); assert.ok(aula);
    await agir('/aulas/' + aula.id, 'PATCH', 'await logic.setStatus(arg, "cancelada");', aula.id, 200);
    assert.equal((await api('/agenda?data=' + dia)).corpo.find(a => a.aula_id === aula.id).status, 'cancelada');
    await agir('/aulas/' + aula.id, 'PATCH', 'await logic.setStatus(arg, "agendada");', aula.id, 200);
    await logic('logic.abrirChamada(logic.state.aulas.find(a => a.aula_id === arg.aula.id)); logic.setState({ cham: { [arg.aluno.id]: true, [arg.colega.id]: false } });', { aula, aluno, colega });
    const ch = await agir(`/disciplinas/${disc.id}/chamada`, 'PUT', 'await logic.salvarChamada();');
    assert.deepEqual(ch.pedido, { data: dia, presencas: [{ aluno_id: aluno.id, presente: true }, { aluno_id: colega.id, presente: false }] });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo, ch.pedido.presencas);
    await agir('/aulas/' + aula.id, 'PATCH', 'await logic.setStatus(arg, "cancelada");', aula.id, 409);
    await visivel('Aula já tem presenças').waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.agErro;'), 'Aula já tem presenças');
    assert.equal((await api('/agenda?data=' + dia)).corpo.find(a => a.aula_id === aula.id).status, 'agendada');
  });
  await conferir('chamada recusa aula cancelada pelo servidor e remarcação usa remarcada_de real', async () => {
    const segundoDia = new Date(Date.parse(dia) + 86400000).toISOString().slice(0, 10);
    await logic('logic.abrirExtra(); logic.setState({ fDisc: String(arg.disc.id), fData: arg.dia, fIni: "10:00", fFim: "11:40" });', { disc, dia: segundoDia });
    await agir(`/disciplinas/${disc.id}/aulas`, 'POST', 'await logic.salvarExtra({ preventDefault() {} });', undefined, 201);
    outra = (await api(`/disciplinas/${disc.id}/aulas`)).corpo.find(a => a.data === segundoDia); assert.ok(outra);
    await logic('logic.abrirChamada(logic.state.aulas.find(a => a.aula_id === arg)); logic.renderVals().ch.todos();', outra.id);
    // Cancelamento concorrente: a pré-checagem local ainda vê a aula agendada.
    assert.equal((await api('/aulas/' + outra.id, 'PATCH', { status: 'cancelada' })).status, 200);
    await agir(`/disciplinas/${disc.id}/chamada`, 'PUT', 'await logic.salvarChamada();', undefined, 409);
    await visivel('Aula cancelada').waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.chamErro;'), 'Aula cancelada');
    assert.deepEqual((await api(`/disciplinas/${disc.id}/chamada?data=${segundoDia}`)).corpo, []);
    assert.equal((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo.length, 2);
    await logic('await logic.recarregar(); logic.abrirRemarcar(logic.state.aulas.find(a => a.aula_id === arg.id)); logic.setState({ fData: arg.data, fIni: "12:00", fFim: "13:40" });', { id: outra.id, data: novoDia });
    const r = await agir('/aulas/' + outra.id, 'PATCH', 'await logic.salvarRemarcar({ preventDefault() {} });', undefined, 200);
    assert.deepEqual(r.pedido, { data: novoDia, hora_inicio: '12:00', hora_fim: '13:40', status: 'agendada' });
    const estado = (await api('/portal/estado')).corpo, au = estado.aulas.find(a => a.id === outra.id);
    assert.equal(au.remarcada_de, segundoDia); assert.equal(au.data, novoDia);
    await visivel('Remarcada de ' + segundoDia.slice(8) + '/' + segundoDia.slice(5, 7)).waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.agDia;'), novoDia);
  });
  await conferir('publica geral e de disciplina, edita e exclui avisos reais', async () => {
    for (const destino of ['', String(disc.id)]) {
      const titulo = 'Aviso F3b ' + sufixo + (destino ? ' turma' : ' geral');
      await logic('logic.setState({ tela: "avisos", avDestino: arg.destino, avTitulo: arg.titulo, avData: arg.dia, avMsg: "Mensagem de teste", avisoQ: String(arg.sufixo) });', { destino, titulo, dia, sufixo });
      const r = await agir('/avisos', 'POST', 'await logic.renderVals().publicarAviso({ preventDefault() {} });', undefined, 201);
      assert.deepEqual(r.pedido, { titulo, mensagem: 'Mensagem de teste', data: dia, ...(destino ? { disciplina_id: disc.id } : {}) });
      const aviso = (await api('/avisos?q=' + encodeURIComponent(titulo))).corpo.itens.find(a => a.titulo === titulo);
      assert.ok(aviso); avisos.add(aviso.id);
      await visivel(titulo).waitFor({ state: 'visible' });
      await logic('logic.renderVals().avisosPagina.find(a => a.id === arg.id).editar(); logic.setState({ fNome: logic.state.fNome + " editado", fTexto: "Mensagem editada", fData: arg.data });', { id: aviso.id, data: novoDia });
      await agir('/avisos/' + aviso.id, 'PATCH', 'await logic.salvarAvisoEd({ preventDefault() {} });', undefined, 200);
      const editado = (await api('/avisos?q=' + encodeURIComponent(titulo))).corpo.itens.find(a => a.id === aviso.id);
      assert.equal(editado.titulo, titulo + ' editado'); assert.equal(editado.mensagem, 'Mensagem editada'); assert.equal(editado.data, novoDia);
      await agir('/avisos/' + aviso.id, 'DELETE', 'await logic.renderVals().avisosPagina.find(a => a.id === arg).excluir();', aviso.id);
      assert.equal((await api('/avisos?q=' + encodeURIComponent(titulo))).corpo.itens.length, 0);
      assert.equal(await logic('return logic.state.avisos.some(a => a.id === arg);', aviso.id), false);
    }
  });
  await conferir('exclui avaliações sem notas pelos dois caminhos e conserva a outra como âncora', async () => {
    await preparar("logic.setState({ tela: 'disciplinas', subAba: 'notas' });");
    await agir('/avaliacoes/' + p1.id, 'DELETE', 'await logic.renderVals().avsSel.find(a => a.nome === "P1 F3b").excluir();');
    assert.deepEqual((await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo.map(a => a.id), [p2.id]);
    await preparar("logic.setState({ tela: 'boletim' });");
    await agir('/avaliacoes/' + p2.id, 'DELETE', 'await logic.renderVals().avalLista.find(a => a.nome === "P2 F3b").excluir();');
    assert.deepEqual((await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo, []);
  });
  await conferir('Carlos escreve nota e chamada na sua disciplina própria; servidor recusa escritas na de Marta com 403', async () => {
    const v = await api(`/disciplinas/${disc.id}/avaliacoes`, 'POST', { nome: 'Professor F3b', peso: 100 }); assert.equal(v.status, 201);
    await logic('logic.sair();'); await entrar('prof@escola.com');
    await preparar("logic.setState({ tela: 'disciplinas', selDisc: arg.disc.id, subAba: 'notas' });");
    await logic('logic.setState({ gnDraft: { [arg]: "9" } });', aluno.id + '-' + v.corpo.id);
    await agir(`/avaliacoes/${v.corpo.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, "Aluno", "Professor F3b");', aluno.id + '-' + v.corpo.id);
    assert.equal((await boletim()).notas[0].valor, 9);
    await logic('logic.setState({ tela: "frequencia", agDia: arg.dia, agDiscF: String(arg.disc.id) }); logic.abrirChamada(logic.state.aulas.find(a => a.aula_id === arg.aula.id)); logic.renderVals().ch.todos();', { dia, disc, aula });
    await agir(`/disciplinas/${disc.id}/chamada`, 'PUT', 'await logic.salvarChamada();');
    assert.deepEqual((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo, [{ aluno_id: aluno.id, presente: true }, { aluno_id: colega.id, presente: true }]);
    const dados = (await api('/portal/estado')).corpo;
    const marta = dados.professores.find(p => p.email === 'marta@escola.com'); assert.ok(marta);
    const daMarta = dados.disciplinas.find(d => d.professor_id === marta.id); assert.ok(daMarta);
    const avalMarta = dados.avaliacoes.find(v => v.disciplina_id === daMarta.id); assert.ok(avalMarta);
    assert.ok(await logic('return logic.state.discs.some(d => d.id === arg);', disc.id));
    assert.equal(await logic('return logic.state.discs.some(d => d.id === arg);', daMarta.id), false);
    // A escrita é real, recusada antes de tocar qualquer dado da disciplina do seed.
    await logic('logic.setState({ tela: "disciplinas", subAba: "notas", gnDraft: { [arg]: "9" } });', aluno.id + '-' + avalMarta.id);
    await agir(`/avaliacoes/${avalMarta.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, "Aluno", "Avaliação da Marta");', aluno.id + '-' + avalMarta.id, 403);
    await visivel('Sem permissão para esta disciplina').waitFor({ state: 'visible' });
    const antes = await api(`/disciplinas/${daMarta.id}/chamada?data=${dia}`);
    const profToken = await page.evaluate(() => localStorage.getItem('portal.token'));
    const negativo = await api(`/disciplinas/${daMarta.id}/chamada`, 'PUT', { data: dia, presencas: [{ aluno_id: aluno.id, presente: true }] }, profToken);
    assert.equal(negativo.status, 403); assert.equal(negativo.corpo.detail, 'Sem permissão para esta disciplina');
    assert.deepEqual(await api(`/disciplinas/${daMarta.id}/chamada?data=${dia}`), antes);
    assert.equal((await boletim()).notas[0].valor, 9);
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser && disc) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  const caminhos = [...avisos].map(id => '/avisos/' + id);
  if (disc) caminhos.push('/disciplinas/' + disc.id);
  for (const a of [aluno, colega]) if (a) caminhos.push('/alunos/' + a.id);
  for (const caminho of caminhos) {
    try {
      const r = await api(caminho, 'DELETE');
      if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
    } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
  }
  if (seed) {
    try {
      const dados = await api('/portal/estado'); assert.equal(dados.status, 200);
      assert.deepEqual(dados.corpo, seed, 'o teste precisa devolver o estado completo ao que encontrou');
      console.log('OK estado do seed preservado integralmente');
    } catch (erro) { limpou = false; console.error('FALHOU estado do seed preservado\n' + erro.stack); }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API de todos os registros próprios');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
