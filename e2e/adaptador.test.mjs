import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Detecta nomes/chaves errados, perda de presença falsa e frequência em escala errada.
function adaptador() {
  const codigo = ts.transpileModule(readFileSync('src/portal/adaptador.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', codigo)(modulo, modulo.exports);
  return modulo.exports;
}
function gradeRegras() {
  const codigo = ts.transpileModule(readFileSync('src/portal/grade-regras.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', codigo)(modulo, modulo.exports);
  return modulo.exports;
}
const montarEstado = (usuario, estado) => adaptador().montarEstado(usuario, estado);
// Executa a lógica TS existente, sem montar React nem acessar serviços.
function quadro(aulas = [], rede = {}, arquivo = 'GradeAgenda.tsx', dev = false) {
  const avisos = [];
  const loja = { aulas, disciplinas: [], professores: [], turmas: [{ id: '5', nome: '1º A' }], salas: [], semestre: { inicio: '2026-08-03', fim: '2026-12-11' }, avisar: texto => avisos.push(texto) };
  class DCLogic {
    props = {};
    setState(u, cb) { this.state = { ...this.state, ...(typeof u === 'function' ? u(this.state) : u) }; cb?.(); }
  }
  const codigo = ts.transpileModule(readFileSync('src/portal/' + arquivo, 'utf8').replaceAll('import.meta.env.DEV', String(dev)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const modulo = { exports: {} };
  const require = nome => nome === 'react' ? { createRef: () => ({ current: null }) }
    : nome === './dc' ? { DCLogic, criarDC: (_nome, _template, classe) => classe }
    : nome === './loja' ? { lerLoja: () => loja, recarregarLoja: async () => {}, publicar: novos => Object.assign(loja, novos), assinar: () => () => {} }
    : nome === './rede' ? rede : nome === './adaptador' ? adaptador() : nome === './grade-regras' ? gradeRegras() : {};
  new Function('module', 'exports', 'require', 'window', codigo)(modulo, modulo.exports, require, globalThis.window || { location: { search: '' } });
  const q = new modulo.exports.default();
  q.avisos = avisos; q.loja = loja;
  q.agora = () => ({ data: '2026-10-07', min: 620 });
  q.state.discs = [{ id: 13, nome: 'Python', turma: '5', prof: 42, sala: '7', carga: 40, grade: [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '8' }] }];
  return q;
}

test('hoje usa calendário local inclusive à noite, com exceção explícita do demo', () => {
  const { dataHoje } = adaptador();
  const noite = { getFullYear: () => 2026, getMonth: () => 9, getDate: () => 7, toISOString: () => '2026-10-08T01:00:00.000Z' };
  assert.equal(dataHoje(noite, false), '2026-10-07');
  assert.equal(dataHoje(noite, true), '2026-10-06');
  assert.equal(dataHoje(new Date(2027, 0, 2), false), '2027-01-02');
});

test('Portal fixa hoje só em DEV com inicio; Quadro permanece ao vivo por padrão', () => {
  const antigoWindow = globalThis.window;
  try {
    globalThis.window = { location: { search: '?inicio=Professor' } };
    const hoje = adaptador().dataHoje(new Date(), false);
    assert.equal(quadro([], {}, 'Portal.tsx', true).state.agDia, '2026-10-06');
    assert.equal(quadro([], {}, 'Portal.tsx').state.agDia, hoje);
    globalThis.window.location.search = '';
    assert.equal(quadro([], {}, 'Portal.tsx', true).state.agDia, hoje);
    const q = quadro(); delete q.agora;
    assert.equal(q.agora().data, hoje); assert.equal(q.agora().vivo, true);
    q.props.relogio = 'Terça 08:40';
    assert.deepEqual(q.agora(), { data: '2026-10-06', min: 520, vivo: false });
  } finally { globalThis.window = antigoWindow; }
});

test('histórico usa aulas preservadas; futuro e demo continuam pela grade', () => {
  const q = quadro([
    { aula_id: 1, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40' },
    { aula_id: 2, disciplina_id: 13, origem: 'grade', status: 'cancelada', data: '2026-10-05', hora_inicio: '08:00', hora_fim: '09:40' },
  ]);
  const r = q.instSemana('2026-10-05', q.state, {}, 'escola');
  assert.deepEqual(r.map(i => [i.data, i.ini, i.idx]), [['2026-10-08', '10:00', 0], ['2026-10-06', '08:00', null], ['2026-10-05', '08:00', null]]);
  assert.equal(q.podeArrastar(r[1]), false);
  assert.equal(q.podeArrastar(r[0]), true);
  const cancelada = r.find(i => i.data === '2026-10-05'); assert.equal(cancelada.cancelada, true); assert.equal(q.podeArrastar(cancelada), false);
  assert.equal(q.instSemana('2026-09-28', q.state, {}, 'escola').length, 0);
  const demo = quadro();
  assert.deepEqual(demo.instSemana('2026-09-28', demo.state, {}, 'escola').map(i => [i.data, i.ini]), [['2026-10-01', '10:00']]);
});

test('remarcação histórica deriva índice pelo dia original e aparece só na data atual', () => {
  const q = quadro([{ aula_id: 1, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-06', remarcada_de: '2026-10-01', hora_inicio: '10:00', hora_fim: '11:40' }]);
  const r = q.instSemana('2026-10-05', q.state, {}, 'escola');
  assert.equal(r.length, 2);
  assert.deepEqual([r[1].data, r[1].dataOrig, r[1].idx, r[1].remarcada], ['2026-10-06', '2026-10-01', 0, true]);
  assert.equal(q.instSemana('2026-09-28', q.state, {}, 'escola').length, 0);
});

test('remarcação do passado para o futuro entra uma vez, inclusive entre semanas', () => {
  const q = quadro([{ aula_id: 1, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-08', remarcada_de: '2026-10-01', hora_inicio: '10:00', hora_fim: '11:40' }]);
  const r = q.instSemana('2026-10-05', q.state, {}, 'escola');
  assert.deepEqual(r.map(i => [i.data, i.ini, i.remarcada]), [['2026-10-08', '10:00', true]]);
  assert.equal(r[0].dataOrig, '2026-10-01');
  assert.equal(q.instSemana('2026-09-28', q.state, {}, 'escola').length, 0);
  const futura = quadro([{ aula_id: 2, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-13', remarcada_de: '2026-10-08', hora_inicio: '13:30', hora_fim: '15:10' }]);
  assert.equal(futura.instSemana('2026-10-05', futura.state, {}, 'escola').length, 0);
  const destino = futura.instSemana('2026-10-12', futura.state, {}, 'escola');
  assert.deepEqual(destino.map(i => [i.data, i.ini]), [['2026-10-15', '10:00'], ['2026-10-13', '13:30']]);
});

test('índice histórico pode corresponder ao dia e horário atuais da aula', () => {
  const q = quadro([{ aula_id: 1, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-01', remarcada_de: '2026-09-30', hora_inicio: '10:00', hora_fim: '11:40' }]);
  const r = q.instSemana('2026-09-28', q.state, {}, 'escola');
  assert.equal(r.length, 1); assert.equal(r[0].idx, 0); assert.equal(q.podeArrastar(r[0]), false); // aula passada nao arrasta
});

test('extras seguem a aula vinculada e incluem avulsas, sem duplicar pedidos', () => {
  const q = quadro([
    { aula_id: 1, disciplina_id: 13, origem: 'extra', status: 'agendada', data: '2026-10-09', remarcada_de: '2026-10-06', hora_inicio: '13:30', hora_fim: '15:10' },
    { aula_id: 2, disciplina_id: 13, origem: 'extra', status: 'cancelada', data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40' },
    { aula_id: 3, disciplina_id: 13, origem: 'extra', status: 'agendada', data: '2026-10-05', hora_inicio: '08:00', hora_fim: '09:40' },
  ]);
  q.state.pedidos = [1, 2].map(id => ({ id, aula_id: id, disc: 13, status: 'aprovada', data: '2026-10-06', ini: '08:00', fim: '09:40', sala: '9' }));
  q.state.pedidos.push({ id: 4, disc: 13, status: 'pendente', data: '2026-10-07', ini: '15:30', fim: '17:10' });
  const r = q.instSemana('2026-10-05', q.state, {}, 'escola').filter(i => i.tipo === 'extra');
  assert.deepEqual(r.map(i => [i.data, i.ini]), [['2026-10-09', '13:30'], ['2026-10-06', '08:00'], ['2026-10-07', '15:30'], ['2026-10-05', '08:00']]);
  assert.equal(r[0].pedido.id, 1); assert.equal(r[0].remarcada, true);
  assert.equal(r[3].sala, '7'); assert.equal(r[3].pendente, false); assert.equal(r[3].pedido, undefined);
  assert.equal(r[1].cancelada, true); assert.equal(r.filter(i => i.pedido?.id === 2).length, 1); // a extra cancelada aparece uma vez, como estado
  const aluno = q.instSemana('2026-10-05', q.state, {}, 'aluno').filter(i => i.tipo === 'extra');
  assert.equal(aluno.length, 3); assert.equal(aluno.filter(i => !i.cancelada).length, 2); assert.equal(aluno.some(i => i.pendente), false);
  const demo = quadro(); demo.state.pedidos = [{ id: 5, disc: 13, status: 'aprovada', data: '2026-10-06', ini: '13:30', fim: '15:10' }];
  assert.equal(demo.instSemana('2026-10-05', demo.state, {}, 'aluno').find(i => i.tipo === 'extra').data, '2026-10-06');
});

test('Sem turma é o último grupo e abre o editor da mesma disciplina', () => {
  const q = quadro(); q.state.discs.push({ ...q.state.discs[0], id: 14, nome: 'Sem vínculo', turma: '' });
  const grupos = q.valsDisc(q.state, q.agora(), {}).turmasD;
  assert.deepEqual(grupos.map(g => g.nome), ['1º A', 'Sem turma']);
  assert.equal(grupos[1].linhas[0].nome, 'Sem vínculo');
  grupos[1].linhas[0].abrir(); assert.deepEqual(q.state.painel, { tipo: 'disc', id: 14 });
  q.state.discs.pop(); assert.deepEqual(q.valsDisc(q.state, q.agora(), {}).turmasD.map(g => g.nome), ['1º A']);
});

test('proposta aceita vazia mantém aplicar e informa horários removidos', async () => {
  const chamadas = [];
  const q = quadro([], { salvarGrade: async (...args) => { chamadas.push(args); } });
  q.state.iaProp = { proposta: [{ disciplina_id: 13, disciplina_nome: 'Python', itens: [] }], moves: [], rec: [] };
  assert.equal(q.valsIa(q.state).iaAcoes, true);
  await q.iaAplicar(); assert.deepEqual(chamadas, [[13, []]]);
  assert.equal(q.state.iaFeito, 'Python: Horários removidos.');
  assert.equal(q.valsIa(q.state).iaAcoes, false);
});

test('evento bloqueia duplo envio e resposta preserva o formulário aberto depois', async () => {
  let concluir, chamadas = 0;
  const q = quadro([], { criarEvento: () => { chamadas++; return new Promise(resolve => { concluir = resolve; }); } });
  q.novoEvento('2026-10-07'); q.state.eF.titulo = 'Primeiro';
  const envio = q.salvarEvento({ preventDefault() {} });
  q.salvarEvento({ preventDefault() {} }); assert.equal(chamadas, 1);
  q.setState({ painel: null }); q.novoEvento('2026-10-08'); q.state.eF.titulo = 'Segundo';
  concluir({ id: 77 }); await envio;
  assert.deepEqual(q.state.painel, { tipo: 'eventoForm', id: null });
  assert.equal(q.state.eF.titulo, 'Segundo'); assert.equal(q.state.msg.t, 'Evento publicado no calendário.');
  assert.equal(q.state.eErro, '');
  q.state.aba = 'disc'; q.state.painel = null;
  assert.equal(q.renderVals().msgTxt, 'Evento publicado no calendário.');
  assert.equal(q.renderVals().msgVis, true);
});

test('editor do Portal preserva sala específica e nula e omite sala de horário novo', async () => {
  const grades = [];
  const q = quadro([], { atualizarDisciplina: async id => ({ id }), salvarGrade: async (id, grade) => { grades.push([id, grade]); return { aulas_geradas: 3 }; } }, 'Portal.tsx');
  q.ativo = () => ({ inicio: '2026-08-03', fim: '2026-12-11' }); q.recarregar = async () => {};
  q.state.discs = montarEstado(escola, { ...vazio, disciplinas: [{ id: 13, nome: 'Python', carga_horaria: 40, professor_id: 42, sala_id: 7, grade: [
    { dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala_id: 8 }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala_id: null },
  ] }] }).discs;
  Object.assign(q.state, { painel: { tipo: 'disc', did: 13 }, fNome: 'Python', fIdade: '40', fProf: '43', fGrade: [
    { dia_semana: '2', hora_inicio: '08:00', hora_fim: '09:40' }, { dia_semana: '4', hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: '5', hora_inicio: '13:30', hora_fim: '15:10' },
  ] });
  await q.salvarDisc({ preventDefault() {} });
  assert.deepEqual(grades, [[13, [
    { dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala_id: 8 }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala_id: null }, { dia_semana: 5, hora_inicio: '13:30', hora_fim: '15:10' },
  ]]]);
});

test('gravações de pedidos bloqueiam repetição em todas as ações', async () => {
  for (const [api, acao, perfil] of [['aprovarPedido', 'aprovar', 'escola'], ['recusarPedido', 'confRec', 'escola'], ['sugerirPedido', 'confSug', 'escola'], ['aceitarSugestao', 'aceitar', 'prof'], ['recusarSugestao', 'recusar', 'prof']]) {
    let concluir, chamadas = 0;
    const q = quadro([], { [api]: () => { chamadas++; return new Promise(resolve => { concluir = resolve; }); } });
    q.profId = () => 42; q.pedCheck = () => '';
    q.state.pedidos = [{ id: 1, disc: 13, prof: 42, status: perfil === 'escola' ? 'pendente' : 'sugestao', data: '2026-10-08', ini: '13:30', fim: '15:10', motivo: 'Reposição', sug: { data: '2026-10-09', ini: '13:30', fim: '15:10' } }];
    q.state.recusando = 1; q.state.recMotivo = 'Sem reposição'; q.state.sugerindo = 1;
    const vals = q.valsPed(q.state, perfil), linha = (perfil === 'escola' ? vals.pendLista : vals.meusLista)[0];
    const envio = linha[acao](); linha[acao](); assert.equal(chamadas, 1, api);
    q.state.recusando = 99; q.state.sugerindo = 99;
    concluir(); await envio;
    assert.equal(q.state.recusando, 99, api); assert.equal(q.state.sugerindo, 99, api);
    assert.equal(q.state.salvando, null, api);
  }
});

test('respostas de pedidos em outra aba preservam o formulário e avisam globalmente', async () => {
  for (const [api, acao, perfil] of [['aprovarPedido', 'aprovar', 'escola'], ['recusarPedido', 'confRec', 'escola'], ['sugerirPedido', 'confSug', 'escola'], ['aceitarSugestao', 'aceitar', 'prof'], ['recusarSugestao', 'recusar', 'prof']]) {
    for (const falha of [false, true]) {
      let concluir;
      const q = quadro([], { [api]: () => new Promise((resolve, reject) => { concluir = () => falha ? reject({ detalhe: 'Falha de teste' }) : resolve(); }) });
      q.profId = () => 42; q.pedCheck = () => ''; q.state.aba = 'pedidos';
      q.state.pedidos = [{ id: 1, disc: 13, prof: 42, status: perfil === 'escola' ? 'pendente' : 'sugestao', data: '2026-10-08', ini: '13:30', fim: '15:10', sug: { data: '2026-10-09', ini: '13:30', fim: '15:10' } }];
      q.state.recusando = 1; q.state.recMotivo = 'Recusa'; q.state.sugerindo = 1;
      const vals = q.valsPed(q.state, perfil), envio = (perfil === 'escola' ? vals.pendLista : vals.meusLista)[0][acao]();
      q.setState({ aba: 'ano', painel: { tipo: 'eventoForm', id: null }, pMsg: { t: 'Outro pedido' }, eF: { titulo: 'Outro evento' } });
      concluir(); await envio;
      assert.equal(q.state.eF.titulo, 'Outro evento', api); assert.equal(q.state.pMsg.t, 'Outro pedido', api);
      assert.ok(q.state.msg?.t, api); if (falha) assert.equal(q.state.msg.t, 'Falha de teste', api);
      assert.equal(q.avisos.at(-1), q.state.msg.t, api);
    }
  }
});

test('aviso global do Quadro usa a faixa existente do Portal', () => {
  const q = quadro([], {}, 'Portal.tsx');
  q.publicarEstado(); q.loja.avisar('Evento publicado no calendário.');
  assert.equal(q.state.rotaAviso, 'Evento publicado no calendário.');
});

test('disciplina do Portal bloqueia repetição e preserva outro editor durante os dois pedidos', async () => {
  for (const etapa of ['disciplina', 'grade']) {
    let concluir, chamadas = 0;
    const gravar = () => { chamadas++; return new Promise(resolve => { concluir = resolve; }); };
    const q = quadro([], { criarDisciplina: etapa === 'disciplina' ? gravar : async () => ({ id: 14 }), salvarGrade: etapa === 'grade' ? gravar : async () => ({ aulas_geradas: 0 }) }, 'Portal.tsx');
    q.ativo = () => ({ inicio: '2026-08-03', fim: '2026-12-11' }); q.recarregar = async () => {};
    q.abrirDisc(null); q.state.fNome = 'Primeira'; q.state.fIdade = '40'; q.state.fGrade = [];
    const envio = q.salvarDisc({ preventDefault() {} });
    await Promise.resolve(); q.salvarDisc({ preventDefault() {} }); assert.equal(chamadas, 1);
    q.abrirDisc({ id: 99, nome: 'Outra', carga_horaria: 60, grade: [] });
    const outro = q.state.painel;
    concluir({ id: 14, aulas_geradas: 0 }); await envio;
    assert.equal(q.state.painel, outro); assert.equal(q.state.fNome, 'Outra'); assert.equal(q.state.fOk, '');
    assert.equal(q.state.rotaAviso, 'Salvo. Sem grade, nenhuma aula foi gerada.');
  }
});

test('envio de pedido, disciplina, exclusão, remarcação e proposta bloqueiam repetição', async () => {
  for (const operacao of ['pedido', 'disciplina', 'excluirEvento', 'remarcacao', 'proposta']) {
    let concluir, chamadas = 0;
    const gravar = () => { chamadas++; return new Promise(resolve => { concluir = resolve; }); };
    const q = quadro([], { criarPedido: gravar, criarDisciplina: gravar, apagarEvento: gravar, salvarGrade: operacao === 'disciplina' ? async () => {} : gravar });
    q.pedCheck = () => ''; q.errosDisc = () => []; q.profId = () => 42;
    let enviar;
    if (operacao === 'pedido') {
      q.state.pF = { disc: '13', data: '2026-10-09', ini: '13:30', fim: '15:10', sala: '7', motivo: 'Reposição' };
      enviar = () => q.enviarPed({ preventDefault() {} });
    } else if (operacao === 'disciplina') {
      q.abrirDisc(null); q.state.dF.nome = 'Nova'; q.state.dF.grade = [];
      enviar = () => q.salvarDisc({ preventDefault() {} });
    } else if (operacao === 'excluirEvento') {
      q.state.eventos = [{ id: 1, tipo: 'evento', titulo: 'Feira', data: '2026-10-09', turmas: 'todas' }];
      q.state.painel = { tipo: 'evento', id: 1 };
      enviar = q.valsPainel(q.state, 'escola', q.agora(), {}).peExcluir;
    } else if (operacao === 'remarcacao') {
      q.state.pend = { inst: { disc: q.state.discs[0], idx: 0 }, alvo: { dia: 5, ini: '13:30', fim: '15:10' } };
      enviar = () => q.confirmar('grade');
    } else {
      q.state.iaProp = { proposta: [{ disciplina_id: 13, disciplina_nome: 'Python', itens: [] }], moves: [], rec: [] };
      enviar = () => q.iaAplicar();
    }
    const envio = enviar(); enviar(); assert.equal(chamadas, 1, operacao);
    q.state.painel = { tipo: 'disc', id: 99 }; q.state.dF = { nome: 'Outro formulário' };
    q.state.pF = { motivo: 'Outro pedido' }; q.state.pend = { inst: { key: 'outra' } }; q.state.iaProp = null;
    concluir({ id: 14 }); await envio;
    assert.deepEqual(q.state.painel, { tipo: 'disc', id: 99 }, operacao);
    assert.equal(q.state.dF.nome, 'Outro formulário', operacao); assert.equal(q.state.pF.motivo, 'Outro pedido', operacao);
    assert.equal(q.state.pend.inst.key, 'outra', operacao); assert.equal(chamadas, 1, operacao);
  }
});

test('desmontar remove os três listeners de arrasto sem abrir aula', () => {
  const antigoWindow = globalThis.window, antigoDocument = globalThis.document, listeners = new Map();
  try {
    globalThis.window = { addEventListener: (tipo, fn) => listeners.set(tipo, fn), removeEventListener: (tipo, fn) => { assert.equal(listeners.get(tipo), fn); listeners.delete(tipo); } };
    globalThis.document = { removeEventListener() {} };
    const q = quadro(); q.raiz.current = { getBoundingClientRect: () => ({ left: 0, top: 0 }) };
    q.blocoDown({ button: 0, clientX: 0, clientY: 0, currentTarget: { parentElement: { getBoundingClientRect: () => ({ width: 100 }) } } }, { data: '2026-10-08', ini: '10:00', fim: '11:40', tipo: 'grade', idx: 0 });
    assert.deepEqual([...listeners.keys()], ['pointermove', 'pointerup', 'pointercancel']);
    q.componentWillUnmount(); assert.equal(listeners.size, 0); assert.equal(q.state.painel, null);
  } finally { globalThis.window = antigoWindow; globalThis.document = antigoDocument; }
});

test('Escape fecha painel, confirmação e assistente nessa ordem', () => {
  const antigoWindow = globalThis.window, antigoDocument = globalThis.document, antigoObserver = globalThis.ResizeObserver;
  try {
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    globalThis.document = { addEventListener() {}, removeEventListener() {} };
    globalThis.ResizeObserver = class { disconnect() {} };
    const q = quadro(); q.receberLoja = () => {}; q.desassinar = () => {};
    // A assinatura não precisa de store real para testar a prioridade de Escape.
    q.componentDidMount();
    q.state.painel = { tipo: 'disc', id: 13 }; q.state.pend = {}; q.state.iaAberto = true;
    q.onKey({ key: 'Escape' }); assert.equal(q.state.painel, null); assert.ok(q.state.pend); assert.equal(q.state.iaAberto, true);
    q.onKey({ key: 'Escape' }); assert.equal(q.state.pend, null); assert.equal(q.state.iaAberto, true);
    q.onKey({ key: 'Escape' }); assert.equal(q.state.iaAberto, false);
    q.componentWillUnmount();
  } finally { globalThis.window = antigoWindow; globalThis.document = antigoDocument; globalThis.ResizeObserver = antigoObserver; }
});
const escola = { id: 90, email: 'direcao@escola.com', perfil: 'escola', nome: 'Direção', aluno_id: null, senha_provisoria: false };
const professor = { id: 42, email: 'docente@escola.com', perfil: 'professor', nome: 'Docente', aluno_id: null, senha_provisoria: false };
const aluno = { id: 91, email: 'bia@escola.com', perfil: 'aluno', nome: 'Bia', aluno_id: 27, senha_provisoria: true };
const vazio = { semestre: null, semestres_encerrados: [], professores: [], alunos: [], disciplinas: [], matriculas: [], avaliacoes: [], notas: [], aulas: [], avisos: [], metricas: [] };
// Regra e avaliações como o servidor entrega no update 4 (forma da seção 5 do contrato).
const REGRA = { tipo: 'Semestre', periodos: [{ id: 'p1', nome: '1º semestre', inicio: '2026-08-03', fim: '2026-09-30', fechado: false }, { id: 'p2', nome: '2º semestre', inicio: '2026-10-01', fim: '2026-12-11', fechado: false }],
  itens: [{ id: 'i1', nome: 'P1', tipo: 'Prova', peso: 1 }], extras: { permitido: true, max: 2, peso: 1 }, participacao: { ativo: true, peso: 1 }, recuperacao: { ativo: true, modo: 'menor' }, final: { ativo: true },
  arred: '0,1', mediaMin: 6, freqMin: 75, conselho: true };
const AVALIACOES = [
  { id: 88, disciplina_id: 13, nome: 'P1', peso: 1, periodo_id: 'p1', tipo: 'obrigatoria', item_id: 'i1', publicada: true, prazo: '2026-09-30' },
  { id: 89, disciplina_id: 13, nome: 'Participação', peso: 1, periodo_id: 'p1', tipo: 'participacao', item_id: null, publicada: false, prazo: null },
  { id: 90, disciplina_id: 13, nome: 'Lista 1', peso: 1, periodo_id: 'p1', tipo: 'extra', item_id: null, publicada: false, prazo: '2026-09-15' },
  { id: 91, disciplina_id: 13, nome: 'Recuperação · 1º semestre', peso: 0, periodo_id: 'p1', tipo: 'recuperacao', item_id: null, publicada: false, prazo: null },
  { id: 92, disciplina_id: 13, nome: 'Prova final', peso: 0, periodo_id: 'final', tipo: 'final', item_id: null, publicada: false, prazo: null },
];
const turma = {
  ...vazio,
  semestre: { id: 9, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null },
  alunos: [{ id: 27, nome: 'Bia', matricula: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', semestre_historico: '2026.1' }],
  disciplinas: [{ id: 13, nome: 'Python', carga_horaria: 40, professor_id: 42, professor_nome: 'Docente', grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }] }],
  matriculas: [{ aluno_id: 27, disciplina_id: 13 }],
  regra: REGRA, avaliacoes: AVALIACOES, conselho: [{ aluno_id: 27, disciplina_id: 13 }],
  notas: [{ aluno_id: 27, avaliacao_id: 88, valor: 0 }, { aluno_id: 27, avaliacao_id: 91, valor: 7.5 }],
  aulas: [
    { id: 73, disciplina_id: 13, data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40', status: 'agendada', origem: 'grade', remarcada_de: '2026-10-05', chamada_feita: true, chamada: [{ aluno_id: 27, presente: false }] },
    { id: 74, disciplina_id: 13, data: '2026-10-08', hora_inicio: null, hora_fim: null, status: 'cancelada', origem: 'extra', remarcada_de: null, chamada_feita: false, chamada: null },
  ],
  avisos: [{ id: 6, titulo: 'Prova', data: '2026-10-06', mensagem: 'Sala 2', disciplina_id: 13, disciplina_nome: 'Python', autor_id: 42, autor_nome: 'Docente' }],
  metricas: [{ aluno_id: 27, media_geral: 0, frequencia_geral: 0, aprovado: false, disciplinas: [{ disciplina_id: 13, media: 0, parcial: false, frequencia: 0 }] }],
};
const esperadoTurma = {
  turmas: [], salas: [], eventos: [], pedidos: [],
  semestre: { id: 9, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null },
  alunos: [{ id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1', turma: null, turma_nome: null }],
  discs: [{ id: 13, nome: 'Python', carga_horaria: 40, professor_id: 42, turma: '', sala: '', grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala: '', sala_id: null }] }],
  mats: { '27-13': true }, avals: [{ id: 90, did: 13, per: 'p1', nome: 'Lista 1', peso: 1, extra: true }], conselho: { '27-13': true }, regra: REGRA,
  avalApi: { v13_p1_i1: 88, v13_p1_pa: 89, 90: 90, r13_p1: 91, f13: 92 },
  avalMeta: { v13_p1_i1: { publicada: true, prazo: '2026-09-30' }, v13_p1_pa: { publicada: false, prazo: '' }, 90: { publicada: false, prazo: '2026-09-15' }, r13_p1: { publicada: false, prazo: '' }, f13: { publicada: false, prazo: '' } },
  notas: { '27-v13_p1_i1': 0, '27-r13_p1': 7.5 },
  aulas: [
    { aula_id: 73, disciplina_id: 13, data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40', status: 'agendada', origem: 'grade', remarcada_de: '2026-10-05', chamada: { '27': false } },
    { aula_id: 74, disciplina_id: 13, data: '2026-10-08', hora_inicio: null, hora_fim: null, status: 'cancelada', origem: 'extra', remarcada_de: null, chamada: null },
  ],
  avisos: [{ id: 6, titulo: 'Prova', data: '2026-10-06', msg: 'Sala 2', disciplina_id: 13, autor_id: 42, autor_nome: 'Docente' }],
  metricas: [{ aluno_id: 27, media_geral: 0, frequencia_geral: 0, aprovado: false, disciplinas: [{ disciplina_id: 13, media: 0, parcial: false, frequencia: 0 }] }],
  selAluno: 27, selDisc: 13, notaDisc: 13, notaAval: '',
};

test('escola traduz todas as coleções e formata o histórico, inclusive nulos', () => {
  const entrada = {
    ...turma, professores: [{ ...professor, senha_provisoria: false }],
    semestres_encerrados: [{ id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01T12:30:00', resumo: [
      { disciplina: { id: 2, nome: 'Lógica', carga_horaria: 40 }, total_alunos: 3, media_turma: 7.24, frequencia_media: 87.5, aprovados: 2, reprovados: 1 },
      { disciplina: { id: 3, nome: 'Redes', carga_horaria: 30 }, total_alunos: 0, media_turma: null, frequencia_media: null, aprovados: 0, reprovados: 0 },
    ] }],
  };
  const copia = structuredClone(entrada);
  assert.deepEqual(montarEstado(escola, entrada), {
    ...esperadoTurma, papel: 'escola', profId: null, usuario: escola, profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com', ocupados: [] }],
    historico: [{ id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01', resumo: [
      { disc: 'Lógica', alunos: '3', media: '7,2', mediaCor: 'var(--texto)', freq: '88%', freqCor: 'var(--texto)', aprov: '2', reprov: '1', reprovCor: 'var(--aviso)' },
      { disc: 'Redes', alunos: '0', media: '—', mediaCor: 'var(--texto)', freq: '—', freqCor: 'var(--texto)', aprov: '0', reprov: '0', reprovCor: 'var(--texto)' },
    ] }],
  });
  assert.deepEqual(entrada, copia);
});

test('professor usa o id autenticado e conserva o recorte recebido', () => {
  assert.deepEqual(montarEstado(professor, { ...turma, professores: [professor] }), {
    ...esperadoTurma, papel: 'prof', profId: 42, usuario: professor, profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com', ocupados: [] }], historico: [],
  });
});

test('aluno usa aluno_id e marca provisória somente na própria conta', () => {
  assert.deepEqual(montarEstado(aluno, turma), {
    ...esperadoTurma, papel: 'aluno', profId: null, usuario: aluno, profs: [], historico: [],
    alunos: [{ id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1', turma: null, turma_nome: null, provisoria: true }],
  });
  const resultado = montarEstado(aluno, { ...turma, alunos: [...turma.alunos, { id: 28, nome: 'Colega', matricula: 'A028', idade: 20, media: 0, email: null, semestre_historico: null }] });
  assert.deepEqual(resultado.alunos, [
    { id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1', turma: null, turma_nome: null, provisoria: true },
    { id: 28, nome: 'Colega', mat: 'A028', idade: 20, media: 0, email: null, hist: null, turma: null, turma_nome: null },
  ]);
});

test('professor sem disciplina recebe coleções vazias e semestre nulo', () => {
  assert.deepEqual(montarEstado(professor, { ...vazio, professores: [professor] }), {
    papel: 'prof', profId: 42, usuario: professor, semestre: null, historico: [], profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com', ocupados: [] }],
    alunos: [], discs: [], turmas: [], salas: [], eventos: [], pedidos: [], mats: {}, avals: [], avalMeta: {}, avalApi: {}, conselho: {}, notas: {}, aulas: [], avisos: [], metricas: [], selAluno: null, selDisc: null, notaDisc: null, notaAval: '',
    regra: { tipo: 'Semestre', periodos: [{ id: 'p1', nome: 'Semestre', inicio: '', fim: '', fechado: false }], itens: [], extras: { permitido: false, max: 0, peso: 1 }, participacao: { ativo: false, peso: 1 }, recuperacao: { ativo: false, modo: 'menor' }, final: { ativo: false }, arred: '0,1', mediaMin: 6, freqMin: 75, conselho: false },
  });
});

test('semestre encerrado aceita timestamp com espaço e devolve só a data', () => {
  assert.deepEqual(montarEstado(escola, { ...vazio, semestre: { id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01 12:30:00' } }).semestre,
    { id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01' });
});


test('ocupacoes da API viram ocupados sem alterar os dados recebidos', () => {
  const ocupacoes = [{ dia_semana: 1, hora_inicio: '08:00', hora_fim: '12:00', motivo: 'Outra escola' }];
  const entrada = { ...turma, professores: [{ ...professor, ocupacoes }] };
  const resultado = montarEstado(escola, entrada);
  assert.equal(resultado.profs[0].id, professor.id);
  assert.deepEqual(resultado.profs[0].ocupados, ocupacoes);
  assert.notEqual(resultado.profs[0].ocupados, ocupacoes);
  assert.deepEqual(entrada.professores[0].ocupacoes, ocupacoes);
});

test('grade e agenda traduzem ids, sala efetiva, eventos e pedidos sem perder o recorte', () => {
  const entrada = { ...turma, turmas: [{ id: 5, nome: '1º A' }], salas: [{ id: 7, nome: 'Sala 101' }],
    disciplinas: [{ ...turma.disciplinas[0], turma_id: 5, sala_id: 7, grade: [
      { dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala_id: null },
      { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala_id: 8 },
    ] }],
    eventos: [{ id: 6, tipo: 'prova', titulo: 'P2', data: '2026-10-13', fim: null, hora_inicio: null, hora_fim: null, todas_turmas: false, turma_ids: [5], disciplina_id: 13, descricao: 'Revisão' },
      { id: 9, tipo: 'feriado', titulo: 'Recesso', data: '2026-10-20', fim: '2026-10-21', hora_inicio: '08:00', hora_fim: '09:40', todas_turmas: true, turma_ids: [], disciplina_id: null, descricao: '' }],
    pedidos: [{ id: 4, professor_id: 42, disciplina_id: 13, data: '2026-10-14', hora_inicio: '13:30', hora_fim: '15:10', sala_id: null, motivo: 'Repor aula', status: 'sugestao', resposta: '', aula_id: null,
      sugestao: { data: '2026-10-15', hora_inicio: '10:00', hora_fim: '11:40', sala_id: 7 } },
      { id: 8, professor_id: 42, disciplina_id: 13, data: '2026-10-08', hora_inicio: '13:30', hora_fim: '15:10', sala_id: 7, motivo: '', status: 'aprovada', resposta: '', sugestao: null, aula_id: 74 }],
  };
  const copia = structuredClone(entrada), r = montarEstado(aluno, entrada);
  assert.deepEqual(r.turmas, [{ id: '5', nome: '1º A' }]);
  assert.deepEqual(r.salas, [{ id: '7', nome: 'Sala 101' }]);
  assert.equal(r.discs[0].turma, '5'); assert.equal(r.discs[0].sala, '7');
  assert.deepEqual(r.discs[0].grade, [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala: '7', sala_id: null }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '8', sala_id: 8 }]);
  assert.deepEqual(r.eventos, [
    { id: 6, tipo: 'prova', titulo: 'P2', data: '2026-10-13', fim: '', hi: '', hf: '', turmas: ['5'], disc: 13, desc: 'Revisão' },
    { id: 9, tipo: 'feriado', titulo: 'Recesso', data: '2026-10-20', fim: '2026-10-21', hi: '08:00', hf: '09:40', turmas: 'todas', disc: null, desc: '' },
  ]);
  assert.deepEqual(r.pedidos, [
    { id: 4, prof: 42, disc: 13, data: '2026-10-14', ini: '13:30', fim: '15:10', sala: '', motivo: 'Repor aula', status: 'sugestao', resposta: '', sug: { data: '2026-10-15', ini: '10:00', fim: '11:40', sala: '7' }, aula_id: null },
    { id: 8, prof: 42, disc: 13, data: '2026-10-08', ini: '13:30', fim: '15:10', sala: '7', motivo: '', status: 'aprovada', resposta: '', sug: null, aula_id: 74 },
  ]);
  assert.deepEqual(entrada, copia);
});

test('canvas devolve campos da API com ids inteiros e vazios nulos', () => {
  const { eventoAPI, horarioAPI, pedidoAPI, disciplinaAPI, itensGradeAPI } = adaptador();
  assert.deepEqual(eventoAPI({ tipo: 'prova', titulo: 'P2', data: '2026-10-13', fim: '', hi: '', hf: '', turmas: ['5'], disc: 13, desc: 'Revisão' }),
    { tipo: 'prova', titulo: 'P2', data: '2026-10-13', fim: null, hora_inicio: null, hora_fim: null, todas_turmas: false, turma_ids: [5], disciplina_id: 13, descricao: 'Revisão' });
  assert.deepEqual(eventoAPI({ tipo: 'evento', titulo: 'Feira', data: '2026-10-20', fim: '2026-10-21', hi: '08:00', hf: '09:40', turmas: 'todas', disc: '', desc: '' }),
    { tipo: 'evento', titulo: 'Feira', data: '2026-10-20', fim: '2026-10-21', hora_inicio: '08:00', hora_fim: '09:40', todas_turmas: true, turma_ids: [], disciplina_id: null, descricao: '' });
  assert.deepEqual(horarioAPI({ data: '2026-10-15', ini: '10:00', fim: '11:40', sala: '7' }), { data: '2026-10-15', hora_inicio: '10:00', hora_fim: '11:40', sala_id: 7 });
  assert.deepEqual(pedidoAPI({ disc: '13', data: '2026-10-14', ini: '13:30', fim: '15:10', sala: '', motivo: 'Repor aula' }), { disciplina_id: 13, data: '2026-10-14', hora_inicio: '13:30', hora_fim: '15:10', sala_id: null, motivo: 'Repor aula' });
  assert.deepEqual(horarioAPI({ data: '2026-10-15', ini: '', fim: '', sala: '' }), { data: '2026-10-15', hora_inicio: null, hora_fim: null, sala_id: null });
  assert.deepEqual(disciplinaAPI({ nome: 'Lógica', carga: 40, prof: '42', turma: '5', sala: '7' }), { nome: 'Lógica', carga_horaria: 40, professor_id: 42, turma_id: 5, sala_id: 7 });
  assert.deepEqual(disciplinaAPI({ nome: 'Lógica', carga: 40, prof: '', turma: '', sala: '' }), { nome: 'Lógica', carga_horaria: 40, professor_id: null, turma_id: null, sala_id: null });
  assert.deepEqual(itensGradeAPI([{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala: '7' }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '' }]),
    [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala_id: 7 }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala_id: null }]);
});

test('aluno com turma vira id em texto e nome; sem turma vira nulo, sem alterar a entrada', () => {
  const entrada = { ...turma, turmas: [{ id: 5, nome: '1º A' }], alunos: [
    { ...turma.alunos[0], turma_id: 5, turma_nome: '1º A' },
    { id: 28, nome: 'Colega', matricula: 'A028', idade: 20, media: 0, email: null, semestre_historico: null, turma_id: null, turma_nome: null },
  ] };
  const copia = structuredClone(entrada), r = montarEstado(escola, entrada);
  assert.deepEqual(r.alunos.map(a => [a.id, a.turma, a.turma_nome]), [[27, '5', '1º A'], [28, null, null]]);
  assert.equal(r.alunos[0].nome, 'Bia'); assert.equal(r.alunos[0].mat, 'A027'); assert.equal(r.alunos[0].media, 7.5);
  assert.deepEqual(entrada, copia);
  // Id 0 não existe, mas o teste garante que só nulo e indefinido contam como sem turma.
  assert.equal(montarEstado(escola, { ...turma, alunos: [{ ...turma.alunos[0], turma_id: 0, turma_nome: 'Zero' }] }).alunos[0].turma, '0');
  assert.equal(montarEstado(aluno, { ...turma, alunos: [{ ...turma.alunos[0], turma_id: 5, turma_nome: '1º A' }] }).alunos[0].turma, '5');
});

test('loja recebe alunos com turma, matriculas em lista e a turma do próprio aluno', () => {
  const { alunosLoja, matriculasDe, turmaDoAluno } = adaptador();
  const alunos = [{ id: 27, nome: 'Bia', mat: 'A027', turma: '5', turma_nome: '1º A' }, { id: 28, nome: 'Colega', mat: 'A028', turma: null }, { id: 29, nome: 'Sem campo', mat: 'A029' }];
  assert.deepEqual(alunosLoja(alunos), [{ id: 27, nome: 'Bia', turma: '5' }, { id: 28, nome: 'Colega', turma: null }, { id: 29, nome: 'Sem campo', turma: null }]);
  assert.deepEqual(matriculasDe({ '27-13': true, '28-13': true, '27-14': false }), [{ aluno_id: 27, disciplina_id: 13 }, { aluno_id: 28, disciplina_id: 13 }]);
  assert.deepEqual(matriculasDe({}), []);
  assert.equal(turmaDoAluno(aluno, alunos), '5');
  assert.equal(turmaDoAluno(escola, alunos), '');
  assert.equal(turmaDoAluno(aluno, [alunos[1]]), '');
  assert.equal(turmaDoAluno({ ...aluno, aluno_id: 28 }, alunos), '');
  const r = montarEstado(escola, { ...turma, alunos: [{ ...turma.alunos[0], turma_id: 5, turma_nome: '1º A' }] });
  assert.deepEqual(alunosLoja(r.alunos), [{ id: 27, nome: 'Bia', turma: '5' }]);
  assert.deepEqual(matriculasDe(r.mats), [{ aluno_id: 27, disciplina_id: 13 }]);
});

test('Portal publica alunos, matriculas, turma do aluno e carga no store', () => {
  const q = quadro([], {}, 'Portal.tsx');
  Object.assign(q.state, montarEstado(aluno, { ...turma, alunos: [{ ...turma.alunos[0], turma_id: 5, turma_nome: '1º A' }] }), { carga: 'carregando' });
  q.publicarEstado();
  assert.deepEqual(q.loja.alunos, [{ id: 27, nome: 'Bia', turma: '5' }]);
  assert.deepEqual(q.loja.matriculas, [{ aluno_id: 27, disciplina_id: 13 }]);
  assert.equal(q.loja.turmaAluno, '5'); assert.equal(q.loja.carga, 'carregando');
  q.state.carga = 'ok'; q.state.usuario = escola; q.publicarEstado();
  assert.equal(q.loja.turmaAluno, ''); assert.equal(q.loja.carga, 'ok');
});

test('renderVals do Portal fornece todos os valores que o template usa, em todos os perfis e no hub', () => {
  const usados = new Set([...readFileSync('src/portal/template.tsx', 'utf8').matchAll(/\bv\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  const dados = { ...turma, turmas: [{ id: 5, nome: '1º A' }], alunos: [{ ...turma.alunos[0], turma_id: 5, turma_nome: '1º A' }, { id: 28, nome: 'Colega', matricula: 'A028', idade: 20, media: 0, email: null, semestre_historico: null, turma_id: null, turma_nome: null }] };
  const fornecidos = new Set();
  const coletar = (usuario, extra = {}, props = {}) => {
    const q = quadro([], {}, 'Portal.tsx');
    Object.assign(q.props, props);
    Object.assign(q.state, montarEstado(usuario, dados), { logado: true, tela: 'alunos' }, extra);
    for (const k of Object.keys(q.renderVals())) fornecidos.add(k);
    return q;
  };
  coletar({ id: 0, perfil: 'escola', nome: 'Visitante', email: '', aluno_id: null }, { papel: null, logado: false, tela: 'inicio' });
  coletar(escola); coletar(escola, { hubTurma: '5', hubNova: true, hubMsg: { erro: false, t: 'ok' }, gaEd: 13, acadDisc: true, tela: 'frequencia' });
  coletar(escola, { hubTurma: '__sem' }); coletar(professor);
  // grade de notas com avaliação aberta, resultado do ano, turma do professor (com e sem estado) e estados vazios do hub
  coletar(escola, { acadDisc: true, tela: 'frequencia', subAba: 'notas', gnPer: 'p1', gnCol: 'v13_p1_i1', gnExtra: { nome: 'Lista', peso: 1 } }); coletar(escola, { gnPer: 'final' });
  const docente = { profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com', ocupados: [] }] };
  coletar(professor, { ...docente, hubTurma: '__semT', gnPer: 'p1', gnCol: 'v13_p1_i1' }); coletar(professor, docente, { estado: 'Vazio' }); coletar(escola, {}, { estado: 'Vazio' }); coletar(escola, { hubTurma: '5' });
  coletar(escola, { tela: 'professores', profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com', ocupados: [] }], painel: { tipo: 'prof', id: 42 }, painelUlt: { tipo: 'prof', id: 42 } }); coletar(aluno, { tela: 'meu-painel' });
  assert.deepEqual([...usados].filter(n => !fornecidos.has(n)), []);
});

test('hub matricula e desmatricula pela API, recarrega e mostra o detalhe do servidor', async () => {
  const chamadas = [];
  const rede = { matricular: async (...a) => { chamadas.push(['matricular', ...a]); if (a[0] === 99) throw { detalhe: 'Semestre encerrado' }; return {}; }, desmatricular: async (...a) => { chamadas.push(['desmatricular', ...a]); } };
  const q = quadro([], rede, 'Portal.tsx'); let recargas = 0;
  q.recarregar = async () => { recargas++; };
  Object.assign(q.state, montarEstado(escola, { ...turma, matriculas: [], notas: [], aulas: [], alunos: [turma.alunos[0], { ...turma.alunos[0], id: 28, nome: 'Colega' }, { ...turma.alunos[0], id: 99, nome: 'Barrado' }] }));
  q.ativo = () => ({ id: 9 });
  await q.hubToggle(27, 13);
  assert.deepEqual(chamadas, [['matricular', 27, 13]]); assert.equal(recargas, 1);
  assert.deepEqual(q.state.hubMsg, { erro: false, t: 'Bia matriculado em Python.' }); assert.equal(q.state.hubGravando, false);
  q.state.mats = { '27-13': true };
  await q.hubToggle(27, 13);
  assert.deepEqual(chamadas.at(-1), ['desmatricular', 27, 13]); assert.equal(q.state.hubMsg.t, 'Bia desmatriculado de Python.');
  await q.hubToggle(99, 13);
  assert.deepEqual(q.state.hubMsg, { erro: true, t: 'Semestre encerrado' }); assert.equal(recargas, 2);
  // coluna Todos: uma chamada por aluno que falta, a primeira falha vira a mensagem e o estado é relido
  chamadas.length = 0; recargas = 0;
  await q.hubTodos({ id: 13, nome: 'Python' }, q.state.alunos);
  assert.deepEqual(chamadas, [['matricular', 28, 13], ['matricular', 99, 13]]); assert.equal(recargas, 1);
  assert.deepEqual(q.state.hubMsg, { erro: true, t: 'Matriculei 1 de 2 em Python. Barrado: Semestre encerrado' });
  // semestre encerrado: nada é chamado
  chamadas.length = 0; q.ativo = () => null;
  await q.hubToggle(27, 13); assert.deepEqual(chamadas, []); assert.equal(q.state.hubMsg.t, 'Semestre encerrado: somente leitura.');
});

test('hub bloqueia envio duplo, não desmatricula quem tem nota e cria turma pela API', async () => {
  let concluir, chamadas = 0;
  const q = quadro([], { matricular: () => { chamadas++; return new Promise(r => { concluir = r; }); }, criarTurma: async nome => { chamadas++; return { id: 8, nome }; } }, 'Portal.tsx');
  q.recarregar = async () => {}; q.ativo = () => ({ id: 9 });
  Object.assign(q.state, montarEstado(escola, { ...turma, matriculas: [{ aluno_id: 27, disciplina_id: 13 }], turmas: [{ id: 5, nome: '1º A' }] }));
  q.state.mats = {};
  const envio = q.hubToggle(27, 13); q.hubToggle(27, 13); assert.equal(chamadas, 1);
  concluir({}); await envio; assert.equal(q.state.hubGravando, false);
  q.state.mats = { '27-13': true }; chamadas = 0;
  await q.hubToggle(27, 13); assert.equal(chamadas, 0); assert.equal(q.state.hubMsg.t, 'Bia já tem notas ou frequência em Python: não dá para desmatricular.');
  const vazio = () => q.state.hubErro;
  await q.hubCriarTurma({ preventDefault() {} }); assert.equal(vazio(), 'Dê um nome à turma.');
  q.state.hubNome = ' 1º a '; await q.hubCriarTurma({ preventDefault() {} }); assert.equal(vazio(), 'Turma já cadastrada.'); assert.equal(chamadas, 0);
  q.state.hubNome = ' 2º B '; q.state.hubNova = true; await q.hubCriarTurma({ preventDefault() {} });
  assert.equal(chamadas, 1); assert.equal(q.state.hubNova, false); assert.equal(q.state.hubMsg.t, 'Turma 2º B criada. Cadastre ou mova alunos para ela.');
});

test('aluno envia turma_id inteiro ou nulo e o aviso de matrícula mantida fica no formulário', async () => {
  const corpos = [];
  const rede = { atualizarAluno: async (id, corpo) => { corpos.push(['patch', id, corpo]); return { matriculas_mantidas: q.mantidas }; }, criarAluno: async corpo => { corpos.push(['post', corpo]); return {}; } };
  const q = quadro([], rede, 'Portal.tsx'); q.recarregar = async () => {}; q.mantidas = [{ disciplina_id: 3, disciplina_nome: 'Algoritmos' }, { disciplina_id: 4, disciplina_nome: 'Redes' }];
  Object.assign(q.state, montarEstado(escola, { ...turma, turmas: [{ id: 5, nome: '1º A' }] }));
  Object.assign(q.state, { painel: { tipo: 'aluno', id: 27 }, editando: true, fNome: 'Bia', fIdade: '20', fMat: '2026009', fEmail: '', fTurma: '5' });
  await q.salvarAluno({ preventDefault() {} });
  assert.deepEqual(corpos[0], ['patch', 27, { nome: 'Bia', idade: 20, matricula: '2026009', turma_id: 5 }]);
  assert.equal(q.state.fErro, 'Mantido em: Algoritmos, Redes (já tem nota ou presença).'); assert.equal(q.state.editando, true);
  q.mantidas = []; q.state.fTurma = ''; await q.salvarAluno({ preventDefault() {} });
  assert.equal(corpos[1][2].turma_id, null); assert.equal(q.state.editando, false); assert.equal(q.state.fErro, '');
  Object.assign(q.state, { painel: { tipo: 'novoAluno' }, fNome: 'Novo', fIdade: '19', fMat: '2026010', fEmail: '', fTurma: '5' });
  await q.cadastrarAluno({ preventDefault() {} });
  assert.deepEqual(corpos[2], ['post', { nome: 'Novo', idade: 19, matricula: '2026010', turma_id: 5 }]);
});

test('GradeAgenda: salvar e nova turma só recarregam; fechar volta o editor a nulo; abrir disciplina abre a página', async () => {
  const q = quadro([], {}, 'Portal.tsx'); let recargas = 0; q.recarregar = async () => { recargas++; }; q.atualizarURL = () => {};
  Object.assign(q.state, montarEstado(escola, turma), { gaEd: 13, tela: 'frequencia' });
  const v = q.renderVals();
  assert.equal(v.gaEdVis, true); assert.equal(v.gaDiscId, '13');
  await v.gaSalvar({ id: 13 }); await v.gaNovaTurma({ id: '8' }); assert.equal(recargas, 2); assert.equal(q.state.gaEd, 13);
  v.gaFechar(); assert.equal(q.state.gaEd, null);
  v.gaAbrirDisc('13'); assert.equal(q.state.selDisc, 13); assert.equal(q.state.acadDisc, true); assert.equal(q.state.subAba, 'alunos');
  q.recarregar = async () => { throw { detalhe: 'Fora do ar' }; };
  await q.gaSalvar(); assert.equal(q.state.rotaAviso, 'Fora do ar');
});

test('professor: boletim e disciplinas viram o Acadêmico e a rota errada ainda avisa', () => {
  const q = quadro([], {}, 'Portal.tsx'); q.atualizarURL = () => {}; q.entrarTela = () => {};
  Object.assign(q.state, montarEstado(professor, { ...turma, professores: [professor] }), { logado: true, tela: 'painel' });
  q.ir('boletim'); assert.equal(q.state.tela, 'frequencia'); assert.equal(q.state.acadDisc, true); assert.equal(q.state.subAba, 'notas'); assert.equal(q.state.rotaAviso, '');
  Object.assign(q.state, { tela: 'painel', acadDisc: false }); q.ir('disciplinas'); assert.equal(q.state.tela, 'frequencia'); assert.equal(q.state.acadDisc, true);
  q.state.tela = 'painel'; q.ir('professores');
  assert.equal(q.state.tela, 'painel'); assert.equal(q.state.rotaAviso, 'Essa tela não faz parte do perfil Professor. Você voltou ao início.');
  const a = quadro([], {}, 'Portal.tsx'); a.atualizarURL = () => {}; a.entrarTela = () => {};
  Object.assign(a.state, montarEstado(aluno, turma), { logado: true, tela: 'meu-painel' });
  for (const pedido of ['disciplinas', 'frequencia', 'boletim', 'alunos']) { a.state.rotaAviso = ''; a.ir(pedido); assert.equal(a.state.tela, 'meu-painel', pedido); assert.match(a.state.rotaAviso, /perfil Aluno/, pedido); assert.equal(a.state.acadDisc, false, pedido); }
});

test('escola: acadêmico e hub levam aos lugares certos, sem cair em tela de outro perfil', () => {
  const q = quadro([], {}, 'Portal.tsx');
  q.atualizarURL = () => {};
  Object.assign(q.state, montarEstado(escola, { ...turma, turmas: [{ id: 5, nome: '1º A' }] }), { logado: true, tela: 'painel' });
  // mudança de tela sem animação: o harness não tem DOM
  q.telaRef = { current: null }; q.mainRef = { current: null };
  q.entrarTela = () => {};
  for (const [pedido, tela, acad] of [['disciplinas', 'frequencia', true], ['frequencia', 'frequencia', false], ['boletim', 'alunos', false], ['alunos', 'alunos', false], ['grade', 'grade', false]]) {
    q.state.tela = 'painel'; q.state.acadDisc = false; q.ir(pedido);
    assert.equal(q.state.tela, tela, pedido); assert.equal(q.state.acadDisc, acad, pedido); assert.equal(q.state.rotaAviso, '', pedido);
  }
  assert.deepEqual(q.telas().map(t => t.label), ['Painel', 'Semestre', 'Professores', 'Alunos', 'Acadêmico', 'Avisos']);
});


test('excluir disciplina pelo Portal: confirma antes, bloqueia com nota e mostra o 409 do servidor', async () => {
  const apagadas = [];
  const q = quadro([], { apagarDisciplina: async id => { apagadas.push(id); if (id === 13) throw { status: 409, detalhe: 'Disciplina com histórico' }; } }, 'Portal.tsx');
  let recargas = 0; q.recarregar = async () => { recargas++; };
  Object.assign(q.state, montarEstado(escola, turma));
  // a disciplina tem nota lançada: o diálogo já abre bloqueado e não chama o servidor
  q.pedirExcluirDisc(13);
  assert.deepEqual({ ...q.state.confExc }, { id: 13, nome: 'Python', bloq: true, aulas: 2, mats: 1, erro: '' });
  const v = q.renderVals(); assert.equal(v.confExcVis, true); assert.equal(v.confExcBloq, true); assert.equal(v.confExcOk, false); assert.equal(v.confExcTitulo, 'Não dá para excluir Python');
  v.confExcSim(); assert.deepEqual(apagadas, []);
  v.confExcNao(); assert.equal(q.state.confExc, null);
  // sem nota nem chamada o diálogo pede confirmação; o servidor ainda pode recusar com 409 e a mensagem dele aparece
  q.state.notas = {}; q.state.aulas = []; q.pedirExcluirDisc(13);
  assert.equal(q.state.confExc.bloq, false); assert.match(q.renderVals().confExcTxt, /^Saem junto 0 aulas do semestre e 1 matrícula\./);
  await q.excluirDisc(13);
  assert.deepEqual(apagadas, [13]); assert.equal(recargas, 0);
  assert.equal(q.state.confExc.bloq, true); assert.equal(q.renderVals().confExcTxt, 'Disciplina com histórico'); assert.equal(q.state.excluindo, false);
});

test('grade de notas grava pela API com o id do servidor e mostra o erro dele em linha', async () => {
  const chamadas = [];
  const registrar = nome => async (...a) => { chamadas.push([nome, ...a]); return nome === 'publicarAvaliacoes' ? { publicadas: 2 } : undefined; };
  const rede = Object.fromEntries(['salvarNota', 'apagarNota', 'atualizarAvaliacao', 'apagarAvaliacao', 'criarAvaliacao', 'publicarAvaliacoes', 'aprovarConselho', 'removerConselho', 'salvarRegra'].map(n => [n, registrar(n)]));
  const q = quadro([], rede, 'Portal.tsx');
  let recargas = 0; q.recarregar = async () => { recargas++; };
  Object.assign(q.state, montarEstado(escola, turma));
  const bia = { id: 27, nome: 'Bia' };
  // nota: a chave do canvas (aluno-v13_p1_i1) vira o id inteiro do servidor
  q.setState({ gnDraft: { '27-v13_p1_i1': '7,5', '27-90': '8' } });
  await q.salvarNotaGrade('27-v13_p1_i1', 'Bia', 'P1'); await q.salvarNotaGrade('27-90', 'Bia', 'Lista 1');
  await q.limparNotaGrade(bia, { id: 'r13_p1', nome: 'Recuperação' });
  assert.deepEqual(chamadas, [['salvarNota', 88, 27, 7.5], ['salvarNota', 90, 27, 8], ['apagarNota', 91, 27]]);
  assert.equal(q.state.gnMsg.t, 'Nota de Bia em Recuperação limpa.'); assert.equal(recargas, 3);
  // publicar/rascunho, prazo, extras, publicar lançadas, conselho e regra
  chamadas.length = 0;
  await q.salvarMetaAval({ id: 'v13_p1_i1', nome: 'P1' }, { publicada: false }, 'P1 voltou para rascunho.');
  await q.salvarMetaAval({ id: 90, nome: 'Lista 1' }, { prazo: '2026-10-20' });
  await q.criarAvalGrade(13, 'p2', 'Lista 2'); await q.apagarAvalGrade({ id: 90, nome: 'Lista 1' });
  await q.publicarLancadas(13, 'p1'); assert.equal(q.state.gnMsg.t, '2 avaliações publicadas para os alunos.');
  await q.salvarConselhoAluno(bia, { id: 13 }, true); await q.salvarConselhoAluno(bia, { id: 13 }, false);
  await q.salvarRegraEscola({ ...REGRA, mediaMin: 7 });
  assert.deepEqual(chamadas, [['atualizarAvaliacao', 88, { publicada: false }], ['atualizarAvaliacao', 90, { prazo: '2026-10-20' }], ['criarAvaliacao', 13, { nome: 'Lista 2', periodo_id: 'p2' }], ['apagarAvaliacao', 90],
    ['publicarAvaliacoes', 13, 'p1'], ['aprovarConselho', 13, 27], ['removerConselho', 13, 27], ['salvarRegra', { ...REGRA, mediaMin: 7 }]]);
  // erro do servidor aparece em linha e a tela não anuncia sucesso
  const falha = async () => { throw { status: 409, detalhe: 'Período fechado pela escola: notas travadas.' }; };
  const r = quadro([], { salvarNota: falha, atualizarAvaliacao: falha, salvarRegra: async () => { throw { status: 422, detalhe: 'Períodos fora de ordem.' }; } }, 'Portal.tsx');
  r.recarregar = async () => {}; Object.assign(r.state, montarEstado(escola, turma));
  r.setState({ gnDraft: { '27-v13_p1_i1': '7' } }); await r.salvarNotaGrade('27-v13_p1_i1', 'Bia', 'P1');
  assert.deepEqual(r.state.gnMsg, { erro: true, t: 'Período fechado pela escola: notas travadas.' });
  await r.salvarMetaAval({ id: 'v13_p1_i1', nome: 'P1' }, { publicada: true }, 'publicada'); assert.equal(r.state.gnMsg.erro, true);
  await assert.rejects(r.salvarRegraEscola(REGRA), { texto: 'Períodos fora de ordem.' });
  // id desconhecido não vai ao servidor com um id inventado
  await r.limparNotaGrade(bia, { id: 'v99_p1_i1', nome: 'X' }); assert.match(r.state.gnMsg.t, /Avaliação não encontrada/);
});

test('o JS do canvas coincide com o cálculo do back (notas_calc.py) com recuperação, final, extras e arredondamento', () => {
  // Esperado gerado com notas_calc.media_ano e notas_calc.situacao do back (commit f9910f5), com a mesma regra, os mesmos pesos e as mesmas notas.
  const q = quadro([], {}, 'Portal.tsx');
  const conta = (modo, notas, papel = 'escola') => {
    Object.assign(q.state, montarEstado(escola, { ...turma, regra: { ...REGRA, recuperacao: { ativo: true, modo } } }), { papel, notas, conselho: {}, avals: [{ id: 90, did: 13, per: 'p1', nome: 'Lista 1', peso: 2, extra: true }] });
    q.state.avalMeta = { v13_p1_i1: { publicada: true }, v13_p1_pa: { publicada: true }, 90: { publicada: true }, r13_p1: { publicada: true }, v13_p2_i1: { publicada: true }, v13_p2_pa: { publicada: true }, r13_p2: { publicada: true }, f13: { publicada: false } };
    q.fr = () => ({ p: 0, t: 0, linha: [] });
    const x = q.mediaAno(27, 13, papel === 'aluno'), s = q.situacaoDisc(27, 13);
    return { ano: x.ano, fin: x.fin, m: x.m, parcial: x.parcial, sit: s.t, ok: s.ok };
  };
  // 1: recuperação 'menor' troca a menor nota do período; ano abaixo da média com final lançada vira (ano + final) / 2 = 5,75 -> 5,8
  assert.deepEqual(conta('menor', { '27-v13_p1_i1': 4, '27-v13_p1_pa': 8, '27-90': 6.5, '27-r13_p1': 7, '27-v13_p2_i1': 4, '27-f13': 6 }), { ano: 5.5, fin: 6, m: 5.8, parcial: true, sit: 'Abaixo da média', ok: false });
  // 2: recuperação 'média' só vale se for maior que a média; 6,125 -> 6,1 e 6,5; ano 6,3 e período completo
  assert.deepEqual(conta('media', { '27-v13_p1_i1': 5, '27-v13_p1_pa': 7.5, '27-90': 6, '27-r13_p1': 5, '27-v13_p2_i1': 6.5, '27-v13_p2_pa': 6.5 }), { ano: 6.3, fin: null, m: 6.3, parcial: false, sit: 'Na média', ok: true });
  // 3: o aluno só conta o que está publicado: a final (10) fica de fora
  assert.deepEqual(conta('menor', { '27-v13_p1_i1': 6, '27-v13_p1_pa': 6, '27-90': 6, '27-f13': 10 }, 'aluno'), { ano: 6, fin: null, m: 6, parcial: true, sit: 'Na média', ok: true });
});
