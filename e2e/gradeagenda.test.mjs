import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Carrega um .ts sem montar React nem acessar serviços.
function carregarTS(arquivo) {
  const codigo = ts.transpileModule(readFileSync('src/portal/' + arquivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', codigo)(modulo, modulo.exports);
  return modulo.exports;
}
const regras = carregarTS('grade-regras.ts');
const { alunosDaChamada, faltamMarcar, presencasAPI, motivoSemChamada, mapaFeriados, feriadoDaTurma } = regras;

// Executa a lógica da tela com a loja e a rede de mentira.
function tela(loja = {}, rede = {}, props = {}) {
  const chamadasRecarga = [];
  const base = {
    perfil: 'escola', usuario: { id: 1, nome: 'Escola' }, carga: 'ok', turmas: [{ id: '5', nome: '1º A' }], salas: [{ id: '7', nome: 'Sala 7' }, { id: '8', nome: 'Sala 8' }],
    semestre: { id: 1, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null },
    disciplinas: [{ id: 13, nome: 'Python', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '8', sala_id: 8 }, { dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala: '7', sala_id: null }] }],
    professores: [{ id: 42, nome: 'Docente', ocupados: [] }], aulas: [], eventos: [], pedidos: [], alunos: [], matriculas: [], turmaAluno: '', avisar: () => {},
  };
  const lojaFinal = { ...base, ...loja };
  class DCLogic {
    props = {};
    setState(u, cb) { this.state = { ...this.state, ...(typeof u === 'function' ? u(this.state) : u) }; cb?.(); }
  }
  const codigo = ts.transpileModule(readFileSync('src/portal/GradeAgenda.tsx', 'utf8').replaceAll('import.meta.env.DEV', 'false'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
  const modulo = { exports: {} };
  const require = nome => nome === 'react' ? { createRef: () => ({ current: null }) }
    : nome === './dc' ? { DCLogic, criarDC: (_n, _t, classe) => classe }
    : nome === './loja' ? { lerLoja: () => lojaFinal, recarregarLoja: async () => { chamadasRecarga.push(1); }, assinar: () => () => {} }
    : nome === './rede' ? rede : nome === './adaptador' ? carregarTS('adaptador.ts') : nome === './grade-regras' ? regras : {};
  new Function('module', 'exports', 'require', 'window', codigo)(modulo, modulo.exports, require, { location: { search: '' } });
  const q = new modulo.exports.default();
  q.props = { perfil: 'Escola', ...props }; q.loja = lojaFinal; q.recargas = chamadasRecarga;
  q.agora = () => ({ data: '2026-10-07', min: 620 });
  q.receberLoja();
  return q;
}

test('chamada: matriculados mais quem já tem presença na aula, sem usar a turma cadastral', () => {
  const alunos = [{ id: 1, nome: 'Ana' }, { id: 2, nome: 'Bia' }, { id: 3, nome: 'Caio' }, { id: 4, nome: 'Davi' }];
  const matriculas = [{ aluno_id: 1, disciplina_id: 13 }, { aluno_id: 3, disciplina_id: 14 }, { aluno_id: 4, disciplina_id: 13 }];
  assert.deepEqual(alunosDaChamada(alunos, matriculas, 13, null).map(a => a.id), [1, 4]);
  // Bia saiu da disciplina mas tem presença registrada: continua na revisão. Caio é de outra disciplina.
  assert.deepEqual(alunosDaChamada(alunos, matriculas, 13, { 2: false, 1: true }).map(a => a.id), [1, 2, 4]);
  assert.deepEqual(alunosDaChamada(alunos, [], 13, null), []);
  assert.deepEqual(alunosDaChamada(alunos, matriculas, 13, { 3: null }).map(a => a.id), [1, 4]);
});

test('chamada: corpo da API tem boolean por aluno e conserva presença de quem não aparece mais', () => {
  const lista = [{ id: 1, nome: 'Ana' }, { id: 4, nome: 'Davi' }];
  assert.equal(faltamMarcar(lista, { 1: true }), 1);
  assert.equal(faltamMarcar(lista, { 1: true, 4: false }), 0);
  assert.deepEqual(presencasAPI(lista, { 1: true, 4: false }, null), [{ aluno_id: 1, presente: true }, { aluno_id: 4, presente: false }]);
  assert.deepEqual(presencasAPI(lista, { 1: false, 4: true }, { 1: true, 9: true, 8: false }),
    [{ aluno_id: 1, presente: false }, { aluno_id: 4, presente: true }, { aluno_id: 8, presente: false }, { aluno_id: 9, presente: true }]);
});

test('chamada: motivo de bloqueio segue a ordem semestre, cancelada, feriado, futura', () => {
  const base = { encerrado: false, data: '2026-10-07', hoje: '2026-10-07' };
  assert.equal(motivoSemChamada(base), '');
  assert.equal(motivoSemChamada({ ...base, data: '2026-10-08' }), 'A chamada abre no dia da aula.');
  assert.equal(motivoSemChamada({ ...base, data: '2026-10-08', feriado: 'Feriado' }), 'Sem aula: Feriado.');
  assert.equal(motivoSemChamada({ ...base, feriado: 'Feriado', cancelada: true }), 'Aula cancelada.');
  assert.equal(motivoSemChamada({ ...base, cancelada: true, encerrado: true, encerradoEm: '2026-07-01T10:00:00' }), 'Semestre encerrado em 01/07/2026: somente leitura.');
  assert.equal(motivoSemChamada({ ...base, semSemestre: true }), 'Sem semestre ativo: somente leitura.');
});

test('feriado de algumas turmas só vale para aulas dessas turmas', () => {
  const mapa = mapaFeriados([
    { tipo: 'feriado', titulo: 'Recesso', data: '2026-10-12', fim: '2026-10-13', turmas: 'todas' },
    { tipo: 'feriado', titulo: 'Passeio do 1º A', data: '2026-10-20', turmas: ['5'] },
    { tipo: 'prova', titulo: 'P1', data: '2026-10-21', turmas: 'todas' },
  ]);
  assert.deepEqual(Object.keys(mapa), ['2026-10-12', '2026-10-13']);
  assert.equal(feriadoDaTurma(mapa, '9', '2026-10-13'), 'Recesso');
  assert.equal(feriadoDaTurma(mapa, '5', '2026-10-20'), 'Passeio do 1º A');
  assert.equal(feriadoDaTurma(mapa, '9', '2026-10-20'), '');
  assert.equal(feriadoDaTurma(mapa, '', '2026-10-20'), '');
  assert.equal(feriadoDaTurma({}, '5', '2026-10-20'), '');
  assert.equal(feriadoDaTurma(mapa, '5', '2026-10-21'), '');
});

test('Quadro: aula cancelada aparece como cancelada e arrasto só vale para aula futura, aberta e sem chamada', () => {
  const aulas = [
    { aula_id: 1, disciplina_id: 13, origem: 'grade', status: 'cancelada', data: '2026-10-08', hora_inicio: '10:00', hora_fim: '11:40', chamada: null },
    { aula_id: 2, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-06', hora_inicio: '08:00', hora_fim: '09:40', chamada: { 9: true } },
  ];
  const q = tela({ aulas });
  const r = q.instSemana('2026-10-05', q.state, q.ferMap(q.state.eventos), 'escola');
  const futura = r.find(i => i.data === '2026-10-08'), passada = r.find(i => i.data === '2026-10-06');
  assert.equal(futura.cancelada, true); assert.equal(q.podeArrastar(futura), false);
  assert.equal(passada.feita, true); assert.equal(q.podeArrastar(passada), false);
  const livre = tela(), semana = livre.instSemana('2026-10-05', livre.state, {}, 'escola').find(i => i.data === '2026-10-08');
  assert.equal(livre.podeArrastar(semana), true);
  livre.loja.semestre = { ...livre.loja.semestre, encerrado_em: '2026-10-01' };
  assert.equal(livre.podeArrastar(semana), false);
});

test('Quadro: feriado de uma turma só marca aula dessa turma e some do conflito', () => {
  const eventos = [{ id: 1, tipo: 'feriado', titulo: 'Passeio', data: '2026-10-08', fim: '', turmas: ['5'], hi: '', hf: '', disc: null, desc: '' }];
  const q = tela({ eventos, disciplinas: [
    { id: 13, nome: 'Python', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '7' }] },
    { id: 14, nome: 'Redes', turma: '6', professor_id: 43, sala: '8', carga_horaria: 40, grade: [{ dia_semana: 4, hora_inicio: '13:30', hora_fim: '15:10', sala: '8' }] },
  ] });
  const r = q.instSemana('2026-10-05', q.state, q.ferMap(q.state.eventos), 'escola');
  assert.equal(r.find(i => i.disc.id === 13).feriado, 'Passeio'); assert.equal(r.find(i => i.disc.id === 14).feriado, '');
});

test('editor: horário sem sala herda a sala da disciplina na conferência de choque', () => {
  const q = tela({ disciplinas: [
    { id: 13, nome: 'Python', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '7' }] },
    { id: 14, nome: 'Redes', turma: '6', professor_id: 43, sala: '7', carga_horaria: 40, grade: [] },
  ], professores: [{ id: 42, nome: 'A', ocupados: [] }, { id: 43, nome: 'B', ocupados: [] }] });
  const f = { turma: '6', prof: '43', sala: '7', grade: [{ k: 1, dia: '4', ini: '10:00', fim: '11:40', sala: '' }] };
  assert.match(q.errosDisc(f, 14)[0], /Sala 7 já está com Python/);
});

