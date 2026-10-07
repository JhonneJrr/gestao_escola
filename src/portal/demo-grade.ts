// @ts-nocheck
// Só DEV: dados fictícios e estados de demonstração da Grade e agenda (atualização 3 do canvas), para o comparador.
// A GradeAgenda carrega este arquivo por import dinâmico dentro de `if (import.meta.env.DEV)`; o build de produção não o inclui.
import { lerLoja } from './loja';

const pD = s => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
const sD = d => d.toISOString().slice(0, 10);
const addD = (s, n) => sD(new Date(pD(s).getTime() + n * 864e5));
const dsem = s => pD(s).getUTCDay() || 7;
const segDe = s => addD(s, 1 - dsem(s));
const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const DIA_C = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const SLOTS = [['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10'], ['15:30', '17:10']];
const nomeTurma = id => !id ? 'Sem turma' : (lerLoja().turmas.find(t => t.id === id) || {}).nome || id;
const MSG_GRAV = 'Não consegui salvar. Confira a conexão e tente de novo.';

export const CHAM0 = { '3-0-2026-10-05': { i0: true, i1: true, i2: false, i3: true, i4: true, i5: true }, '4-0-2026-10-05': { i0: true, i1: true, i2: true, i3: false, i4: true } };
const IA_ERROS = { 'Não configurado': 'O assistente não está configurado neste servidor.', 'Limite de uso': 'O assistente atingiu o limite de uso. Tente de novo em alguns minutos.', 'Sem conexão': 'Não consegui falar com o assistente. Tente de novo.' };

