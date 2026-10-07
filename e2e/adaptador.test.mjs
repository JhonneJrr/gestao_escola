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
    : nome === './rede' ? rede : nome === './adaptador' ? adaptador() : {};
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
  assert.deepEqual(r.map(i => [i.data, i.ini, i.idx]), [['2026-10-08', '10:00', 0], ['2026-10-06', '08:00', null]]);
  assert.equal(q.podeArrastar(r[1]), false);
  assert.equal(q.podeArrastar(r[0]), true);
  assert.equal(r.some(i => i.data === '2026-10-05'), false);
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
  assert.equal(r.length, 1); assert.equal(r[0].idx, 0); assert.equal(q.podeArrastar(r[0]), true);
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
  assert.deepEqual(r.map(i => [i.data, i.ini]), [['2026-10-09', '13:30'], ['2026-10-07', '15:30'], ['2026-10-05', '08:00']]);
  assert.equal(r[0].pedido.id, 1); assert.equal(r[0].remarcada, true);
  assert.equal(r[2].sala, '7'); assert.equal(r[2].pendente, false); assert.equal(r[2].pedido, undefined);
  assert.equal(r.some(i => i.pedido?.id === 2), false);
  const aluno = q.instSemana('2026-10-05', q.state, {}, 'aluno').filter(i => i.tipo === 'extra');
  assert.equal(aluno.length, 2); assert.equal(aluno.some(i => i.pendente), false);
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
    assert.equal(q.state.gravando['resposta-1'], false, api);
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
const turma = {
  ...vazio,
  semestre: { id: 9, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null },
  alunos: [{ id: 27, nome: 'Bia', matricula: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', semestre_historico: '2026.1' }],
  disciplinas: [{ id: 13, nome: 'Python', carga_horaria: 40, professor_id: 42, professor_nome: 'Docente', grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }] }],
  matriculas: [{ aluno_id: 27, disciplina_id: 13 }],
  avaliacoes: [{ id: 88, disciplina_id: 13, nome: 'P1', peso: 100 }],
  notas: [{ aluno_id: 27, avaliacao_id: 88, valor: 0 }],
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
  mats: { '27-13': true }, avals: [{ id: 88, did: 13, nome: 'P1', peso: 100 }], notas: { '27-88': 0 },
  aulas: [
    { aula_id: 73, disciplina_id: 13, data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40', status: 'agendada', origem: 'grade', remarcada_de: '2026-10-05', chamada: { '27': false } },
    { aula_id: 74, disciplina_id: 13, data: '2026-10-08', hora_inicio: null, hora_fim: null, status: 'cancelada', origem: 'extra', remarcada_de: null, chamada: null },
  ],
  avisos: [{ id: 6, titulo: 'Prova', data: '2026-10-06', msg: 'Sala 2', disciplina_id: 13, autor_id: 42, autor_nome: 'Docente' }],
  metricas: [{ aluno_id: 27, media_geral: 0, frequencia_geral: 0, aprovado: false, disciplinas: [{ disciplina_id: 13, media: 0, parcial: false, frequencia: 0 }] }],
  selAluno: 27, selDisc: 13, notaDisc: 13, notaAval: 88,
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
    alunos: [], discs: [], turmas: [], salas: [], eventos: [], pedidos: [], mats: {}, avals: [], notas: {}, aulas: [], avisos: [], metricas: [], selAluno: null, selDisc: null, notaDisc: null, notaAval: '',
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