test('chamada grava pela API com a data da aula e só então volta ao painel da aula', async () => {
  const chamadas = [];
  const aulas = [{ aula_id: 5, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-07', hora_inicio: '08:00', hora_fim: '09:40', chamada: { 4: false } }];
  const q = tela({ aulas, alunos: [{ id: 1, nome: 'Ana Souza', turma: '5' }, { id: 4, nome: 'Davi Alves', turma: '5' }, { id: 9, nome: 'Fora Turma', turma: '5' }], matriculas: [{ aluno_id: 1, disciplina_id: 13 }, { aluno_id: 4, disciplina_id: 13 }] },
    { salvarChamada: async (...args) => { chamadas.push(args); } });
  q.state.discs[0].grade = [{ dia_semana: 3, hora_inicio: '08:00', hora_fim: '09:40', sala: '7' }];
  const inst = q.instSemana('2026-10-05', q.state, {}, 'escola').find(i => i.data === '2026-10-07');
  q.abrirChamada(inst);
  assert.deepEqual(q.state.chamF, { 4: false });
  let ch = q.valsPainel(q.state, 'escola', q.agora(), {}).ch;
  assert.deepEqual(ch.alunos.map(a => a.nome), ['Ana Souza', 'Davi Alves']);
  ch.salvar(); assert.equal(chamadas.length, 0); assert.match(q.state.chamErro, /Falta 1/);
  ch.alunos[0].marcarP(); ch = q.valsPainel(q.state, 'escola', q.agora(), {}).ch;
  const envio = ch.salvar(); ch.salvar();
  assert.equal(q.valsPainel(q.state, 'escola', q.agora(), {}).ch.botao, 'Salvando…');
  await envio; await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(chamadas, [[13, { data: '2026-10-07', presencas: [{ aluno_id: 1, presente: true }, { aluno_id: 4, presente: false }] }]]);
  assert.equal(q.recargas.length, 1); assert.equal(q.state.painel.tipo, 'aula'); assert.equal(q.state.salvando, null);
});

test('chamada com erro mostra o detail do servidor e não fecha o painel', async () => {
  const aulas = [{ aula_id: 5, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-07', hora_inicio: '08:00', hora_fim: '09:40', chamada: null }];
  for (const [falha, texto] of [[{ status: 409, detalhe: 'Semestre encerrado' }, 'Semestre encerrado'], [{ status: 0, detalhe: 'Não foi possível falar com o servidor.' }, 'Não consegui salvar. Confira a conexão e tente de novo.']]) {
    const q = tela({ aulas, alunos: [{ id: 1, nome: 'Ana', turma: '5' }], matriculas: [{ aluno_id: 1, disciplina_id: 13 }] }, { salvarChamada: async () => { throw falha; } });
    q.state.discs[0].grade = [{ dia_semana: 3, hora_inicio: '08:00', hora_fim: '09:40', sala: '7' }];
    q.abrirChamada(q.instSemana('2026-10-05', q.state, {}, 'escola').find(i => i.data === '2026-10-07'));
    q.setState({ chamF: { 1: true } });
    await q.valsPainel(q.state, 'escola', q.agora(), {}).ch.salvar(); await new Promise(r => setTimeout(r, 0));
    assert.equal(q.valsPainel(q.state, 'escola', q.agora(), {}).chamErro, texto);
    assert.equal(q.state.painel.tipo, 'chamada'); assert.equal(q.recargas.length, 0);
  }
});

test('aula futura, cancelada, de feriado ou de semestre encerrado não abre chamada', () => {
  const q = tela(); const now = q.agora();
  const pn = { key: 'k', disc: 13, data: '2026-10-07', ini: '08:00', itipo: 'grade', pendente: false };
  assert.equal(q.chamadaInfo(pn, q.state, now, 'escola').off, '');
  assert.equal(q.chamadaInfo({ ...pn, data: '2026-10-08' }, q.state, now, 'escola').off, 'A chamada abre no dia da aula.');
  assert.equal(q.chamadaInfo({ ...pn, cancelada: true }, q.state, now, 'escola').off, 'Aula cancelada.');
  assert.equal(q.chamadaInfo({ ...pn, feriado: 'Dia X' }, q.state, now, 'escola').off, 'Sem aula: Dia X.');
  assert.equal(q.chamadaInfo(pn, q.state, now, 'aluno').vis, false);
  q.loja.semestre = { ...q.loja.semestre, encerrado_em: '2026-10-01' };
  assert.match(q.chamadaInfo(pn, q.state, now, 'escola').off, /^Semestre encerrado em 01\/10\/2026/);
});

test('reverter grava de novo a grade anterior pela API e recarrega', async () => {
  const grades = [];
  const q = tela({}, { salvarGrade: async (...args) => { grades.push(args); } });
  const d = q.state.discs[0], i = { key: 'k', tkey: '13-0', disc: d, idx: 0, data: '2026-10-08', dataOrig: '2026-10-08', ini: '10:00', fim: '11:40', tipo: 'grade' };
  q.setState({ pend: { inst: i, alvo: { dia: 5, ini: '13:30', fim: '15:10' }, novaData: '2026-10-09', erroSemana: '', erroGrade: '' } });
  await q.confirmar('grade');
  assert.equal(grades.length, 1); assert.equal(grades[0][1][0].dia_semana, 5);
  assert.match(q.state.msg.t, /agora fica na grade às sextas/); assert.ok(q.state.msg.snap);
  assert.equal(q.renderVals().temDesfazer, true);
  q.renderVals().pedirReverter(); assert.equal(q.state.reverter, true);
  await q.renderVals().confReverter();
  // A grade anterior volta como a API a guardava: sala própria preservada, inclusive a nula.
  assert.deepEqual(grades[1], [13, [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala_id: 8 }, { dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40', sala_id: null }]]);
  assert.equal(q.recargas.length, 2); assert.equal(q.state.reverter, false); assert.equal(q.state.msg.t, 'Revertido. A grade voltou ao que era antes.');
});

test('reverter com falha mostra o erro e mantém a confirmação', async () => {
  let chamou = 0;
  const q = tela({}, { salvarGrade: async () => { chamou++; if (chamou > 1) throw { status: 500, detalhe: 'Erro do servidor' }; } });
  const d = q.state.discs[0];
  q.setState({ pend: { inst: { key: 'k', tkey: '13-0', disc: d, idx: 0, data: '2026-10-08', dataOrig: '2026-10-08', ini: '10:00', fim: '11:40', tipo: 'grade' }, alvo: { dia: 5, ini: '13:30', fim: '15:10' }, novaData: '2026-10-09' } });
  await q.confirmar('grade'); q.setState({ reverter: true });
  await q.renderVals().confReverter();
  const v = q.renderVals();
  assert.equal(v.revErro, 'Erro do servidor'); assert.equal(v.revTemErro, true); assert.equal(v.reverterVis, true); assert.equal(v.revTxt, 'Reverter');
});

test('disciplina: cadastro salvo e grade falha diz o que foi gravado e recarrega', async () => {
  const q = tela({}, { atualizarDisciplina: async id => ({ id }), salvarGrade: async () => { throw { status: 409, detalhe: 'Choque de horário' }; } });
  q.abrirDisc(q.state.discs[0]);
  await q.salvarDisc({ preventDefault() {} });
  assert.equal(q.state.dErro, 'Cadastro salvo; a grade não foi: Choque de horário');
  assert.equal(q.state.dOk, ''); assert.equal(q.recargas.length, 1); assert.deepEqual(q.state.painel, { tipo: 'disc', id: 13 });
});

test('disciplina salva: avisa o Portal só depois das duas chamadas e recarrega', async () => {
  const avisos = [], ordem = [];
  const q = tela({}, { atualizarDisciplina: async id => { ordem.push('disc'); return { id }; }, salvarGrade: async () => { ordem.push('grade'); } }, { aoSalvar: d => avisos.push(d) });
  q.abrirDisc(q.state.discs[0]);
  const envio = q.salvarDisc({ preventDefault() {} }); assert.deepEqual(avisos, []);
  await envio;
  assert.deepEqual(ordem, ['disc', 'grade']); assert.deepEqual(avisos, [{ id: 13 }]); assert.match(q.state.dOk, /Grade salva: 2 aulas por semana/);
});

test('assistente: gravação parcial lista o que foi gravado e o que falhou, sem anunciar sucesso geral', async () => {
  const q = tela({ disciplinas: [
    { id: 13, nome: 'Python', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [] },
    { id: 14, nome: 'Redes', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [] },
  ] }, { salvarGrade: async id => { if (id === 14) throw { status: 409, detalhe: 'Choque' }; } });
  q.state.iaProp = { proposta: [{ disciplina_id: 13, disciplina_nome: 'Python', itens: [{ dia_semana: 1, hora_inicio: '08:00', hora_fim: '09:40' }] }, { disciplina_id: 14, disciplina_nome: 'Redes', itens: [{ dia_semana: 1, hora_inicio: '08:00', hora_fim: '09:40' }] }], moves: [], rec: [] };
  await q.iaAplicar();
  assert.equal(q.state.iaFeito, 'Gravadas: Python. Falhou: Redes: Choque.');
  assert.match(q.state.msg.t, /só em parte/); assert.deepEqual(q.state.msg.snap.grades.map(g => g.id), [13]); assert.equal(q.recargas.length, 1);
});

test('assistente: se nada foi gravado mostra o erro e deixa tentar de novo', async () => {
  const q = tela({}, { salvarGrade: async () => { throw { status: 0, detalhe: 'x' }; } });
  q.state.iaProp = { proposta: [{ disciplina_id: 13, disciplina_nome: 'Python', itens: [] }], moves: [], rec: [] };
  await q.iaAplicar();
  assert.equal(q.state.iaFeito, null); assert.equal(q.valsIa(q.state).iaTemGravErro, true); assert.equal(q.valsIa(q.state).iaAcoes, true);
  assert.match(q.valsIa(q.state).iaGravErro, /Falhou: Python: Não consegui salvar/);
});

test('assistente: erro de envio fica à parte da conversa e Tentar de novo reenvia a mesma mensagem', async () => {
  let n = 0; const enviadas = [];
  const q = tela({}, { erroGradeIA: er => er.status === 503 ? 'O assistente não está configurado neste servidor.' : 'x', pedirGradeIA: async m => { enviadas.push(m); if (++n === 1) throw { status: 503 }; return { resposta: 'Ok', proposta: [], recusados: [] }; } });
  await q.iaEnviar('Monte a grade');
  assert.equal(q.valsIa(q.state).iaTemErro, true); assert.equal(q.valsIa(q.state).iaErro, 'O assistente não está configurado neste servidor.'); assert.equal(q.state.iaMsgs.length, 1); assert.equal(q.state.iaEnv, false);
  await q.iaTentar();
  assert.equal(q.state.iaErro, ''); assert.deepEqual(q.state.iaMsgs.map(m => m.papel), ['usuario', 'ia']);
  assert.deepEqual(enviadas[1], [{ papel: 'usuario', texto: 'Monte a grade' }]);
});

test('nova turma e nova sala: criam pela API, avisam o Portal e voltam ao editor com o novo valor', async () => {
  const novas = [];
  const q = tela({}, { criarTurma: async nome => ({ id: 77, nome }), criarSala: async nome => ({ id: 88, nome }) }, { aoNovaTurma: t => novas.push(t) });
  q.abrirDisc(null); const volta = { painel: q.state.painel, dF: q.state.dF };
  q.abrirNovo('turma', volta); q.setState({ nomeF: '1º A' });
  await q.salvarNovo({ preventDefault() {} }); assert.equal(q.state.nomeErro, 'Turma já cadastrada.'); assert.equal(q.recargas.length, 0);
  q.setState({ nomeF: '1º B' }); await q.salvarNovo({ preventDefault() {} });
  assert.deepEqual(novas, [{ id: '77', nome: '1º B' }]); assert.equal(q.state.painel, volta.painel); assert.equal(q.state.dF.turma, '77'); assert.equal(q.recargas.length, 1);
  q.abrirNovo('sala'); q.setState({ nomeF: 'Sala 9' }); await q.salvarNovo({ preventDefault() {} });
  assert.equal(q.state.painel, null); assert.equal(q.state.msgDisc, 'Sala Sala 9 cadastrada.'); assert.equal(novas.length, 1);
});

test('modo editor único abre a disciplina do store e avisa o Portal quando o painel fecha', async () => {
  const fechou = [];
  const q = tela({}, {}, { soEditor: true, discId: 13, aoFechar: () => fechou.push(1) });
  q.iniciarEditor(); assert.deepEqual(q.state.painel, { tipo: 'disc', id: 13 }); assert.equal(q.state.dF.nome, 'Python');
  assert.equal(q.renderVals().conteudoVis, false);
  q.setState({ painel: null }); await new Promise(r => setTimeout(r, 5)); assert.equal(fechou.length, 1);
  const novo = tela({}, {}, { soEditor: true }); novo.iniciarEditor();
  assert.deepEqual(novo.state.painel, { tipo: 'disc', id: null }); assert.equal(novo.state.dF.turma, ''); assert.equal(novo.state.dF.sala, '');
});

test('carga vem do store: carregando e erro mostram esqueleto e erro; Tentar de novo recarrega', async () => {
  const q = tela({ carga: 'carregando' }); let v = q.renderVals();
  assert.equal(v.skQuadro, true); assert.equal(v.abaQuadro, false); assert.equal(v.cargaErro, false);
  q.loja.carga = 'erro'; v = q.renderVals(); assert.equal(v.cargaErro, true); assert.equal(v.skQuadro, false);
  q.loja.carga = 'ok'; v = q.renderVals(); assert.equal(v.abaQuadro, true);
  await v.tentarCarregar !== undefined; q.loja.carga = 'erro'; await q.tentarCarregar(); assert.equal(q.recargas.length, 1);
});

test('Sem turma e Sem sala aparecem nos nomes e o Quadro vazio tem mensagem por perfil', () => {
  const q = tela({ disciplinas: [{ id: 20, nome: 'Projeto', turma: '', professor_id: null, sala: '', carga_horaria: 40, grade: [] }] });
  const v = q.renderVals();
  assert.equal(v.quadroVazio, true); assert.equal(v.quadroVazioMsg, 'Nenhuma aula na grade. Monte os horários ou peça ao assistente.');
  assert.equal(v.eixoDias, false); assert.equal(v.dragDicaVis, false);
  q.props.perfil = 'Aluno'; assert.equal(q.renderVals().quadroVazioMsg, 'Você ainda não está numa turma. Fale com a secretaria.');
  q.props.perfil = 'Professor'; assert.equal(q.renderVals().quadroVazioMsg, 'Nenhuma aula sua na grade.');
});

const aulaQuinta = { aula_id: 6, disciplina_id: 13, origem: 'grade', status: 'agendada', data: '2026-10-08', hora_inicio: '10:00', hora_fim: '11:40', chamada: null, remarcada_de: null };
const abrirAulaQuinta = q => { q.abrirAula(q.instSemana('2026-10-05', q.state, {}, 'escola').find(i => i.data === '2026-10-08')); return () => q.valsPainel(q.state, 'escola', q.agora(), {}); };

test('cancelar e reativar aula gravam o status pela API, recarregam e mostram o erro do servidor', async () => {
  const chamadas = [];
  const q = tela({ aulas: [aulaQuinta] }, { atualizarAula: async (...a) => { chamadas.push(a); } });
  const vals = abrirAulaQuinta(q);
  assert.equal(vals().paCancVis, true); assert.equal(vals().paReatVis, false); assert.equal(vals().paCancOff, false);
  const envio = vals().paCancelar(); vals().paCancelar();
  assert.equal(vals().paCancTxt, 'Salvando…'); await envio;
  assert.deepEqual(chamadas, [[6, { status: 'cancelada' }]]); assert.equal(q.recargas.length, 1);
  assert.equal(q.state.painel.cancelada, true); assert.match(q.state.msg.t, /Python · 1º A de 08\/10 cancelada\./);
  await vals().paReativar(); assert.deepEqual(chamadas.at(-1), [6, { status: 'agendada' }]); assert.equal(q.state.painel.cancelada, false);
  // erro do servidor aparece na mensagem e não troca o estado do painel
  const r = tela({ aulas: [aulaQuinta] }, { atualizarAula: async () => { throw { status: 409, detalhe: 'Aula já tem presenças' }; } });
  const v2 = abrirAulaQuinta(r); await v2().paCancelar();
  assert.equal(r.state.msg.t, 'Aula já tem presenças'); assert.equal(r.state.painel.cancelada, false); assert.equal(r.recargas.length, 0);
});

test('cancelar fica bloqueado com chamada feita, aula que já passou ou semestre encerrado', async () => {
  const chamadas = [];
  const rede = { atualizarAula: async (...a) => { chamadas.push(a); } };
  const feita = tela({ aulas: [{ ...aulaQuinta, chamada: { 1: true } }] }, rede); const vf = abrirAulaQuinta(feita);
  assert.equal(vf().paCancOff, true); assert.equal(vf().paCancDica, 'Aula já tem presenças'); vf().paCancelar();
  const passada = tela({ aulas: [{ ...aulaQuinta, data: '2026-10-06' }] }, rede); passada.state.discs[0].grade = [{ dia_semana: 2, hora_inicio: '10:00', hora_fim: '11:40', sala: '8' }];
  passada.abrirAula(passada.instSemana('2026-10-05', passada.state, {}, 'escola').find(i => i.data === '2026-10-06'));
  assert.equal(passada.valsPainel(passada.state, 'escola', passada.agora(), {}).paCancDica, 'Aula já começou ou passou');
  const enc = tela({ aulas: [aulaQuinta], semestre: { id: 1, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: '2026-10-01' } }, rede); const ve = abrirAulaQuinta(enc);
  await ve().paCancelar(); await ve().paReativar();
  assert.deepEqual(chamadas, []); assert.match(enc.state.msg.t, /^Semestre encerrado em 01\/10\/2026/);
});

test('aula extra direta da escola cria a aula pela API na sala da disciplina e mostra o erro do servidor', async () => {
  const chamadas = [];
  const q = tela({}, { criarAula: async (...a) => { chamadas.push(a); } });
  q.setState({ aba: 'pedidos', xAberto: true });
  const ped = () => q.valsPed(q.state, 'escola');
  ped().setXDisc({ target: { value: '13' } });
  for (const [k, v] of [['Data', '2026-10-14'], ['Ini', '14:00'], ['Fim', '15:40']]) ped()['setX' + k]({ target: { value: v } });
  assert.equal(ped().xF.sala, '7'); assert.equal(ped().xCk, 'Horário livre para o professor, a turma e a sala.');
  ped().setXSala({ target: { value: '8' } }); assert.equal(ped().xF.sala, '7'); assert.match(ped().xMsg, /usa a sala da disciplina: Sala 7/);
  await ped().criarX({ preventDefault() {} });
  assert.deepEqual(chamadas, [[13, { data: '2026-10-14', hora_inicio: '14:00', hora_fim: '15:40' }]]);
  assert.equal(q.recargas.length, 1); assert.match(ped().xMsg, /^Aula extra criada: Python em 14\/10, 14:00\./); assert.equal(ped().xF.data, '');
  // data passada, dia de aula da grade e erro do servidor
  ped().setXIni({ target: { value: '14:00' } }); ped().setXFim({ target: { value: '15:40' } }); ped().setXData({ target: { value: '2026-10-05' } }); assert.equal(ped().xCk, 'Escolha uma data futura.'); assert.equal(ped().xOff, true);
  ped().setXData({ target: { value: '2026-10-15' } }); assert.equal(ped().xCk, 'Já existe aula dessa disciplina nesse dia.');
  const r = tela({}, { criarAula: async () => { throw { status: 409, detalhe: 'Já existe aula nessa data' }; } });
  r.setState({ aba: 'pedidos', xF: { disc: '13', data: '2026-10-14', ini: '14:00', fim: '15:40', sala: '7' } });
  await r.valsPed(r.state, 'escola').criarX({ preventDefault() {} }); assert.equal(r.state.xMsg, 'Já existe aula nessa data'); assert.equal(r.recargas.length, 0);
});

test('excluir disciplina: confirma, bloqueia com chamada e usa o 409 do servidor', async () => {
  const apagadas = [];
  const q = tela({}, { apagarDisciplina: async id => { apagadas.push(id); } });
  q.abrirDisc(q.state.discs[0]);
  const pn = () => q.valsPainel(q.state, 'escola', q.agora(), {});
  assert.equal(pn().dExcVis, true); assert.equal(pn().dExcPerg, true);
  pn().dExcPedir(); assert.equal(pn().dExcConf, true); assert.match(pn().dExcTxt, /^Excluir Python · 1º A\? Saem junto 2 horários semanais/);
  pn().dExcCancelar(); assert.equal(pn().dExcPerg, true);
  pn().dExcPedir(); await pn().dExcConfirmar();
  assert.deepEqual(apagadas, [13]); assert.equal(q.recargas.length, 1); assert.equal(q.state.painel, null); assert.equal(q.state.msg.t, 'Python · 1º A excluída.');
  const comChamada = tela({ aulas: [{ ...aulaQuinta, chamada: { 1: true } }] }, { apagarDisciplina: async id => { apagadas.push(id); } }); comChamada.abrirDisc(comChamada.state.discs[0]);
  comChamada.valsPainel(comChamada.state, 'escola', comChamada.agora(), {}).dExcPedir();
  assert.equal(comChamada.valsPainel(comChamada.state, 'escola', comChamada.agora(), {}).dExcBloq, true);
  const r = tela({}, { apagarDisciplina: async () => { throw { status: 409, detalhe: 'Disciplina com histórico' }; } }); r.abrirDisc(r.state.discs[0]);
  r.valsPainel(r.state, 'escola', r.agora(), {}).dExcPedir(); await r.valsPainel(r.state, 'escola', r.agora(), {}).dExcConfirmar();
  const pr = r.valsPainel(r.state, 'escola', r.agora(), {}); assert.equal(pr.dExcBloq, true); assert.equal(pr.dExcBloqTxt, 'Disciplina com histórico'); assert.equal(r.recargas.length, 0);
  // com o Portal por cima, o pedido de exclusão sobe para ele e o painel fecha
  const sobe = []; const p = tela({}, {}, { aoExcluir: id => sobe.push(id) }); p.abrirDisc(p.state.discs[0]);
  p.valsPainel(p.state, 'escola', p.agora(), {}).dExcPedir(); assert.deepEqual(sobe, [13]); assert.equal(p.state.painel, null);
});

test('somente leitura: o aviso aparece, o Quadro não arrasta e as gravações recusam', () => {
  const q = tela({ semestre: { id: 1, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: '2026-10-01' } });
  assert.match(q.soLeitura(), /^Semestre encerrado em 01\/10\/2026: somente leitura\.$/);
  const v = q.renderVals(); assert.equal(v.roVis, true); assert.equal(v.roTxt, q.soLeitura());
  assert.equal(q.podeArrastar({ tipo: 'grade', idx: 0, data: '2026-10-08', ini: '10:00', fim: '11:40' }), false);
  const livre = tela(); assert.equal(livre.soLeitura(), ''); assert.equal(livre.renderVals().roVis, false);
  assert.equal(livre.podeArrastar({ tipo: 'grade', idx: 0, data: '2026-10-08', ini: '10:00', fim: '11:40' }), true);
  assert.equal(livre.podeArrastar({ tipo: 'grade', idx: 0, data: '2026-10-07', ini: '08:00', fim: '09:40' }), false);
  const porProp = tela({}, {}, { somenteLeitura: 'Sem semestre ativo: somente leitura. Abra um semestre na aba Semestre.' });
  assert.equal(porProp.renderVals().roTxt, 'Sem semestre ativo: somente leitura. Abra um semestre na aba Semestre.');
  q.abrirDisc(q.state.discs[0]); q.salvarDisc({ preventDefault() {} }); assert.equal(q.state.dErro, q.soLeitura());
});

test('Quadro por professor ganha a linha Sem professor quando uma disciplina não tem professor', () => {
  const q = tela({ disciplinas: [{ id: 13, nome: 'Python', turma: '5', professor_id: 42, sala: '7', carga_horaria: 40, grade: [{ dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40', sala: '8', sala_id: 8 }] }, { id: 14, nome: 'Redes', turma: '5', professor_id: null, sala: '7', carga_horaria: 30, grade: [{ dia_semana: 3, hora_inicio: '13:30', hora_fim: '15:10', sala: '7', sala_id: 7 }] }] });
  q.setState({ eixo: 'prof' });
  const linhas = q.renderVals().linhasP; assert.deepEqual(linhas.map(l => l.nome), ['Docente', 'Sem professor']);
  assert.equal(linhas[1].tag, 'Atribuir professor');
  const dia = linhas[1].dias[2]; assert.equal(dia.itens.length, 1); assert.equal(dia.itens[0].bl, true); assert.match(dia.itens[0].linha, /· 1º A ·/);
  assert.equal(linhas[0].dias[2].vazioDia, true);
});