// Respostas do assistente da demonstração (o canvas planeja localmente; em produção quem responde é o servidor).
function iaPlanejar(c, alvos, soManha) {
  const st = c.state, SL = soManha ? SLOTS.slice(0, 2) : SLOTS, ig = alvos.filter(a => a.idx != null).map(a => a.d.id + '-' + a.idx), virt = [], moves = [], rec = [];
  alvos.forEach(a => {
    const d = a.d, n = a.idx == null ? 2 : 1, dias = new Set((d.grade || []).filter((x, k) => !ig.includes(d.id + '-' + k)).map(x => x.dia_semana));
    virt.filter(v => v.id === 'v' + d.id).forEach(v => dias.add(v.grade[0].dia_semana));
    const achados = [];
    for (const s of SL) for (let dia = 1; dia <= 5 && achados.length < n; dia++) {
      if (dias.has(dia) || achados.some(x => x.dia === dia)) continue;
      const sala = a.idx != null ? (d.grade[a.idx].sala || d.sala) : d.sala;
      const e = c.checarSlot({ prof: d.prof, turma: d.turma, sala, dia, ini: s[0], fim: s[1], ignorar: ig }, st.discs.concat(virt), st.profs);
      if (!e) achados.push({ dia, ini: s[0], fim: s[1], sala });
    }
    if (achados.length < n) { const p = st.profs.find(q => q.id === d.prof); rec.push({ nome: d.nome + ' · ' + nomeTurma(d.turma), motivo: p && (p.ocupados || []).length ? 'Choca com um horário ocupado de ' + p.nome + ' em todas as opções livres' + (soManha ? ' de manhã.' : '.') : 'Não há horário livre para o professor, a turma e a sala' + (soManha ? ' de manhã.' : '.') }); return; }
    achados.forEach(x => { virt.push({ id: 'v' + d.id, nome: d.nome, prof: d.prof, turma: d.turma, sala: x.sala, grade: [{ dia_semana: x.dia, hora_inicio: x.ini, hora_fim: x.fim, sala: x.sala }] });
      const de = a.idx != null ? DIA_C[d.grade[a.idx].dia_semana] + ' ' + d.grade[a.idx].hora_inicio : 'sem horário';
      moves.push({ discId: d.id, idx: a.idx, novo: a.idx == null, nome: d.nome + ' · ' + nomeTurma(d.turma), de, dia: x.dia, ini: x.ini, fim: x.fim, sala: x.sala }); });
  });
  return { moves, rec };
}
function iaResponder(c, t0) {
  const st = c.state, t = t0.toLowerCase(), ch = c.choques(st.discs, st.profs);
  const pm = st.profs.find(p => t.includes(p.nome.split(' ')[0].toLowerCase()));
  if (/choque|conflit/.test(t) && !/resolv|reorganiz|mont|corrij/.test(t)) {
    if (!ch.n) return { resposta: 'Não encontrei choques. Nenhuma aula cai em horário ocupado de professor, e nenhum professor, turma ou sala tem duas aulas ao mesmo tempo.' };
    const linhas = []; Object.keys(ch.M).forEach(k => { const [id] = k.split('-').map(Number), d = st.discs.find(x => x.id === id); ch.M[k].forEach(m => { const l = '· ' + d.nome + ' · ' + nomeTurma(d.turma) + ': ' + m; if (!linhas.includes(l)) linhas.push(l); }); });
    return { resposta: 'Encontrei ' + ch.n + (ch.n === 1 ? ' choque' : ' choques') + ', marcados no quadro:\n' + linhas.join('\n') + '\n\nPeça "Resolva os choques" e eu monto uma proposta.' };
  }
  const fala = (r, intro) => { const pt = []; if (r.moves.length) pt.push(intro); if (r.rec.length) pt.push(r.rec.length === 1 ? 'Um item não coube.' : r.rec.length + ' itens não couberam.'); return pt.join(' ') + (r.moves.length ? ' A proposta aparece tracejada no quadro. Confira e aplique.' : ''); };
  if (pm && /manh/.test(t)) {
    const alvos = []; st.discs.filter(d => d.prof === pm.id).forEach(d => (d.grade || []).forEach((x, idx) => { if (hm(x.hora_inicio) >= 720 || (pm.ocupados || []).some(o => o.dia_semana === x.dia_semana && hm(x.hora_inicio) < hm(o.hora_fim) && hm(o.hora_inicio) < hm(x.hora_fim))) alvos.push({ d, idx }); }));
    if (!alvos.length) return { resposta: 'As aulas de ' + pm.nome + ' já estão todas de manhã e fora dos horários ocupados dele.' };
    const r = iaPlanejar(c, alvos, true); return Object.assign({ resposta: fala(r, 'Movi ' + r.moves.length + (r.moves.length === 1 ? ' aula' : ' aulas') + ' de ' + pm.nome + ' para a manhã, fora dos horários ocupados e sem choque de turma ou sala.') }, r);
  }
  if (/sem hor|mont|resolv|reorganiz|corrij/.test(t)) {
    const alvos = st.discs.filter(d => !(d.grade || []).length).map(d => ({ d, idx: null }));
    if (/resolv|choque|corrij|reorganiz/.test(t)) ch.alvos.forEach(k => { const [id, ix] = k.split('-').map(Number); alvos.push({ d: st.discs.find(x => x.id === id), idx: ix }); });
    if (!alvos.length) return { resposta: 'Todas as disciplinas já têm horário e não há choques. Nada a mudar.' };
    const r = iaPlanejar(c, alvos, false); return Object.assign({ resposta: fala(r, 'Montei ' + r.moves.length + (r.moves.length === 1 ? ' horário' : ' horários') + ' sem choque com professores, turmas e salas.') }, r);
  }
  return { resposta: 'Posso montar a grade das disciplinas sem horário, resolver os choques do quadro ou reorganizar as aulas de um professor (por exemplo, só de manhã). Diga qual.' };
}

