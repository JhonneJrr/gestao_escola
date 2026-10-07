// Usa API e Vite já em execução; só as escritas de semestre são simuladas.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173';
const sufixo = Date.now(), emailProf = `portal-e2e-${sufixo}@escola.com`;
let browser, token, professorCriado;
const alunos = new Set(), disciplinas = new Set(), matriculas = new Set();
async function api(caminho, method = 'GET', corpo) {
  const resposta = await fetch(API + caminho, {
    method, headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  return { status: resposta.status, corpo: resposta.status === 204 ? null : await resposta.json() };
}
async function conferir(nome, fn) {
  try { await fn(); console.log('OK ' + nome); }
  catch (erro) { console.error('FALHOU ' + nome + '\n' + erro.stack); throw erro; }
}
try {
  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  // Registra IDs assim que a API responde, mesmo se uma checagem posterior falhar.
  page.on('response', async r => {
    const caminho = new URL(r.url()).pathname;
    if (r.request().method() !== 'POST' || r.status() !== 201) return;
    if (caminho === '/alunos') alunos.add((await r.json()).id);
    if (caminho === '/disciplinas') disciplinas.add((await r.json()).id);
    if (caminho === '/professores') professorCriado = (await r.json()).id;
    if (/^\/alunos\/\d+\/matricular\/\d+$/.test(caminho)) matriculas.add(caminho);
  });
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  const botao = nome => page.getByRole('button', { name: nome, exact: true }).filter({ visible: true });
  const form = () => page.locator('form').filter({ visible: true });
  async function logic(codigo, arg) {
    return page.evaluate(async ({ codigo, arg }) => {
      const host = document.querySelector('[data-sc-name="Portal Escolar"]');
      let fiber = host[Object.keys(host).find(k => k.startsWith('__reactFiber$'))];
      while (!fiber.stateNode?.logic) fiber = fiber.return;
      return await new Function('logic', 'arg', codigo)(fiber.stateNode.logic, arg);
    }, { codigo, arg });
  }
  async function resposta(caminho, method, agir) {
    const espera = page.waitForResponse(r => r.url() === API + caminho && r.request().method() === method);
    const [r] = await Promise.all([espera, agir()]);
    const corpo = r.status() === 204 ? null : await r.json();
    return { status: r.status(), corpo, pedido: r.request().postDataJSON() };
  }
  async function senha(corpo, email) {
    assert.ok(corpo.senha_provisoria_texto, 'resposta deve conter senha provisória');
    await visivel(corpo.senha_provisoria_texto).waitFor({ state: 'visible' });
    assert.equal((await api('/auth/login', 'POST', { email, senha: corpo.senha_provisoria_texto })).status, 200);
  }
  async function abrirAluno(nome) {
    await page.keyboard.press('Alt+5');
    await page.getByLabel('Buscar', { exact: true }).fill(nome);
    await visivel(nome).first().click();
    await botao('Editar').waitFor({ state: 'visible' });
  }
  async function criarAluno(nome, email, matricula) {
    await page.keyboard.press('Alt+5');
    await botao('Novo aluno').click();
    await form().getByLabel('Nome', { exact: true }).fill(nome);
    await form().getByLabel('Idade', { exact: true }).fill('20');
    await form().getByLabel('Matrícula', { exact: true }).fill(matricula);
    if (email) await form().getByLabel(/^E-mail de acesso · opcional/).fill(email);
    const r = await resposta('/alunos', 'POST', () => botao('Cadastrar aluno').click());
    assert.equal(r.status, 201); alunos.add(r.corpo.id);
    if (email) { await senha(r.corpo, email); await botao('Concluir').click(); }
    else {
      await botao('Cadastrar aluno').waitFor({ state: 'hidden' });
      assert.equal(r.corpo.nome, nome);
      assert.equal(r.corpo.senha_provisoria_texto, undefined);
    }
    return r.corpo;
  }
  async function editarAluno(nome, novoNome, email) {
    await abrirAluno(nome); await botao('Editar').click();
    await form().getByLabel('Nome', { exact: true }).fill(novoNome);
    if (email) await form().getByLabel(/^E-mail de acesso · opcional/).fill(email);
  }

  await conferir('login da escola e recarregamento conserva seleções e interface', async () => {
    await page.goto(FRONT + '/login');
    await form().getByLabel('E-mail', { exact: true }).fill('escola@escola.com');
    await form().getByLabel('Senha', { exact: true }).fill('escola123');
    assert.equal((await resposta('/auth/login', 'POST', () => form().getByRole('button', { name: 'Entrar', exact: true }).click())).status, 200);
    await botao('Menu do usuário').waitFor({ state: 'visible' });
    token = await page.evaluate(() => localStorage.getItem('portal.token'));
    assert.ok(token);
    const antes = await logic(`
      const st = logic.state, d = st.discs.find(d => st.avals.some(a => a.did === d.id) && d.id !== st.discs[0].id);
      const ui = { selAluno: st.alunos[1].id, selDisc: d.id, notaDisc: d.id, notaAval: st.avals.find(a => a.did === d.id).id,
        matAluno: String(st.alunos[1].id), matDisc: String(d.id), tela: 'disciplinas', subAba: 'notas', discQ: 'Python', pagina: 2, painel: { tipo: 'disc', did: d.id } };
      logic.setState(ui); return ui;
    `);
    await logic('return logic.recarregar();');
    assert.deepEqual(await logic('return Object.fromEntries(Object.keys(arg).map(k => [k, logic.state[k]]));', antes), antes);
    await logic("logic.fecharPainel(); logic.setState({ discQ: '', pagina: 1, subAba: 'alunos' });");
  });

  let prof, comEmail, semEmail, disc;
  const nomeProf = 'Professor F3a ' + sufixo, nomeAluno = 'Aluno F3a ' + sufixo;
  const nomeSemEmail = 'Aluno sem acesso F3a ' + sufixo, nomeEditado = nomeAluno + ' editado';
  const emailAluno = `aluno-f3a-${sufixo}@escola.com`, emailNovo = `acesso-f3a-${sufixo}@escola.com`;
  const estadoInicial = (await api('/portal/estado')).corpo;
  let mat = 1000000 + sufixo % 8000000;
  while (estadoInicial.alunos.some(a => [String(mat), String(mat + 1)].includes(a.matricula))) mat += 2;

  await conferir('cria um professor pela UI com senha do servidor válida', async () => {
    await page.keyboard.press('Alt+4'); await botao('Novo professor').click();
    await form().getByLabel('Nome', { exact: true }).fill(nomeProf);
    await form().getByLabel('E-mail', { exact: true }).fill(emailProf);
    const r = await resposta('/professores', 'POST', () => botao('Criar conta do professor').click());
    assert.equal(r.status, 201); prof = r.corpo; professorCriado = prof.id;
    await senha(prof, emailProf); await botao('Concluir').click();
    await visivel(nomeProf).waitFor({ state: 'visible' });
    assert.ok((await api('/professores')).corpo.some(p => p.id === prof.id && p.email === emailProf));
  });
  await conferir('redefine senha do professor de teste pela UI', async () => {
    const linha = visivel(emailProf).locator('xpath=ancestor::div[1]');
    const r = await resposta(`/professores/${prof.id}/redefinir-senha`, 'POST', () => linha.getByRole('button', { name: 'Redefinir senha' }).click());
    assert.equal(r.status, 200); assert.equal(r.pedido, null);
    await senha(r.corpo, emailProf); await botao('Concluir').click();
    assert.equal((await api('/auth/login', 'POST', { email: emailProf, senha: prof.senha_provisoria_texto })).status, 401);
  });
  await conferir('cria aluno com e-mail e aluno sem e-mail pela UI', async () => {
    comEmail = await criarAluno(nomeAluno, emailAluno, String(mat));
    semEmail = await criarAluno(nomeSemEmail, null, String(mat + 1));
    const st = (await api('/portal/estado')).corpo;
    assert.ok(st.alunos.some(a => a.id === comEmail.id && a.email === emailAluno));
    assert.ok(st.alunos.some(a => a.id === semEmail.id && a.email === null));
  });
  await conferir('edita nome do aluno e confere GET; redefinição vem do servidor', async () => {
    await editarAluno(nomeAluno, nomeEditado);
    const r = await resposta(`/alunos/${comEmail.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 200);
    assert.equal((await api(`/alunos/${comEmail.id}`)).corpo.nome, nomeEditado);
    await visivel(nomeEditado).last().waitFor({ state: 'visible' });
    const reset = await resposta(`/alunos/${comEmail.id}/redefinir-senha`, 'POST', () => botao('Redefinir senha').click());
    assert.equal(reset.status, 200); await senha(reset.corpo, emailAluno);
    await page.keyboard.press('Escape');
  });
  await conferir('PATCH cria e troca acesso, exibindo senha provisória real', async () => {
    await editarAluno(nomeSemEmail, nomeSemEmail, emailNovo);
    let r = await resposta(`/alunos/${semEmail.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 200); await senha(r.corpo, emailNovo); await page.keyboard.press('Escape');
    await editarAluno(nomeSemEmail, nomeSemEmail, emailNovo.replace('acesso-', 'trocado-'));
    r = await resposta(`/alunos/${semEmail.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 200); await senha(r.corpo, emailNovo.replace('acesso-', 'trocado-')); await page.keyboard.press('Escape');
  });
  await conferir('erro real da API aparece no mesmo campo do formulário', async () => {
    await editarAluno(nomeSemEmail, nomeSemEmail, emailProf);
    const r = await resposta(`/alunos/${semEmail.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 409);
    await form().getByRole('alert').filter({ hasText: r.corpo.detail }).waitFor({ state: 'visible' });
    assert.equal(await botao('Salvar').isVisible(), true);
    assert.equal((await api('/portal/estado')).corpo.alunos.find(a => a.id === semEmail.id).email, emailNovo.replace('acesso-', 'trocado-'));
    await page.keyboard.press('Escape');
  });

  const nomeDisc = 'Disciplina F3a ' + sufixo;
  const grade = [{ dia_semana: 6, hora_inicio: '20:00', hora_fim: '21:00' }, { dia_semana: 7, hora_inicio: '20:00', hora_fim: '21:00' }];
  await conferir('cria disciplina com professor e dois horários; usa aulas_geradas do PUT', async () => {
    await page.keyboard.press('Alt+3'); await botao('Nova disciplina').click();
    await form().getByLabel('Nome', { exact: true }).fill(nomeDisc);
    await form().getByLabel('Carga horária (h)', { exact: true }).fill('40');
    await form().getByRole('radio', { name: nomeProf }).click();
    await botao('Adicionar horário').click();
    for (let i = 0; i < grade.length; i++) {
      await form().getByLabel('Dia da semana', { exact: true }).nth(i).selectOption(String(grade[i].dia_semana));
      await form().getByLabel('Início', { exact: true }).nth(i).fill(grade[i].hora_inicio);
      await form().getByLabel('Fim', { exact: true }).nth(i).fill(grade[i].hora_fim);
    }
    const put = page.waitForResponse(r => /\/disciplinas\/\d+\/grade$/.test(r.url()) && r.request().method() === 'PUT');
    const r = await resposta('/disciplinas', 'POST', () => botao('Criar disciplina').click());
    assert.equal(r.status, 201); disc = r.corpo; disciplinas.add(disc.id);
    const salvo = await put; assert.equal(salvo.status(), 200);
    assert.deepEqual(salvo.request().postDataJSON(), { itens: grade });
    const n = (await salvo.json()).aulas_geradas; assert.ok(n > 0);
    await page.getByRole('status').filter({ hasText: `${n} aulas geradas` }).waitFor({ state: 'visible' });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/grade`)).corpo, grade);
    const aulas = await api(`/disciplinas/${disc.id}/aulas`);
    assert.equal(aulas.status, 200); assert.equal(aulas.corpo.length, n);
    const st = (await api('/portal/estado')).corpo;
    assert.equal(st.disciplinas.find(d => d.id === disc.id).professor_id, prof.id);
    const geradas = st.aulas.filter(a => a.disciplina_id === disc.id);
    assert.equal(geradas.length, n);
    for (const a of geradas) {
      assert.equal(a.origem, 'grade'); assert.equal(a.status, 'agendada');
      assert.ok(a.data >= st.semestre.inicio && a.data <= st.semestre.fim);
      assert.ok(grade.some(g => g.dia_semana === (new Date(a.data + 'T12:00:00Z').getUTCDay() || 7) && g.hora_inicio === a.hora_inicio && g.hora_fim === a.hora_fim));
    }
    await botao('Fechar').click(); await visivel(nomeDisc).first().waitFor({ state: 'visible' });
  });
  await conferir('matricula pela disciplina, confere roster e desmatricula (204)', async () => {
    await page.getByRole('combobox', { name: 'Matricular aluno em ' + nomeDisc, exact: true }).selectOption(String(comEmail.id));
    const caminho = `/alunos/${comEmail.id}/matricular/${disc.id}`;
    const r = await resposta(caminho, 'POST', () => botao('Matricular').click());
    assert.equal(r.status, 201); assert.equal(r.pedido, null); matriculas.add(caminho);
    await visivel(`${nomeEditado} matriculado em ${nomeDisc}.`).waitFor({ state: 'visible' });
    assert.ok((await api(`/disciplinas/${disc.id}/alunos`)).corpo.some(a => a.id === comEmail.id));
    await botao(`Desmatricular ${nomeEditado} de ${nomeDisc}`).click();
    assert.equal((await resposta(caminho, 'DELETE', () => botao('Desmatricular').click())).status, 204);
    await visivel(`${nomeEditado} desmatriculado de ${nomeDisc}.`).waitFor({ state: 'visible' });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/alunos`)).corpo, []);
    assert.equal(await logic('return logic.state.selDisc;'), disc.id);
  });
  await conferir('matricula pelo aluno e mostra 409 do servidor em desmErro', async () => {
    await page.keyboard.press('Alt+6');
    await logic('logic.setState({ selAluno: arg });', comEmail.id);
    await page.getByRole('combobox', { name: 'Matricular em outra disciplina', exact: true }).selectOption(String(disc.id));
    const caminho = `/alunos/${comEmail.id}/matricular/${disc.id}`;
    assert.equal((await resposta(caminho, 'POST', () => botao('Matricular').click())).status, 201);
    await visivel(`${nomeEditado} matriculado em ${nomeDisc}.`).waitFor({ state: 'visible' });
    assert.ok((await api(`/disciplinas/${disc.id}/alunos`)).corpo.some(a => a.id === comEmail.id));
    // O banco permanece sem notas: simula apenas o conflito devolvido por DELETE.
    await page.route(API + caminho, async route => {
      if (route.request().method() === 'DELETE') await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: 'aluno já tem notas ou frequência' }) });
      else await route.continue();
    });
    await botao(`Desmatricular ${nomeEditado} de ${nomeDisc}`).click();
    assert.equal((await resposta(caminho, 'DELETE', () => botao('Desmatricular').click())).status, 409);
    await visivel('aluno já tem notas ou frequência').waitFor({ state: 'visible' });
    assert.ok((await api(`/disciplinas/${disc.id}/alunos`)).corpo.some(a => a.id === comEmail.id));
    await page.unroute(API + caminho);
    await botao(`Desmatricular ${nomeEditado} de ${nomeDisc}`).click();
    assert.equal((await resposta(caminho, 'DELETE', () => botao('Desmatricular').click())).status, 204);
    await visivel(`${nomeEditado} desmatriculado de ${nomeDisc}.`).waitFor({ state: 'visible' });
    assert.deepEqual((await api(`/disciplinas/${disc.id}/alunos`)).corpo, []);
  });
  await conferir('edita disciplina e troca professor; falha do PUT recarrega PATCH gravado', async () => {
    await page.keyboard.press('Alt+3'); await botao('Editar').click();
    const marta = estadoInicial.professores.find(p => p.email === 'marta@escola.com'); assert.ok(marta);
    await form().getByRole('radio', { name: marta.nome }).click();
    const caminho = `/disciplinas/${disc.id}`;
    const put = page.waitForResponse(r => r.url() === API + caminho + '/grade' && r.request().method() === 'PUT');
    assert.equal((await resposta(caminho, 'PATCH', () => botao('Salvar').click())).status, 200);
    assert.equal((await put).status(), 200);
    await page.getByRole('status').filter({ hasText: 'aulas geradas' }).waitFor({ state: 'visible' });
    assert.equal((await api('/portal/estado')).corpo.disciplinas.find(d => d.id === disc.id).professor_id, marta.id);
    await form().getByLabel('Nome', { exact: true }).fill(nomeDisc + ' editada');
    await page.route(API + caminho + '/grade', route => route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ detail: 'O fim deve ser depois do início' }) }));
    const falhou = page.waitForResponse(r => r.url() === API + caminho + '/grade' && r.request().method() === 'PUT');
    assert.equal((await resposta(caminho, 'PATCH', () => botao('Salvar').click())).status, 200);
    assert.equal((await falhou).status(), 422);
    await form().getByRole('alert').filter({ hasText: 'O fim deve ser depois do início' }).waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.discs.find(d => d.id === arg).nome;', disc.id), nomeDisc + ' editada');
    assert.equal((await api('/portal/estado')).corpo.disciplinas.find(d => d.id === disc.id).nome, nomeDisc + ' editada');
    await page.unroute(API + caminho + '/grade');
    const draft = nomeDisc + ' edição preservada';
    await form().getByLabel('Nome', { exact: true }).fill(draft);
    const detalhe = 'Choque de horário retornado pelo servidor.';
    for (const [rota, metodo] of [[caminho, 'PATCH'], [caminho + '/grade', 'PUT']]) {
      await page.route(API + rota, route => route.request().method() === metodo ? route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ detail: detalhe }) }) : route.continue());
      const falha = page.waitForResponse(r => r.url() === API + rota && r.request().method() === metodo);
      await botao('Salvar').click(); assert.equal((await falha).status(), 409);
      await form().getByRole('alert').filter({ hasText: detalhe }).waitFor({ state: 'visible' });
      assert.equal(await form().getByLabel('Nome', { exact: true }).inputValue(), draft);
      assert.equal(await botao('Salvar').isVisible(), true);
      assert.deepEqual(await logic('return logic.state.fGrade.map(({ dia_semana, hora_inicio, hora_fim }) => ({ dia_semana: +dia_semana, hora_inicio, hora_fim }));'), grade);
      await page.unroute(API + rota);
    }
    await page.keyboard.press('Escape');
  });
  await conferir('cria sem professor omitindo o campo e remove professor com null no PATCH', async () => {
    await botao('Editar').click();
    await form().getByRole('radio', { name: /^Sem professor/ }).click();
    const put = page.waitForResponse(r => r.url() === API + `/disciplinas/${disc.id}/grade` && r.request().method() === 'PUT');
    const r = await resposta(`/disciplinas/${disc.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 200); assert.equal(r.pedido.professor_id, null); await put;
    await botao('Fechar').click(); await botao('Nova disciplina').click();
    await form().getByLabel('Nome', { exact: true }).fill(nomeDisc + ' sem professor');
    await form().getByLabel('Carga horária (h)', { exact: true }).fill('20');
    await botao('Remover horário 1').click();
    const criada = await resposta('/disciplinas', 'POST', () => botao('Criar disciplina').click());
    assert.equal(criada.status, 201); disciplinas.add(criada.corpo.id);
    assert.deepEqual(criada.pedido, { nome: nomeDisc + ' sem professor', carga_horaria: 20 });
    await page.getByRole('status').filter({ hasText: 'Salvo. Sem grade, nenhuma aula foi gerada.' }).waitFor({ state: 'visible' });
    assert.equal((await api('/portal/estado')).corpo.disciplinas.find(d => d.id === criada.corpo.id).professor_id, null);
    await botao('Fechar').click();
    assert.equal((await resposta(`/disciplinas/${criada.corpo.id}`, 'DELETE', () => botao('Excluir disciplina').click())).status, 204);
    await visivel(nomeDisc + ' sem professor').first().waitFor({ state: 'hidden' });
    assert.ok(await logic('return logic.state.discs.some(d => d.id === arg);', disc.id));
    assert.equal(await logic('return logic.state.discs.some(d => d.id === arg);', criada.corpo.id), false);
  });
  await conferir('exclui disciplina e alunos; seleções inválidas caem no primeiro válido', async () => {
    await logic('logic.setState({ selDisc: arg, notaDisc: arg, notaAval: 999999, matDisc: String(arg) });', disc.id);
    await visivel(nomeDisc + ' editada').first().waitFor({ state: 'visible' });
    assert.equal((await resposta(`/disciplinas/${disc.id}`, 'DELETE', () => botao('Excluir disciplina').click())).status, 204);
    await page.waitForFunction(() => !document.body.textContent.includes('Disciplina F3a'));
    const st = await logic('return { selDisc: logic.state.selDisc, notaDisc: logic.state.notaDisc, matDisc: logic.state.matDisc, primeiro: logic.state.discs[0].id };');
    assert.equal(st.selDisc, st.primeiro); assert.equal(st.notaDisc, st.primeiro); assert.equal(st.matDisc, String(st.primeiro));
    assert.ok((await api('/portal/estado')).corpo.disciplinas.length > 0);
    assert.equal((await api(`/disciplinas/${disc.id}/grade`)).status, 404);
    for (const a of [{ id: comEmail.id, nome: nomeEditado }, { id: semEmail.id, nome: nomeSemEmail }]) {
      await abrirAluno(a.nome);
      await logic('logic.setState({ selAluno: arg, matAluno: String(arg) });', a.id);
      const painel = page.getByRole('dialog').filter({ visible: true });
      await painel.getByText(a.nome, { exact: true }).waitFor({ state: 'visible' });
      assert.equal((await resposta(`/alunos/${a.id}`, 'DELETE', () => painel.getByRole('button', { name: 'Excluir aluno', exact: true }).click())).status, 204);
      await botao('Editar').waitFor({ state: 'hidden' });
      const selecao = await logic('return { selAluno: logic.state.selAluno, matAluno: logic.state.matAluno, primeiro: logic.state.alunos[0].id };');
      assert.equal(selecao.selAluno, selecao.primeiro); assert.equal(selecao.matAluno, String(selecao.primeiro));
      assert.ok((await api('/portal/estado')).corpo.alunos.length > 0);
      assert.equal((await api(`/alunos/${a.id}`)).status, 404);
    }
  });
  await conferir('semestre: POSTs simulados por page.route, sem escrita no banco', async () => {
    await page.keyboard.press('Alt+2');
    const sem = (await api('/portal/estado')).corpo.semestre; assert.ok(sem && !sem.encerrado_em);
    const semestresAntes = await api('/semestres'); assert.equal(semestresAntes.status, 200);
    const dadosAntes = await logic('return { semestre: logic.state.semestre, historico: logic.state.historico, discs: logic.state.discs, alunos: logic.state.alunos, mats: logic.state.mats, avals: logic.state.avals, notas: logic.state.notas, aulas: logic.state.aulas, avisos: logic.state.avisos, profs: logic.state.profs };');
    const caminho = `/semestres/${sem.id}/encerrar`;
    await page.route(API + caminho, async route => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...sem, encerrado_em: '2026-10-06T12:00:00' }) });
      else await route.continue();
    });
    await botao('Encerrar semestre').click();
    const recarregouEncerrar = page.waitForResponse(r => r.url() === API + '/portal/estado' && r.request().method() === 'GET');
    const r = await resposta(caminho, 'POST', () => page.getByRole('alertdialog').getByRole('button', { name: 'Encerrar semestre', exact: true }).click());
    assert.equal(r.status, 200); assert.equal(r.pedido, null);
    const estadoEncerrar = await recarregouEncerrar; assert.equal(estadoEncerrar.status(), 200);
    assert.deepEqual((await estadoEncerrar.json()).semestre, sem);
    await page.getByRole('alertdialog').waitFor({ state: 'hidden' });
    // O GET real continua ativo: a resposta da escrita não pode fabricar dados locais.
    await botao('Encerrar semestre').waitFor({ state: 'visible' });
    assert.equal(await logic('return logic.state.semestre.encerrado_em;'), null);
    assert.deepEqual(await logic('return Object.fromEntries(Object.keys(arg).map(k => [k, logic.state[k]]));', dadosAntes), dadosAntes);
    // Pré-condição só da UI para alcançar o formulário; nenhuma escrita/GET é simulado aqui.
    await logic("logic.setState({ semestre: { ...logic.state.semestre, encerrado_em: '2026-10-06' } });");
    await form().getByLabel('Nome', { exact: true }).fill('Semestre F3a ' + sufixo);
    await form().getByLabel('Início', { exact: true }).fill('2027-02-01');
    await form().getByLabel('Fim', { exact: true }).fill('2027-06-30');
    await page.route(API + '/semestres', async route => {
      if (route.request().method() === 'POST') await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 999999, nome: 'Simulado', inicio: '2027-02-01', fim: '2027-06-30', encerrado_em: null }) });
      else await route.continue();
    });
    const recarregouAbrir = page.waitForResponse(r => r.url() === API + '/portal/estado' && r.request().method() === 'GET');
    const aberto = await resposta('/semestres', 'POST', () => botao('Abrir semestre').click());
    assert.equal(aberto.status, 201);
    assert.deepEqual(aberto.pedido, { nome: 'Semestre F3a ' + sufixo, inicio: '2027-02-01', fim: '2027-06-30' });
    const estadoAbrir = await recarregouAbrir; assert.equal(estadoAbrir.status(), 200);
    assert.deepEqual((await estadoAbrir.json()).semestre, sem);
    await visivel('Semestre ' + aberto.pedido.nome + ' aberto. Agora crie as disciplinas.').waitFor({ state: 'visible' });
    await botao('Encerrar semestre').waitFor({ state: 'visible' });
    assert.equal(await botao('Abrir semestre').count(), 0);
    assert.equal(await logic('return logic.state.semestre.id;'), sem.id);
    assert.deepEqual(await logic('return Object.fromEntries(Object.keys(arg).map(k => [k, logic.state[k]]));', dadosAntes), dadosAntes);
    assert.ok(await logic('return logic.state.discs.length > 0;'));
    assert.equal((await api('/portal/estado')).corpo.semestre.encerrado_em, null);
    assert.deepEqual((await api('/semestres')).corpo, semestresAntes.corpo);
    await page.unroute(API + caminho);
    await page.unroute(API + '/semestres');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true;
  if (token) {
    for (const caminho of [...matriculas, ...[...disciplinas].map(id => '/disciplinas/' + id), ...[...alunos].map(id => '/alunos/' + id)]) {
      try {
        const r = await api(caminho, 'DELETE');
        if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
      } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
    }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API de alunos, disciplinas e matrículas de teste');
  if (professorCriado) console.log('professor de teste nao removivel pela API (reseed limpa): ' + emailProf);
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
