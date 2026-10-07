// @ts-nocheck
import React from 'react';
import { DCLogic, criarDC } from './dc';
import Template from './componentes/GradeEAgendaTemplate';
import { lerLoja, assinar, recarregarLoja } from './loja';
import { salvarGrade, atualizarAula, criarDisciplina, atualizarDisciplina, pedirGradeIA, erroGradeIA, criarEvento, atualizarEvento, apagarEvento, criarPedido, aprovarPedido, recusarPedido, sugerirPedido, aceitarSugestao, recusarSugestao } from './rede';
import { itensGradeAPI as itensAPI, disciplinaAPI, eventoAPI, pedidoAPI, horarioAPI } from './adaptador';
const pD = s => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
const sD = d => d.toISOString().slice(0, 10);
const addD = (s, n) => sD(new Date(pD(s).getTime() + n * 864e5));
const dsem = s => pD(s).getUTCDay() || 7;
const segDe = s => addD(s, 1 - dsem(s));
const ddmm = s => s.slice(8, 10) + '/' + s.slice(5, 7);
const pad = n => String(n).padStart(2, '0');
const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const mh = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const fmtH = h => (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA_C = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIA_L = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const SLOTS = [['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10'], ['15:30', '17:10']];
const JAN = [480, 1030], G0 = 470, G1 = 1040, PX = 1.05;
const nomeTurma = id => (lerLoja().turmas.find(t => t.id === id) || {}).nome || id || '—';
const nomeSala = id => (lerLoja().salas.find(t => t.id === id) || {}).nome || id || '—';
const TIPOS = {
  prova: { label: 'Prova', ab: 'PR', bg: 'var(--texto)', cor: 'var(--fundo)', borda: 'var(--texto)' },
  entrega: { label: 'Entrega de trabalho', ab: 'ET', bg: 'var(--superficie)', cor: 'var(--texto)', borda: 'var(--texto)' },
  evento: { label: 'Evento', ab: 'EV', bg: 'var(--sunken)', cor: 'var(--texto)', borda: 'var(--borda)' },
  gincana: { label: 'Gincana', ab: 'GI', bg: 'var(--sunken)', cor: 'var(--texto)', borda: 'var(--borda)' },
  reuniao: { label: 'Reunião de pais', ab: 'RP', bg: 'var(--superficie)', cor: 'var(--texto)', borda: 'var(--borda)' },
  conselho: { label: 'Conselho de classe', ab: 'CC', bg: 'var(--superficie)', cor: 'var(--texto)', borda: 'var(--borda)' },
  feriado: { label: 'Feriado / recesso', ab: 'FE', bg: 'repeating-linear-gradient(135deg,var(--superficie) 0 3px,var(--borda) 3px 4px)', cor: 'var(--texto)', borda: 'var(--borda)' },
  bimestre: { label: 'Bimestre', ab: 'BI', bg: 'var(--fundo)', cor: 'var(--texto)', borda: 'var(--texto)' }
};
const HACH = 'repeating-linear-gradient(135deg,transparent 0 6px,var(--borda-fraca) 6px 7px)';
class GradeAgenda extends DCLogic {
  state = { aba: 'quadro', eixo: null, semana: null, fTurma: '', fProf: '', fDisc: '', fSala: '', verOcup: true, soChoques: false, diaM: null,
    discs: [], profs: [], eventos: [], pedidos: [], remarc: [], pend: null, msg: null, tick: 0, largura: 1200,
    iaAberto: false, iaMsgs: [], iaTexto: '', iaEnv: false, iaProp: null, iaFeito: null,
    vis: 'mes', ref: null, tiposOff: {}, aTurma: '', passados: false,
    painel: null, eF: null, eErro: '', dF: null, dErro: '', dOk: '', gravando: {},
    pF: { disc: '', data: '', ini: '', fim: '', sala: '', motivo: '' }, pMsg: null,
    recusando: null, recMotivo: '', recErro: '', sugerindo: null, sug: { data: '', ini: '', fim: '', sala: '' }, sugErro: '' };
  raiz = React.createRef(); dicaRef = React.createRef();
  iniciarGravacao(op) { if (this.state.gravando[op]) return false; this.setState(s => ({ gravando: { ...s.gravando, [op]: true } })); return true; }
  terminarGravacao(op) { this.setState(s => ({ gravando: { ...s.gravando, [op]: false } })); }
  responderPainel(painel, campos, texto) { this.setState(s => s.painel === painel && s.painel?.tipo === painel?.tipo && s.painel?.id === painel?.id ? campos : { msg: { t: texto } }); }
  semestre() { return lerLoja().semestre || { nome: '—', inicio: '', fim: '' }; }
  ano() { const s = this.semestre(), ano = (s.inicio || this.agora().data).slice(0, 4); return lerLoja().ano || { inicio: ano + '-01-01', fim: s.fim || ano + '-12-31' }; }
  profId() { const s = lerLoja(); return s.perfil === 'prof' ? s.usuario?.id : (import.meta.env.DEV ? s.profDemo : null); }
  demo() { return import.meta.env.DEV && lerLoja().profDemo != null; }
  turmaId() { return this.demo() ? lerLoja().turmaDemo : undefined; }
  turmaAluno() { return this.demo() ? nomeTurma(this.turmaId()) : [...new Set(this.state.discs.map(d => d.turma).filter(Boolean))].map(nomeTurma).join(', ') || lerLoja().usuario?.nome || 'Aluno'; }
  dadosLoja() {
    const s = lerLoja();
    return { discs: s.disciplinas.map(d => ({ ...d, prof: d.professor_id, carga: d.carga_horaria,
      sigla: d.sigla || d.nome.split(' ').map(p => p[0]).join('').slice(0, 3).toUpperCase(), grade: d.grade || [] })), profs: s.professores };
  }
  receberLoja = () => {
    const s = lerLoja();
    this.setState({ ...this.dadosLoja(), ...(!this.demo() || !this.recebeu ? { eventos: s.eventos, pedidos: s.pedidos } : {}) });
    this.recebeu = true;
  };
  componentDidMount() {
    this.desassinar = assinar(this.receberLoja);
    this.receberLoja();
    this.rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.iv = setInterval(() => this.setState(s => ({ tick: s.tick + 1 })), 20000);
    this.ro = new ResizeObserver(es => { const w = es[0].contentRect.width; if (Math.abs(w - this.state.largura) > 4) this.setState({ largura: w }); });
    if (this.raiz.current) this.ro.observe(this.raiz.current);
    this.onKey = e => { if (e.key !== 'Escape') return; if (this.state.painel) this.setState({ painel: null }); else if (this.state.pend) this.setState({ pend: null }); else if (this.state.iaAberto) this.setState({ iaAberto: false }); };
    document.addEventListener('keydown', this.onKey);
  }
  componentWillUnmount() { this.desassinar?.(); this.limparArrasto?.(); if (this._sp) this._sp.style.overflow = this._spOv || ''; clearInterval(this.iv); clearTimeout(this.iaT); this.ro && this.ro.disconnect(); document.removeEventListener('keydown', this.onKey); }
  scrollPai() { let p = this.raiz.current && this.raiz.current.parentElement; while (p && !(/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)) p = p.parentElement; return p; }
  geoPainel() {
    if (!this.props.embutido) return null;
    const sp = this.scrollPai(), r = this.raiz.current; if (!sp || !r) return null;
    if (!this._sp) { this._spOv = sp.style.overflow; sp.style.overflow = 'hidden'; this._sp = sp; }
    return { top: Math.max(0, sp.getBoundingClientRect().top - r.getBoundingClientRect().top), h: sp.clientHeight };
  }
  setState(u, cb) {
    const msg = this.state?.msg;
    super.setState(prev => {
      const o = typeof u === 'function' ? u(prev) : u;
      if (!o || !('painel' in o)) return o;
      if (o.painel && !prev.painel) { const g = this.geoPainel(); return g ? Object.assign({}, o, { pGeo: g }) : o; }
      if (!o.painel && this._sp) { this._sp.style.overflow = this._spOv || ''; this._sp = null; }
      return o;
    }, cb);
    if (this.state.msg && this.state.msg !== msg && this.state.aba !== 'quadro') lerLoja().avisar?.(this.state.msg.t);
  }
  componentDidUpdate(pp) { if (pp.perfil !== this.props.perfil) this.setState({ aba: 'quadro', eixo: null, fTurma: '', fProf: '', fDisc: '', fSala: '', painel: null, pend: null, diaM: null }); }
  perfil() { return { Escola: 'escola', Professor: 'prof', Aluno: 'aluno' }[this.props.perfil] || lerLoja().perfil || 'escola'; }
  agora() {
    const S = { 'Terça 08:40': '2026-10-06T08:40', 'Quarta 10:20': '2026-10-07T10:20', 'Quinta 14:00': '2026-10-08T14:00' }[this.props.relogio ?? (import.meta.env.DEV ? lerLoja().relogio : undefined) ?? 'Ao vivo'];
    const d = S ? new Date(S) : new Date();
    return { data: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), min: d.getHours() * 60 + d.getMinutes(), vivo: !S };
  }
  ferMap(evs) { const m = {}; evs.filter(e => e.tipo === 'feriado').forEach(e => { for (let d = e.data; d <= (e.fim || e.data); d = addD(d, 1)) m[d] = e.titulo; }); return m; }
  escopo(st, P) { if (!this.demo()) return st.discs; return P === 'prof' ? st.discs.filter(d => d.prof === this.profId()) : P === 'aluno' ? st.discs.filter(d => !this.turmaId() || d.turma === this.turmaId()) : st.discs; }
  profNome(id, profs) { return ((profs || this.state.profs).find(p => p.id === id) || {}).nome || 'Sem professor'; }
  instSemana(W, st, fer, P) {
    const r = [], fim = addD(W, 6), aulas = lerLoja().aulas, hoje = this.agora().data, usadas = new Set();
    st.discs.forEach(d => (d.grade || []).forEach((x, idx) => {
      const data = addD(W, x.dia_semana - 1); if (!this.semestre().inicio || data < this.semestre().inicio || data > this.semestre().fim) return;
      if (data < hoje && aulas.some(a => a.disciplina_id === d.id)) return;
      const rm = st.remarc.find(q => q.disc === d.id && q.idx === idx && q.de === data);
      const aula = aulas.find(a => a.origem === 'grade' && a.disciplina_id === d.id && (a.remarcada_de === data || (a.data === data && a.hora_inicio?.slice(0, 5) === x.hora_inicio)));
      if (aula?.status === 'cancelada') return;
      if (aula && aula.data < hoje) return; // O histórico entra pelas aulas reais abaixo.
      const real = aula && (aula.remarcada_de || aula.hora_inicio?.slice(0, 5) !== x.hora_inicio) ? { data: aula.data, ini: aula.hora_inicio?.slice(0, 5), fim: aula.hora_fim?.slice(0, 5), remarcada: true } : null;
      const b = { key: d.id + '-' + idx + '-' + data, tkey: d.id + '-' + idx, disc: d, idx, dataOrig: aula?.remarcada_de || data, tipo: 'grade', sala: x.sala || d.sala };
      const inst = Object.assign(b, real || (rm ? { data: rm.data, ini: rm.ini, fim: rm.fim, remarcada: true } : { data, ini: x.hora_inicio, fim: x.hora_fim }));
      if (inst.data < W || inst.data > fim) return;
      r.push(inst); if (aula) usadas.add(aula.aula_id);
    }));
    aulas.forEach(a => {
      if (a.origem !== 'grade' || a.status === 'cancelada' || a.data < W || a.data > fim || usadas.has(a.aula_id) || (a.data >= hoje && !a.remarcada_de)) return;
      const d = st.discs.find(d => d.id === a.disciplina_id); if (!d) return;
      const dataOrig = a.remarcada_de || a.data, ini = a.hora_inicio?.slice(0, 5), hf = a.hora_fim?.slice(0, 5);
      const k = (d.grade || []).findIndex(x => (x.dia_semana === dsem(a.data) || x.dia_semana === dsem(dataOrig)) && x.hora_inicio === ini), idx = k < 0 ? null : k;
      r.push({ key: 'a' + a.aula_id, tkey: d.id + '-' + idx, disc: d, idx, dataOrig, tipo: 'grade', sala: d.grade?.[idx]?.sala || d.sala, data: a.data, ini, fim: hf, remarcada: !!a.remarcada_de });
    });
    st.pedidos.forEach(p => {
      if (!['aprovada', 'pendente', 'sugestao'].includes(p.status) || (P === 'aluno' && p.status !== 'aprovada')) return;
      const aula = p.status === 'aprovada' && p.aula_id != null ? aulas.find(a => a.aula_id === p.aula_id) : null;
      if (p.status === 'aprovada' && p.aula_id != null && (!aula || aula.status === 'cancelada')) return;
      const q = aula ? { data: aula.data, ini: aula.hora_inicio?.slice(0, 5), fim: aula.hora_fim?.slice(0, 5), sala: p.sala } : p.status === 'sugestao' ? p.sug : p; if (q.data < W || q.data > fim) return;
      const d = st.discs.find(x => x.id === p.disc); if (!d) return;
      r.push({ key: 'x' + p.id, tkey: 'x' + p.id, disc: d, idx: null, tipo: 'extra', pedido: p, pendente: p.status !== 'aprovada', data: q.data, dataOrig: aula?.remarcada_de || q.data, ini: q.ini, fim: q.fim, sala: q.sala || d.sala, ...(aula ? { remarcada: !!aula.remarcada_de } : {}) });
    });
    aulas.forEach(a => {
      if (a.origem !== 'extra' || a.status === 'cancelada' || a.data < W || a.data > fim || st.pedidos.some(p => p.aula_id === a.aula_id)) return;
      const d = st.discs.find(d => d.id === a.disciplina_id); if (!d) return;
      r.push({ key: 'a' + a.aula_id, tkey: 'a' + a.aula_id, disc: d, idx: null, tipo: 'extra', pendente: false, sala: d.sala, data: a.data, dataOrig: a.remarcada_de || a.data, ini: a.hora_inicio?.slice(0, 5), fim: a.hora_fim?.slice(0, 5), remarcada: !!a.remarcada_de });
    });
    r.forEach(i => { i.feriado = fer[i.data] || ''; });
    return r;
  }
  choques(discs, profs) {
    const it = [], M = {}, alvo = new Set(); let n = 0;
    discs.forEach(d => (d.grade || []).forEach((x, idx) => it.push({ d, idx, k: d.id + '-' + idx, dia: x.dia_semana, a: hm(x.hora_inicio), b: hm(x.hora_fim), ini: x.hora_inicio, fim: x.hora_fim, sala: x.sala || d.sala })));
    const add = (i, t) => (M[i.k] = M[i.k] || []).push(t), fx = i => DIA_L[i.dia] + ', ' + i.ini + '–' + i.fim;
    it.forEach(i => { const p = profs.find(q => q.id === i.d.prof); ((p && p.ocupados) || []).forEach(o => { if (o.dia_semana === i.dia && i.a < hm(o.hora_fim) && hm(o.hora_inicio) < i.b) { n++; alvo.add(i.k); add(i, 'Horário ocupado de ' + p.nome + (o.motivo ? ': ' + o.motivo : '') + ' (' + DIA_L[o.dia_semana] + ', ' + o.hora_inicio + '–' + o.hora_fim + ').'); } }); });
    for (let x = 0; x < it.length; x++) for (let y = x + 1; y < it.length; y++) {
      const A = it[x], B = it[y]; if (A.d.id === B.d.id || A.dia !== B.dia || !(A.a < B.b && B.a < A.b)) continue;
      const rs = [];
      if (A.d.prof && A.d.prof === B.d.prof) rs.push(['prof', this.profNome(A.d.prof, profs)]);
      if (A.d.turma && A.d.turma === B.d.turma) rs.push(['turma', nomeTurma(A.d.turma)]);
      if (A.sala && A.sala === B.sala) rs.push(['sala', nomeSala(A.sala)]);
      rs.forEach(([t, nm]) => { n++; const m = o => t === 'prof' ? nm + ' também dá ' + o.d.nome + ' neste horário (' + fx(o) + ').' : t === 'turma' ? nm + ' também tem ' + o.d.nome + ' neste horário (' + fx(o) + ').' : nm + ' também recebe ' + o.d.nome + ' · ' + nomeTurma(o.d.turma) + ' neste horário (' + fx(o) + ').'; add(A, m(B)); add(B, m(A)); });
      if (rs.length && !alvo.has(A.k) && !alvo.has(B.k)) alvo.add(B.k);
    }
    return { M, alvos: [...alvo], n };
  }
  basico(c, profs) {
    if (!c.ini || !c.fim) return 'Preencha início e fim.';
    const a = hm(c.ini), b = hm(c.fim);
    if (!(a < b)) return 'O fim precisa ser depois do início.';
    if (a < JAN[0] || b > JAN[1]) return 'Fora da janela da escola (08:00 às 17:10).';
    if (c.dia > 5) return 'Escolha um dia de segunda a sexta.';
    const p = profs.find(q => q.id === c.prof);
    for (const o of (p && p.ocupados) || []) if (o.dia_semana === c.dia && a < hm(o.hora_fim) && hm(o.hora_inicio) < b) return 'Choca com um horário ocupado de ' + p.nome + ' (' + DIA_L[o.dia_semana] + ', ' + o.hora_inicio + '–' + o.hora_fim + (o.motivo ? ': ' + o.motivo : '') + ').';
    return '';
  }
  motivo(c, d, sala, fx, profs) {
    if (c.prof && d.prof === c.prof) return this.profNome(c.prof, profs) + ' já dá ' + d.nome + ' neste horário (' + fx + ').';
    if (c.turma && d.turma === c.turma) return nomeTurma(c.turma) + ' já tem ' + d.nome + ' neste horário (' + fx + ').';
    if (c.sala && sala === c.sala) return nomeSala(c.sala) + ' já está com ' + d.nome + ' · ' + nomeTurma(d.turma) + ' neste horário (' + fx + ').';
    return '';
  }
  checarSlot(c, discs, profs) {
    const e = this.basico(c, profs); if (e) return e;
    const a = hm(c.ini), b = hm(c.fim), ig = c.ignorar || [];
    for (const d of discs) { const g = d.grade || []; for (let i = 0; i < g.length; i++) { const x = g[i]; if (ig.includes(d.id + '-' + i) || x.dia_semana !== c.dia || !(a < hm(x.hora_fim) && hm(x.hora_inicio) < b)) continue; const r = this.motivo(c, d, x.sala || d.sala, DIA_L[x.dia_semana] + ', ' + x.hora_inicio + '–' + x.hora_fim, profs); if (r) return r; } }
    return '';
  }
  checarData(c, st) {
    if (!c.data) return 'Escolha a data.';
    if (!this.semestre().inicio || c.data < this.semestre().inicio || c.data > this.semestre().fim) return 'Fora do semestre (' + ddmm(this.semestre().inicio) + ' a ' + ddmm(this.semestre().fim) + ').';
    const fer = this.ferMap(st.eventos); if (fer[c.data]) return 'Dia sem aula: ' + fer[c.data] + '.';
    const e = this.basico(Object.assign({}, c, { dia: dsem(c.data) }), st.profs); if (e) return e;
    const a = hm(c.ini), b = hm(c.fim), ig = c.ignorar || [];
    const ins = this.instSemana(segDe(c.data), st, fer, 'escola').filter(i => i.data === c.data && !i.pendente && !ig.includes(i.key));
    for (const i of ins) if (hm(i.ini) < b && a < hm(i.fim)) { const r = this.motivo(c, i.disc, i.sala, DIA_L[dsem(i.data)] + ' ' + ddmm(i.data) + ', ' + i.ini + '–' + i.fim, st.profs); if (r) return r; }
    return '';
  }
  carga(d, st, fer, hoje, nm) {
    let f = 0, t = 0;
    if (!this.semestre().inicio) return { feito: 0, total: 0 };
    for (let w = segDe(this.semestre().inicio); w <= this.semestre().fim; w = addD(w, 7)) (d.grade || []).forEach(x => { const dt = addD(w, x.dia_semana - 1); if (dt < this.semestre().inicio || dt > this.semestre().fim || fer[dt]) return; const du = hm(x.hora_fim) - hm(x.hora_inicio); t += du; if (dt < hoje || (dt === hoje && hm(x.hora_fim) <= nm)) f += du; });
    st.pedidos.forEach(p => { if (p.disc !== d.id || p.status !== 'aprovada') return; const du = hm(p.fim) - hm(p.ini); t += du; if (p.data < hoje || (p.data === hoje && hm(p.fim) <= nm)) f += du; });
    return { feito: f / 60, total: t / 60 };
  }
  evVisiveis(st, P) {
    if (!this.demo()) return st.eventos;
    const minhas = P === 'prof' ? [...new Set(st.discs.filter(d => d.prof === this.profId()).map(d => d.turma))] : P === 'aluno' ? [this.turmaId()] : null;
    return st.eventos.filter(e => !minhas || e.turmas === 'todas' || e.turmas.some(t => minhas.includes(t)));
  }
  podeArrastar(i) { return this.perfil() === 'escola' && i.tipo === 'grade' && i.idx != null && !i.feriado && !this.state.pend; }
  abrirAula(i) { this.setState({ painel: { tipo: 'aula', key: i.key, tkey: i.tkey, disc: i.disc.id, data: i.data, ini: i.ini, fim: i.fim, sala: i.sala, itipo: i.tipo, pendente: !!i.pendente, remarcada: !!i.remarcada, feriado: i.feriado, pedido: i.pedido ? i.pedido.id : null } }); }
  blocoDown(e, i) {
    if (e.button !== 0) return;
    this.limparArrasto?.();
    const el = e.currentTarget, x0 = e.clientX, y0 = e.clientY, pode = this.podeArrastar(i) && this.state.eixo !== 'prof';
    const colW = el.parentElement.getBoundingClientRect().width, cols = this.colDias || [1, 2, 3, 4, 5], dia0 = dsem(i.data), ci = cols.indexOf(dia0);
    const rr = this.raiz.current.getBoundingClientRect(), dur = hm(i.fim) - hm(i.ini);
    let mov = false, alvo = null;
    const move = ev => {
      const dx = ev.clientX - x0, dy = ev.clientY - y0;
      if (!mov && pode && Math.hypot(dx, dy) > 5) { mov = true; try { el.setPointerCapture(e.pointerId); } catch (er) {} el.style.zIndex = 8; el.style.boxShadow = '0 8px 20px rgba(0,0,0,.14)'; el.style.cursor = 'grabbing'; }
      if (!mov) return; ev.preventDefault();
      const ni = Math.max(0, Math.min(cols.length - 1, ci + Math.round(dx / colW)));
      const s0 = Math.max(JAN[0], Math.min(JAN[1] - dur, Math.round((hm(i.ini) + dy / PX) / 10) * 10));
      alvo = { dia: cols[ni], ini: mh(s0), fim: mh(s0 + dur) };
      el.style.transform = 'translate(' + ((ni - ci) * colW) + 'px,' + ((s0 - hm(i.ini)) * PX) + 'px)';
      const t = this.dicaRef.current; if (t) { t.textContent = DIA_C[alvo.dia] + ' ' + alvo.ini + '–' + alvo.fim; t.style.opacity = '1'; t.style.transform = 'translate(' + (ev.clientX - rr.left + 14) + 'px,' + (ev.clientY - rr.top + 14) + 'px)'; }
    };
    const up = () => {
      this.limparArrasto();
      if (this.dicaRef.current) this.dicaRef.current.style.opacity = '0';
      if (!mov) return this.abrirAula(i);
      el.style.transform = ''; el.style.zIndex = ''; el.style.boxShadow = ''; el.style.cursor = '';
      if (alvo && !(alvo.dia === dia0 && alvo.ini === i.ini)) this.propor(i, alvo);
    };
    this.limparArrasto = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); this.limparArrasto = null; };
    window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }
  propor(i, alvo) {
    const st = this.state, d = i.disc, novaData = addD(segDe(i.data), alvo.dia - 1);
    const c = { prof: d.prof, turma: d.turma, sala: i.sala, dia: alvo.dia, ini: alvo.ini, fim: alvo.fim };
    const erroSemana = this.checarData(Object.assign({ data: novaData, ignorar: [i.key] }, c), st);
    const erroGrade = i.remarcada ? 'Esta aula já foi remarcada nesta semana.' : this.checarSlot(Object.assign({ ignorar: [i.tkey] }, c), st.discs, st.profs);
    this.setState({ pend: { inst: i, alvo, novaData, erroSemana, erroGrade }, msg: null });
  }
  async confirmar(modo) {
    const st = this.state, p = st.pend; if (!p) return;
    const i = p.inst, d = i.disc;
    if (modo === 'semana' ? p.erroSemana : p.erroGrade) return;
    if (!this.iniciarGravacao('remarcacao')) return;
    try {
      if (modo === 'semana') {
        const aula = lerLoja().aulas.find(a => a.disciplina_id === d.id && a.data === i.dataOrig && a.hora_inicio?.slice(0, 5) === i.ini);
        if (!aula) throw { detalhe: 'Aula não encontrada no semestre.' };
        await atualizarAula(aula.aula_id, { data: p.novaData, hora_inicio: p.alvo.ini, hora_fim: p.alvo.fim });
      } else {
        const grade = d.grade.map((g, k) => k !== i.idx ? g : { ...g, dia_semana: p.alvo.dia, hora_inicio: p.alvo.ini, hora_fim: p.alvo.fim });
        await salvarGrade(d.id, itensAPI(grade));
      }
      await recarregarLoja();
      this.setState(s => ({ ...(s.pend === p ? { pend: null } : {}), msg: { t: d.nome + (modo === 'semana' ? ' remarcada só nesta semana.' : ' salva na grade do semestre.') } }));
    } catch (er) {
      this.setState(s => s.pend === p ? { pend: { ...p, ...(modo === 'semana' ? { erroSemana: er.detalhe } : { erroGrade: er.detalhe }) } } : { msg: { t: er.detalhe } });
    } finally { this.terminarGravacao('remarcacao'); }
  }
  statusProf(p, instHoje, hoje, nm, fer) {
    const dia = dsem(hoje), its = instHoje.filter(i => i.disc.prof === p.id).sort((a, b) => hm(a.ini) - hm(b.ini));
    const c = its.find(i => hm(i.ini) <= nm && nm < hm(i.fim));
    if (c) return { tag: 'Em aula', forte: true, det: c.disc.nome + ' · ' + nomeTurma(c.disc.turma) + ' · ' + nomeSala(c.sala) + ' · até ' + c.fim, prog: (nm - hm(c.ini)) / (hm(c.fim) - hm(c.ini)) };
    const o = (p.ocupados || []).find(x => x.dia_semana === dia && hm(x.hora_inicio) <= nm && nm < hm(x.hora_fim));
    if (o) return { tag: 'Ocupado', hach: true, det: (o.motivo || 'Horário ocupado') + ' · até ' + o.hora_fim, prog: (nm - hm(o.hora_inicio)) / (hm(o.hora_fim) - hm(o.hora_inicio)) };
    if (dia > 5) return { tag: 'Fim de semana', det: 'Sem aulas hoje.', prog: 0 };
    if (fer[hoje]) return { tag: 'Feriado', det: fer[hoje] + '.', prog: 0 };
    const nx = its.find(i => hm(i.ini) > nm);
    return { tag: 'Livre', det: nx ? 'Próxima: ' + nx.disc.nome + ' · ' + nomeTurma(nx.disc.turma) + ' às ' + nx.ini + '.' : its.length ? 'Sem mais aulas hoje.' : 'Sem aulas hoje.', prog: 0 };
  }
  cartao(nome, s, on, ir) {
    return { nome, tag: s.tag, det: s.det, prog: 'scaleX(' + Math.max(0, Math.min(1, s.prog || 0)).toFixed(3) + ')', on, ir,
      borda: on || s.forte ? 'var(--texto)' : 'var(--borda-fraca)', bg: on ? 'var(--sunken)' : 'var(--fundo)',
      tagBg: s.forte ? 'var(--texto)' : s.hach ? HACH : 'transparent', tagCor: s.forte ? 'var(--fundo)' : 'var(--texto)', tagBorda: s.forte ? 'var(--texto)' : 'var(--borda)' };
  }
  valsQuadro(st, P, now, fer) {
    const hoje = now.data, nm = now.min, esc = P === 'escola', narrow = st.largura < 760;
    const W = st.semana || segDe(hoje), eixo = esc ? (st.eixo || 'prof') : 'dias';
    const ch = this.choques(st.discs, st.profs), ids = new Set(this.escopo(st, P).map(d => d.id));
    const fil = i => ids.has(i.disc.id) && (!st.fTurma || i.disc.turma === st.fTurma) && (!st.fProf || String(i.disc.prof) === st.fProf) && (!st.fDisc || String(i.disc.id) === st.fDisc) && (!st.fSala || i.sala === st.fSala);
    const inst = this.instSemana(W, st, fer, P).filter(fil), prev = [], apagar = new Set();
    if (st.pend) { apagar.add(st.pend.inst.key); prev.push(Object.assign({}, st.pend.inst, { key: 'pv', data: st.pend.novaData, ini: st.pend.alvo.ini, fim: st.pend.alvo.fim, tipo: 'preview', feriado: '' })); }
    if (st.iaProp && !st.iaFeito) st.iaProp.moves.forEach((m, n) => {
      const d = st.discs.find(x => x.id === m.discId); if (!d) return;
      if (m.idx != null && d.grade[m.idx]) apagar.add(d.id + '-' + m.idx + '-' + addD(W, d.grade[m.idx].dia_semana - 1));
      const data = addD(W, m.dia - 1); if (data >= this.semestre().inicio && data <= this.semestre().fim) prev.push({ key: 'ia' + n, tkey: 'ia' + n, disc: d, idx: m.idx, tipo: 'proposta', data, ini: m.ini, fim: m.fim, sala: m.sala, feriado: fer[data] || '' });
    });
    const todos = inst.concat(prev);
    const est = i => {
      const passado = i.data < hoje || (i.data === hoje && hm(i.fim) <= nm), cur = i.data === hoje && hm(i.ini) <= nm && nm < hm(i.fim) && !i.feriado && !i.pendente && i.tipo !== 'preview' && i.tipo !== 'proposta';
      const choque = i.tipo === 'grade' && !i.remarcada && ch.M[i.tkey];
      let r = { borda: '1px solid var(--borda)', bg: 'var(--superficie)', op: 1, tag: '', tagCor: 'var(--texto)' };
      if (i.tipo === 'preview') r = { borda: '2px dashed var(--texto)', bg: 'var(--superficie)', op: 1, tag: 'Nova posição', tagCor: 'var(--texto)' };
      else if (i.tipo === 'proposta') r = { borda: '2px dashed var(--texto)', bg: 'var(--sunken)', op: 1, tag: 'Proposta', tagCor: 'var(--texto)' };
      else if (i.feriado) r = { borda: '1px solid var(--borda-fraca)', bg: 'var(--fundo)', op: 0.45, tag: 'Feriado', tagCor: 'var(--texto-suave)' };
      else if (i.pendente) r = { borda: '1px dashed var(--texto)', bg: 'var(--fundo)', op: 1, tag: i.pedido && i.pedido.status === 'sugestao' ? 'Extra · sugestão' : 'Extra · em análise', tagCor: 'var(--texto)' };
      else if (choque && esc) r = { borda: '1px solid var(--aviso)', bg: 'var(--aviso-suave)', op: 1, tag: 'Choque', tagCor: 'var(--aviso)' };
      else if (cur) r = { borda: '2px solid var(--texto)', bg: 'var(--sunken)', op: 1, tag: 'Agora', tagCor: 'var(--texto)' };
      else if (i.tipo === 'extra') r.tag = 'Extra';
      else if (i.remarcada) r.tag = 'Remarcada';
      if (!cur && passado && i.tipo !== 'preview' && i.tipo !== 'proposta' && !r.tag) r.op = 0.62;
      if (apagar.has(i.key)) r.op = 0.28;
      if (st.soChoques && !choque && i.tipo !== 'preview') r.op = Math.min(r.op, 0.22);
      return r;
    };
    const instHoje = this.instSemana(segDe(hoje), st, fer, 'escola').filter(i => i.data === hoje && !i.pendente && !i.feriado);
    const dSel = st.diaM || (dsem(hoje) <= 5 ? dsem(hoje) : 1);
    const colDias = narrow ? [dSel] : [1, 2, 3, 4, 5]; this.colDias = colDias;
    const evs = this.evVisiveis(st, P).filter(e => e.tipo !== 'feriado' && e.tipo !== 'bimestre');
    const evsDia = data => evs.filter(e => e.data <= data && data <= (e.fim || e.data));
    const profsOc = esc ? (st.fProf ? st.profs.filter(p => String(p.id) === st.fProf) : st.verOcup ? st.profs : []) : P === 'prof' ? st.profs.filter(p => p.id === this.profId()) : [];
    const bloco = (i, modo) => {
      const pode = this.podeArrastar(i) && modo === 'dias', e = est(i), d = i.disc, pn = this.profNome(d.prof, st.profs);
      return Object.assign(e, { key: i.key, nome: d.nome, curto: d.sigla + ' ' + (d.turma || '—'), l2: nomeTurma(d.turma) + ' · ' + nomeSala(i.sala), l3: (P === 'aluno' ? pn : pn.split(' ')[0]) + ' · ' + i.ini + '–' + i.fim, temTag: !!e.tag,
        titulo: d.nome + ' · ' + nomeTurma(d.turma) + ' · ' + nomeSala(i.sala) + ' · ' + pn + ' · ' + i.ini + '–' + i.fim + (e.tag ? ' · ' + e.tag : ''),
        cursor: pode ? 'grab' : 'pointer', touch: pode ? 'none' : 'auto', down: ev => this.blocoDown(ev, i), tecla: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.abrirAula(i); } } });
    };
    const cols = colDias.map(dia => {
      const data = addD(W, dia - 1), its = todos.filter(i => i.data === data).sort((a, b) => hm(a.ini) - hm(b.ini) || hm(b.fim) - hm(a.fim));
      let grupo = [], fimG = -1;
      const fechar = () => { const ln = []; grupo.forEach(i => { let l = ln.findIndex(x => x <= hm(i.ini)); if (l < 0) { l = ln.length; ln.push(0); } ln[l] = hm(i.fim); i._l = l; }); grupo.forEach(i => { i._n = ln.length; }); grupo = []; };
      its.forEach(i => { if (grupo.length && hm(i.ini) >= fimG) fechar(); grupo.push(i); fimG = Math.max(fimG, hm(i.fim)); }); fechar();
      const ed = evsDia(data);
      return { dia: DIA_C[dia], data: ddmm(data), hdBg: data === hoje ? 'var(--sunken)' : 'var(--superficie)', hdPeso: data === hoje ? 700 : 600,
        evs: ed.slice(0, 2).map(e => ({ ab: TIPOS[e.tipo].ab, bBg: TIPOS[e.tipo].bg, bCor: TIPOS[e.tipo].cor, bBorda: TIPOS[e.tipo].borda, titulo: e.titulo, abrir: () => this.setState({ painel: { tipo: 'evento', id: e.id } }) })), temMais: ed.length > 2, mais: '+' + (ed.length - 2),
        feriado: !!fer[data], feriadoTxt: fer[data] || '', agora: data === hoje && nm >= G0 && nm <= G1,
        ocup: profsOc.flatMap(p => (p.ocupados || []).filter(o => o.dia_semana === dia).map(o => ({ top: (hm(o.hora_inicio) - G0) * PX + 'px', h: (hm(o.hora_fim) - hm(o.hora_inicio)) * PX + 'px', txt: p.nome.split(' ')[0] + ' · ' + (o.motivo || 'ocupado') }))),
        blocos: its.map(i => Object.assign(bloco(i, 'dias'), { top: (hm(i.ini) - G0) * PX + 1 + 'px', h: (hm(i.fim) - hm(i.ini)) * PX - 2 + 'px', left: 'calc(' + (i._l / i._n * 100) + '% + 2px)', w: 'calc(' + (100 / i._n) + '% - 4px)' })) };
    });
    const profsLinhas = esc ? (st.fProf ? st.profs.filter(p => String(p.id) === st.fProf) : st.profs) : [];
    const pct = m => ((m - JAN[0]) / (JAN[1] - JAN[0]) * 100) + '%';
    const linhasP = profsLinhas.map(p => {
      const s = this.statusProf(p, instHoje, hoje, nm, fer);
      return { nome: p.nome, tag: s.tag, tagBg: s.forte ? 'var(--texto)' : s.hach ? HACH : 'transparent', tagCor: s.forte ? 'var(--fundo)' : 'var(--texto)', tagBorda: s.forte ? 'var(--texto)' : 'var(--borda)',
        dias: [1, 2, 3, 4, 5].map(dia => { const data = addD(W, dia - 1);
          return { bg: data === hoje ? 'var(--sunken)' : 'transparent', feriado: !!fer[data], agora: data === hoje && nm >= JAN[0] && nm <= JAN[1], agoraL: pct(nm),
            ocup: (p.ocupados || []).filter(o => o.dia_semana === dia).map(o => ({ left: pct(hm(o.hora_inicio)), w: ((hm(o.hora_fim) - hm(o.hora_inicio)) / (JAN[1] - JAN[0]) * 100) + '%', titulo: p.nome + ' · ' + (o.motivo || 'ocupado') + ' · ' + o.hora_inicio + '–' + o.hora_fim })),
            blocos: todos.filter(i => i.data === data && i.disc.prof === p.id).map(i => Object.assign(bloco(i, 'prof'), { left: pct(hm(i.ini)), w: ((hm(i.fim) - hm(i.ini)) / (JAN[1] - JAN[0]) * 100) + '%' })) }; }) };
    });
    const slot = SLOTS.findIndex(s => hm(s[0]) <= nm && nm < hm(s[1])), prox = SLOTS.find(s => hm(s[0]) > nm), diaH = dsem(hoje);
    const periodo = diaH > 5 ? 'Fim de semana · sem aulas' : fer[hoje] ? 'Feriado: ' + fer[hoje] : slot >= 0 ? (slot + 1) + 'º horário · termina às ' + SLOTS[slot][1] : nm < JAN[0] ? 'Antes do 1º horário · começa às 08:00' : prox ? 'Intervalo · próximo horário às ' + prox[0] : 'Fora do horário de aula';
    let cartoes;
    if (esc) cartoes = st.profs.map(p => this.cartao(p.nome, this.statusProf(p, instHoje, hoje, nm, fer), st.fProf === String(p.id), () => this.setState(s2 => ({ fProf: s2.fProf === String(p.id) ? '' : String(p.id) }))));
    else if (P === 'prof') cartoes = [this.cartao('Você', this.statusProf(st.profs.find(p => p.id === this.profId()) || { ocupados: [] }, instHoje, hoje, nm, fer), false, () => {})];
    else {
      const its = instHoje.filter(i => !this.turmaId() || i.disc.turma === this.turmaId()).sort((a, b) => hm(a.ini) - hm(b.ini)), c = its.find(i => hm(i.ini) <= nm && nm < hm(i.fim)), nx = its.find(i => hm(i.ini) > nm);
      cartoes = [this.cartao('Agora', c ? { tag: 'Em aula', forte: true, det: c.disc.nome + ' · ' + nomeSala(c.sala) + ' · ' + this.profNome(c.disc.prof) + ' · até ' + c.fim, prog: (nm - hm(c.ini)) / (hm(c.fim) - hm(c.ini)) } : { tag: 'Sem aula', det: 'Nenhuma aula da turma neste momento.', prog: 0 }, false, () => {}),
        this.cartao('Próxima', nx ? { tag: nx.ini, det: nx.disc.nome + ' · ' + nomeSala(nx.sala) + ' · ' + this.profNome(nx.disc.prof) } : { tag: '—', det: 'Sem mais aulas hoje.' }, false, () => {})];
    }
    const pd = st.pend, op = (lista, v) => lista.map(x => ({ v: String(x.id), l: x.nome, on: v === String(x.id) }));
    const escD = this.escopo(st, P), msgIa = st.iaProp;
    return {
      horaTxt: mh(nm), dataTxt: DIA_L[diaH] + ', ' + hoje.slice(8, 10) + ' de ' + MESES[+hoje.slice(5, 7) - 1], relogioRot: now.vivo ? 'Ao vivo' : 'Relógio simulado', periodoTxt: periodo,
      pulsoRef: el => { if (el && el.animate && !this.rm && !el._pul) { el._pul = 1; el.animate([{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }], { duration: 1800, iterations: Infinity }); } },
      cartoes, cartaoAjuda: esc ? 'Toque num professor para filtrar o quadro.' : '',
      eixoVis: esc, eixos: [['prof', 'Professores'], ['dias', 'Dias × horários']].map(([id, l]) => ({ label: l, on: eixo === id, bg: eixo === id ? 'var(--texto)' : 'transparent', cor: eixo === id ? 'var(--fundo)' : 'var(--texto)', peso: eixo === id ? 600 : 500, ir: () => this.setState({ eixo: id, pend: null }) })),
      eixoDias: eixo === 'dias', eixoProf: eixo === 'prof',
      semanaTxt: 'Semana de ' + ddmm(W) + ' a ' + ddmm(addD(W, 4)), semAnt: () => this.setState({ semana: addD(W, -7), pend: null }), semProx: () => this.setState({ semana: addD(W, 7), pend: null }), naoAtual: W !== segDe(hoje), irHoje: () => this.setState({ semana: null, pend: null }),
      filtrosVis: P !== 'aluno', fTurmaVis: esc, fProfVis: esc, fSalaVis: esc,
      optTurmas: lerLoja().turmas.map(t => ({ v: t.id, l: t.nome })), optProfs: st.profs.map(p => ({ v: String(p.id), l: p.nome })), optDiscs: escD.map(d => ({ v: String(d.id), l: d.nome + ' · ' + nomeTurma(d.turma) })), optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })),
      fTurma: st.fTurma, fProf: st.fProf, fDisc: st.fDisc, fSala: st.fSala,
      setFTurma: e => this.setState({ fTurma: e.target.value }), setFProf: e => this.setState({ fProf: e.target.value }), setFDisc: e => this.setState({ fDisc: e.target.value }), setFSala: e => this.setState({ fSala: e.target.value }),
      filtrado: !!(st.fTurma || st.fProf || st.fDisc || st.fSala), limparFiltros: () => this.setState({ fTurma: '', fProf: '', fDisc: '', fSala: '' }),
      ocupVis: esc, verOcup: st.verOcup, alternarOcup: () => this.setState(s => ({ verOcup: !s.verOcup })), ocupBg: st.verOcup ? 'var(--sunken)' : 'var(--superficie)',
      choquesVis: esc, choquesTxt: ch.n ? ch.n + (ch.n === 1 ? ' choque' : ' choques') : 'Sem choques', soChoques: st.soChoques, alternarChoques: () => { if (ch.n) this.setState(s => ({ soChoques: !s.soChoques })); },
      choquesBorda: ch.n ? 'var(--aviso)' : 'var(--borda)', choquesCor: ch.n ? 'var(--aviso)' : 'var(--texto-suave)', choquesBg: st.soChoques ? 'var(--aviso-suave)' : 'var(--superficie)',
      iaBotaoVis: esc, iaAberto: esc && st.iaAberto, alternarIa: () => this.setState(s => ({ iaAberto: !s.iaAberto })), iaBotaoBg: st.iaAberto ? 'var(--sunken)' : 'var(--superficie)',
      diasMVis: narrow && eixo === 'dias', diasM: [1, 2, 3, 4, 5].map(d => ({ l: DIA_C[d] + ' ' + ddmm(addD(W, d - 1)), on: d === dSel, bg: d === dSel ? 'var(--texto)' : 'var(--superficie)', cor: d === dSel ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState({ diaM: d }) })),
      gridCols: '56px repeat(' + colDias.length + ',minmax(0,1fr))', gridMinW: narrow ? '0' : '760px', gridH: (G1 - G0) * PX + 'px',
      horas: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => ({ t: pad(h) + ':00', top: (h * 60 - G0) * PX + 'px' })),
      intTop: (700 - G0) * PX + 'px', intH: 110 * PX + 'px', agoraTop: (nm - G0) * PX + 'px', cols, linhasP, profVazio: !linhasP.length,
      dragDica: esc && eixo === 'dias' ? 'Arraste uma aula para remarcar. Toque para ver os detalhes.' : 'Toque numa aula para ver os detalhes.',
      pendVis: !!pd, pendErroTotal: !!(pd && pd.erroSemana && pd.erroGrade), pendOk: !!(pd && !(pd.erroSemana && pd.erroGrade)),
      pendTxt: pd ? 'Mover ' + pd.inst.disc.nome + ' · ' + nomeTurma(pd.inst.disc.turma) + ' de ' + DIA_L[dsem(pd.inst.data)] + ' ' + ddmm(pd.inst.data) + ', ' + pd.inst.ini + ' para ' + DIA_L[pd.alvo.dia] + ' ' + ddmm(pd.novaData) + ', ' + pd.alvo.ini + '?' : '',
      pendErro: pd ? (pd.erroSemana || pd.erroGrade) : '', pendSemOff: !!(pd && pd.erroSemana) || !!st.gravando.remarcacao, pendGrOff: !!(pd && pd.erroGrade) || !!st.gravando.remarcacao, pendSemO: (pd && pd.erroSemana) || st.gravando.remarcacao ? 0.4 : 1, pendGrO: (pd && pd.erroGrade) || st.gravando.remarcacao ? 0.4 : 1,
      pendNotas: pd ? [pd.erroSemana && !pd.erroGrade ? 'Só nesta semana não dá: ' + pd.erroSemana : '', pd.erroGrade && !pd.erroSemana ? 'Na grade do semestre não dá: ' + pd.erroGrade : ''].filter(Boolean).map(t => ({ t })) : [],
      confSemana: () => this.confirmar('semana'), confGrade: () => this.confirmar('grade'), cancelarPend: () => this.setState({ pend: null })
    };
  }
  renderVals() {
    const st = this.state, P = this.perfil(), now = this.agora(), esc = P === 'escola';
    const nPend = st.pedidos.filter(p => p.status === 'pendente').length, nSug = st.pedidos.filter(p => p.prof === this.profId() && p.status === 'sugestao').length;
    const tabs = esc ? [['quadro', 'Quadro semanal'], ['ano', 'Ano letivo'], ['disc', 'Disciplinas'], ['pedidos', 'Pedidos de aula extra', nPend]] : P === 'prof' ? [['quadro', 'Minha semana'], ['ano', 'Ano letivo'], ['pedidos', 'Aulas extras', nSug]] : [['quadro', 'Minha semana'], ['ano', 'Ano letivo']];
    const aba = tabs.some(t => t[0] === st.aba) ? st.aba : 'quadro';
    const me = this.profNome(this.profId()), fer = this.ferMap(st.eventos);
    return Object.assign(aba === 'quadro' ? this.valsQuadro(st, P, now, fer) : {}, aba === 'quadro' && esc ? this.valsIa(st) : {}, aba === 'ano' ? this.valsAno(st, P, now, fer) : {}, aba === 'disc' ? this.valsDisc(st, now, fer) : {}, aba === 'pedidos' ? this.valsPed(st, P) : {}, this.valsPainel(st, P, now, fer), {
      raiz: this.raiz, dicaRef: this.dicaRef,
      ...(() => { const emb = !!this.props.embutido, g = st.pGeo || { top: 0, h: 0 }; return { raizMinH: emb ? '0' : '100vh', raizBg: emb ? 'transparent' : 'var(--fundo)', raizMaxW: emb ? 'none' : '1320px', raizPad: emb ? '0' : 'clamp(20px,4cqi,40px) clamp(16px,3cqi,40px) 96px',
        pPos: emb ? 'absolute' : 'fixed', pTop: emb ? g.top + 'px' : '0', pH: emb ? g.h + 'px' : '100vh' }; })(),
      rotulo: (esc ? 'Escola' : P === 'prof' ? me : this.turmaAluno()) + ' · semestre ' + this.semestre().nome,
      subtitulo: esc ? 'O quadro mostra a escala de todos os professores agora e na semana. O ano letivo junta provas, eventos e feriados.' : P === 'prof' ? 'Suas aulas da semana, o calendário da escola e os seus pedidos de aula extra.' : 'As aulas da sua turma e o que vem pela frente no ano letivo.',
      abas: tabs.map(([id, label, n]) => ({ label, on: aba === id, peso: aba === id ? 600 : 500, cor: aba === id ? 'var(--texto)' : 'var(--texto-suave)', barra: aba === id ? 'var(--texto)' : 'transparent', temN: !!n, n: n || '', ir: () => this.setState({ aba: id, painel: null, pend: null }) })),
      abaQuadro: aba === 'quadro', abaAno: aba === 'ano', abaDisc: aba === 'disc', abaPed: aba === 'pedidos',
      msgVis: !!st.msg, msgTxt: st.msg ? st.msg.t : '', desfazer: () => { const m = this.state.msg; if (m && m.snap) this.setState({ discs: m.snap.discs, remarc: m.snap.remarc, msg: { t: 'Desfeito.' } }); }, fecharMsg: () => this.setState({ msg: null }), temDesfazer: import.meta.env.DEV && !!(st.msg && st.msg.snap)
    });
  }
  async iaEnviar(txt) {
    const t = (txt != null ? txt : this.state.iaTexto).trim(); if (!t || this.state.iaEnv) return;
    const mensagens = this.state.iaMsgs.concat({ papel: 'usuario', texto: t });
    this.setState({ iaMsgs: mensagens, iaTexto: '', iaEnv: true });
    try {
      const r = await pedirGradeIA(mensagens.map(({ papel, texto }) => ({ papel, texto })));
      const moves = r.proposta.flatMap(p => {
        const d = this.state.discs.find(d => d.id === p.disciplina_id);
        return p.itens.map((x, idx) => ({ discId: p.disciplina_id, idx, novo: !d?.grade[idx], nome: p.disciplina_nome,
          de: d?.grade[idx] ? DIA_C[d.grade[idx].dia_semana] + ' ' + d.grade[idx].hora_inicio : 'sem horário',
          dia: x.dia_semana, ini: x.hora_inicio, fim: x.hora_fim, sala: String(x.sala_id ?? d?.sala ?? '') }));
      });
      this.setState(s => ({ iaEnv: false, iaMsgs: s.iaMsgs.concat({ papel: 'ia', texto: r.resposta }),
        iaProp: r.proposta.length || r.recusados.length ? { proposta: r.proposta, moves, rec: r.recusados.map(p => ({ nome: p.disciplina_nome, motivo: p.motivo })), idx: s.iaMsgs.length } : null, iaFeito: null }));
    } catch (er) {
      // O canvas do Quadro apresenta respostas no log da conversa.
      this.setState(s => ({ iaEnv: false, iaMsgs: s.iaMsgs.concat({ papel: 'ia', texto: erroGradeIA(er) }) }));
    }
  }
  async iaAplicar() {
    const p = this.state.iaProp; if (!p || this.state.iaFeito || this.state.iaEnv) return;
    if (!this.iniciarGravacao('proposta')) return;
    this.setState({ iaEnv: true });
    const res = [];
    for (const d of p.proposta) {
      try { await salvarGrade(d.disciplina_id, d.itens); res.push(d.disciplina_nome + (d.itens.length ? ': grade salva.' : ': Horários removidos.')); }
      catch (er) { res.push(d.disciplina_nome + ': ' + er.detalhe); }
      this.setState(s => s.iaProp === p ? { iaFeito: res.join('\n') } : {});
    }
    try { await recarregarLoja(); } catch (er) { res.push(er.detalhe); }
    this.setState(s => ({ iaEnv: false, ...(s.iaProp === p ? { iaFeito: res.join('\n') } : {}), msg: { t: 'Aplicação da proposta concluída. Veja o resultado por disciplina.' } }));
    this.terminarGravacao('proposta');
  }
  valsIa(st) {
    const p = st.iaProp;
    return { iaVazio: !st.iaMsgs.length && !st.iaEnv, iaSug: ['Tem algum choque na grade atual?', 'Resolva os choques e monte a grade das disciplinas sem horário.', this.demo() ? lerLoja().iaSugGrade : 'Reorganize as aulas de um professor para o período da manhã.'].map(t => ({ t, usar: () => this.iaEnviar(t) })),
      iaLista: st.iaMsgs.map((m, i) => ({ autor: m.papel === 'usuario' ? 'Escola' : 'Assistente', usuario: m.papel === 'usuario', ia: m.papel === 'ia', texto: m.texto, temProp: !!p && p.idx === i })),
      iaMoves: p ? p.moves.map(m => ({ nome: m.nome, de: m.de, para: DIA_C[m.dia] + ' ' + m.ini + '–' + m.fim + ' · ' + nomeSala(m.sala) })) : [], iaTemMoves: !!(p && p.moves.length), iaRec: p ? p.rec : [], iaTemRec: !!(p && p.rec.length),
      iaAcoes: !!(p && p.proposta.length && !st.iaFeito), iaFeitoVis: !!st.iaFeito, iaFeito: st.iaFeito || '', iaAplicar: () => this.iaAplicar(), iaDescartar: () => this.setState({ iaProp: null, iaFeito: null }),
      iaEnv: st.iaEnv, iaTexto: st.iaTexto, setIaTexto: e => this.setState({ iaTexto: e.target.value }), iaTecla: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.iaEnviar(); } },
      iaSubmit: e => { e.preventDefault(); this.iaEnviar(); }, iaOff: st.iaEnv || !st.iaTexto.trim(), iaEnvO: st.iaEnv || !st.iaTexto.trim() ? 0.4 : 1, fecharIa: () => this.setState({ iaAberto: false }),
      iaMsgRef: el => { if (el && el.animate && !el._a) { el._a = 1; el.animate(this.rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }); } },
      iaFimRef: el => { if (el) { const p2 = el.parentElement; if (p2) p2.scrollTop = p2.scrollHeight; } } };
  }
  chipEv(e) { const T = TIPOS[e.tipo]; return { ab: T.ab, bBg: T.bg, bCor: T.cor, bBorda: T.borda, titulo: e.titulo, tipoTxt: T.label, quem: e.turmas === 'todas' ? 'Todas as turmas' : e.turmas.map(nomeTurma).join(', '), hora: e.hi ? e.hi + (e.hf ? '–' + e.hf : '') : '', datas: ddmm(e.data) + (e.fim ? ' a ' + ddmm(e.fim) : ''), abrir: () => this.setState({ painel: { tipo: 'evento', id: e.id } }) }; }
  novoEvento(data) { this.setState({ painel: { tipo: 'eventoForm', id: null }, eErro: '', eF: { tipo: 'prova', titulo: '', data: data || '', fim: '', hi: '', hf: '', todas: true, turmas: [], disc: '', desc: '' } }); }
  editarEvento(e) { this.setState({ painel: { tipo: 'eventoForm', id: e.id }, eErro: '', eF: { tipo: e.tipo, titulo: e.titulo, data: e.data, fim: e.fim || '', hi: e.hi || '', hf: e.hf || '', todas: e.turmas === 'todas', turmas: e.turmas === 'todas' ? [] : e.turmas.slice(), disc: e.disc ? String(e.disc) : '', desc: e.desc || '' } }); }
  async salvarEvento(ev) {
    ev.preventDefault(); if (this.state.gravando.evento) return;
    const st = this.state, f = st.eF, pn = st.painel, id = pn.id, erro = t => this.responderPainel(pn, { eErro: t }, t);
    if (!f.titulo.trim()) return erro('Dê um título ao evento.');
    if (!f.data) return erro('Escolha a data.');
    if (f.data.slice(0, 4) !== this.ano().inicio.slice(0, 4)) return erro('A data precisa estar no ano letivo de ' + this.ano().inicio.slice(0, 4) + '.');
    if (f.fim && f.fim < f.data) return erro('O fim precisa ser no mesmo dia ou depois do início.');
    if ((f.hi && !f.hf) || (!f.hi && f.hf)) return erro('Preencha os dois horários ou deixe os dois em branco.');
    if (f.hi && !(hm(f.hi) < hm(f.hf))) return erro('O horário de fim precisa ser depois do início.');
    if (!f.todas && !f.turmas.length) return erro('Escolha pelo menos uma turma.');
    const obj = { id: id || Date.now(), tipo: f.tipo, titulo: f.titulo.trim(), data: f.data, fim: f.fim && f.fim !== f.data ? f.fim : '', hi: f.hi, hf: f.hf, turmas: f.todas ? 'todas' : f.turmas.slice(), disc: f.disc ? +f.disc : null, desc: f.desc.trim() };
    if (this.demo()) return this.setState(s => ({ eventos: id ? s.eventos.map(x => x.id === id ? obj : x) : s.eventos.concat(obj), painel: { tipo: 'evento', id: obj.id }, msgAno: id ? 'Evento atualizado.' : 'Evento publicado no calendário.', ref: obj.data }));
    if (!this.iniciarGravacao('evento')) return;
    try {
      const salvo = id ? await atualizarEvento(id, eventoAPI(obj)) : await criarEvento(eventoAPI(obj));
      await recarregarLoja();
      const msgAno = id ? 'Evento atualizado.' : 'Evento publicado no calendário.';
      this.responderPainel(pn, { painel: { tipo: 'evento', id: salvo.id }, eErro: '', msgAno, ref: obj.data }, msgAno);
    } catch (er) { erro(er.detalhe); }
    finally { this.terminarGravacao('evento'); }
  }
  valsAno(st, P, now, fer) {
    const hoje = now.data, ref = st.ref || hoje, esc = P === 'escola', vis = st.vis;
    const evs = this.evVisiveis(st, P).filter(e => !st.tiposOff[e.tipo] && (!esc || !st.aTurma || e.turmas === 'todas' || e.turmas.includes(st.aTurma))).sort((a, b) => a.data.localeCompare(b.data) || (a.hi || '').localeCompare(b.hi || ''));
    const doDia = d => evs.filter(e => e.data <= d && d <= (e.fim || e.data));
    const mesTxt = d => MESES[+d.slice(5, 7) - 1] + ' de ' + d.slice(0, 4), first = d => d.slice(0, 8) + '01', lastDay = d => { const y = +d.slice(0, 4), m = +d.slice(5, 7); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
    const nav = n => { let r = ref; if (vis === 'ano') r = (+ref.slice(0, 4) + n) + ref.slice(4); else if (vis === 'mes') { const y = +ref.slice(0, 4), m = +ref.slice(5, 7) - 1 + n; r = (y + Math.floor(m / 12)) + '-' + pad(((m % 12) + 12) % 12 + 1) + '-01'; } else if (vis === 'semana') r = addD(ref, 7 * n); else r = addD(ref, n); this.setState({ ref: r }); };
    const W = segDe(ref);
    const titulo = vis === 'ano' ? ref.slice(0, 4) : vis === 'mes' ? mesTxt(ref) : vis === 'semana' ? ddmm(W) + ' a ' + ddmm(addD(W, 6)) : vis === 'dia' ? DIA_L[dsem(ref)] + ', ' + ref.slice(8, 10) + ' de ' + MESES[+ref.slice(5, 7) - 1] : st.passados ? 'Ano letivo inteiro' : 'A partir de hoje';
    const r = {
      visOps: [['ano', 'Ano'], ['mes', 'Mês'], ['semana', 'Semana'], ['dia', 'Dia'], ['lista', 'Lista']].map(([id, l]) => ({ label: l, on: vis === id, bg: vis === id ? 'var(--texto)' : 'transparent', cor: vis === id ? 'var(--fundo)' : 'var(--texto)', peso: vis === id ? 600 : 500, ir: () => this.setState({ vis: id }) })),
      anoTitulo: titulo, anoNavVis: vis !== 'lista', anoAnt: () => nav(-1), anoProx: () => nav(1), anoHoje: () => this.setState({ ref: null }), anoNaoHoje: ref !== hoje,
      aTurmaVis: esc, aTurma: st.aTurma, setATurma: e => this.setState({ aTurma: e.target.value }), optTurmas: lerLoja().turmas.map(t => ({ v: t.id, l: t.nome })), novoEvVis: esc, novoEv: () => this.novoEvento(vis === 'dia' ? ref : ''),
      tiposF: Object.keys(TIPOS).map(k => { const T = TIPOS[k], on = !st.tiposOff[k]; return { label: T.label, ab: T.ab, bBg: T.bg, bCor: T.cor, bBorda: T.borda, on, op: on ? 1 : 0.45, borda: on ? 'var(--texto)' : 'var(--borda)', ir: () => this.setState(s => ({ tiposOff: Object.assign({}, s.tiposOff, { [k]: !s.tiposOff[k] }) })) }; }),
      escopoAno: esc ? 'A escola vê o calendário de todas as turmas.' : P === 'prof' ? 'Você vê os eventos gerais e os das turmas em que dá aula.' : 'Você vê os eventos gerais e os ' + (this.demo() ? 'do ' : 'de ') + this.turmaAluno() + '.',
      visAno: vis === 'ano', visMes: vis === 'mes', visSemana: vis === 'semana', visDia: vis === 'dia', visLista: vis === 'lista', msgAnoVis: !!st.msgAno, msgAno: st.msgAno || '', fecharMsgAno: () => this.setState({ msgAno: '' })
    };
    const diaCel = (d, opts) => { const ds = doDia(d), fe = !!fer[d], bim = ds.some(e => e.tipo === 'bimestre'), letivo = d >= this.ano().inicio && d <= this.ano().fim, tp = [...new Set(ds.filter(e => e.tipo !== 'feriado').map(e => e.tipo))].slice(0, 3);
      return { n: String(+d.slice(8, 10)), hoje: d === hoje, bg: d === hoje ? 'var(--texto)' : fe ? HACH : 'transparent', cor: d === hoje ? 'var(--fundo)' : letivo ? 'var(--texto)' : 'var(--texto-suave)', peso: ds.length ? 700 : 400, borda: bim ? 'var(--texto)' : 'transparent',
        marcas: tp.map(k => ({ bg: TIPOS[k].bg, borda: TIPOS[k].borda })), title: ds.map(e => e.titulo).join(' · '), aria: d.slice(8, 10) + ' de ' + MESES[+d.slice(5, 7) - 1] + (ds.length ? ': ' + ds.map(e => e.titulo).join(', ') : ''), ir: () => this.setState({ vis: 'dia', ref: d }) }; };
    if (vis === 'ano') {
      const y = ref.slice(0, 4);
      r.meses = MESES.map((nm, i) => { const f = y + '-' + pad(i + 1) + '-01', L = lastDay(f), lead = dsem(f) - 1, dias = [];
        for (let k = 0; k < lead; k++) dias.push({ vazio: true, n: '', vis: 'hidden', marcas: [], ir: () => {} });
        for (let k = 1; k <= L; k++) dias.push(Object.assign(diaCel(y + '-' + pad(i + 1) + '-' + pad(k)), { vis: 'visible' }));
        const nEv = evs.filter(e => e.data.slice(0, 7) === f.slice(0, 7) && e.tipo !== 'bimestre').length;
        return { nome: nm.charAt(0).toUpperCase() + nm.slice(1), nEv: nEv ? nEv + (nEv === 1 ? ' evento' : ' eventos') : '', dias, op: f.slice(0, 7) < this.ano().inicio.slice(0, 7) ? 0.55 : 1, ir: () => this.setState({ vis: 'mes', ref: f }) }; });
      r.legenda = Object.keys(TIPOS).map(k => ({ ab: TIPOS[k].ab, label: TIPOS[k].label, bBg: TIPOS[k].bg, bCor: TIPOS[k].cor, bBorda: TIPOS[k].borda }));
    }
    if (vis === 'mes') {
      const f = first(ref), ini = segDe(f), L = lastDay(f), fimM = f.slice(0, 8) + pad(L), fimG = addD(segDe(fimM), 6), cel = [];
      for (let d = ini; d <= fimG; d = addD(d, 1)) { const ds = doDia(d).filter(e => e.tipo !== 'feriado'), dc = diaCel(d);
        cel.push({ n: dc.n, ir: dc.ir, numBg: d === hoje ? 'var(--texto)' : 'transparent', numCor: d === hoje ? 'var(--fundo)' : 'var(--texto)', bg: fer[d] ? HACH : d.slice(0, 7) === f.slice(0, 7) ? 'var(--superficie)' : 'var(--fundo)', op: d.slice(0, 7) === f.slice(0, 7) ? 1 : 0.5, fer: fer[d] || '', temFer: !!fer[d],
          evs: ds.slice(0, 3).map(e => this.chipEv(e)), temMais: ds.length > 3, mais: '+' + (ds.length - 3) + ' no dia' }); }
      r.celMes = cel; r.semDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(t => ({ t }));
    }
    if (vis === 'semana') {
      const ins = this.instSemana(W, st, fer, P), ids = new Set(this.escopo(st, P).map(d => d.id));
      r.semCols = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = addD(W, k), na = ins.filter(i => i.data === d && ids.has(i.disc.id) && !i.feriado && !i.pendente).length;
        return { dia: DIA_C[k + 1] + ' ' + ddmm(d), bg: d === hoje ? 'var(--sunken)' : 'var(--superficie)', fer: fer[d] || '', temFer: !!fer[d], evs: doDia(d).filter(e => e.tipo !== 'feriado').map(e => this.chipEv(e)), aulas: na ? na + (na === 1 ? ' aula' : ' aulas') : '', temAulas: !!na, irDia: () => this.setState({ vis: 'dia', ref: d }), vazio: !doDia(d).length && !na }; });
    }
    if (vis === 'dia') {
      const ids = new Set(this.escopo(st, P).map(d => d.id)), ins = this.instSemana(segDe(ref), st, fer, P).filter(i => i.data === ref && ids.has(i.disc.id)).sort((a, b) => hm(a.ini) - hm(b.ini));
      r.diaAulas = ins.map(i => { const passado = ref < hoje || (ref === hoje && hm(i.fim) <= now.min), cur = ref === hoje && hm(i.ini) <= now.min && now.min < hm(i.fim);
        return { hora: i.ini + '–' + i.fim, nome: i.disc.nome + ' · ' + nomeTurma(i.disc.turma), sub: nomeSala(i.sala) + ' · ' + this.profNome(i.disc.prof), st: i.feriado ? 'Sem aula · feriado' : i.pendente ? 'Extra em análise' : cur ? 'Agora' : passado ? 'Dada' : 'Prevista', forte: cur, abrir: () => this.abrirAula(i) }; });
      r.diaTemAulas = ins.length > 0; r.diaSemAulas = !ins.length; r.diaSemAulasTxt = fer[ref] ? 'Sem aula: ' + fer[ref] + '.' : dsem(ref) > 5 ? 'Fim de semana.' : 'Nenhuma aula neste dia.';
      r.diaEvs = doDia(ref).map(e => Object.assign(this.chipEv(e), { desc: e.desc })); r.diaTemEvs = r.diaEvs.length > 0; r.diaSemEvs = !r.diaEvs.length;
    }
    if (vis === 'lista') {
      const lst = evs.filter(e => st.passados || (e.fim || e.data) >= hoje), grupos = [];
      lst.forEach(e => { const k = e.data.slice(0, 7); let g = grupos.find(x => x.k === k); if (!g) { g = { k, mes: mesTxt(e.data + ''), itens: [] }; g.mes = g.mes.charAt(0).toUpperCase() + g.mes.slice(1); grupos.push(g); } g.itens.push(Object.assign(this.chipEv(e), { dia: DIA_C[dsem(e.data)] })); });
      r.grupos = grupos; r.listaVazia = !grupos.length; r.passados = st.passados; r.alternarPassados = () => this.setState(s => ({ passados: !s.passados })); r.passadosTxt = st.passados ? 'Esconder passados' : 'Mostrar passados';
    }
    return r;
  }
  abrirDisc(d) {
    const f = d ? { nome: d.nome, turma: d.turma, prof: String(d.prof || ''), sala: d.sala, carga: String(d.carga), grade: (d.grade || []).map((g, k) => ({ k: k + 1, dia: String(g.dia_semana), ini: g.hora_inicio, fim: g.hora_fim, sala: g.sala || d.sala })) }
      : { nome: '', turma: lerLoja().turmas[0]?.id, prof: '', sala: lerLoja().salas[0]?.id, carga: '60', grade: [{ k: 1, dia: '1', ini: '08:00', fim: '09:40', sala: lerLoja().salas[0]?.id }] };
    this.setState({ painel: { tipo: 'disc', id: d ? d.id : null }, dF: f, dErro: '', dOk: '' });
  }
  setDF(campo, v) { this.setState(s => ({ dF: Object.assign({}, s.dF, { [campo]: v }), dErro: '', dOk: '' })); }
  setLinhaD(k, campo, v) { this.setState(s => ({ dF: Object.assign({}, s.dF, { grade: s.dF.grade.map(r => r.k === k ? Object.assign({}, r, { [campo]: v }) : r) }), dErro: '', dOk: '' })); }
  errosDisc(f, id) {
    const st = this.state, ig = id ? (st.discs.find(d => d.id === id)?.grade || []).map((x, k) => id + '-' + k) : [];
    return f.grade.map((r, i) => {
      for (let j = 0; j < f.grade.length; j++) { if (j === i) continue; const o = f.grade[j]; if (o.dia === r.dia && hm(r.ini) < hm(o.fim) && hm(o.ini) < hm(r.fim)) return 'Sobrepõe o horário ' + (j + 1) + '.'; }
      return this.checarSlot({ prof: f.prof ? +f.prof : null, turma: f.turma, sala: r.sala, dia: +r.dia, ini: r.ini, fim: r.fim, ignorar: ig }, st.discs, st.profs);
    });
  }
  async salvarDisc(e) {
    e.preventDefault(); if (this.state.gravando.disciplina) return;
    const st = this.state, f = st.dF, pn = st.painel, id = pn.id, erro = t => this.responderPainel(pn, { dErro: t, dOk: '' }, t);
    if (!f.nome.trim()) return erro('Informe o nome.');
    if (st.discs.some(d => d.id !== id && d.turma === f.turma && d.nome.trim().toLowerCase() === f.nome.trim().toLowerCase())) return erro('Essa turma já tem uma disciplina com esse nome.');
    const c = parseInt(f.carga, 10); if (isNaN(c) || c <= 0) return erro('A carga horária precisa ser maior que zero.');
    const errs = this.errosDisc(f, id), k = errs.findIndex(Boolean); if (k >= 0) return erro('Horário ' + (k + 1) + ': ' + errs[k]);
    if (!this.iniciarGravacao('disciplina')) return;
    let nid = id;
    try {
      const corpo = disciplinaAPI({ ...f, nome: f.nome.trim(), carga: c });
      nid = (id ? await atualizarDisciplina(id, corpo) : await criarDisciplina(corpo)).id;
      const grade = itensAPI(f.grade.map(r => ({ dia_semana: +r.dia, hora_inicio: r.ini, hora_fim: r.fim, sala: r.sala })));
      await salvarGrade(nid, grade); await recarregarLoja();
      const dOk = grade.length ? 'Grade salva: ' + grade.length + (grade.length === 1 ? ' aula' : ' aulas') + ' por semana.' : 'Salvo. Sem horários, a disciplina não aparece no quadro.';
      this.responderPainel(pn, { painel: { tipo: 'disc', id: nid }, dErro: '', dOk }, dOk);
    } catch (er) {
      if (nid) { try { await recarregarLoja(); } catch {} }
      this.responderPainel(pn, { ...(nid ? { painel: { tipo: 'disc', id: nid } } : {}), dErro: er.detalhe, dOk: '' }, er.detalhe);
    } finally { this.terminarGravacao('disciplina'); }
  }
  valsDisc(st, now, fer) {
    const ch = this.choques(st.discs, st.profs);
    const turmas = lerLoja().turmas.concat(st.discs.some(d => !d.turma) ? [{ id: '', nome: 'Sem turma' }] : []);
    return {
      novaDisc: () => this.abrirDisc(null), discResumo: st.discs.length + ' disciplinas · ' + lerLoja().turmas.length + ' turmas · ' + (ch.n ? ch.n + (ch.n === 1 ? ' choque na grade' : ' choques na grade') : 'grade sem choques'),
      turmasD: (turmas.length ? turmas : [{ id: undefined, nome: '—' }]).map(t => { const ds = st.discs.filter(d => t.id === '' ? !d.turma : d.turma === t.id); const aulas = ds.reduce((x, d) => x + (d.grade || []).length, 0);
        return { nome: t.nome, sub: ds.length + (ds.length === 1 ? ' disciplina' : ' disciplinas') + ' · ' + aulas + (aulas === 1 ? ' aula' : ' aulas') + ' por semana',
          linhas: ds.map(d => { const c = this.carga(d, st, fer, now.data, now.min), temCh = (d.grade || []).some((x, k) => ch.M[d.id + '-' + k]), falta = d.carga - c.total;
            return { nome: d.nome, prof: this.profNome(d.prof), sala: nomeSala(d.sala), horarios: (d.grade || []).length ? d.grade.map(x => DIA_C[x.dia_semana] + ' ' + x.hora_inicio).join(' · ') : 'Sem horário',
              cargaTxt: fmtH(c.feito) + ' de ' + d.carga + ' h', bar: 'scaleX(' + Math.min(1, c.feito / d.carga).toFixed(3) + ')', proj: !(d.grade || []).length ? 'Sem horário, não acumula carga.' : falta > 0.05 ? 'A grade não fecha a carga: faltam ' + fmtH(falta) + ' até ' + ddmm(this.semestre().fim) + '.' : 'Fecha a carga até ' + ddmm(this.semestre().fim) + '.',
              projCor: !(d.grade || []).length || falta > 0.05 ? 'var(--aviso)' : 'var(--texto-suave)', temCh, semH: !(d.grade || []).length, abrir: () => this.abrirDisc(d) }; }) }; })
    };
  }
  pedCheck(p, q, st) { const d = st.discs.find(x => x.id === p.disc); return d ? this.checarData({ data: q.data, ini: q.ini, fim: q.fim, prof: p.prof, turma: d.turma, sala: q.sala }, st) : 'Disciplina não encontrada.'; }
  async enviarPed(e) {
    e.preventDefault(); if (this.state.gravando.pedido) return;
    const st = this.state, f = st.pF, resposta = (pMsg, campos = {}) => this.setState(s => s.pF === f && s.aba === st.aba ? { ...campos, pMsg } : { msg: { t: pMsg.t } }), erro = t => resposta({ erro: true, t });
    if (!f.disc) return erro('Escolha a disciplina.');
    const ck = this.pedCheck({ disc: +f.disc, prof: this.profId() }, f, st); if (ck) return erro('Não dá para enviar: ' + ck);
    if (!f.motivo.trim()) return erro('Explique o motivo da aula extra.');
    if (this.demo()) return this.setState(s => ({ pedidos: [{ id: Date.now(), prof: this.profId(), disc: +f.disc, data: f.data, ini: f.ini, fim: f.fim, sala: f.sala, motivo: f.motivo.trim(), status: 'pendente', resposta: '', sug: null }].concat(s.pedidos), pF: { disc: f.disc, data: '', ini: '', fim: '', sala: f.sala, motivo: '' }, pMsg: { erro: false, t: 'Pedido enviado. A escola analisa e você vê a resposta aqui.' } }));
    if (!this.iniciarGravacao('pedido')) return;
    try {
      await criarPedido(pedidoAPI({ ...f, motivo: f.motivo.trim() })); await recarregarLoja();
      resposta({ erro: false, t: 'Pedido enviado. A escola analisa e você vê a resposta aqui.' }, { pF: { disc: f.disc, data: '', ini: '', fim: '', sala: f.sala, motivo: '' } });
    } catch (er) { erro((er.status === 409 ? 'Não dá para enviar: ' : '') + er.detalhe); }
    finally { this.terminarGravacao('pedido'); }
  }
  valsPed(st, P) {
    const esc = P === 'escola', f = st.pF, minhas = st.discs.filter(d => d.prof === this.profId());
    const resposta = (campos, texto, mesmo = () => true) => this.setState(s => s.aba === st.aba && s.painel === st.painel && mesmo(s) ? campos : { msg: { t: texto } });
    const fmtP = (p, q) => { const d = st.discs.find(x => x.id === p.disc) || {}; return { nome: (d.nome || '—') + ' · ' + nomeTurma(d.turma), prof: this.profNome(p.prof), quando: DIA_L[dsem(q.data)] + ', ' + ddmm(q.data) + ' · ' + q.ini + '–' + q.fim, sala: nomeSala(q.sala), motivo: p.motivo }; };
    const STT = { pendente: 'Em análise', aprovada: 'Aprovada', recusada: 'Recusada', sugestao: 'Sugestão da escola' };
    const tagSt = s => ({ tag: STT[s], tagBg: s === 'aprovada' ? 'var(--texto)' : s === 'recusada' ? 'var(--aviso-suave)' : 'transparent', tagCor: s === 'aprovada' ? 'var(--fundo)' : s === 'recusada' ? 'var(--aviso)' : 'var(--texto)', tagBorda: s === 'aprovada' ? 'var(--texto)' : s === 'recusada' ? 'var(--aviso)' : 'var(--texto)' });
    const set = (k, v) => this.setState(s => ({ [k]: v }));
    if (esc) {
      const pend = st.pedidos.filter(p => p.status === 'pendente'), hist = st.pedidos.filter(p => p.status !== 'pendente');
      return { pedEsc: true, pedProf: false, pendTitulo: pend.length ? pend.length + (pend.length === 1 ? ' pedido aguardando análise' : ' pedidos aguardando análise') : 'Nenhum pedido aguardando análise',
        pendLista: pend.map(p => { const ck = st.pedErros?.[p.id] || this.pedCheck(p, p, st), rec = st.recusando === p.id, sug = st.sugerindo === p.id;
          return Object.assign(fmtP(p, p), { ok: !ck, ck: ck ? 'Choque: ' + ck : 'Sem choque com professor, turma e sala.', ckCor: ck ? 'var(--aviso)' : 'var(--texto-suave)', aprovarOff: !!ck || !!st.gravando['resposta-' + p.id], aprovarO: ck || st.gravando['resposta-' + p.id] ? 0.4 : 1,
            normal: !rec && !sug, rec, sug, recMotivo: st.recMotivo, recErro: st.recErro, sugF: st.sug, sugErro: st.sugErro,
            aprovar: async () => {
              if (!this.demo()) {
                if (!this.iniciarGravacao('resposta-' + p.id)) return;
                try { await aprovarPedido(p.id); await recarregarLoja(); resposta({ msgPed: 'Aula extra aprovada. Ela entra no quadro e na semana dos alunos.' }, 'Aula extra aprovada. Ela entra no quadro e na semana dos alunos.'); }
                catch (er) { resposta({ pedErros: { ...this.state.pedErros, [p.id]: er.detalhe } }, er.detalhe); }
                finally { this.terminarGravacao('resposta-' + p.id); }
                return;
              }
              const c2 = this.pedCheck(p, p, this.state); if (c2) return; this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'aprovada', resposta: '' }) : x), msgPed: 'Aula extra aprovada. Ela entra no quadro e na semana dos alunos.' })); },
            pedirRec: () => this.setState({ recusando: p.id, recMotivo: '', recErro: '', sugerindo: null }), pedirSug: () => this.setState({ sugerindo: p.id, recusando: null, sugErro: '', sug: { data: p.data, ini: p.ini, fim: p.fim, sala: p.sala } }),
            cancelar: () => this.setState({ recusando: null, sugerindo: null }),
            setRec: e => this.setState({ recMotivo: e.target.value, recErro: '' }),
            confRec: async () => { if (!this.state.recMotivo.trim()) return this.setState({ recErro: 'Escreva o motivo da recusa. O professor vai ver.' });
              if (!this.demo()) {
                if (!this.iniciarGravacao('resposta-' + p.id)) return;
                const motivo = this.state.recMotivo;
                try { await recusarPedido(p.id, motivo.trim()); await recarregarLoja(); resposta({ recusando: null, msgPed: 'Pedido recusado. O professor vê o motivo.' }, 'Pedido recusado. O professor vê o motivo.', s => s.recusando === p.id && s.recMotivo === motivo); }
                catch (er) { resposta({ recErro: er.detalhe }, er.detalhe, s => s.recusando === p.id && s.recMotivo === motivo); }
                finally { this.terminarGravacao('resposta-' + p.id); }
                return;
              }
              this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'recusada', resposta: s.recMotivo.trim() }) : x), recusando: null, msgPed: 'Pedido recusado. O professor vê o motivo.' })); },
            setSugData: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { data: e.target.value }), sugErro: '' })), setSugIni: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { ini: e.target.value }), sugErro: '' })), setSugFim: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { fim: e.target.value }), sugErro: '' })), setSugSala: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { sala: e.target.value }), sugErro: '' })),
            sugCk: (() => { const c3 = this.pedCheck(p, st.sug, st); return c3 ? 'Choque: ' + c3 : 'Horário livre.'; })(), sugCkCor: this.pedCheck(p, st.sug, st) ? 'var(--aviso)' : 'var(--texto-suave)',
            confSug: async () => {
              if (!this.demo()) {
                if (!this.iniciarGravacao('resposta-' + p.id)) return;
                const sug = this.state.sug;
                try { await sugerirPedido(p.id, horarioAPI(sug)); await recarregarLoja(); resposta({ sugerindo: null, msgPed: 'Sugestão enviada. O professor aceita ou recusa.' }, 'Sugestão enviada. O professor aceita ou recusa.', s => s.sugerindo === p.id && s.sug === sug); }
                catch (er) { resposta({ sugErro: er.detalhe }, er.detalhe, s => s.sugerindo === p.id && s.sug === sug); }
                finally { this.terminarGravacao('resposta-' + p.id); }
                return;
              }
              const c4 = this.pedCheck(p, this.state.sug, this.state); if (c4) return this.setState({ sugErro: 'Esse horário também tem choque. ' + c4 }); this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'sugestao', sug: Object.assign({}, s.sug) }) : x), sugerindo: null, msgPed: 'Sugestão enviada. O professor aceita ou recusa.' })); } }); }),
        temPend: pend.length > 0, histLista: hist.map(p => { const q = p.status === 'sugestao' ? p.sug : p; return Object.assign(fmtP(p, q), tagSt(p.status), { resposta: p.resposta, temResp: !!p.resposta }); }), temHist: hist.length > 0,
        optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })), msgPedVis: !!st.msgPed, msgPed: st.msgPed || '', fecharMsgPed: () => this.setState({ msgPed: '' }) };
    }
    const meus = st.pedidos.filter(p => p.prof === this.profId()), d = st.discs.find(x => String(x.id) === f.disc);
    const ck = f.disc && f.data && f.ini && f.fim ? this.pedCheck({ disc: +f.disc, prof: this.profId() }, Object.assign({}, f, { sala: f.sala || (d && d.sala) }), st) : '';
    const setF = k => e => { const v = e.target.value; this.setState(s => { const n = Object.assign({}, s.pF, { [k]: v }); if (k === 'disc' && !s.pF.sala) { const dd = s.discs.find(x => String(x.id) === v); if (dd) n.sala = dd.sala; } return { pF: n, pMsg: null }; }); };
    return { pedEsc: false, pedProf: true, optMinhas: minhas.map(x => ({ v: String(x.id), l: x.nome + ' · ' + nomeTurma(x.turma) })), optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })),
      pF: f, setPDisc: setF('disc'), setPData: setF('data'), setPIni: setF('ini'), setPFim: setF('fim'), setPSala: setF('sala'), setPMotivo: setF('motivo'), enviarPed: e => this.enviarPed(e),
      pCkVis: !!(f.disc && f.data && f.ini && f.fim), pCk: ck ? 'Choque: ' + ck : 'Horário livre para você, a turma e a sala.', pCkCor: ck ? 'var(--aviso)' : 'var(--texto-suave)', pEnvOff: !!ck || !!st.gravando.pedido, pEnvO: ck || st.gravando.pedido ? 0.4 : 1,
      pMsgVis: !!st.pMsg, pMsg: st.pMsg ? st.pMsg.t : '', pMsgCor: st.pMsg && st.pMsg.erro ? 'var(--aviso)' : 'var(--texto)',
      meusLista: meus.map(p => { const q = p.status === 'sugestao' ? p.sug : p; return Object.assign(fmtP(p, q), tagSt(p.status), { resposta: p.resposta, temResp: !!p.resposta, ehSug: p.status === 'sugestao', original: 'Você pediu ' + DIA_L[dsem(p.data)] + ', ' + ddmm(p.data) + ' · ' + p.ini + '–' + p.fim + '.',
        aceitar: async () => {
          if (!this.demo()) {
            if (!this.iniciarGravacao('resposta-' + p.id)) return;
            try { await aceitarSugestao(p.id); await recarregarLoja(); resposta({ pMsg: { erro: false, t: 'Sugestão aceita. A aula extra está no quadro.' } }, 'Sugestão aceita. A aula extra está no quadro.', s => s.pF === f); }
            catch (er) { resposta({ pMsg: { erro: true, t: er.detalhe } }, er.detalhe, s => s.pF === f); }
            finally { this.terminarGravacao('resposta-' + p.id); }
            return;
          }
          const c5 = this.pedCheck(p, p.sug, this.state); if (c5) return this.setState({ pMsg: { erro: true, t: 'A sugestão deixou de estar livre: ' + c5 } }); this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'aprovada', data: p.sug.data, ini: p.sug.ini, fim: p.sug.fim, sala: p.sug.sala, sug: null }) : x), pMsg: { erro: false, t: 'Sugestão aceita. A aula extra está no quadro.' } })); },
        recusar: async () => {
          if (this.demo()) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'recusada', resposta: 'Você recusou a sugestão da escola.', sug: null }) : x) }));
          if (!this.iniciarGravacao('resposta-' + p.id)) return;
          try { await recusarSugestao(p.id); await recarregarLoja(); resposta({ pMsg: { erro: false, t: 'Você recusou a sugestão da escola.' } }, 'Você recusou a sugestão da escola.', s => s.pF === f); }
          catch (er) { resposta({ pMsg: { erro: true, t: er.detalhe } }, er.detalhe, s => s.pF === f); }
          finally { this.terminarGravacao('resposta-' + p.id); }
        } }); }),
      temMeus: meus.length > 0 };
  }
  valsPainel(st, P, now, fer) {
    const pn = st.painel, esc = P === 'escola', base = { painelVis: !!pn, fecharPainel: () => this.setState({ painel: null }), pAula: false, pEv: false, pEvForm: false, pDisc: false, painelTitulo: '' };
    if (!pn) return base;
    if (pn.tipo === 'aula') {
      const d = st.discs.find(x => x.id === pn.disc); if (!d) return base;
      const c = this.carga(d, st, fer, now.data, now.min), ch = this.choques(st.discs, st.profs), msgs = pn.itipo === 'grade' && !pn.remarcada ? (ch.M[pn.tkey] || []) : [];
      const prox = this.evVisiveis(st, P).filter(e => e.disc === d.id && (e.fim || e.data) >= now.data).slice(0, 3).map(e => this.chipEv(e));
      const cur = pn.data === now.data && hm(pn.ini) <= now.min && now.min < hm(pn.fim), passado = pn.data < now.data || (pn.data === now.data && hm(pn.fim) <= now.min);
      return Object.assign(base, { painelTitulo: 'Aula', pAula: true, pa: { nome: d.nome, sub: nomeTurma(d.turma) + ' · ' + nomeSala(pn.sala) + ' · ' + this.profNome(d.prof), quando: DIA_L[dsem(pn.data)] + ', ' + ddmm(pn.data) + ' · ' + pn.ini + '–' + pn.fim,
        status: pn.feriado ? 'Sem aula: ' + pn.feriado : pn.pendente ? 'Aula extra aguardando análise da escola' : cur ? 'Acontecendo agora' : passado ? 'Aula dada' : pn.remarcada ? 'Remarcada só nesta semana' : pn.itipo === 'extra' ? 'Aula extra aprovada' : 'Prevista',
        cargaTxt: fmtH(c.feito) + ' de ' + d.carga + ' h cumpridas', bar: 'scaleX(' + Math.min(1, c.feito / d.carga).toFixed(3) + ')' }, paChoques: msgs.map(t => ({ t })), paTemCh: esc && msgs.length > 0, paProx: prox, paTemProx: prox.length > 0,
        paEditarVis: esc && pn.itipo === 'grade', paEditar: () => this.abrirDisc(d), paPedVis: esc && pn.pendente, paIrPed: () => this.setState({ aba: 'pedidos', painel: null }) });
    }
    if (pn.tipo === 'evento') {
      const e = st.eventos.find(x => x.id === pn.id); if (!e) return base;
      const d = e.disc ? st.discs.find(x => x.id === e.disc) : null, c = this.chipEv(e);
      return Object.assign(base, { painelTitulo: 'Calendário', pEv: true, pe: Object.assign(c, { quando: (e.fim ? ddmm(e.data) + ' a ' + ddmm(e.fim) + ' de ' : DIA_L[dsem(e.data)] + ', ' + e.data.slice(8, 10) + ' de ') + MESES[+e.data.slice(5, 7) - 1] + (e.hi ? ' · ' + e.hi + '–' + e.hf : ''), disc: d ? d.nome + ' · ' + nomeTurma(d.turma) : '', temDisc: !!d, desc: e.desc, temDesc: !!e.desc }),
        peAcoes: esc, peEditar: () => this.editarEvento(e), peExcluir: async () => {
          if (this.demo()) return this.setState(s => ({ eventos: s.eventos.filter(x => x.id !== e.id), painel: null, msgAno: 'Evento removido do calendário.' }));
          if (!this.iniciarGravacao('excluirEvento')) return;
          try { await apagarEvento(e.id); await recarregarLoja(); this.responderPainel(pn, { painel: null, msgAno: 'Evento removido do calendário.' }, 'Evento removido do calendário.'); }
          catch (er) { if (this.state.painel === pn) { this.editarEvento(e); this.setState({ eErro: er.detalhe }); } else this.setState({ msg: { t: er.detalhe } }); }
          finally { this.terminarGravacao('excluirEvento'); }
        } });
    }
    if (pn.tipo === 'eventoForm' && st.eF) {
      const f = st.eF, setE = k => ev => { const v = ev.target.value; this.setState(s => ({ eF: Object.assign({}, s.eF, { [k]: v }), eErro: '' })); };
      return Object.assign(base, { painelTitulo: 'Calendário', pEvForm: true, ef: f, efTitulo: pn.id ? 'Editar evento' : 'Novo evento', optTipos: Object.keys(TIPOS).map(k => ({ v: k, l: TIPOS[k].label })),
        setETipo: setE('tipo'), setETitulo: setE('titulo'), setEData: setE('data'), setEFim: setE('fim'), setEHi: setE('hi'), setEHf: setE('hf'), setEDisc: setE('disc'), setEDesc: setE('desc'),
        quemOps: [[true, 'Todas as turmas'], [false, 'Turmas específicas']].map(([v, l]) => ({ label: l, on: f.todas === v, bg: f.todas === v ? 'var(--texto)' : 'transparent', cor: f.todas === v ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState(s => ({ eF: Object.assign({}, s.eF, { todas: v }), eErro: '' })) })),
        turmasVis: !f.todas, turmasOps: lerLoja().turmas.map(t => { const on = f.turmas.includes(t.id); return { label: t.nome, on, bg: on ? 'var(--texto)' : 'var(--superficie)', cor: on ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState(s => ({ eF: Object.assign({}, s.eF, { turmas: on ? s.eF.turmas.filter(x => x !== t.id) : s.eF.turmas.concat(t.id) }), eErro: '' })) }; }),
        optDiscE: st.discs.filter(d => f.todas || f.turmas.includes(d.turma)).map(d => ({ v: String(d.id), l: d.nome + ' · ' + nomeTurma(d.turma) })), eErro: st.eErro, salvarEvento: ev => this.salvarEvento(ev) });
    }
    if (pn.tipo === 'disc' && st.dF) {
      const f = st.dF, errs = this.errosDisc(f, pn.id), set = k => e => this.setDF(k, e.target.value);
      const disc = st.discs.find(x => x.id === pn.id), c = disc ? this.carga(disc, st, fer, now.data, now.min) : null;
      return Object.assign(base, { painelTitulo: 'Disciplina', pDisc: true, df: f, dfTitulo: pn.id ? f.nome || 'Disciplina' : 'Nova disciplina', setDNome: set('nome'), setDTurma: set('turma'), setDProf: set('prof'), setDSala: set('sala'), setDCarga: set('carga'),
        optTurmas: lerLoja().turmas.map(t => ({ v: t.id, l: t.nome })), optProfs: st.profs.map(p => ({ v: String(p.id), l: p.nome })), optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })),
        dfCarga: c ? fmtH(c.feito) + ' cumpridas de ' + f.carga + ' h · a grade soma ' + fmtH(c.total) + ' no semestre' : '', dfTemCarga: !!c,
        dfLinhas: f.grade.map((r, i) => ({ n: String(i + 1), dia: r.dia, ini: r.ini, fim: r.fim, sala: r.sala, nota: errs[i] || 'Livre para o professor, a turma e a sala.', notaCor: errs[i] ? 'var(--aviso)' : 'var(--texto-suave)', borda: errs[i] ? 'var(--aviso)' : 'var(--borda)',
          setDia: e => this.setLinhaD(r.k, 'dia', e.target.value), setIni: e => this.setLinhaD(r.k, 'ini', e.target.value), setFim: e => this.setLinhaD(r.k, 'fim', e.target.value), setSala: e => this.setLinhaD(r.k, 'sala', e.target.value),
          remover: () => this.setState(s => ({ dF: Object.assign({}, s.dF, { grade: s.dF.grade.filter(x => x.k !== r.k) }), dErro: '', dOk: '' })), remLabel: 'Remover horário ' + (i + 1) })),
        dfSemLinhas: !f.grade.length, addLinhaD: () => this.setState(s => { const g = s.dF.grade, u = g[g.length - 1]; return { dF: Object.assign({}, s.dF, { grade: g.concat({ k: Date.now(), dia: u ? String(Math.min(5, +u.dia + 1)) : '1', ini: u ? u.ini : '08:00', fim: u ? u.fim : '09:40', sala: u ? u.sala : s.dF.sala }) }), dErro: '', dOk: '' }; }),
        dErro: st.dErro, dOk: st.dOk, temDOk: !!st.dOk, salvarDisc: e => this.salvarDisc(e) });
    }
    return base;
  }
}

export default criarDC('Grade e Agenda', Template, GradeAgenda);
