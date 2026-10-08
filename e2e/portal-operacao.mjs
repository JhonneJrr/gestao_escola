// Usa os serviços em execução e escreve apenas em registros próprios, apagados no finally.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = process.env.API_URL || 'http://localhost:8000', FRONT = process.env.FRONT_URL || 'http://localhost:5173', sufixo = Date.now();
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
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
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
    await page.goto(FRONT + '/login');
    const form = page.locator('form').filter({ visible: true });
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill('escola123');
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  // Executa a ação (por lógica ou por cliques) e confere: uma escrita só, recarga só no sucesso e coleções iguais ao servidor.
  async function observar(caminho, metodo, status, executar) {
    const inicio = respostas.length;
    const escrita = page.waitForResponse(r => r.url() === API + caminho && r.request().method() === metodo);
    const recarga = status < 300 ? page.waitForResponse(r => r.url() === API + '/portal/estado' && r.request().method() === 'GET') : null;
    escrita.catch(() => {}); recarga?.catch(() => {}); // se a ação falhar antes, a espera pendente não pode derrubar o processo
    await executar(); await escrita; if (recarga) await recarga;
    const novas = respostas.slice(inicio), escritas = novas.filter(r => r.caminho === caminho && r.metodo === metodo);
    assert.equal(escritas.length, 1, 'a ação precisa escrever na API: ' + metodo + ' ' + caminho);
    assert.equal(escritas[0].status, status);
    const cargas = novas.filter(r => r.caminho === '/portal/estado' && r.metodo === 'GET');
    assert.equal(cargas.length, status < 300 ? 1 : 0, 'recarregar somente após sucesso');
    if (status < 300) {
      const credencial = await page.evaluate(() => localStorage.getItem('portal.token'));
      const dados = await api('/portal/estado', 'GET', undefined, credencial); assert.equal(dados.status, 200);
      const confere = () => logic(`
        const url = performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === '/src/portal/adaptador.ts').name;
        const { montarEstado } = await import(url), recebido = montarEstado(logic.state.usuario, arg);
        return ['alunos', 'discs', 'mats', 'avals', 'notas', 'aulas', 'avisos', 'profs', 'semestre', 'historico'].every(k => JSON.stringify(logic.state[k]) === JSON.stringify(recebido[k]));
      `, dados.corpo);
      // Na ação por clique a tela aplica a recarga logo depois que a resposta chega: espera o estado convergir.
      let igual = await confere();
      for (let i = 0; i < 30 && !igual; i++) { await page.waitForTimeout(100); igual = await confere(); }
      assert.equal(igual, true, 'coleções precisam corresponder ao estado do servidor');
    }
    return escritas[0];
  }
  const agir = (caminho, metodo, codigo, arg, status = 204) => observar(caminho, metodo, status, () => logic(codigo, arg));
  const agirUI = (caminho, metodo, fazer, status = 204) => observar(caminho, metodo, status, fazer);
  const preparar = codigo => logic(codigo, { disc, aluno, colega });
  async function boletim() {
    const r = await api(`/alunos/${aluno.id}/boletim`); assert.equal(r.status, 200);
    return r.corpo.find(b => b.disciplina.id === disc.id);
  }
  // valores das duas atividades extras de teste, na ordem p1, p2 (a regra do update 4 cria várias avaliações por disciplina)
  const notasDe = async () => { const b = await boletim(); const m = Object.fromEntries(b.notas.map(n => [n.avaliacao.id, n.valor])); return [m[p1.id] ?? null, m[p2.id] ?? null]; };
  const extrasDe = async () => (await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo.filter(a => a.tipo === 'extra');
  const periodoAtual = async () => { const r = (await api('/regra-avaliacao')).corpo, hoje = new Date().toISOString().slice(0, 10); return (r.periodos.find(p => p.inicio <= hoje && hoje <= p.fim) || r.periodos[0]).id; };
  let p1, p2, aula, outra, dia, novoDia;
  await conferir('escola cria atividades extras pela grade da disciplina e pelo formulário do boletim', async () => {
    await entrar('escola@escola.com');
    const periodo = await periodoAtual();
    await page.goto(FRONT + '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).getByText(disc.nome, { exact: true }).first().click();
    await page.getByRole('tab', { name: /^Avaliações e notas/ }).click();
    await page.getByRole('button', { name: /^Atividade extra/ }).click();
    await page.getByLabel('Nome da atividade', { exact: true }).fill('Lista A F3b');
    const a = await agirUI(`/disciplinas/${disc.id}/avaliacoes`, 'POST', () => page.getByRole('button', { name: 'Criar', exact: true }).click(), 201);
    assert.deepEqual(a.pedido, { nome: 'Lista A F3b', periodo_id: periodo });
    await visivel('Lista A F3b criada. Começa como rascunho.').waitFor({ state: 'visible' });
    await preparar("logic.setState({ tela: 'boletim', selDisc: arg.disc.id, selAluno: arg.aluno.id, notaDisc: arg.disc.id, avalNome: 'Lista B F3b', avalPeso: '1' });");
    const b = await agir(`/disciplinas/${disc.id}/avaliacoes`, 'POST', 'await logic.renderVals().criarAval({ preventDefault() {} });', undefined, 201);
    assert.deepEqual(b.pedido, { nome: 'Lista B F3b', periodo_id: periodo });
    const extras = await extrasDe();
    assert.deepEqual(extras.map(x => [x.nome, x.publicada]), [['Lista A F3b', false], ['Lista B F3b', false]]);
    [p1, p2] = extras;
    assert.equal(await logic('return logic.state.selDisc;'), disc.id);
  });
  await conferir('grade e boletim lançam notas reais e a média do servidor é 7,0', async () => {
    const key = aluno.id + '-' + p1.id;
    await preparar("logic.setState({ tela: 'disciplinas', subAba: 'notas' });");
    await logic('logic.setState({ gnDraft: { [arg]: "6,0" } });', key);
    const r = await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, logic.state.alunos.find(a => a.id === +arg.split("-")[0]).nome, "Lista A F3b");', key);
    assert.deepEqual(r.pedido, { valor: 6 });
    await visivel('Nota de ' + aluno.nome + ' em Lista A F3b: 6,0.').waitFor({ state: 'visible' });
    await logic("logic.setState({ tela: 'boletim', notaAval: arg, notaValor: '8,0' });", p2.id);
    await agir(`/avaliacoes/${p2.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });');
    assert.deepEqual(await notasDe(), [6, 8]);
    assert.equal((await boletim()).media, 7);
  });
  await conferir('exclusão de atividade com notas mostra o 409 real e preserva as duas', async () => {
    assert.deepEqual(await notasDe(), [6, 8]);
    await agir('/avaliacoes/' + p1.id, 'DELETE', 'await logic.renderVals().avalLista.find(a => a.nome === "Lista A F3b").excluir();', undefined, 409);
    const detalhe = 'Só dá para excluir atividade sem notas.';
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.deepEqual(await logic('return logic.state.avalMsg;'), { erro: true, t: detalhe });
    assert.deepEqual((await extrasDe()).map(a => a.id), [p1.id, p2.id]);
  });
  await conferir('uma casa decimal é validada localmente nos dois caminhos, com nota válida como âncora', async () => {
    assert.equal((await notasDe())[0], 6);
    const antes = respostas.length, key = aluno.id + '-' + p1.id;
    await logic('logic.setState({ gnDraft: { [arg]: "6,25" } }); await logic.salvarNotaGrade(arg, "Aluno", "Lista A F3b");', key);
    assert.match(await logic('return logic.state.gnMsg.t;'), /até uma casa decimal/);
    await logic("logic.setState({ notaValor: '8,25' }); await logic.renderVals().lancarNota({ preventDefault() {} });");
    assert.deepEqual(await logic('return logic.state.notaMsg;'), { erro: true, t: 'Use um valor de 0 a 10, com até uma casa decimal.' });
    assert.equal(respostas.slice(antes).filter(r => r.metodo === 'PUT').length, 0);
    assert.deepEqual(await notasDe(), [6, 8]);
    await logic('logic.setState({ gnDraft: {} });');
  });
  await conferir('limpa notas pela grade e pela confirmação do boletim, preservando a outra nota', async () => {
    await preparar("logic.setState({ tela: 'disciplinas', subAba: 'notas' });");
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'DELETE', 'await logic.renderVals().gnLinhas.find(l => l.nome === arg).cels.find(c => c.label.endsWith("em Lista A F3b")).limpar();', aluno.nome);
    assert.deepEqual(await notasDe(), [null, 8]);
    await logic("logic.setState({ tela: 'boletim', limpar: arg });", aluno.id + '-' + p2.id);
    await agir(`/avaliacoes/${p2.id}/notas/${aluno.id}`, 'DELETE', 'await logic.boletim(arg)[0].confirmarLimpar();', aluno.id);
    assert.deepEqual(await notasDe(), [null, null]);
    assert.equal(await logic('return logic.state.limpar;'), null);
  });
  await conferir('erro real de nota sem matrícula aparece em notaMsg e gnMsg, ao lado de lançamento válido', async () => {
    await logic("logic.setState({ notaAval: arg, notaValor: '7' });", p1.id);
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });');
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'DELETE', 'await logic.boletim(arg)[0].avs.find(a => a.nome === "Lista A F3b").pedirLimpar(); await logic.boletim(arg)[0].confirmarLimpar();', aluno.id);
    assert.equal((await api(`/alunos/${aluno.id}/matricular/${disc.id}`, 'DELETE')).status, 204);
    // O estado da tela fica deliberadamente anterior à desmatrícula concorrente.
    await logic("logic.setState({ notaValor: '7' });");
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.renderVals().lancarNota({ preventDefault() {} });', undefined, 409);
    const detalhe = 'O aluno não está matriculado nessa disciplina';
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.deepEqual(await logic('return logic.state.notaMsg;'), { erro: true, t: detalhe });
    await logic('logic.setState({ tela: "disciplinas", subAba: "notas", gnDraft: { [arg]: "7" } });', aluno.id + '-' + p1.id);
    await agir(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, "Aluno", "Lista A F3b");', aluno.id + '-' + p1.id, 409);
    await visivel(detalhe).waitFor({ state: 'visible' });
    assert.equal((await boletim()), undefined);
    assert.equal((await api(`/alunos/${aluno.id}/matricular/${disc.id}`, 'POST')).status, 201);
    await logic('await logic.recarregar(); logic.setState({ gnDraft: {} });');
  });
  // Chamada pela interface nova: página da disciplina (sub-aba Chamada), gravando em PUT /disciplinas/{id}/chamada.
  // A escola não tem botão de aula extra direto (o professor pede e a escola aprova), nem de cancelar e reativar: a aula nasce pela API.
  const painelChamada = () => page.getByRole('dialog', { name: 'Chamada', exact: true });
  const marcarChamada = (nome, rotulo) => painelChamada().getByRole('radiogroup', { name: nome, exact: true }).getByRole('radio', { name: new RegExp('^' + rotulo) });
  const porAluno = presencas => presencas.slice().sort((a, b) => a.aluno_id - b.aluno_id);
  async function abrirChamadas() {
    await page.goto(FRONT + '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).getByText(disc.nome, { exact: true }).first().click();
    await page.getByRole('tab', { name: /^Chamada/ }).click();
  }
  let segundoDia;
  await conferir('aula extra (criada pela API) e chamada completa pela página da disciplina', async () => {
    const sem = (await api('/semestres/atual')).corpo;
    dia = sem.inicio; novoDia = new Date(Date.parse(dia) + 2 * 86400000).toISOString().slice(0, 10);
    segundoDia = new Date(Date.parse(dia) + 86400000).toISOString().slice(0, 10);
    assert.equal((await api(`/disciplinas/${disc.id}/aulas`, 'POST', { data: dia, hora_inicio: '15:30', hora_fim: '17:10' })).status, 201);
    assert.equal((await api(`/disciplinas/${disc.id}/aulas`, 'POST', { data: segundoDia, hora_inicio: '13:30', hora_fim: '15:10' })).status, 201);
    const aulas = (await api(`/disciplinas/${disc.id}/aulas`)).corpo;
    aula = aulas.find(a => a.data === dia); outra = aulas.find(a => a.data === segundoDia); assert.ok(aula && outra);
    await logic('await logic.recarregar();');
    await abrirChamadas();
    await page.getByRole('button', { name: 'Fazer chamada', exact: true }).first().click();
    await painelChamada().waitFor({ state: 'visible' });
    await marcarChamada(aluno.nome, 'Presente').click(); await marcarChamada(colega.nome, 'Ausente').click();
    const ch = await agirUI(`/disciplinas/${disc.id}/chamada`, 'PUT', () => painelChamada().getByRole('button', { name: 'Salvar chamada', exact: true }).click());
    assert.deepEqual({ data: ch.pedido.data, presencas: porAluno(ch.pedido.presencas) }, { data: dia, presencas: porAluno([{ aluno_id: aluno.id, presente: true }, { aluno_id: colega.id, presente: false }]) });
    assert.deepEqual(porAluno((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo), porAluno(ch.pedido.presencas));
    await visivel('Chamada feita (1/2)').waitFor({ state: 'visible' });
  });
  await conferir('chamada recusa aula cancelada pelo servidor (409) e preserva a chamada anterior', async () => {
    await page.getByRole('button', { name: 'Fazer chamada', exact: true }).first().click();
    await painelChamada().getByRole('button', { name: 'Todos presentes', exact: true }).click();
    // Cancelamento concorrente: a tela ainda vê a aula agendada.
    assert.equal((await api('/aulas/' + outra.id, 'PATCH', { status: 'cancelada' })).status, 200);
    await agirUI(`/disciplinas/${disc.id}/chamada`, 'PUT', () => painelChamada().getByRole('button', { name: 'Salvar chamada', exact: true }).click(), 409);
    await painelChamada().getByText('Aula cancelada', { exact: true }).waitFor({ state: 'visible' });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/chamada?data=${segundoDia}`)).corpo, []);
    assert.equal((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo.length, 2);
    await page.keyboard.press('Escape'); await painelChamada().waitFor({ state: 'hidden' });
  });
  // Cancelar, reativar e remarcar aula não têm botão na página da disciplina nem na escola: a tela só diz que isso fica na Agenda.
  // O equivalente real é a regra do servidor, conferida pela API ao lado da âncora positiva (a chamada feita continua visível).
  await conferir('sem botão de cancelar/reativar na tela; servidor recusa cancelar aula com presenças e remarca com remarcada_de', async () => {
    await page.getByRole('button', { name: 'Ver chamada', exact: true }).first().waitFor({ state: 'visible' });
    await visivel('Cancelar, remarcar e aula extra ficam na Agenda.').waitFor({ state: 'visible' });
    assert.equal(await page.getByRole('button', { name: /Cancelar aula|Reativar/ }).count(), 0);
    const r = await api('/aulas/' + aula.id, 'PATCH', { status: 'cancelada' });
    assert.equal(r.status, 409); assert.equal(r.corpo.detail, 'Aula já tem presenças');
    assert.equal((await api('/agenda?data=' + dia)).corpo.find(a => a.aula_id === aula.id).status, 'agendada');
    assert.equal((await api('/aulas/' + outra.id, 'PATCH', { status: 'agendada' })).status, 200);
    const re = await api('/aulas/' + outra.id, 'PATCH', { data: novoDia, hora_inicio: '12:00', hora_fim: '13:40', status: 'agendada' });
    assert.equal(re.status, 200);
    const au = (await api('/portal/estado')).corpo.aulas.find(a => a.id === outra.id);
    assert.equal(au.remarcada_de, segundoDia); assert.equal(au.data, novoDia);
  });
  const semAvisos = (await api('/semestres/atual')).corpo;
  dia = semAvisos.inicio; novoDia = new Date(Date.parse(dia) + 2 * 86400000).toISOString().slice(0, 10);
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
  await conferir('exclui atividades sem notas pela coluna da grade e pela lista do boletim', async () => {
    // A página foi recarregada nos passos de chamada: reaponta a seleção para a disciplina própria.
    await preparar("logic.setState({ tela: 'disciplinas', selDisc: arg.disc.id, notaDisc: arg.disc.id, subAba: 'notas', gnCol: null });");
    await page.locator('[role=columnheader]', { hasText: 'Lista A F3b' }).first().click();
    await agirUI('/avaliacoes/' + p1.id, 'DELETE', () => page.getByRole('button', { name: 'Excluir atividade', exact: true }).click());
    assert.deepEqual((await extrasDe()).map(a => a.id), [p2.id]);
    await preparar("logic.setState({ tela: 'boletim', selDisc: arg.disc.id, notaDisc: arg.disc.id });");
    await agir('/avaliacoes/' + p2.id, 'DELETE', 'await logic.renderVals().avalLista.find(a => a.nome === "Lista B F3b").excluir();');
    assert.deepEqual(await extrasDe(), []);
  });
  await conferir('Carlos escreve nota e chamada na sua disciplina própria; servidor recusa escritas na de Marta com 403', async () => {
    const v = await api(`/disciplinas/${disc.id}/avaliacoes`, 'POST', { nome: 'Professor F3b', periodo_id: await periodoAtual() }); assert.equal(v.status, 201);
    await logic('logic.sair();'); await entrar('prof@escola.com');
    await preparar("logic.setState({ tela: 'disciplinas', selDisc: arg.disc.id, subAba: 'notas' });");
    await logic('logic.setState({ gnDraft: { [arg]: "9" } });', aluno.id + '-' + v.corpo.id);
    await agir(`/avaliacoes/${v.corpo.id}/notas/${aluno.id}`, 'PUT', 'await logic.salvarNotaGrade(arg, "Aluno", "Professor F3b");', aluno.id + '-' + v.corpo.id);
    assert.equal((await boletim()).notas.find(n => n.avaliacao.id === v.corpo.id).valor, 9);
    // Chamada pela interface do professor, na página da disciplina: revisa a chamada da escola marcando todos presentes.
    await abrirChamadas();
    await page.getByRole('button', { name: 'Ver chamada', exact: true }).first().click();
    await painelChamada().getByRole('button', { name: 'Todos presentes', exact: true }).click();
    await agirUI(`/disciplinas/${disc.id}/chamada`, 'PUT', () => painelChamada().getByRole('button', { name: 'Salvar alterações', exact: true }).click());
    assert.deepEqual(porAluno((await api(`/disciplinas/${disc.id}/chamada?data=${dia}`)).corpo), porAluno([{ aluno_id: aluno.id, presente: true }, { aluno_id: colega.id, presente: true }]));
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
    assert.equal((await boletim()).notas.find(n => n.avaliacao.id === v.corpo.id).valor, 9);
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser && disc) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  const caminhos = [...avisos].map(id => '/avisos/' + id);
  let ficou = false; // a API recusa excluir disciplina e aluno com nota ou chamada: o histórico fica até o reseed
  if (disc) caminhos.push('/disciplinas/' + disc.id);
  for (const a of [aluno, colega]) if (a) caminhos.push('/alunos/' + a.id);
  for (const caminho of caminhos) {
    try {
      const r = await api(caminho, 'DELETE');
      if (r.status === 409 && /notas ou (chamadas|presenças)/.test(r.corpo.detail || '')) {
        ficou = true; console.log('Fica até o reseed (tem chamada lançada): ' + caminho);
        // Solta o professor para o horário da disciplina não bloquear a próxima rodada.
        if (caminho.startsWith('/disciplinas/')) await api(caminho, 'PATCH', { professor_id: null });
      } else if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
    } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
  }
  if (seed && !ficou) {
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
