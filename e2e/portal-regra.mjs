// Update 4: regra de avaliação, atividade extra, publicação de nota, período fechado e conselho de classe, pela interface e pela API.
// Usa os serviços em execução (API_URL e FRONT_URL; padrão 8000 e 5173) e escreve em registros próprios.
// A regra da escola é restaurada no fim; disciplina e alunos com nota ficam até o reseed, como nos outros e2e.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const API = process.env.API_URL || 'http://localhost:8000', FRONT = process.env.FRONT_URL || 'http://localhost:5173', sufixo = Date.now();
let browser, token, disc, aluno, colega, contaAluno, regraOriginal;
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
const logar = async (email, senha = 'escola123') => { const r = await api('/auth/login', 'POST', { email, senha }, null); assert.equal(r.status, 200, 'login ' + email); return r.corpo.access_token; };
try {
  let tokenProf, periodoAtual, avaliacoes;
  await conferir('prepara disciplina de Carlos, dois alunos (um com acesso) e a regra original', async () => {
    token = await logar('escola@escola.com'); tokenProf = await logar('prof@escola.com');
    const r = await api('/regra-avaliacao'); assert.equal(r.status, 200); regraOriginal = r.corpo;
    assert.ok(regraOriginal.periodos.length >= 2 && regraOriginal.itens.length >= 1);
    const hoje = new Date().toISOString().slice(0, 10);
    periodoAtual = regraOriginal.periodos.find(p => p.inicio <= hoje && hoje <= p.fim) || regraOriginal.periodos[0];
    const professores = await api('/professores'); const carlos = professores.corpo.find(p => p.email === 'prof@escola.com'); assert.ok(carlos);
    const d = await api('/disciplinas', 'POST', { nome: 'Regra E2E ' + sufixo, carga_horaria: 40, professor_id: carlos.id });
    if (d.status === 201) disc = d.corpo; assert.equal(d.status, 201);
    const email = 'regra.' + sufixo + '@escola.com';
    for (const [i, nome] of ['Aluno', 'Colega'].entries()) {
      const a = await api('/alunos', 'POST', { nome: nome + ' Regra ' + sufixo, idade: 20, matricula: 'R4-' + sufixo + '-' + i, ...(i === 0 ? { email } : {}) });
      if (a.status === 201) { if (i === 0) aluno = a.corpo; else colega = a.corpo; }
      assert.equal(a.status, 201);
      assert.equal((await api(`/alunos/${a.corpo.id}/matricular/${disc.id}`, 'POST')).status, 201);
    }
    // o aluno entra com a senha definitiva (a provisória é trocada pela API)
    const prov = await api('/auth/login', 'POST', { email, senha: aluno.senha_provisoria_texto }, null); assert.equal(prov.status, 200);
    assert.equal((await api('/auth/trocar-senha', 'POST', { senha_atual: aluno.senha_provisoria_texto, senha_nova: 'escola1234' }, prov.corpo.access_token)).status, 200);
    contaAluno = { email, senha: 'escola1234' };
    avaliacoes = (await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo; assert.ok(avaliacoes.length > 0);
  });
  const obrig = (periodo, item) => avaliacoes.find(a => a.tipo === 'obrigatoria' && a.periodo_id === periodo && a.item_id === item);
  const listar = async () => (await api(`/disciplinas/${disc.id}/avaliacoes`)).corpo;

  browser = await chromium.launch({ channel: 'msedge' });
  const gancho = process.env.E2E_GANCHO ? await import(pathToFileURL(process.env.E2E_GANCHO).href) : null; // só para preparar o contexto em testes do próprio teste
  const contexto = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  if (gancho?.preparar) await gancho.preparar(contexto);
  const page = await contexto.newPage();
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const respostas = [], erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('response', r => { if (r.url().startsWith(API)) respostas.push({ caminho: new URL(r.url()).pathname, metodo: r.request().method(), status: r.status(), pedido: r.request().postDataJSON() }); });
  async function logic(codigo, arg) {
    return page.evaluate(async ({ codigo, arg }) => {
      const host = document.querySelector('[data-sc-name="Portal Escolar"]');
      let fiber = host[Object.keys(host).find(k => k.startsWith('__reactFiber$'))];
      while (!fiber.stateNode?.logic) fiber = fiber.return;
      return await new Function('logic', 'arg', 'return (async () => {' + codigo + '})();')(fiber.stateNode.logic, arg);
    }, { codigo, arg });
  }
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  async function entrar(email, senha = 'escola123') {
    await page.goto(FRONT + '/login');
    const form = page.locator('form').filter({ visible: true });
    await form.getByLabel('E-mail', { exact: true }).fill(email);
    await form.getByLabel('Senha', { exact: true }).fill(senha);
    await form.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.getByRole('button', { name: 'Menu do usuário' }).waitFor({ state: 'visible' });
  }
  const sair = async () => { await logic('logic.sair();'); };
  // Espera a escrita pedida e devolve o pedido e o status; a ação é um clique ou uma chamada da lógica.
  async function escrever(caminho, metodo, status, executar) {
    const resposta = page.waitForResponse(r => r.url() === API + caminho && r.request().method() === metodo);
    resposta.catch(() => {});
    await executar();
    const r = await resposta;
    assert.equal(r.status(), status, metodo + ' ' + caminho + ' ' + (await r.text()).slice(0, 200));
    return r.request().postDataJSON();
  }
  const aba = nome => page.locator('[data-sc-name="GradeAgenda"]').getByRole('tab', { name: nome, exact: true });
  const grupo = nome => page.getByRole('group', { name: nome, exact: true });

  await conferir('escola muda a média mínima na regra, salva, recarrega e o valor persiste', async () => {
    await entrar('escola@escola.com');
    await page.goto(FRONT + '/agenda');
    await aba('Avaliação').click();
    const antes = regraOriginal.mediaMin, esperado = Math.round((antes + 0.5) * 2) / 2;
    await grupo('Média mínima').getByRole('button', { name: 'Aumentar', exact: true }).click();
    await grupo('Média mínima').getByText(String(esperado).replace('.', ','), { exact: true }).waitFor({ state: 'visible' });
    const corpo = await escrever('/regra-avaliacao', 'PUT', 200, () => page.getByRole('button', { name: 'Salvar regra', exact: true }).click());
    assert.equal(corpo.mediaMin, esperado);
    assert.equal((await api('/regra-avaliacao')).corpo.mediaMin, esperado);
    await page.reload(); await aba('Avaliação').click();
    await grupo('Média mínima').getByText(String(esperado).replace('.', ','), { exact: true }).waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.regra.mediaMin;'), esperado);
    // o servidor recusa regra inválida e a mensagem dele chega à tela
    const recusa = await logic('try { await logic.salvarRegraEscola({ ...logic.state.regra, mediaMin: 11 }); return null; } catch (e) { return e.texto; }');
    assert.equal(recusa, 'A média mínima deve estar entre 0 e 10.');
    assert.equal((await api('/regra-avaliacao')).corpo.mediaMin, esperado);
    // volta ao valor original
    assert.equal((await api('/regra-avaliacao', 'PUT', regraOriginal)).status, 200);
  });

  let extra;
  await conferir('Carlos cria atividade extra, lança nota e publica pela grade da turma', async () => {
    await sair(); await entrar('prof@escola.com');
    await page.goto(FRONT + '/alunos');
    await page.getByRole('button', { name: /^Sem turma/ }).click();
    await visivel(disc.nome).first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: /^Atividade extra/ }).click();
    await page.getByLabel('Nome da atividade', { exact: true }).fill('Lista E2E');
    const corpo = await escrever(`/disciplinas/${disc.id}/avaliacoes`, 'POST', 201, () => page.getByRole('button', { name: 'Criar', exact: true }).click());
    assert.deepEqual(corpo, { nome: 'Lista E2E', periodo_id: periodoAtual.id });
    extra = (await listar()).find(a => a.nome === 'Lista E2E'); assert.ok(extra); assert.equal(extra.tipo, 'extra'); assert.equal(extra.publicada, false);
    // nota no campo da grade: digita e sai do campo
    const campo = page.getByLabel('Nota de ' + aluno.nome + ' em Lista E2E', { exact: true });
    await campo.fill('8');
    const nota = await escrever(`/avaliacoes/${extra.id}/notas/${aluno.id}`, 'PUT', 204, () => campo.press('Tab'));
    assert.deepEqual(nota, { valor: 8 });
    // a obrigatória P1 do período também recebe nota, que fica em rascunho
    const p1 = obrig(periodoAtual.id, regraOriginal.itens[0].id), campoP1 = page.getByLabel('Nota de ' + aluno.nome + ' em ' + p1.nome, { exact: true });
    await campoP1.fill('3');
    await escrever(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', 204, () => campoP1.press('Tab'));
    // publicar lançadas: só as que têm nota; o rascunho da atividade passa a publicada
    const pub = await escrever(`/disciplinas/${disc.id}/avaliacoes/publicar`, 'POST', 200, () => page.getByRole('button', { name: 'Publicar lançadas', exact: true }).click());
    assert.deepEqual(pub, { periodo_id: periodoAtual.id });
    const depois = await listar();
    assert.equal(depois.find(a => a.id === extra.id).publicada, true); assert.equal(depois.find(a => a.id === p1.id).publicada, true);
    // volta a P1 para rascunho pela coluna: PATCH com publicada falso
    await page.locator('[role=columnheader]', { hasText: p1.nome }).first().click();
    const rasc = await escrever(`/avaliacoes/${p1.id}`, 'PATCH', 200, () => page.getByRole('switch').click());
    assert.deepEqual(rasc, { publicada: false });
    assert.equal((await listar()).find(a => a.id === p1.id).publicada, false);
    // prazo da atividade: PATCH com a data
    await page.locator('[role=columnheader]', { hasText: 'Lista E2E' }).first().click();
    const prazo = await escrever(`/avaliacoes/${extra.id}`, 'PATCH', 200, () => page.getByLabel('Prazo de lançamento', { exact: true }).fill('2026-12-01'));
    assert.deepEqual(prazo, { prazo: '2026-12-01' });
    // excluir atividade com nota: a tela já avisa sem chamar o servidor; se a tela estiver desatualizada, o servidor recusa e a mensagem dele aparece
    const antes = respostas.length;
    await page.getByRole('button', { name: 'Excluir atividade', exact: true }).click();
    await visivel('Lista E2E já tem notas: não dá para excluir.').waitFor({ state: 'visible' });
    assert.equal(respostas.slice(antes).some(r => r.metodo === 'DELETE'), false);
    await escrever(`/avaliacoes/${extra.id}`, 'DELETE', 409, () => logic('await logic.apagarAvalGrade({ id: arg, nome: "Lista E2E" });', extra.id));
    await visivel('Só dá para excluir atividade sem notas.').waitFor({ state: 'visible' });
    assert.equal((await listar()).some(a => a.id === extra.id), true);
  });

  await conferir('aluno só vê a atividade publicada e a nota dela', async () => {
    // pela API: nenhuma avaliação em rascunho e nenhuma nota delas chega ao aluno
    const tokenAluno = await logar(contaAluno.email, contaAluno.senha);
    const estado = await api('/portal/estado', 'GET', undefined, tokenAluno); assert.equal(estado.status, 200);
    const deles = estado.corpo.avaliacoes.filter(a => a.disciplina_id === disc.id);
    assert.ok(deles.length > 0 && deles.every(a => a.publicada), 'só publicadas');
    const ocultas = (await listar()).filter(a => !a.publicada).map(a => a.id);
    assert.ok(ocultas.length > 0, 'há rascunhos no servidor');
    assert.ok(deles.some(a => a.id === extra.id) && deles.every(a => !ocultas.includes(a.id)));
    assert.ok(estado.corpo.notas.every(n => !ocultas.includes(n.avaliacao_id)), 'nenhuma nota de rascunho chega ao aluno');
    // pela tela
    await sair(); await entrar(contaAluno.email, contaAluno.senha);
    await page.getByText('Meu painel', { exact: true }).first().waitFor({ state: 'visible' });
    await page.getByText('Lista E2E').first().waitFor({ state: 'visible' });
    const nomeP1 = obrig(periodoAtual.id, regraOriginal.itens[0].id).nome;
    assert.equal(await page.getByText(nomeP1, { exact: true }).filter({ visible: true }).count(), 0, nomeP1 + ' em rascunho não aparece para o aluno');
  });

  await conferir('média e situação do canvas coincidem com o boletim do servidor em dois casos', async () => {
    await sair(); await entrar('escola@escola.com');
    const p1 = obrig(periodoAtual.id, regraOriginal.itens[0].id);
    const comparar = async rotulo => {
      await logic('await logic.recarregar();');
      const b = (await api(`/alunos/${aluno.id}/boletim`)).corpo.find(x => x.disciplina.id === disc.id); assert.ok(b, rotulo);
      const js = await logic('const x = logic.mediaAno(arg.a, arg.d, false), s = logic.situacaoDisc(arg.a, arg.d); return { m: x && x.m, parcial: x && x.parcial, sit: s.t };', { a: aluno.id, d: disc.id });
      assert.equal(js.m, b.media, rotulo + ': média'); assert.equal(js.sit, b.situacao, rotulo + ': situação');
      return js;
    };
    // caso 1: P1 = 3 e atividade = 8 (peso da regra): média simples ponderada
    const c1 = await comparar('caso 1');
    // caso 2: recuperação 7 no período (modo da regra) muda a média
    const rec = (await listar()).find(a => a.tipo === 'recuperacao' && a.periodo_id === periodoAtual.id);
    if (rec) { assert.equal((await api(`/avaliacoes/${rec.id}/notas/${aluno.id}`, 'PUT', { valor: 7 })).status, 204); }
    const c2 = await comparar('caso 2');
    if (rec) assert.notEqual(c2.m, c1.m);
  });

  await conferir('escola fecha o período e a nota nele é recusada com a mensagem do servidor', async () => {
    await page.goto(FRONT + '/agenda'); await aba('Avaliação').click();
    await page.getByRole('button', { name: 'Fechar período', exact: true }).nth(regraOriginal.periodos.findIndex(p => p.id === periodoAtual.id)).click();
    const corpo = await escrever('/regra-avaliacao', 'PUT', 200, () => page.getByRole('button', { name: 'Salvar regra', exact: true }).click());
    const fechado = corpo.periodos.find(p => p.id === periodoAtual.id); assert.equal(fechado.fechado, true);
    const p1 = obrig(periodoAtual.id, regraOriginal.itens[0].id);
    const r = await api(`/avaliacoes/${p1.id}/notas/${aluno.id}`, 'PUT', { valor: 9 });
    assert.equal(r.status, 409); assert.equal(r.corpo.detail, 'Período fechado pela escola: notas travadas.');
    // Carlos vê o período travado e, se o campo ainda estiver aberto na tela, a recusa chega em linha
    await sair(); await entrar('prof@escola.com');
    await page.goto(FRONT + '/alunos'); await page.getByRole('button', { name: /^Sem turma/ }).click();
    await visivel(periodoAtual.nome + ' fechado pela escola: notas travadas.').first().waitFor({ state: 'visible' });
    await logic('logic.setState({ gnDraft: { [arg.k]: "9" } }); await logic.salvarNotaGrade(arg.k, "Aluno", "P1");', { k: aluno.id + '-v' + disc.id + '_' + periodoAtual.id + '_' + regraOriginal.itens[0].id });
    assert.deepEqual(await logic('return logic.state.gnMsg;'), { erro: true, t: 'Período fechado pela escola: notas travadas.' });
    assert.notEqual((await api(`/avaliacoes/${p1.id}/notas/${aluno.id}`)).status, 200);
    // reabre para o resto do percurso
    assert.equal((await api('/regra-avaliacao', 'PUT', regraOriginal)).status, 200);
  });

  await conferir('aprovar pelo conselho muda a situação do aluno e desfazer volta', async () => {
    const p1 = obrig(periodoAtual.id, regraOriginal.itens[0].id);
    assert.equal((await api(`/avaliacoes/${p1.id}/notas/${colega.id}`, 'PUT', { valor: 2 })).status, 204);
    await sair(); await entrar('escola@escola.com');
    await page.goto(FRONT + '/disciplinas');
    await page.getByRole('listbox', { name: 'Disciplinas', exact: true }).getByText(disc.nome, { exact: true }).first().click();
    await page.getByRole('tab', { name: /^Avaliações e notas/ }).click();
    await page.getByRole('tab', { name: /^Resultado do ano/ }).click();
    const linha = page.locator('[role=row]', { hasText: colega.nome });
    const situacao = () => api(`/alunos/${colega.id}/boletim`).then(r => r.corpo.find(x => x.disciplina.id === disc.id).situacao);
    const emConselho = async () => (await api('/portal/estado')).corpo.conselho.some(c => c.aluno_id === colega.id && c.disciplina_id === disc.id);
    const situacaoAntes = await situacao();
    assert.equal(situacaoAntes, 'Prova final'); assert.equal(await emConselho(), false);
    await linha.getByText('Prova final', { exact: true }).first().waitFor({ state: 'visible' });
    await escrever(`/disciplinas/${disc.id}/conselho/${colega.id}`, 'POST', 204, () => linha.getByRole('button', { name: 'Aprovar pelo conselho', exact: true }).click());
    await linha.getByText('Aprovado pelo conselho', { exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await situacao(), 'Aprovado pelo conselho'); assert.equal(await emConselho(), true);
    await escrever(`/disciplinas/${disc.id}/conselho/${colega.id}`, 'DELETE', 204, () => linha.getByRole('button', { name: 'Desfazer', exact: true }).click());
    await linha.getByText('Prova final', { exact: true }).first().waitFor({ state: 'visible' });
    assert.equal(await situacao(), situacaoAntes); assert.equal(await emConselho(), false);
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser && disc) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  try { if (regraOriginal) assert.equal((await api('/regra-avaliacao', 'PUT', regraOriginal)).status, 200); }
  catch (erro) { limpou = false; console.error('FALHOU restaurar a regra\n' + erro.stack); }
  // a API recusa excluir disciplina e aluno com nota ou chamada: ficam até o reseed
  const caminhos = [];
  if (disc) caminhos.push('/disciplinas/' + disc.id);
  for (const a of [aluno, colega]) if (a) caminhos.push('/alunos/' + a.id);
  for (const caminho of caminhos) {
    try {
      const r = await api(caminho, 'DELETE');
      if (r.status === 409) {
        console.log('Fica até o reseed (tem nota ou chamada): ' + caminho);
        if (caminho.startsWith('/disciplinas/')) await api(caminho, 'PATCH', { professor_id: null });
      } else if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
    } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' restauração da regra e limpeza dos registros próprios');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
