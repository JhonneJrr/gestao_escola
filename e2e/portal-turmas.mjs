// Turma do aluno na atualização 3: hub por turma, matrícula automática pelo servidor, troca de turma e chamada.
// Usa API e Vite já em execução. Cria alunos, uma disciplina e uma turma de teste; apaga alunos e disciplina no finally.
// A turma de teste não pode ser apagada pela API (reseed limpa), como os professores de teste dos outros e2e.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const API = 'http://localhost:8000', FRONT = 'http://localhost:5173', sufixo = Date.now();
let browser, token, inicial, turmaNova, disciplinaId, notaDoAluno;
const alunos = new Set();
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
const estado = async () => (await api('/portal/estado')).corpo;
// Disciplinas em que o aluno está matriculado, pelo estado do servidor (ordem estável).
const matriculasDe = (st, alunoId) => st.matriculas.filter(m => m.aluno_id === alunoId).map(m => m.disciplina_id).sort((a, b) => a - b);
const ids = (...discs) => discs.map(d => d.id).sort((a, b) => a - b);
try {
  const login = await api('/auth/login', 'POST', { email: 'escola@escola.com', senha: 'escola123' });
  assert.equal(login.status, 200); token = login.corpo.access_token;
  inicial = await estado();
  const turma = nome => { const t = inicial.turmas.find(x => x.nome === nome); assert.ok(t, 'turma do seed: ' + nome); return t; };
  const disc = nome => { const d = inicial.disciplinas.find(x => x.nome === nome); assert.ok(d, 'disciplina do seed: ' + nome); return d; };
  const [t1, t2, t3] = [turma('1º A'), turma('2º A'), turma('3º A')];
  const [python, banco, algoritmos, redes] = [disc('Python'), disc('Banco de Dados'), disc('Algoritmos'), disc('Redes')];
  assert.deepEqual([python.turma_id, banco.turma_id, algoritmos.turma_id, redes.turma_id], [t1.id, t1.id, t2.id, t3.id]);
  const discsDa = t => inicial.disciplinas.filter(d => d.turma_id === t.id);
  const nomeTurmaNova = 'Turma E2E ' + sufixo;
  let mat = 3000000 + sufixo % 6000000;
  while (inicial.alunos.some(a => Number(a.matricula) >= mat && Number(a.matricula) <= mat + 10)) mat += 11;

  browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  const erros = [], escritas = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('request', r => { if (r.url().startsWith(API) && r.method() !== 'GET') escritas.push(r.method() + ' ' + new URL(r.url()).pathname); });
  const visivel = texto => page.getByText(texto, { exact: true }).filter({ visible: true });
  const botao = nome => page.getByRole('button', { name: nome, exact: true }).filter({ visible: true });
  const form = () => page.locator('form').filter({ visible: true });
  async function resposta(caminho, method, agir) {
    const espera = page.waitForResponse(r => r.url() === API + caminho && r.request().method() === method);
    const [r] = await Promise.all([espera, agir()]);
    return { status: r.status(), corpo: r.status() === 204 ? null : await r.json(), pedido: r.request().postDataJSON() };
  }
  const plural = n => n + (n === 1 ? ' aluno' : ' alunos');
  const cartao = (nome, n) => page.getByRole('button', { name: new RegExp('^' + nome + '\\s*' + (n == null ? '\\d+' : n) + ' aluno') }).filter({ visible: true });
  // Alunos é o hub de turmas (Alt+4): volta aos cartões antes de abrir uma turma.
  async function hubTurmas() {
    await page.keyboard.press('Alt+4');
    const voltar = botao('Turmas');
    if (await voltar.count()) await voltar.click();
    await botao('Nova turma').waitFor({ state: 'visible' });
  }
  async function abrirTurma(nome) { await hubTurmas(); await cartao(nome).click(); await botao('Turmas').waitFor({ state: 'visible' }); }
  async function criarAluno(nome, matricula, nomeTurma) {
    await hubTurmas(); await botao('Novo aluno').click();
    await form().getByLabel('Nome', { exact: true }).fill(nome);
    await form().getByLabel('Idade', { exact: true }).fill('21');
    await form().getByLabel('Matrícula', { exact: true }).fill(String(matricula));
    await form().locator('select').selectOption({ label: nomeTurma });
    const r = await resposta('/alunos', 'POST', () => botao('Cadastrar aluno').click());
    assert.equal(r.status, 201, JSON.stringify(r.corpo)); alunos.add(r.corpo.id);
    await botao('Cadastrar aluno').waitFor({ state: 'hidden' });
    return r;
  }
  async function abrirAluno(nome, nomeTurma) {
    await abrirTurma(nomeTurma);
    await page.getByPlaceholder('Nome ou matrícula', { exact: true }).fill(nome);
    await page.locator('[role=button][data-fi]').filter({ hasText: nome }).click();
    await botao('Editar').waitFor({ state: 'visible' });
  }

  await page.goto(FRONT + '/login');
  await form().getByLabel('E-mail', { exact: true }).fill('escola@escola.com');
  await form().getByLabel('Senha', { exact: true }).fill('escola123');
  assert.equal((await resposta('/auth/login', 'POST', () => form().getByRole('button', { name: 'Entrar', exact: true }).click())).status, 200);
  await botao('Menu do usuário').waitFor({ state: 'visible' });

  await conferir('hub de turmas lista as turmas do seed com cartões e abre a lista da turma', async () => {
    await page.keyboard.press('Alt+4');
    await visivel(`${inicial.turmas.length} turmas · ${inicial.alunos.length} alunos`).waitFor({ state: 'visible' });
    await botao('Nova turma').waitFor({ state: 'visible' }); await botao('Novo aluno').waitFor({ state: 'visible' });
    for (const t of [t1, t2, t3]) {
      const n = inicial.alunos.filter(a => a.turma_id === t.id).length, ds = discsDa(t);
      assert.ok(n > 0, 'o seed põe pelo menos um aluno em ' + t.nome);
      const c = cartao(t.nome, n); await c.waitFor({ state: 'visible' });
      assert.equal(await c.count(), 1);
      const txt = await c.evaluate(e => e.textContent);
      for (const d of ds) assert.ok(txt.includes(d.nome), t.nome + ' deve listar ' + d.nome);
      for (const rotulo of ['Média', 'Frequência', 'Em risco']) assert.ok(txt.includes(rotulo), rotulo);
      const aulas = ds.reduce((x, d) => x + d.grade.length, 0);
      assert.ok(txt.includes(aulas + (aulas === 1 ? ' aula por semana' : ' aulas por semana')), 'aulas por semana de ' + t.nome);
    }
    // Abre a turma 1º A: disciplinas, matriz de matrículas do seed e lista só com os alunos dela.
    await cartao('1º A').click();
    await botao('Turmas').waitFor({ state: 'visible' });
    await visivel('Disciplinas da turma').waitFor({ state: 'visible' });
    const daTurma = inicial.alunos.filter(a => a.turma_id === t1.id), foraDaTurma = inicial.alunos.filter(a => a.turma_id !== t1.id);
    for (const a of daTurma) for (const d of discsDa(t1)) {
      assert.ok(inicial.matriculas.some(m => m.aluno_id === a.id && m.disciplina_id === d.id), 'o seed matricula pela regra da turma');
      await botao(`Desmatricular ${a.nome} de ${d.nome}`).waitFor({ state: 'visible' });
    }
    assert.equal(await page.locator('[role=button][data-fi]').count(), daTurma.length);
    for (const a of foraDaTurma) assert.equal(await botao(`Desmatricular ${a.nome} de Python`).count(), 0);
  });

  await conferir('Nova turma cria a turma pela tela (POST /turmas) e o cartão aparece vazio', async () => {
    await hubTurmas(); await botao('Nova turma').click();
    await page.getByPlaceholder('1º B', { exact: true }).fill(nomeTurmaNova);
    const r = await resposta('/turmas', 'POST', () => botao('Criar turma').click());
    assert.equal(r.status, 201); assert.deepEqual(r.pedido, { nome: nomeTurmaNova }); turmaNova = r.corpo;
    console.log('Turma de teste criada (reseed limpa): ' + nomeTurmaNova);
    await visivel(`Turma ${nomeTurmaNova} criada. Cadastre ou mova alunos para ela.`).waitFor({ state: 'visible' });
    await cartao(nomeTurmaNova, 0).waitFor({ state: 'visible' });
    assert.ok((await estado()).turmas.some(t => t.id === turmaNova.id && t.nome === nomeTurmaNova));
  });

  let alunoA, alunoB;
  const nomeA = 'Aluno Turma A ' + sufixo, nomeB = 'Aluno Turma B ' + sufixo;
  await conferir('criar aluno com turma pela tela matricula nas disciplinas da turma (GET /portal/estado)', async () => {
    const r = await criarAluno(nomeA, mat, '1º A'); alunoA = r.corpo;
    assert.equal(r.pedido.turma_id, t1.id); assert.equal(alunoA.turma_id, t1.id); assert.equal(alunoA.turma_nome, '1º A');
    const st = await estado();
    assert.equal(st.alunos.find(a => a.id === alunoA.id).turma_id, t1.id);
    // Âncora positiva: as duas disciplinas do 1º A; o negativo (Algoritmos e Redes) fica ao lado dela.
    assert.deepEqual(matriculasDe(st, alunoA.id), ids(python, banco));
    assert.ok(!matriculasDe(st, alunoA.id).includes(algoritmos.id) && !matriculasDe(st, alunoA.id).includes(redes.id));
    await cartao('1º A', inicial.alunos.filter(a => a.turma_id === t1.id).length + 1).waitFor({ state: 'visible' });
    await abrirTurma('1º A');
    await botao(`Desmatricular ${nomeA} de Python`).waitFor({ state: 'visible' });
    await botao(`Desmatricular ${nomeA} de Banco de Dados`).waitFor({ state: 'visible' });
    const b = await criarAluno(nomeB, mat + 1, '3º A'); alunoB = b.corpo;
    assert.equal(b.pedido.turma_id, t3.id); assert.equal(alunoB.turma_nome, '3º A');
    assert.deepEqual(matriculasDe(await estado(), alunoB.id), ids(redes));
  });

  await conferir('mover o aluno tira só as matrículas sem histórico da turma antiga e põe as da nova', async () => {
    // Nota em Python: o histórico segura a matrícula quando a turma muda; Banco de Dados não tem histórico.
    const avaliacao = inicial.avaliacoes.find(v => v.disciplina_id === python.id); assert.ok(avaliacao);
    assert.equal((await api(`/avaliacoes/${avaliacao.id}/notas/${alunoA.id}`, 'PUT', { valor: 7 })).status, 204);
    notaDoAluno = `/avaliacoes/${avaliacao.id}/notas/${alunoA.id}`;
    await abrirAluno(nomeA, '1º A'); await botao('Editar').click();
    await form().locator('select').selectOption({ label: '2º A' });
    const r = await resposta(`/alunos/${alunoA.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(r.status, 200); assert.equal(r.pedido.turma_id, t2.id);
    assert.deepEqual(r.corpo.matriculas_mantidas, [{ disciplina_id: python.id, disciplina_nome: 'Python' }]);
    await form().getByText('Mantido em: Python (já tem nota ou presença).', { exact: true }).waitFor({ state: 'visible' });
    const st = await estado();
    assert.equal(st.alunos.find(a => a.id === alunoA.id).turma_id, t2.id);
    // Âncora positiva: Algoritmos (nova) e Python (mantida); o negativo é Banco de Dados, que saiu.
    assert.deepEqual(matriculasDe(st, alunoA.id), ids(python, algoritmos));
    assert.ok(!matriculasDe(st, alunoA.id).includes(banco.id));
    await page.keyboard.press('Escape');
    // Sem histórico, nada fica: B sai do 3º A (Redes) e entra no 2º A (Algoritmos), sem matrículas mantidas.
    await abrirAluno(nomeB, '3º A'); await botao('Editar').click();
    await form().locator('select').selectOption({ label: '2º A' });
    const rb = await resposta(`/alunos/${alunoB.id}`, 'PATCH', () => botao('Salvar').click());
    assert.equal(rb.status, 200); assert.deepEqual(rb.corpo.matriculas_mantidas, []);
    const sb = await estado();
    assert.deepEqual(matriculasDe(sb, alunoB.id), ids(algoritmos));
    assert.ok(!matriculasDe(sb, alunoB.id).includes(redes.id));
    await page.keyboard.press('Escape');
    await hubTurmas();
    await cartao('2º A', inicial.alunos.filter(a => a.turma_id === t2.id).length + 2).waitFor({ state: 'visible' });
  });

  await conferir('matricular e desmatricular individualmente pelo hub (aluno sem nota) e o bloqueio por histórico', async () => {
    await abrirTurma('2º A');
    const caminho = `/alunos/${alunoB.id}/matricular/${algoritmos.id}`;
    const antes = escritas.length;
    const del = await resposta(caminho, 'DELETE', () => botao(`Desmatricular ${nomeB} de Algoritmos`).click());
    assert.equal(del.status, 204);
    await visivel(`${nomeB} desmatriculado de Algoritmos.`).waitFor({ state: 'visible' });
    assert.deepEqual(matriculasDe(await estado(), alunoB.id), []);
    const post = await resposta(caminho, 'POST', () => botao(`Matricular ${nomeB} em Algoritmos`).click());
    assert.equal(post.status, 201); assert.equal(post.pedido, null);
    await visivel(`${nomeB} matriculado em Algoritmos.`).waitFor({ state: 'visible' });
    assert.deepEqual(matriculasDe(await estado(), alunoB.id), ids(algoritmos));
    // Aluno do seed com notas e presenças em Python: o hub recusa desmatricular sem chamar a API.
    const ana = inicial.alunos.find(a => a.email === 'ana@escola.com'); assert.ok(ana);
    assert.equal(escritas.length - antes, 2);
    await abrirTurma('1º A');
    const antesBloqueio = escritas.length;
    await botao(`Desmatricular ${ana.nome} de Python`).click();
    await visivel(`${ana.nome} já tem notas ou frequência em Python: não dá para desmatricular.`).waitFor({ state: 'visible' });
    assert.equal(escritas.length, antesBloqueio, 'o bloqueio local não escreve na API');
    assert.ok(matriculasDe(await estado(), ana.id).includes(python.id));
  });

  let alunoC, alunoD;
  const nomeC = 'Aluno Chamada C ' + sufixo, nomeD = 'Aluno Chamada D ' + sufixo, nomeDisc = 'Chamada E2E ' + sufixo;
  await conferir('aluno na turma sem disciplinas não tem matrícula; disciplina nova da turma e novo aluno entram pela regra da turma', async () => {
    const c = await criarAluno(nomeC, mat + 2, nomeTurmaNova); alunoC = c.corpo;
    assert.equal(alunoC.turma_id, turmaNova.id);
    // Âncora positiva: o aluno existe na turma nova; o negativo é a ausência de matrículas (a turma não tem disciplina).
    const sem = await estado();
    assert.equal(sem.alunos.find(a => a.id === alunoC.id).turma_id, turmaNova.id);
    assert.deepEqual(matriculasDe(sem, alunoC.id), []);
    // O cartão da turma nova diz que ela não tem disciplina; o aluno aparece contado nele.
    await hubTurmas(); await cartao(nomeTurmaNova, 1).waitFor({ state: 'visible' });
    const txtNova = await cartao(nomeTurmaNova, 1).evaluate(e => e.textContent);
    assert.ok(txtNova.includes('0 aulas por semana'));
    for (const d of inicial.disciplinas) assert.ok(!txtNova.includes(d.nome), 'a turma nova não lista ' + d.nome);
    // A API cria a disciplina da turma (a tela de disciplina é coberta no e2e da escola): C entra por R3.
    const d = await api('/disciplinas', 'POST', { nome: nomeDisc, carga_horaria: 40, turma_id: turmaNova.id });
    if (d.status === 201) disciplinaId = d.corpo.id;
    assert.equal(d.status, 201, JSON.stringify(d.corpo));
    assert.deepEqual(matriculasDe(await estado(), alunoC.id), [disciplinaId]);
    const dd = await criarAluno(nomeD, mat + 3, nomeTurmaNova); alunoD = dd.corpo;
    assert.deepEqual(matriculasDe(await estado(), alunoD.id), [disciplinaId]);
    await cartao(nomeTurmaNova, 2).waitFor({ state: 'visible' });
  });

  await conferir('chamada pela página da disciplina grava (PUT .../chamada) e a presença aparece', async () => {
    const sem = (await api('/semestres/atual')).corpo, dia = sem.inicio;
    // A interface não cria aula extra direto para a escola: a aula (já passada, com chamada permitida) nasce pela API.
    assert.equal((await api(`/disciplinas/${disciplinaId}/aulas`, 'POST', { data: dia, hora_inicio: '08:00', hora_fim: '09:40' })).status, 201);
    await page.goto(FRONT + '/disciplinas');
    const lista = page.getByRole('listbox', { name: 'Disciplinas', exact: true });
    await lista.getByText(nomeDisc, { exact: true }).first().click();
    await page.getByRole('tab', { name: /^Chamada/ }).click();
    await visivel('Sem chamada').first().waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Fazer chamada', exact: true }).first().click();
    const painel = page.getByRole('dialog', { name: 'Chamada', exact: true });
    const marca = (nome, rotulo) => painel.getByRole('radiogroup', { name: nome, exact: true }).getByRole('radio', { name: new RegExp('^' + rotulo) });
    await marca(nomeC, 'Presente').click(); await marca(nomeD, 'Ausente').click();
    const r = await resposta(`/disciplinas/${disciplinaId}/chamada`, 'PUT', () => painel.getByRole('button', { name: 'Salvar chamada', exact: true }).click());
    assert.equal(r.status, 204);
    const porAluno = p => p.slice().sort((a, b) => a.aluno_id - b.aluno_id);
    const esperado = porAluno([{ aluno_id: alunoC.id, presente: true }, { aluno_id: alunoD.id, presente: false }]);
    assert.equal(r.pedido.data, dia); assert.deepEqual(porAluno(r.pedido.presencas), esperado);
    assert.deepEqual(porAluno((await api(`/disciplinas/${disciplinaId}/chamada?data=${dia}`)).corpo), esperado);
    // A presença aparece na tela: resumo da aula e as marcações ao reabrir.
    await visivel('Chamada feita (1/2)').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Ver chamada', exact: true }).first().click();
    assert.equal(await marca(nomeC, 'Presente').getAttribute('aria-checked'), 'true');
    assert.equal(await marca(nomeC, 'Ausente').getAttribute('aria-checked'), 'false');
    assert.equal(await marca(nomeD, 'Ausente').getAttribute('aria-checked'), 'true');
    assert.equal(await marca(nomeD, 'Presente').getAttribute('aria-checked'), 'false');
    await page.keyboard.press('Escape');
  });
  await conferir('nenhum erro JavaScript no percurso', async () => assert.deepEqual(erros, []));
} catch (erro) {
  process.exitCode = 1;
  if (!browser) console.error('FALHOU abrir Edge\n' + erro.stack);
} finally {
  let limpou = true, ficou = false;
  if (token) {
    const apagar = async caminho => {
      try {
        const r = await api(caminho, 'DELETE');
        if (r.status === 409 && /notas ou (chamadas|presenças)/.test(r.corpo.detail || '')) {
          // A API recusa excluir com nota ou chamada: o histórico fica até o reseed.
          ficou = true; console.log('Fica até o reseed (tem chamada lançada): ' + caminho);
          if (caminho.startsWith('/disciplinas/')) await api(caminho, 'PATCH', { professor_id: null });
        } else if (![204, 404].includes(r.status)) { limpou = false; console.error('FALHOU limpeza ' + caminho + ': ' + JSON.stringify(r)); }
      } catch (erro) { limpou = false; console.error('FALHOU limpeza ' + caminho + '\n' + erro.stack); }
    };
    if (notaDoAluno) await apagar(notaDoAluno);
    if (disciplinaId) await apagar('/disciplinas/' + disciplinaId);
    for (const id of alunos) await apagar('/alunos/' + id);
    if (inicial && !ficou) {
      try {
        const final = await estado();
        for (const k of ['alunos', 'disciplinas', 'matriculas', 'notas', 'aulas']) assert.deepEqual(final[k], inicial[k], 'o teste precisa devolver ' + k + ' ao que encontrou');
        console.log('OK estado do seed preservado (alunos, disciplinas, matrículas, notas e aulas)');
      } catch (erro) { limpou = false; console.error('FALHOU estado do seed preservado\n' + erro.stack); }
    }
  }
  console.log((limpou ? 'OK' : 'FALHOU') + ' limpeza pela API de alunos, disciplina e nota de teste');
  if (!limpou) process.exitCode = 1;
  await browser?.close();
}