// Aplica um estado do comparador (nomes como 'Escola / Chamada / Aberta') na GradeAgenda `c`.
export function aplicarEstado(c, nome) {
  clearTimeout(c.iaT); clearTimeout(c.cT);
  const prof = /^Professor/.test(nome), TER = '2026-10-06T10:20', W = '2026-10-05';
  const DISC0 = lerLoja().discsGrade, PED0 = lerLoja().pedidosGrade;
  const gr = (dia, i, sala) => ({ dia_semana: dia, hora_inicio: SLOTS[i][0], hora_fim: SLOTS[i][1], sala });
  const reset = { perfilF: prof ? 'Professor' : 'Escola', relF: null, carga: 'ok', recarregando: false, salvando: null, erroG: {}, painel: null, pend: null, msg: null, reverter: false, semEnc: false, canceladas: {}, discs: DISC0, pedidos: PED0, remarc: [], chamadas: CHAM0, chamF: {}, chamErro: '',
    iaAberto: false, iaMsgs: [], iaTexto: '', iaEnv: false, iaProp: null, iaFeito: null, iaErro: '', aba: 'quadro', eixo: 'dias', semana: null, fTurma: '', fProf: '', fDisc: '', fSala: '', soChoques: false, nomeF: '', nomeErro: '', msgDisc: '' };
  const abrir = (key, data, comoCh) => () => { const st = c.state, i = c.instSemana(segDe(data), st, c.ferMap(st.eventos), c.perfil()).find(x => x.key === key); if (i) comoCh ? c.abrirChamada(i) : c.abrirAula(i); };
  const discX = { id: 10, nome: 'Projeto Integrador', sigla: 'PI', turma: null, prof: 2, sala: null, carga: 40, grade: [gr(5, 2, null)] };
  const Q = 'Resolva os choques e monte a grade das disciplinas sem horário.';
  const conv = q => { const r = iaResponder(c, q); const ids = r.moves ? [...new Set(r.moves.map(m => m.discId))] : [];
    return { iaAberto: true, iaMsgs: [{ papel: 'usuario', texto: q }, { papel: 'ia', texto: r.resposta }], iaProp: r.moves && (r.moves.length || r.rec.length) ? { proposta: ids.map(id => ({ disciplina_id: id, disciplina_nome: '', itens: [] })), moves: r.moves, rec: r.rec, idx: 1 } : null, iaUltimo: q }; };
  const remarcar = cb => () => { const st = c.state, i = c.instSemana(W, st, c.ferMap(st.eventos), 'escola').find(x => x.key === '3-0-2026-10-05'); if (i) { c.propor(i, { dia: 1, ini: '15:30', fim: '17:10' }); if (cb) setTimeout(cb, 0); } };
  const F = { chamF: { i0: true, i1: true, i2: true, i3: false, i4: true, i5: true } };
  const ev = { tipo: 'prova', titulo: 'P3 de Python', data: '2026-11-17', fim: '', hi: '08:00', hf: '09:40', todas: false, turmas: ['1A'], disc: '1', desc: '' };
  const pf = { disc: '2', data: '2026-10-16', ini: '13:30', fim: '15:10', sala: 'lab', motivo: 'Revisão para a P2.' };
  const rem = { disc: 3, idx: 0, de: '2026-10-05', data: '2026-10-05', ini: '15:30', fim: '17:10' };
  const msgRem = { t: 'Algoritmos · 1º A remarcada só nesta semana: segunda 05/10, 15:30.', snap: { discs: DISC0, remarc: [] } };
  const E = {
    'Escola / Grade e agenda / Carregando': [{ carga: 'carregando' }],
    'Escola / Grade e agenda / Erro ao carregar': [{ carga: 'erro' }],
    'Escola / Aula / Chamada de hoje': [{ relF: TER, semana: W }, abrir('7-0-2026-10-06', '2026-10-06')],
    'Escola / Aula / Chamada feita': [{ relF: TER, semana: W }, abrir('3-0-2026-10-05', '2026-10-05')],
    'Escola / Aula / Aula futura': [{ relF: TER, semana: W }, abrir('3-1-2026-10-07', '2026-10-07')],
    'Escola / Aula / Feriado': [{ relF: TER, semana: '2026-10-12' }, abrir('3-0-2026-10-12', '2026-10-12')],
    'Escola / Aula / Cancelada': [{ relF: TER, semana: W, canceladas: { '7-1-2026-10-09': true } }, abrir('7-1-2026-10-09', '2026-10-09')],
    'Escola / Aula / Semestre encerrado': [{ relF: TER, semana: W, semEnc: true }, abrir('7-0-2026-10-06', '2026-10-06')],
    'Escola / Chamada / Aberta': [{ relF: TER, semana: W }, abrir('7-0-2026-10-06', '2026-10-06', true)],
    'Escola / Chamada / Salvando': [{ relF: TER, semana: W }, abrir('7-0-2026-10-06', '2026-10-06', true), () => c.setState({ ...F, salvando: 'chamada' })],
    'Escola / Chamada / Erro de gravação': [{ relF: TER, semana: W }, abrir('7-0-2026-10-06', '2026-10-06', true), () => c.setState({ ...F, erroG: { chamada: MSG_GRAV } })],
    'Professor / Aula / Chamada de hoje': [{ relF: TER, semana: W }, abrir('1-0-2026-10-06', '2026-10-06')],
    'Escola / Remarcação / Salvando': [{ relF: TER, semana: W }, remarcar(() => c.setState({ salvando: 'remarc-semana' }))],
    'Escola / Remarcação / Erro de gravação': [{ relF: TER, semana: W }, remarcar(() => c.setState({ erroG: { 'remarc-semana': MSG_GRAV } }))],
    'Escola / Disciplina / Salvando': [{ aba: 'disc' }, () => c.abrirDisc(DISC0[2]), () => c.setState({ salvando: 'disc' })],
    'Escola / Disciplina / Erro de gravação': [{ aba: 'disc' }, () => c.abrirDisc(DISC0[2]), () => c.setState({ erroG: { disc: MSG_GRAV } })],
    'Escola / Disciplina / Sem turma e sem sala': [{ aba: 'disc', discs: DISC0.concat(discX) }, () => c.abrirDisc(discX)],
    'Escola / Quadro / Sem turma e sem sala': [{ relF: TER, semana: W, discs: DISC0.concat(discX), fDisc: '10' }],
    'Escola / Quadro / Vazio': [{ discs: DISC0.map(d => Object.assign({}, d, { grade: [] })), pedidos: PED0.filter(p => p.status !== 'aprovada') }],
    'Escola / Evento / Salvando': [{ aba: 'ano' }, () => c.setState({ painel: { tipo: 'eventoForm', id: null }, eErro: '', eF: ev, salvando: 'evento' })],
    'Escola / Evento / Erro de gravação': [{ aba: 'ano' }, () => c.setState({ painel: { tipo: 'eventoForm', id: null }, eErro: '', eF: ev, erroG: { evento: MSG_GRAV } })],
    'Escola / Pedidos / Aprovando': [{ aba: 'pedidos', salvando: 'ap-2' }],
    'Escola / Pedidos / Erro de gravação': [{ aba: 'pedidos', erroG: { 'ap-2': MSG_GRAV } }],
    'Professor / Pedido / Salvando': [{ aba: 'pedidos', pF: pf, salvando: 'pedido' }],
    'Professor / Pedido / Erro de gravação': [{ aba: 'pedidos', pF: pf, erroG: { pedido: MSG_GRAV } }],
    'Professor / Sugestão / Salvando': [{ aba: 'pedidos', pedidos: PED0.map(p => p.id === 1 ? Object.assign({}, p, { status: 'sugestao', sug: { data: '2026-10-16', ini: '15:30', fim: '17:10', sala: 'lab' } }) : p), salvando: 'ac-1' }],
    'Escola / Assistente / Enviando': [{ iaAberto: true, iaMsgs: [{ papel: 'usuario', texto: Q }], iaEnv: true, iaUltimo: Q }],
    'Escola / Assistente / Só texto': [() => c.setState(conv('Tem algum choque na grade atual?'))],
    'Escola / Assistente / Proposta com Não coube': [() => c.setState(conv(Q))],
    'Escola / Assistente / Aplicando': [() => c.setState(Object.assign(conv(Q), { salvando: 'ia' }))],
    'Escola / Assistente / Erro: não configurado': [{ iaAberto: true, iaMsgs: [{ papel: 'usuario', texto: Q }], iaErro: IA_ERROS['Não configurado'], iaUltimo: Q }],
    'Escola / Assistente / Erro: limite de uso': [{ iaAberto: true, iaMsgs: [{ papel: 'usuario', texto: Q }], iaErro: IA_ERROS['Limite de uso'], iaUltimo: Q }],
    'Escola / Assistente / Erro: sem conexão': [{ iaAberto: true, iaMsgs: [{ papel: 'usuario', texto: Q }], iaErro: IA_ERROS['Sem conexão'], iaUltimo: Q }],
    'Escola / Nova turma': [{ aba: 'disc' }, () => c.abrirNovo('turma')],
    'Escola / Nova sala': [{ aba: 'disc' }, () => c.abrirNovo('sala')],
    'Escola / Nova turma / Já cadastrada': [{ aba: 'disc' }, () => c.abrirNovo('turma'), () => c.setState({ nomeF: '1º A', nomeErro: 'Turma já cadastrada.' })],
    'Escola / Reverter / Confirmar': [{ relF: TER, semana: W, remarc: [rem], msg: msgRem, reverter: true }],
    'Escola / Reverter / Salvando': [{ relF: TER, semana: W, remarc: [rem], msg: msgRem, reverter: true, salvando: 'reverter' }],
    'Escola / Reverter / Erro de gravação': [{ relF: TER, semana: W, remarc: [rem], msg: msgRem, reverter: true, erroG: { reverter: MSG_GRAV } }]
  }[nome];
  if (!E) return;
  c.estadoBruto(Object.assign({}, reset, typeof E[0] === 'object' ? E[0] : {}), () => { E.filter(x => typeof x === 'function').reduce((p, fn) => p.then(() => new Promise(r => { fn(); setTimeout(r, 30); })), Promise.resolve()); });
}
