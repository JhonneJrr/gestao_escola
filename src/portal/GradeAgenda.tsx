// @ts-nocheck
import React from 'react';
import { DCLogic, criarDC } from './dc';
import Template from './componentes/GradeAgendaTemplate';
import { lerLoja, assinar, recarregarLoja } from './loja';
import { salvarGrade, atualizarAula, salvarChamada, criarTurma, criarSala, criarDisciplina, atualizarDisciplina, pedirGradeIA, erroGradeIA, criarEvento, atualizarEvento, apagarEvento, criarPedido, aprovarPedido, recusarPedido, sugerirPedido, aceitarSugestao, recusarSugestao } from './rede';
import { itensGradeAPI as itensAPI, disciplinaAPI, eventoAPI, pedidoAPI, horarioAPI } from './adaptador';
import { alunosDaChamada, faltamMarcar, presencasAPI, motivoSemChamada, mapaFeriados, feriadoDaTurma } from './grade-regras';
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
const nomeTurma = id => !id ? 'Sem turma' : (lerLoja().turmas.find(t => t.id === id) || {}).nome || id;
const nomeSala = id => !id ? 'Sem sala' : (lerLoja().salas.find(t => t.id === id) || {}).nome || id;
const MSG_GRAV = 'Não consegui salvar. Confira a conexão e tente de novo.';
// Mensagem de erro de gravação: o detail do servidor, ou a mensagem padrão quando não houve resposta dele.
const msgErro = er => er && er.texto ? er.texto : er && er.detalhe && er.status !== 0 ? er.detalhe : MSG_GRAV;
// Grade como a API guarda (sala do horário preservada, inclusive nula), para reverter sem mudar nada.
const itensDe = grade => (grade || []).map(g => ({ dia_semana: g.dia_semana, hora_inicio: g.hora_inicio, hora_fim: g.hora_fim, sala_id: 'sala_id' in g ? g.sala_id : g.sala ? Number(g.sala) : null }));
const esperar = ms => new Promise(r => setTimeout(r, ms));
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
    painel: null, eF: null, eErro: '', dF: null, dErro: '', dOk: '',
    pF: { disc: '', data: '', ini: '', fim: '', sala: '', motivo: '' }, pMsg: null,
    recusando: null, recMotivo: '', recErro: '', sugerindo: null, sug: { data: '', ini: '', fim: '', sala: '' }, sugErro: '',
    // Gravação em andamento (uma só por vez) e o erro de cada gravação, pela chave da operação.
    salvando: null, erroG: {}, carga: 'ok', recarregando: false, chamF: {}, chamErro: '', iaErro: '', iaUltimo: '', reverter: false, nomeF: '', nomeErro: '', msgDisc: '',
    // Só demonstração (DEV): chamadas, cancelamentos, semestre encerrado e perfil/relógio forçados pelos estados do comparador.
    chamadas: {}, canceladas: {}, semEnc: false, perfilF: null, relF: null };
  raiz = React.createRef(); dicaRef = React.createRef();
  // Grava de verdade: bloqueia envio duplo, mostra "Salvando…", só o sucesso recarrega o estado e chama aoOk;
  // o erro mostra o detail do servidor (ou MSG_GRAV) e não muda nada na tela. aoErro(texto, erro) troca o destino do erro.
  async gravar(chave, fazer, aoOk, aoErro) {
    if (this.state.salvando) return;
    this.setState(s => ({ salvando: chave, erroG: { ...s.erroG, [chave]: '' } }));
    try {
      let r; const simulado = this.demo();
      if (simulado) { await esperar(this.rm ? 300 : 700); if (this.props.falhaGravacao) throw { status: 0 }; }
      else { r = await fazer(); await recarregarLoja(); }
      // Uma notícia com "Reverter" fica velha depois de qualquer outra gravação bem-sucedida.
      if (chave !== 'reverter') this.setState(s => s.msg && s.msg.snap ? { msg: { t: s.msg.t }, reverter: false } : null);
      aoOk?.(r, simulado);
    } catch (er) {
      if (er && er.recarregar) { try { await recarregarLoja(); } catch {} }
      const t = msgErro(er);
      if (aoErro) aoErro(t, er); else this.setState(s => ({ erroG: { ...s.erroG, [chave]: t } }));
    } finally { this.setState({ salvando: null }); }
  }
  sv(chave, txt) { return this.state.salvando === chave ? 'Salvando…' : txt; }
  responderPainel(painel, campos, texto) { this.setState(s => s.painel === painel && s.painel?.tipo === painel?.tipo && s.painel?.id === painel?.id ? (typeof campos === 'function' ? campos(s) : campos) : { msg: { t: texto } }); }
  semestre() { return lerLoja().semestre || { nome: '—', inicio: '', fim: '' }; }
  // Semestre encerrado: vem do store (encerrado_em); o estado demonstrativo só entra em DEV.
  semEnc() { return !!lerLoja().semestre?.encerrado_em || (import.meta.env.DEV && this.state.semEnc); }
  semAtivo() { return !!lerLoja().semestre && !this.semEnc(); }
  // Turma do aluno logado, só para exibição (o recorte das aulas é pela matrícula, feito pelo servidor).
  tAluno() {
    if (this.demo()) return lerLoja().turmaDemo || null;
    const t = lerLoja().turmaAluno; if (!t) return null;
    const ts = lerLoja().turmas; return (ts.find(x => x.id === String(t)) || ts.find(x => x.nome === t) || { id: String(t) }).id;
  }
  matriculasLoja() { return lerLoja().matriculas || []; }
  ano() { const s = this.semestre(), ano = (s.inicio || this.agora().data).slice(0, 4); return lerLoja().ano || { inicio: ano + '-01-01', fim: s.fim || ano + '-12-31' }; }
  profId() { const s = lerLoja(); return s.perfil === 'prof' ? s.usuario?.id : (import.meta.env.DEV ? s.profDemo : null); }
  demo() { return import.meta.env.DEV && lerLoja().profDemo != null; }
  turmaId() { return this.demo() ? lerLoja().turmaDemo : undefined; }
  dadosLoja() {
    const s = lerLoja();
    return { discs: s.disciplinas.map(d => ({ ...d, prof: d.professor_id, carga: d.carga_horaria,
      sigla: d.sigla || d.nome.split(' ').map(p => p[0]).join('').slice(0, 3).toUpperCase(), grade: d.grade || [] })), profs: s.professores };
  }
  receberLoja = () => {
    const s = lerLoja();
    this.setState({ ...this.dadosLoja(), ...(!this.demo() || !this.recebeu ? { eventos: s.eventos, pedidos: s.pedidos } : {}) });
    this.recebeu = true;
    if (this.editorPendente) this.iniciarEditor();
  };
  // Modo editor único: abre só o painel de uma disciplina (ou de uma nova) e avisa o Portal quando o painel fecha.
  iniciarEditor() {
    const id = this.props.discId, d = id == null ? null : this.state.discs.find(x => String(x.id) === String(id));
    if (id != null && !d) { this.editorPendente = true; return; }
    this.editorPendente = false; this.abrirDisc(d || null);
  }
  componentDidMount() {
    this.desassinar = assinar(this.receberLoja);
    this.receberLoja();
    this.rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.iv = setInterval(() => this.setState(s => ({ tick: s.tick + 1 })), 20000);
    this.ro = new ResizeObserver(es => { const w = es[0].contentRect.width; if (Math.abs(w - this.state.largura) > 4) this.setState({ largura: w }); });
    if (this.raiz.current) this.ro.observe(this.raiz.current);
    this.onKey = e => { if (e.key !== 'Escape') return; if (this.state.painel) this.setState({ painel: null }); else if (this.state.pend) this.setState({ pend: null }); else if (this.state.iaAberto) this.setState({ iaAberto: false }); };
    document.addEventListener('keydown', this.onKey);
    if (this.props.soEditor) setTimeout(() => { if (!this.sumiu) this.iniciarEditor(); }, 0);
    if (this.props.abaInicial && this.props.abaInicial !== 'quadro') this.setState({ aba: this.props.abaInicial });
    if (import.meta.env.DEV && (this.props.estado ?? 'Normal') !== 'Normal') this.estadoDemo(this.props.estado);
  }
  // Só DEV: estados de demonstração do comparador, carregados à parte para não entrar no build de produção.
  async estadoDemo(nome) {
    if (import.meta.env.DEV) {
      this.demoMod = this.demoMod || await import('./demo-grade');
      if (!this.sumiu) this.demoMod.aplicarEstado(this, nome);
    }
  }
  estadoBruto(o, cb) { super.setState(o, cb); }
  componentWillUnmount() { this.sumiu = true; this.desassinar?.(); this.limparArrasto?.(); if (this._sp) this._sp.style.overflow = this._spOv || ''; clearInterval(this.iv); clearTimeout(this.iaT); clearTimeout(this.cT); this.ro && this.ro.disconnect(); document.removeEventListener('keydown', this.onKey); }
  scrollPai() { let p = this.raiz.current && this.raiz.current.parentElement; while (p && !(/auto|scroll/.test(getComputedStyle(p).overflowY) && p.scrollHeight > p.clientHeight)) p = p.parentElement; return p; }
  geoPainel() {
    if (!this.props.embutido) return null;
    const sp = this.scrollPai(), r = this.raiz.current; if (!sp || !r) return null;
    if (!this._sp) { this._spOv = sp.style.overflow; sp.style.overflow = 'hidden'; this._sp = sp; }
    const a = sp.getBoundingClientRect(), b = r.getBoundingClientRect();
    return { top: Math.max(0, a.top - b.top), h: sp.clientHeight, left: a.left - b.left, right: b.right - (a.left + sp.clientWidth) };
  }
  setState(u, cb) {
    const msg = this.state?.msg;
    super.setState(prev => {
      const o = typeof u === 'function' ? u(prev) : u;
      if (!o || !('painel' in o)) return o;
      if (o.painel && !prev.painel) { const g = this.geoPainel(); return g ? Object.assign({}, o, { pGeo: g }) : o; }
      if (!o.painel && this._sp) { this._sp.style.overflow = this._spOv || ''; this._sp = null; }
      if (!o.painel && prev.painel && this.props.soEditor && this.props.aoFechar) setTimeout(() => this.props.aoFechar(), 0);
      return o;
    }, cb);
    if (this.state.msg && this.state.msg !== msg && this.state.aba !== 'quadro') lerLoja().avisar?.(this.state.msg.t);
  }
  componentDidUpdate(pp) {
    if (import.meta.env.DEV && pp.estado !== this.props.estado && (this.props.estado ?? 'Normal') !== 'Normal') this.estadoDemo(this.props.estado);
    if (this.props.soEditor && pp.discId !== this.props.discId) this.iniciarEditor();
    if (pp.perfil !== this.props.perfil) this.setState({ aba: 'quadro', eixo: null, fTurma: '', fProf: '', fDisc: '', fSala: '', painel: null, pend: null, diaM: null });
  }
  perfil() { const f = import.meta.env.DEV ? this.state.perfilF : null; return { Escola: 'escola', Professor: 'prof', Aluno: 'aluno' }[f || this.props.perfil] || lerLoja().perfil || 'escola'; }
  agora() {
    const S = (import.meta.env.DEV && this.state.relF) || { 'Terça 08:40': '2026-10-06T08:40', 'Quarta 10:20': '2026-10-07T10:20', 'Quinta 14:00': '2026-10-08T14:00' }[this.props.relogio ?? (import.meta.env.DEV ? lerLoja().relogio : undefined) ?? 'Ao vivo'];
    const d = S ? new Date(S) : new Date();
    return { data: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), min: d.getHours() * 60 + d.getMinutes(), vivo: !S };
  }
  // Feriados de todas as turmas (chaves = datas); os de algumas turmas só valem para aulas delas, via ferD.
  ferMap(evs) { return mapaFeriados(evs); }
  ferD(fer, data, turma) { return feriadoDaTurma(fer, turma, data); }
  escopo(st, P) { if (!this.demo()) return st.discs; return P === 'prof' ? st.discs.filter(d => d.prof === this.profId()) : P === 'aluno' ? st.discs.filter(d => !this.turmaId() || d.turma === this.turmaId()) : st.discs; }
  profNome(id, profs) { return ((profs || this.state.profs).find(p => p.id === id) || {}).nome || 'Sem professor'; }
  instSemana(W, st, fer, P) {
    const r = [], fim = addD(W, 6), aulas = lerLoja().aulas, hoje = this.agora().data, usadas = new Set();
    st.discs.forEach(d => (d.grade || []).forEach((x, idx) => {
      const data = addD(W, x.dia_semana - 1); if (!this.semestre().inicio || data < this.semestre().inicio || data > this.semestre().fim) return;
      if (data < hoje && aulas.some(a => a.disciplina_id === d.id)) return;
      const rm = st.remarc.find(q => q.disc === d.id && q.idx === idx && q.de === data);
      const aula = aulas.find(a => a.origem === 'grade' && a.disciplina_id === d.id && (a.remarcada_de === data || (a.data === data && a.hora_inicio?.slice(0, 5) === x.hora_inicio)));
      if (aula && aula.data < hoje) return; // O histórico entra pelas aulas reais abaixo.
      const real = aula && (aula.remarcada_de || aula.hora_inicio?.slice(0, 5) !== x.hora_inicio) ? { data: aula.data, ini: aula.hora_inicio?.slice(0, 5), fim: aula.hora_fim?.slice(0, 5), remarcada: true } : null;
      const b = { key: d.id + '-' + idx + '-' + data, tkey: d.id + '-' + idx, disc: d, idx, dataOrig: aula?.remarcada_de || data, tipo: 'grade', sala: x.sala || d.sala };
      const inst = Object.assign(b, real || (rm ? { data: rm.data, ini: rm.ini, fim: rm.fim, remarcada: true } : { data, ini: x.hora_inicio, fim: x.hora_fim }));
      if (inst.data < W || inst.data > fim) return;
      r.push(inst); if (aula) usadas.add(aula.aula_id);
    }));
    aulas.forEach(a => {
      if (a.origem !== 'grade' || a.data < W || a.data > fim || usadas.has(a.aula_id) || (a.data >= hoje && !a.remarcada_de)) return;
      const d = st.discs.find(d => d.id === a.disciplina_id); if (!d) return;
      const dataOrig = a.remarcada_de || a.data, ini = a.hora_inicio?.slice(0, 5), hf = a.hora_fim?.slice(0, 5);
      const k = (d.grade || []).findIndex(x => (x.dia_semana === dsem(a.data) || x.dia_semana === dsem(dataOrig)) && x.hora_inicio === ini), idx = k < 0 ? null : k;
      r.push({ key: 'a' + a.aula_id, tkey: d.id + '-' + idx, disc: d, idx, dataOrig, tipo: 'grade', sala: d.grade?.[idx]?.sala || d.sala, data: a.data, ini, fim: hf, remarcada: !!a.remarcada_de });
    });
    st.pedidos.forEach(p => {
      if (!['aprovada', 'pendente', 'sugestao'].includes(p.status) || (P === 'aluno' && p.status !== 'aprovada')) return;
      const aula = p.status === 'aprovada' && p.aula_id != null ? aulas.find(a => a.aula_id === p.aula_id) : null;
      if (p.status === 'aprovada' && p.aula_id != null && !aula) return;
      const q = aula ? { data: aula.data, ini: aula.hora_inicio?.slice(0, 5), fim: aula.hora_fim?.slice(0, 5), sala: p.sala } : p.status === 'sugestao' ? p.sug : p; if (q.data < W || q.data > fim) return;
      const d = st.discs.find(x => x.id === p.disc); if (!d) return;
      r.push({ key: 'x' + p.id, tkey: 'x' + p.id, disc: d, idx: null, tipo: 'extra', pedido: p, pendente: p.status !== 'aprovada', data: q.data, dataOrig: aula?.remarcada_de || q.data, ini: q.ini, fim: q.fim, sala: q.sala || d.sala, ...(aula ? { remarcada: !!aula.remarcada_de } : {}) });
    });
    aulas.forEach(a => {
      if (a.origem !== 'extra' || a.data < W || a.data > fim || st.pedidos.some(p => p.aula_id === a.aula_id)) return;
      const d = st.discs.find(d => d.id === a.disciplina_id); if (!d) return;
      r.push({ key: 'a' + a.aula_id, tkey: 'a' + a.aula_id, disc: d, idx: null, tipo: 'extra', pendente: false, sala: d.sala, data: a.data, dataOrig: a.remarcada_de || a.data, ini: a.hora_inicio?.slice(0, 5), fim: a.hora_fim?.slice(0, 5), remarcada: !!a.remarcada_de });
    });
    // Cada ocorrência sabe da aula real (cancelada, chamada feita) e do feriado da turma dela.
    r.forEach(i => { i.feriado = this.ferD(fer, i.data, i.disc.turma); const au = this.aulaDe(i.disc.id, i.data, i.ini); i.aulaId = au ? au.aula_id : null;
      i.cancelada = !!(au && au.status === 'cancelada') || !!(import.meta.env.DEV && st.canceladas[i.key]);
      i.feita = !!(au && au.chamada) || !!(import.meta.env.DEV && st.chamadas[i.key]); });
    return r;
  }
  // Aula real (do store) de uma disciplina numa data e hora de início.
  aulaDe(discId, data, ini) { return lerLoja().aulas.find(a => a.disciplina_id === discId && a.data === data && a.hora_inicio?.slice(0, 5) === ini) || null; }
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
    const fer = this.ferMap(st.eventos), fd = this.ferD(fer, c.data, c.turma); if (fd) return 'Dia sem aula: ' + fd + '.';
    const e = this.basico(Object.assign({}, c, { dia: dsem(c.data) }), st.profs); if (e) return e;
    const a = hm(c.ini), b = hm(c.fim), ig = c.ignorar || [];
    const ins = this.instSemana(segDe(c.data), st, fer, 'escola').filter(i => i.data === c.data && !i.pendente && !i.cancelada && !ig.includes(i.key));
    for (const i of ins) if (hm(i.ini) < b && a < hm(i.fim)) { const r = this.motivo(c, i.disc, i.sala, DIA_L[dsem(i.data)] + ' ' + ddmm(i.data) + ', ' + i.ini + '–' + i.fim, st.profs); if (r) return r; }
    return '';
  }
  carga(d, st, fer, hoje, nm) {
    let f = 0, t = 0;
    if (!this.semestre().inicio) return { feito: 0, total: 0 };
    for (let w = segDe(this.semestre().inicio); w <= this.semestre().fim; w = addD(w, 7)) (d.grade || []).forEach(x => { const dt = addD(w, x.dia_semana - 1); if (dt < this.semestre().inicio || dt > this.semestre().fim || this.ferD(fer, dt, d.turma)) return; const du = hm(x.hora_fim) - hm(x.hora_inicio); t += du; if (dt < hoje || (dt === hoje && hm(x.hora_fim) <= nm)) f += du; });
    st.pedidos.forEach(p => { if (p.disc !== d.id || p.status !== 'aprovada') return; const du = hm(p.fim) - hm(p.ini); t += du; if (p.data < hoje || (p.data === hoje && hm(p.fim) <= nm)) f += du; });
    return { feito: f / 60, total: t / 60 };
  }
  evVisiveis(st, P) {
    if (!this.demo()) return st.eventos;
    const minhas = P === 'prof' ? [...new Set(st.discs.filter(d => d.prof === this.profId()).map(d => d.turma))] : P === 'aluno' ? [this.turmaId()] : null;
    return st.eventos.filter(e => !minhas || e.turmas === 'todas' || e.turmas.some(t => minhas.includes(t)));
  }
  // Arrasta só aula de grade de hoje ou futura, sem chamada feita, sem feriado, nem cancelada, com o semestre aberto.
  podeArrastar(i) { return this.perfil() === 'escola' && i.tipo === 'grade' && i.idx != null && !i.feriado && !i.cancelada && !i.feita && i.data >= this.agora().data && this.semAtivo() && !this.state.pend; }
  abrirAula(i) { this.setState({ painel: { tipo: 'aula', key: i.key, tkey: i.tkey, disc: i.disc.id, data: i.data, ini: i.ini, fim: i.fim, sala: i.sala, itipo: i.tipo, pendente: !!i.pendente, remarcada: !!i.remarcada, feriado: i.feriado, cancelada: !!i.cancelada, pedido: i.pedido ? i.pedido.id : null } }); }
  // Chamada já feita da aula (presenças por aluno), lida das aulas do store; o estado local só existe na demonstração (DEV).
  chamadaAtual(pn) { const au = this.aulaDe(pn.disc, pn.data, pn.ini); if (au) return au.chamada || null; return (import.meta.env.DEV && this.state.chamadas[pn.key]) || null; }
  chamadaInfo(pn, st, now, P) {
    const vis = P !== 'aluno' && !pn.pendente && (pn.itipo === 'grade' || pn.itipo === 'extra'), feita = !!this.chamadaAtual(pn), s = lerLoja().semestre;
    const off = motivoSemChamada({ encerrado: this.semEnc(), encerradoEm: (s && s.encerrado_em) || (this.semEnc() ? this.semestre().fim : null), semSemestre: !s, cancelada: pn.cancelada, feriado: pn.feriado, data: pn.data, hoje: now.data });
    return { vis, feita, off, txt: feita ? 'Revisar chamada' : 'Fazer chamada' };
  }
  abrirChamada(i) {
    const pn = { tipo: 'chamada', key: i.key, tkey: i.tkey, disc: i.disc.id, data: i.data, ini: i.ini, fim: i.fim, sala: i.sala, itipo: i.tipo, pendente: !!i.pendente, remarcada: !!i.remarcada, feriado: i.feriado, cancelada: !!i.cancelada, pedido: i.pedido ? i.pedido.id : null };
    this.setState(s => ({ painel: pn, chamF: { ...(this.chamadaAtual(pn) || {}) }, chamErro: '', erroG: { ...s.erroG, chamada: '' } }));
  }
  // Lista da chamada: matriculados na disciplina (mais quem já tem presença nesta aula). Na demonstração, a lista do canvas.
  alunosChamada(d, pn) {
    if (import.meta.env.DEV && this.demo() && this.demoMod) return this.demoMod.alunosDaTurma(d.turma);
    return alunosDaChamada(lerLoja().alunos || [], this.matriculasLoja(), d.id, this.chamadaAtual(pn));
  }
  cargaAtual() { const st = this.state; if (st.carga !== 'ok') return st.carga; if (st.recarregando) return 'carregando'; return lerLoja().carga || 'ok'; }
  async tentarCarregar() {
    if (this.demo()) { this.setState({ carga: 'carregando' }); clearTimeout(this.cT); this.cT = setTimeout(() => this.setState({ carga: this.props.falhaCarga ? 'erro' : 'ok' }), this.rm ? 400 : 900); return; }
    if (this.state.recarregando) return;
    this.setState({ recarregando: true, carga: 'ok' });
    try { await recarregarLoja(); } catch {} finally { if (!this.sumiu) this.setState({ recarregando: false }); }
  }
  abrirNovo(tipo, volta) { this.setState(s => ({ painel: { tipo, volta: volta || null }, nomeF: '', nomeErro: '', erroG: { ...s.erroG, [tipo]: '' } })); }
  salvarNovo(e) {
    e.preventDefault(); const st = this.state, pn = st.painel, tipo = pn.tipo, nome = st.nomeF.trim(), lista = tipo === 'turma' ? lerLoja().turmas : lerLoja().salas;
    if (st.salvando) return;
    if (!nome) return this.setState({ nomeErro: tipo === 'turma' ? 'Dê um nome à turma.' : 'Dê um nome à sala.' });
    if (lista.some(x => x.nome.trim().toLowerCase() === nome.toLowerCase())) return this.setState({ nomeErro: tipo === 'turma' ? 'Turma já cadastrada.' : 'Sala já cadastrada.' });
    return this.gravar(tipo, async () => { const r = await (tipo === 'turma' ? criarTurma(nome) : criarSala(nome)); return { id: String(r.id), nome: r.nome || nome }; }, (r, simulado) => {
      const id = simulado ? (tipo === 'turma' ? 't' : 's') + Date.now() : r.id;
      if (simulado) lista.push({ id, nome });
      if (tipo === 'turma') this.props.aoNovaTurma?.({ id, nome });
      const aviso = (tipo === 'turma' ? 'Turma ' : 'Sala ') + nome + ' cadastrada.';
      this.setState(s => s.painel !== pn ? { msg: { t: aviso } } : pn.volta ? { painel: pn.volta.painel, dF: Object.assign({}, pn.volta.dF, { [tipo]: id }), dOk: '', dErro: '' } : { painel: null, msgDisc: aviso });
    }, t => this.responderPainel(pn, s => ({ erroG: { ...s.erroG, [tipo]: t } }), t));
  }
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
  confirmar(modo) {
    const st = this.state, p = st.pend; if (!p) return;
    const i = p.inst, d = i.disc, chave = 'remarc-' + modo, txt = d.nome + ' · ' + nomeTurma(d.turma);
    if (modo === 'semana' ? p.erroSemana : p.erroGrade) return;
    let snap;
    return this.gravar(chave, async () => {
      if (modo === 'semana') {
        const aula = lerLoja().aulas.find(a => a.disciplina_id === d.id && a.data === i.dataOrig && a.hora_inicio?.slice(0, 5) === i.ini);
        if (!aula) throw { detalhe: 'Aula não encontrada no semestre.' };
        snap = { aula: { id: aula.aula_id, corpo: { data: aula.data, hora_inicio: aula.hora_inicio?.slice(0, 5), hora_fim: aula.hora_fim?.slice(0, 5) } } };
        await atualizarAula(aula.aula_id, { data: p.novaData, hora_inicio: p.alvo.ini, hora_fim: p.alvo.fim });
      } else {
        snap = { grades: [{ id: d.id, nome: d.nome, itens: itensDe(d.grade) }] };
        const grade = d.grade.map((g, k) => k !== i.idx ? g : { ...g, dia_semana: p.alvo.dia, hora_inicio: p.alvo.ini, hora_fim: p.alvo.fim });
        await salvarGrade(d.id, itensAPI(grade));
      }
    }, () => this.setState(s => ({ ...(s.pend === p ? { pend: null } : {}), reverter: false,
      msg: { t: modo === 'semana' ? txt + ' remarcada só nesta semana: ' + DIA_L[p.alvo.dia] + ' ' + (p.novaData ? ddmm(p.novaData) : '') + ', ' + p.alvo.ini + '.' : txt + ' agora fica na grade às ' + DIA_L[p.alvo.dia] + 's, ' + p.alvo.ini + '–' + p.alvo.fim + ', até o fim do semestre.', snap } })),
    (t, er) => this.setState(s => s.pend !== p ? { msg: { t } } : er && er.status > 0 && er.detalhe ? { pend: { ...p, ...(modo === 'semana' ? { erroSemana: t } : { erroGrade: t }) } } : { erroG: { ...s.erroG, [chave]: t } }));
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
    const W = st.semana || segDe(hoje), eixo = esc ? (st.eixo || 'dias') : 'dias';
    const ch = this.choques(st.discs, st.profs), ids = new Set(this.escopo(st, P).map(d => d.id));
    const fil = i => ids.has(i.disc.id) && (!st.fTurma || (st.fTurma === '__sem' ? !i.disc.turma : i.disc.turma === st.fTurma)) && (!st.fProf || String(i.disc.prof) === st.fProf) && (!st.fDisc || String(i.disc.id) === st.fDisc) && (!st.fSala || (st.fSala === '__sem' ? !i.sala : i.sala === st.fSala));
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
      else if (i.cancelada) r = { borda: '1px dashed var(--borda)', bg: 'var(--fundo)', op: 0.55, tag: 'Cancelada', tagCor: 'var(--texto-suave)' };
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
    const instHoje = this.instSemana(segDe(hoje), st, fer, 'escola').filter(i => i.data === hoje && !i.pendente && !i.feriado && !i.cancelada);
    const dSel = st.diaM || (dsem(hoje) <= 5 ? dsem(hoje) : 1);
    const colDias = narrow ? [dSel] : [1, 2, 3, 4, 5]; this.colDias = colDias;
    const evs = this.evVisiveis(st, P).filter(e => e.tipo !== 'feriado' && e.tipo !== 'bimestre');
    const evsDia = data => evs.filter(e => e.data <= data && data <= (e.fim || e.data));
    const profsOc = esc ? (st.fProf ? st.profs.filter(p => String(p.id) === st.fProf) : st.verOcup ? st.profs : []) : P === 'prof' ? st.profs.filter(p => p.id === this.profId()) : [];
    const bloco = (i, modo) => {
      const pode = this.podeArrastar(i) && modo === 'dias', e = est(i), d = i.disc, pn = this.profNome(d.prof, st.profs);
      return Object.assign(e, { key: i.key, nome: d.nome, curto: d.sigla, curto2: nomeTurma(d.turma) + ' · ' + nomeSala(i.sala).replace('Lab. de Informática', 'Lab.').replace('Sala ', ''), l2: nomeTurma(d.turma) + ' · ' + nomeSala(i.sala), l3: (P === 'aluno' ? pn : pn.split(' ')[0]) + ' · ' + i.ini + '–' + i.fim, temTag: !!e.tag,
        titulo: d.nome + ' · ' + nomeTurma(d.turma) + ' · ' + nomeSala(i.sala) + ' · ' + pn + ' · ' + i.ini + '–' + i.fim + (e.tag ? ' · ' + e.tag : ''),
        chIcone: modo === 'dias' && P !== 'aluno' && i.data === hoje && (i.tipo === 'grade' || (i.tipo === 'extra' && !i.pendente)) && !i.feriado && !i.cancelada && !this.semEnc(), chFeita: !!i.feita, chLabel: (i.feita ? 'Revisar chamada de ' : 'Fazer chamada de ') + d.nome,
        chBg: i.feita ? 'var(--texto)' : 'var(--superficie)', chCor: i.feita ? 'var(--fundo)' : 'var(--texto)', chParar: ev => ev.stopPropagation(), chAbrir: ev => { ev.stopPropagation(); this.abrirChamada(i); }, padDir: modo === 'dias' && P !== 'aluno' && i.data === hoje ? '30px' : '6px',
        cursor: pode ? 'grab' : 'pointer', touch: pode ? 'none' : 'auto', down: ev => this.blocoDown(ev, i), tecla: ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); this.abrirAula(i); } } });
    };
    const cols = colDias.map(dia => {
      const data = addD(W, dia - 1), its = todos.filter(i => i.data === data).sort((a, b) => hm(a.ini) - hm(b.ini) || hm(b.fim) - hm(a.fim));
      let grupo = [], fimG = -1;
      const fechar = () => { const ln = []; grupo.forEach(i => { let l = ln.findIndex(x => x <= hm(i.ini)); if (l < 0) { l = ln.length; ln.push(0); } ln[l] = hm(i.fim); i._l = l; }); grupo.forEach(i => { i._n = ln.length; }); grupo = []; };
      its.forEach(i => { if (grupo.length && hm(i.ini) >= fimG) fechar(); grupo.push(i); fimG = Math.max(fimG, hm(i.fim)); }); fechar();
      const ed = evsDia(data), nL = its.reduce((x, i) => Math.max(x, i._n || 1), 1);
      return { nL, dia: DIA_C[dia], data: ddmm(data), hdBg: data === hoje ? 'var(--sunken)' : 'var(--superficie)', hdPeso: data === hoje ? 700 : 600,
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
      eixoVis: esc, eixos: [['dias', 'Dias × horários'], ['prof', 'Professores']].map(([id, l]) => ({ label: l, on: eixo === id, bg: eixo === id ? 'var(--texto)' : 'transparent', cor: eixo === id ? 'var(--fundo)' : 'var(--texto)', peso: eixo === id ? 600 : 500, ir: () => this.setState({ eixo: id, pend: null }) })),
      ...(() => { const vz = !this.escopo(st, P).some(d => (d.grade || []).length) && !inst.some(i => i.tipo === 'extra'); return { quadroVazioMsg: P === 'aluno' && !this.tAluno() ? 'Você ainda não está numa turma. Fale com a secretaria.' : P === 'prof' ? 'Nenhuma aula sua na grade.' : 'Nenhuma aula na grade. Monte os horários ou peça ao assistente.', quadroVazio: vz, eixoDias: eixo === 'dias' && !vz, eixoProf: eixo === 'prof' && !vz, dragDicaVis: !vz }; })(),
      semanaTxt: 'Semana de ' + ddmm(W) + ' a ' + ddmm(addD(W, 4)), semAnt: () => this.setState({ semana: addD(W, -7), pend: null }), semProx: () => this.setState({ semana: addD(W, 7), pend: null }), naoAtual: W !== segDe(hoje), irHoje: () => this.setState({ semana: null, pend: null }),
      filtrosVis: P !== 'aluno', fTurmaVis: esc, fProfVis: esc, fSalaVis: esc,
      optTurmas: lerLoja().turmas.map(t => ({ v: t.id, l: t.nome })).concat(st.discs.some(d => !d.turma) ? [{ v: '__sem', l: 'Sem turma' }] : []), optProfs: st.profs.map(p => ({ v: String(p.id), l: p.nome })), optDiscs: escD.map(d => ({ v: String(d.id), l: d.nome + ' · ' + nomeTurma(d.turma) })), optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })).concat(st.discs.some(d => !d.sala || (d.grade || []).some(g => !g.sala && !d.sala)) ? [{ v: '__sem', l: 'Sem sala' }] : []),
      fTurma: st.fTurma, fProf: st.fProf, fDisc: st.fDisc, fSala: st.fSala,
      setFTurma: e => this.setState({ fTurma: e.target.value }), setFProf: e => this.setState({ fProf: e.target.value }), setFDisc: e => this.setState({ fDisc: e.target.value }), setFSala: e => this.setState({ fSala: e.target.value }),
      filtrado: !!(st.fTurma || st.fProf || st.fDisc || st.fSala), limparFiltros: () => this.setState({ fTurma: '', fProf: '', fDisc: '', fSala: '' }),
      ocupVis: esc, verOcup: st.verOcup, alternarOcup: () => this.setState(s => ({ verOcup: !s.verOcup })), ocupBg: st.verOcup ? 'var(--sunken)' : 'var(--superficie)',
      choquesVis: esc, choquesTxt: ch.n ? ch.n + (ch.n === 1 ? ' choque' : ' choques') : 'Sem choques', soChoques: st.soChoques, alternarChoques: () => { if (ch.n) this.setState(s => ({ soChoques: !s.soChoques })); },
      choquesBorda: ch.n ? 'var(--aviso)' : 'var(--borda)', choquesCor: ch.n ? 'var(--aviso)' : 'var(--texto-suave)', choquesBg: st.soChoques ? 'var(--aviso-suave)' : 'var(--superficie)',
      iaBotaoVis: esc, iaAberto: esc && st.iaAberto, alternarIa: () => this.setState(s => ({ iaAberto: !s.iaAberto })), iaBotaoBg: st.iaAberto ? 'var(--sunken)' : 'var(--superficie)',
      diasMVis: narrow && eixo === 'dias', diasM: [1, 2, 3, 4, 5].map(d => ({ l: DIA_C[d] + ' ' + ddmm(addD(W, d - 1)), on: d === dSel, bg: d === dSel ? 'var(--texto)' : 'var(--superficie)', cor: d === dSel ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState({ diaM: d }) })),
      gridCols: '56px ' + cols.map(c => narrow ? 'minmax(0,1fr)' : 'minmax(' + (c.nL * 132) + 'px,' + c.nL + 'fr)').join(' '), gridMinW: '0', gridH: (G1 - G0) * PX + 'px',
      horas: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map(h => ({ t: pad(h) + ':00', top: (h * 60 - G0) * PX + 'px' })),
      intTop: (700 - G0) * PX + 'px', intH: 110 * PX + 'px', agoraTop: (nm - G0) * PX + 'px', cols, linhasP, profVazio: !linhasP.length,
      dragDica: esc && eixo === 'dias' ? 'Arraste uma aula para remarcar. Toque para ver os detalhes.' : 'Toque numa aula para ver os detalhes.',
      pendVis: !!pd, pendErroTotal: !!(pd && pd.erroSemana && pd.erroGrade), pendOk: !!(pd && !(pd.erroSemana && pd.erroGrade)),
      pendTxt: pd ? 'Mover ' + pd.inst.disc.nome + ' · ' + nomeTurma(pd.inst.disc.turma) + ' de ' + DIA_L[dsem(pd.inst.data)] + ' ' + ddmm(pd.inst.data) + ', ' + pd.inst.ini + ' para ' + DIA_L[pd.alvo.dia] + ' ' + ddmm(pd.novaData) + ', ' + pd.alvo.ini + '?' : '',
      pendErro: pd ? (pd.erroSemana || pd.erroGrade) : '', pendSemOff: !!(pd && pd.erroSemana) || !!st.salvando, pendGrOff: !!(pd && pd.erroGrade) || !!st.salvando, pendSemO: pd && pd.erroSemana ? 0.4 : 1, pendGrO: pd && pd.erroGrade ? 0.4 : 1,
      pendNotas: pd ? [pd.erroSemana && !pd.erroGrade ? 'Só nesta semana não dá: ' + pd.erroSemana : '', pd.erroGrade && !pd.erroSemana ? 'Na grade do semestre não dá: ' + pd.erroGrade : ''].filter(Boolean).map(t => ({ t })) : [],
      confSemana: () => this.confirmar('semana'), confGrade: () => this.confirmar('grade'), cancelarPend: () => this.setState(s2 => ({ pend: null, erroG: Object.assign({}, s2.erroG, { 'remarc-semana': '', 'remarc-grade': '' }) })),
      pendSemTxt: this.sv('remarc-semana', 'Só nesta semana'), pendGrTxt: this.sv('remarc-grade', 'Na grade do semestre'), pendGravErro: st.erroG['remarc-semana'] || st.erroG['remarc-grade'] || '', pendTemGravErro: !!(st.erroG['remarc-semana'] || st.erroG['remarc-grade']), pendOcupado: !!st.salvando
    };
  }
  renderVals() {
    const st = this.state, P = this.perfil(), now = this.agora(), esc = P === 'escola';
    const nPend = st.pedidos.filter(p => p.status === 'pendente').length, nSug = st.pedidos.filter(p => p.prof === this.profId() && p.status === 'sugestao').length;
    const tabs = esc ? [['quadro', 'Quadro semanal'], ['ano', 'Ano letivo'], ['disc', 'Disciplinas'], ['pedidos', 'Pedidos de aula extra', nPend]] : P === 'prof' ? [['quadro', 'Minha semana'], ['ano', 'Ano letivo']].concat(this.props.aoAbrirDisc ? [['disc', 'Disciplinas']] : [], [['pedidos', 'Aulas extras', nSug]]) : [['quadro', 'Minha semana'], ['ano', 'Ano letivo']];
    const aba = tabs.some(t => t[0] === st.aba) ? st.aba : 'quadro';
    const me = this.profNome(this.profId()), fer = this.ferMap(st.eventos);
    if (this.props.soEditor) { const g = st.pGeo || {}; return Object.assign(this.valsPainel(st, P, now, fer), { raiz: this.raiz, dicaRef: this.dicaRef, conteudoVis: false, rotulo: '', subtitulo: '', abas: [], raizMinH: '0', raizBg: 'transparent', raizMaxW: 'none', raizPad: '0', raizOvx: 'visible', pPos: 'absolute', pTop: (g.top ?? 0) + 'px', pH: (g.h ?? 0) + 'px', pLeft: (g.left ?? 0) + 'px', pRight: (g.right ?? 0) + 'px' }); }
    const carga = this.cargaAtual(), ok = carga === 'ok';
    return Object.assign(aba === 'quadro' && ok ? this.valsQuadro(st, P, now, fer) : {}, aba === 'quadro' && esc ? this.valsIa(st) : {}, aba === 'ano' ? this.valsAno(st, P, now, fer) : {}, aba === 'disc' ? this.valsDisc(st, now, fer) : {}, aba === 'pedidos' ? this.valsPed(st, P) : {}, this.valsPainel(st, P, now, fer), {
      raiz: this.raiz, dicaRef: this.dicaRef,
      ...(() => { const emb = !!this.props.embutido, g = st.pGeo || { top: 0, h: 0, left: 0, right: 0 }; return { raizMinH: emb ? '0' : '100vh', raizBg: emb ? 'transparent' : 'var(--fundo)', raizMaxW: emb ? 'none' : '1320px', raizPad: emb ? '0' : 'clamp(20px,4cqi,40px) clamp(16px,3cqi,40px) 96px',
        pPos: emb ? 'absolute' : 'fixed', pTop: emb ? g.top + 'px' : '0', pH: emb ? g.h + 'px' : '100vh', pLeft: emb ? g.left + 'px' : '0', pRight: emb ? g.right + 'px' : '0', raizOvx: emb ? 'visible' : 'hidden' }; })(),
      rotulo: (esc ? 'Escola' : P === 'prof' ? me : nomeTurma(this.tAluno())) + ' · semestre ' + this.semestre().nome,
      subtitulo: esc ? 'O quadro mostra a escala de todos os professores agora e na semana. O ano letivo junta provas, eventos e feriados.' : P === 'prof' ? 'Suas aulas da semana, o calendário da escola e os seus pedidos de aula extra.' : 'As aulas da sua turma e o que vem pela frente no ano letivo.',
      abas: tabs.map(([id, label, n]) => ({ label, on: aba === id, peso: aba === id ? 600 : 500, cor: aba === id ? 'var(--texto)' : 'var(--texto-suave)', barra: aba === id ? 'var(--texto)' : 'transparent', temN: !!n, n: n || '', ir: () => this.setState({ aba: id, painel: null, pend: null }) })),
      abaQuadro: aba === 'quadro' && ok, abaAno: aba === 'ano' && ok, abaDisc: aba === 'disc' && ok, abaPed: aba === 'pedidos' && ok,
      conteudoVis: true, skQuadro: carga === 'carregando' && aba === 'quadro', skAno: carga === 'carregando' && aba === 'ano', skLista: carga === 'carregando' && (aba === 'disc' || aba === 'pedidos'), cargaErro: carga === 'erro',
      tentarCarregar: () => this.tentarCarregar(), skCols: [0, 1, 2, 3, 4].map(k => ({ blocos: [[34 + k * 6, 100], [150, 100], [400 - k * 4, 100]].concat(k % 2 ? [[520, 100]] : []).map(([t, h]) => ({ top: t + 'px', h: h + 'px' })) })), skMeses: Array.from({ length: 12 }, (_, k) => ({ k })),
      skRef: el => { if (el && el.animate && !this.rm && !el._sk) { el._sk = 1; el.animate([{ opacity: 1 }, { opacity: 0.45 }, { opacity: 1 }], { duration: 1400, iterations: Infinity }); } },
      msgVis: !!st.msg, msgTxt: st.msg ? st.msg.t : '', fecharMsg: () => this.setState({ msg: null, reverter: false }), temDesfazer: !!(st.msg && st.msg.snap),
      pedirReverter: () => this.setState({ reverter: true }), cancelarReverter: () => this.setState(s2 => ({ reverter: false, erroG: Object.assign({}, s2.erroG, { reverter: '' }) })), reverterVis: !!st.reverter, reverterNao: !st.reverter,
      confReverter: () => this.reverter(), revTxt: this.sv('reverter', 'Reverter'), revOff: !!st.salvando, revErro: st.erroG.reverter || '', revTemErro: !!st.erroG.reverter
    });
  }
  // Reverter de verdade: grava de novo na API o que havia antes (grades ou data e hora da aula) e recarrega o estado.
  reverter() {
    const m = this.state.msg; if (!m || !m.snap) return;
    const snap = m.snap;
    return this.gravar('reverter', async () => {
      const feitos = [];
      try {
        for (const g of snap.grades || []) { await salvarGrade(g.id, g.itens); feitos.push(g.nome); }
        if (snap.aula) await atualizarAula(snap.aula.id, snap.aula.corpo);
      } catch (er) {
        if (feitos.length) throw { texto: 'Revertido em parte: ' + feitos.join(', ') + '. Falhou: ' + msgErro(er), recarregar: true };
        throw er;
      }
    }, () => {
      if (snap.discs) this.setState({ discs: snap.discs, remarc: snap.remarc || [] });
      this.setState({ reverter: false, msg: { t: 'Revertido. A grade voltou ao que era antes.' } });
      this.props.aoSalvar?.();
    });
  }
  iaEnviar(txt) {
    const t = (txt != null ? txt : this.state.iaTexto).trim(); if (!t || this.state.iaEnv) return;
    this.setState(s => ({ iaMsgs: s.iaMsgs.concat({ papel: 'usuario', texto: t }), iaTexto: '', iaEnv: true, iaErro: '', iaUltimo: t }));
    return this.iaResp();
  }
  // Tentar de novo reenvia a mesma conversa (a última mensagem do usuário já está nela).
  iaTentar() { if (!this.state.iaUltimo || this.state.iaEnv) return; this.setState({ iaErro: '', iaEnv: true }); return this.iaResp(); }
  async iaResp() {
    try {
      const r = await pedirGradeIA(this.state.iaMsgs.map(({ papel, texto }) => ({ papel, texto })));
      const moves = r.proposta.flatMap(p => {
        const d = this.state.discs.find(d => d.id === p.disciplina_id);
        return p.itens.map((x, idx) => ({ discId: p.disciplina_id, idx, novo: !d?.grade[idx], nome: p.disciplina_nome,
          de: d?.grade[idx] ? DIA_C[d.grade[idx].dia_semana] + ' ' + d.grade[idx].hora_inicio : 'sem horário',
          dia: x.dia_semana, ini: x.hora_inicio, fim: x.hora_fim, sala: String(x.sala_id ?? d?.sala ?? '') }));
      });
      this.setState(s => ({ iaEnv: false, iaMsgs: s.iaMsgs.concat({ papel: 'ia', texto: r.resposta }),
        iaProp: r.proposta.length || r.recusados.length ? { proposta: r.proposta, moves, rec: r.recusados.map(p => ({ nome: p.disciplina_nome, motivo: p.motivo })), idx: s.iaMsgs.length } : null, iaFeito: null }));
    } catch (er) {
      // O erro fica à parte da conversa, com o botão Tentar de novo.
      this.setState({ iaEnv: false, iaErro: erroGradeIA(er) });
    }
  }
  // Aplica a proposta disciplina por disciplina. Se só parte foi gravada, o resultado diz o que foi e o que falhou.
  iaAplicar() {
    const p = this.state.iaProp; if (!p || this.state.iaFeito || this.state.salvando) return;
    const antes = {}; p.proposta.forEach(d => { const x = this.state.discs.find(y => y.id === d.disciplina_id); antes[d.disciplina_id] = itensDe(x && x.grade); });
    return this.gravar('ia', async () => {
      const ok = [], falhas = [];
      for (const d of p.proposta) {
        try { await salvarGrade(d.disciplina_id, d.itens); ok.push(d); }
        catch (er) { falhas.push({ d, t: msgErro(er) }); }
      }
      if (!ok.length) throw { texto: 'Falhou: ' + falhas.map(f => f.d.disciplina_nome + ': ' + f.t).join('; ') + '.' };
      const nomes = ok.map(d => d.disciplina_nome).join(', ');
      return { ok, falhas, feito: falhas.length ? 'Gravadas: ' + nomes + '. Falhou: ' + falhas.map(f => f.d.disciplina_nome + ': ' + f.t).join('; ') + '.' : ok.map(d => d.disciplina_nome + (d.itens.length ? ': grade salva.' : ': Horários removidos.')).join('\n') };
    }, (r, simulado) => {
      const snap = simulado ? undefined : { grades: r.ok.map(d => ({ id: d.disciplina_id, nome: d.disciplina_nome, itens: antes[d.disciplina_id] })) };
      this.setState(s => ({ ...(s.iaProp === p ? { iaFeito: simulado ? 'Aplicado.' : r.feito } : {}), reverter: false,
        msg: { t: !simulado && r.falhas.length ? 'A proposta foi aplicada só em parte. Veja o resultado por disciplina.' : 'Aplicação da proposta concluída. Veja o resultado por disciplina.', snap } }));
    }, t => this.setState(s => ({ erroG: { ...s.erroG, ia: t } })));
  }
  valsIa(st) {
    const p = st.iaProp;
    return { iaVazio: !st.iaMsgs.length && !st.iaEnv, iaSug: ['Tem algum choque na grade atual?', 'Resolva os choques e monte a grade das disciplinas sem horário.', this.demo() ? lerLoja().iaSugGrade : 'Reorganize as aulas de um professor para o período da manhã.'].map(t => ({ t, usar: () => this.iaEnviar(t) })),
      iaLista: st.iaMsgs.map((m, i) => ({ autor: m.papel === 'usuario' ? 'Escola' : 'Assistente', usuario: m.papel === 'usuario', ia: m.papel === 'ia', texto: m.texto, temProp: !!p && p.idx === i })),
      iaMoves: p ? p.moves.map(m => ({ nome: m.nome, de: m.de, para: DIA_C[m.dia] + ' ' + m.ini + '–' + m.fim + ' · ' + nomeSala(m.sala) })) : [], iaTemMoves: !!(p && p.moves.length), iaRec: p ? p.rec : [], iaTemRec: !!(p && p.rec.length),
      iaTemErro: !!st.iaErro, iaErro: st.iaErro, iaTentar: () => this.iaTentar(), iaAplicarTxt: this.sv('ia', 'Aplicar proposta'), iaAplOff: !!st.salvando, iaAplO: st.salvando === 'ia' ? 0.6 : 1, iaGravErro: st.erroG.ia || '', iaTemGravErro: !!st.erroG.ia,
      iaAcoes: !!(p && p.proposta.length && !st.iaFeito), iaFeitoVis: !!st.iaFeito, iaFeito: st.iaFeito || '', iaAplicar: () => this.iaAplicar(), iaDescartar: () => this.setState({ iaProp: null, iaFeito: null }),
      iaEnv: st.iaEnv, iaTexto: st.iaTexto, setIaTexto: e => this.setState({ iaTexto: e.target.value }), iaTecla: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.iaEnviar(); } },
      iaSubmit: e => { e.preventDefault(); this.iaEnviar(); }, iaOff: st.iaEnv || !st.iaTexto.trim(), iaEnvO: st.iaEnv || !st.iaTexto.trim() ? 0.4 : 1, fecharIa: () => this.setState({ iaAberto: false }),
      iaMsgRef: el => { if (el && el.animate && !el._a) { el._a = 1; el.animate(this.rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' }); } },
      iaFimRef: el => { if (el) { const p2 = el.parentElement; if (p2) p2.scrollTop = p2.scrollHeight; } } };
  }
  chipEv(e) { const T = TIPOS[e.tipo]; return { ab: T.ab, bBg: T.bg, bCor: T.cor, bBorda: T.borda, titulo: e.titulo, tipoTxt: T.label, quem: e.turmas === 'todas' ? 'Todas as turmas' : e.turmas.map(nomeTurma).join(', '), hora: e.hi ? e.hi + (e.hf ? '–' + e.hf : '') : '', datas: ddmm(e.data) + (e.fim ? ' a ' + ddmm(e.fim) : ''), abrir: () => this.setState({ painel: { tipo: 'evento', id: e.id } }) }; }
  novoEvento(data) { this.setState({ painel: { tipo: 'eventoForm', id: null }, eErro: '', eF: { tipo: 'prova', titulo: '', data: data || '', fim: '', hi: '', hf: '', todas: true, turmas: [], disc: '', desc: '' } }); }
  editarEvento(e) { this.setState({ painel: { tipo: 'eventoForm', id: e.id }, eErro: '', eF: { tipo: e.tipo, titulo: e.titulo, data: e.data, fim: e.fim || '', hi: e.hi || '', hf: e.hf || '', todas: e.turmas === 'todas', turmas: e.turmas === 'todas' ? [] : e.turmas.slice(), disc: e.disc ? String(e.disc) : '', desc: e.desc || '' } }); }
  salvarEvento(ev) {
    ev.preventDefault(); if (this.state.salvando) return;
    const st = this.state, f = st.eF, pn = st.painel, id = pn.id, erro = t => this.responderPainel(pn, { eErro: t }, t);
    if (!f.titulo.trim()) return erro('Dê um título ao evento.');
    if (!f.data) return erro('Escolha a data.');
    if (f.data.slice(0, 4) !== this.ano().inicio.slice(0, 4)) return erro('A data precisa estar no ano letivo de ' + this.ano().inicio.slice(0, 4) + '.');
    if (f.fim && f.fim < f.data) return erro('O fim precisa ser no mesmo dia ou depois do início.');
    if ((f.hi && !f.hf) || (!f.hi && f.hf)) return erro('Preencha os dois horários ou deixe os dois em branco.');
    if (f.hi && !(hm(f.hi) < hm(f.hf))) return erro('O horário de fim precisa ser depois do início.');
    if (!f.todas && !f.turmas.length) return erro('Escolha pelo menos uma turma.');
    const obj = { id: id || Date.now(), tipo: f.tipo, titulo: f.titulo.trim(), data: f.data, fim: f.fim && f.fim !== f.data ? f.fim : '', hi: f.hi, hf: f.hf, turmas: f.todas ? 'todas' : f.turmas.slice(), disc: f.disc ? +f.disc : null, desc: f.desc.trim() };
    const msgAno = id ? 'Evento atualizado.' : 'Evento publicado no calendário.';
    return this.gravar('evento', () => id ? atualizarEvento(id, eventoAPI(obj)) : criarEvento(eventoAPI(obj)), (salvo, simulado) => {
      if (simulado) return this.setState(s => ({ eventos: id ? s.eventos.map(x => x.id === id ? obj : x) : s.eventos.concat(obj), painel: { tipo: 'evento', id: obj.id }, msgAno, ref: obj.data })); // demonstração
      this.responderPainel(pn, { painel: { tipo: 'evento', id: salvo.id }, eErro: '', msgAno, ref: obj.data }, msgAno);
    }, t => this.responderPainel(pn, s => ({ erroG: { ...s.erroG, evento: t } }), t));
  }
  valsAno(st, P, now, fer) {
    const hoje = now.data, ref = st.ref || hoje, esc = P === 'escola', vis = st.vis;
    // Dias marcados no calendário: feriados de todas as turmas e os das turmas visíveis (a escola vê os da turma filtrada).
    const ferA = Object.assign({}, fer); Object.keys(fer.__t || {}).forEach(k => { if (!esc || st.aTurma === k) Object.keys(fer.__t[k]).forEach(d => { ferA[d] = ferA[d] || fer.__t[k][d]; }); });
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
      escopoAno: esc ? 'A escola vê o calendário de todas as turmas.' : P === 'prof' ? 'Você vê os eventos gerais e os das turmas em que dá aula.' : this.tAluno() ? 'Você vê os eventos gerais e os ' + (this.demo() ? 'do ' : 'de ') + nomeTurma(this.tAluno()) + '.' : 'Você vê os eventos gerais.',
      visAno: vis === 'ano', visMes: vis === 'mes', visSemana: vis === 'semana', visDia: vis === 'dia', visLista: vis === 'lista', msgAnoVis: !!st.msgAno, msgAno: st.msgAno || '', fecharMsgAno: () => this.setState({ msgAno: '' })
    };
    const diaCel = (d, opts) => { const ds = doDia(d), fe = !!ferA[d], bim = ds.some(e => e.tipo === 'bimestre'), letivo = d >= this.ano().inicio && d <= this.ano().fim, tp = [...new Set(ds.filter(e => e.tipo !== 'feriado').map(e => e.tipo))].slice(0, 3);
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
        cel.push({ n: dc.n, ir: dc.ir, numBg: d === hoje ? 'var(--texto)' : 'transparent', numCor: d === hoje ? 'var(--fundo)' : 'var(--texto)', bg: ferA[d] ? HACH : d.slice(0, 7) === f.slice(0, 7) ? 'var(--superficie)' : 'var(--fundo)', op: d.slice(0, 7) === f.slice(0, 7) ? 1 : 0.5, fer: ferA[d] || '', temFer: !!ferA[d],
          evs: ds.slice(0, 3).map(e => this.chipEv(e)), temMais: ds.length > 3, mais: '+' + (ds.length - 3) + ' no dia' }); }
      r.celMes = cel; r.semDias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(t => ({ t }));
    }
    if (vis === 'semana') {
      const ins = this.instSemana(W, st, fer, P), ids = new Set(this.escopo(st, P).map(d => d.id));
      r.semCols = [0, 1, 2, 3, 4, 5, 6].map(k => { const d = addD(W, k), na = ins.filter(i => i.data === d && ids.has(i.disc.id) && !i.feriado && !i.pendente && !i.cancelada).length;
        return { dia: DIA_C[k + 1] + ' ' + ddmm(d), bg: d === hoje ? 'var(--sunken)' : 'var(--superficie)', fer: fer[d] || '', temFer: !!fer[d], evs: doDia(d).filter(e => e.tipo !== 'feriado').map(e => this.chipEv(e)), aulas: na ? na + (na === 1 ? ' aula' : ' aulas') : '', temAulas: !!na, irDia: () => this.setState({ vis: 'dia', ref: d }), vazio: !doDia(d).length && !na }; });
    }
    if (vis === 'dia') {
      const ids = new Set(this.escopo(st, P).map(d => d.id)), ins = this.instSemana(segDe(ref), st, fer, P).filter(i => i.data === ref && ids.has(i.disc.id)).sort((a, b) => hm(a.ini) - hm(b.ini));
      r.diaAulas = ins.map(i => { const passado = ref < hoje || (ref === hoje && hm(i.fim) <= now.min), cur = ref === hoje && hm(i.ini) <= now.min && now.min < hm(i.fim);
        const ci = this.chamadaInfo({ key: i.key, disc: i.disc.id, ini: i.ini, itipo: i.tipo, pendente: !!i.pendente, cancelada: !!i.cancelada, feriado: i.feriado, data: i.data }, st, now, P);
        return { hora: i.ini + '–' + i.fim, nome: i.disc.nome + ' · ' + nomeTurma(i.disc.turma), sub: nomeSala(i.sala) + ' · ' + this.profNome(i.disc.prof), st: i.feriado ? 'Sem aula · feriado' : i.cancelada ? 'Cancelada' : i.pendente ? 'Extra em análise' : cur ? 'Agora' : passado ? 'Dada' : 'Prevista', forte: cur, abrir: () => this.abrirAula(i),
          chFeita: ci.vis && ci.feita, chAtalho: ci.vis && !ci.off, chTxt: ci.feita ? 'Revisar chamada' : 'Fazer chamada', chAbrir: () => this.abrirChamada(i) }; });
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
      : this.props.soEditor ? { nome: '', turma: '', prof: '', sala: '', carga: '60', grade: [{ k: 1, dia: '1', ini: '08:00', fim: '09:40', sala: '' }] }
      : { nome: '', turma: lerLoja().turmas[0]?.id, prof: '', sala: lerLoja().salas[0]?.id, carga: '60', grade: [{ k: 1, dia: '1', ini: '08:00', fim: '09:40', sala: lerLoja().salas[0]?.id }] };
    f.turma = f.turma || ''; f.sala = f.sala || ''; f.grade.forEach(g => { g.sala = g.sala || ''; });
    this.setState(s => ({ painel: { tipo: 'disc', id: d ? d.id : null }, dF: f, dErro: '', dOk: '', erroG: Object.assign({}, s.erroG, { disc: '' }) }));
  }
  setDF(campo, v) { this.setState(s => ({ dF: Object.assign({}, s.dF, { [campo]: v }), dErro: '', dOk: '' })); }
  setLinhaD(k, campo, v) { this.setState(s => ({ dF: Object.assign({}, s.dF, { grade: s.dF.grade.map(r => r.k === k ? Object.assign({}, r, { [campo]: v }) : r) }), dErro: '', dOk: '' })); }
  errosDisc(f, id) {
    const st = this.state, ig = id ? (st.discs.find(d => d.id === id)?.grade || []).map((x, k) => id + '-' + k) : [];
    return f.grade.map((r, i) => {
      for (let j = 0; j < f.grade.length; j++) { if (j === i) continue; const o = f.grade[j]; if (o.dia === r.dia && hm(r.ini) < hm(o.fim) && hm(o.ini) < hm(r.fim)) return 'Sobrepõe o horário ' + (j + 1) + '.'; }
      // O horário sem sala herda a sala da disciplina, como a ocorrência gerada (x.sala || d.sala).
      return this.checarSlot({ prof: f.prof ? +f.prof : null, turma: f.turma, sala: r.sala || f.sala, dia: +r.dia, ini: r.ini, fim: r.fim, ignorar: ig }, st.discs, st.profs);
    });
  }
  salvarDisc(e) {
    e.preventDefault(); if (this.state.salvando) return;
    const st = this.state, f = st.dF, pn = st.painel, id = pn.id, erro = t => this.responderPainel(pn, { dErro: t, dOk: '' }, t);
    if (!f.nome.trim()) return erro('Informe o nome.');
    if (st.discs.some(d => d.id !== id && (d.turma || '') === (f.turma || '') && d.nome.trim().toLowerCase() === f.nome.trim().toLowerCase())) return erro('Essa turma já tem uma disciplina com esse nome.');
    const c = parseInt(f.carga, 10); if (isNaN(c) || c <= 0) return erro('A carga horária precisa ser maior que zero.');
    const errs = this.errosDisc(f, id), k = errs.findIndex(Boolean); if (k >= 0) return erro('Horário ' + (k + 1) + ': ' + errs[k]);
    let nid = id, cadastroOk = false;
    const corpo = disciplinaAPI({ ...f, nome: f.nome.trim(), carga: c });
    const grade = itensAPI(f.grade.map(r => ({ dia_semana: +r.dia, hora_inicio: r.ini, hora_fim: r.fim, sala: r.sala })));
    return this.gravar('disc', async () => {
      try {
        nid = (id ? await atualizarDisciplina(id, corpo) : await criarDisciplina(corpo)).id; cadastroOk = true;
        await salvarGrade(nid, grade);
      } catch (er) {
        // O cadastro já foi gravado: a mensagem diz isso, em vez de anunciar sucesso ou falha geral.
        if (cadastroOk) throw { texto: 'Cadastro salvo; a grade não foi: ' + msgErro(er), recarregar: true };
        throw er;
      }
    }, () => {
      const dOk = grade.length ? 'Grade salva: ' + grade.length + (grade.length === 1 ? ' aula' : ' aulas') + ' por semana.' : 'Salvo. Sem horários, a disciplina não aparece no quadro.';
      this.responderPainel(pn, { painel: { tipo: 'disc', id: nid }, dErro: '', dOk }, dOk);
      this.props.aoSalvar?.({ id: nid });
    }, t => this.responderPainel(pn, { ...(cadastroOk ? { painel: { tipo: 'disc', id: nid } } : {}), dErro: t, dOk: '' }, t));
  }
  valsDisc(st, now, fer) {
    const ch = this.choques(st.discs, st.profs), P = this.perfil(), esc = P === 'escola', escD = this.escopo(st, P), pag = !!this.props.aoAbrirDisc;
    return {
      discAdmin: esc, discAjuda: pag ? 'Toque numa disciplina para abrir alunos, chamada, notas e avisos.' : '', temDiscAjuda: pag, novaSala: () => this.abrirNovo('sala'), msgDiscVis: !!st.msgDisc, msgDisc: st.msgDisc || '', fecharMsgDisc: () => this.setState({ msgDisc: '' }),
      novaDisc: () => this.abrirDisc(null), discResumo: st.discs.length + ' disciplinas · ' + lerLoja().turmas.length + ' turmas · ' + (ch.n ? ch.n + (ch.n === 1 ? ' choque na grade' : ' choques na grade') : 'grade sem choques'),
      turmasD: lerLoja().turmas.concat(escD.some(d => !d.turma) ? [{ id: null, nome: 'Sem turma' }] : []).filter(t => escD.some(d => (d.turma || null) === t.id) || esc).map(t => { const ds = escD.filter(d => (d.turma || null) === t.id); const aulas = ds.reduce((x, d) => x + (d.grade || []).length, 0);
        return { nome: t.nome, sub: ds.length + (ds.length === 1 ? ' disciplina' : ' disciplinas') + ' · ' + aulas + (aulas === 1 ? ' aula' : ' aulas') + ' por semana',
          linhas: ds.map(d => { const c = this.carga(d, st, fer, now.data, now.min), temCh = (d.grade || []).some((x, k) => ch.M[d.id + '-' + k]), falta = d.carga - c.total;
            return { nome: d.nome, prof: this.profNome(d.prof), sala: nomeSala(d.sala), salaCor: d.sala ? 'var(--texto-suave)' : 'var(--texto-fraco, var(--texto-suave))', horarios: (d.grade || []).length ? d.grade.map(x => DIA_C[x.dia_semana] + ' ' + x.hora_inicio).join(' · ') : 'Sem horário',
              cargaTxt: fmtH(c.feito) + ' de ' + d.carga + ' h', bar: 'scaleX(' + Math.min(1, c.feito / d.carga).toFixed(3) + ')', proj: !(d.grade || []).length ? 'Sem horário, não acumula carga.' : falta > 0.05 ? 'A grade não fecha a carga: faltam ' + fmtH(falta) + ' até ' + ddmm(this.semestre().fim) + '.' : 'Fecha a carga até ' + ddmm(this.semestre().fim) + '.',
              projCor: !(d.grade || []).length || falta > 0.05 ? 'var(--aviso)' : 'var(--texto-suave)', temCh, semH: !(d.grade || []).length, abrir: () => pag ? this.props.aoAbrirDisc(d.id) : this.abrirDisc(d), editarVis: esc && pag, editar: () => this.abrirDisc(d) }; }) }; })
    };
  }
  pedCheck(p, q, st) { const d = st.discs.find(x => x.id === p.disc); return d ? this.checarData({ data: q.data, ini: q.ini, fim: q.fim, prof: p.prof, turma: d.turma, sala: q.sala }, st) : 'Disciplina não encontrada.'; }
  enviarPed(e) {
    e.preventDefault(); if (this.state.salvando) return;
    const st = this.state, f = st.pF, resposta = (pMsg, campos = {}) => this.setState(s => s.pF === f && s.aba === st.aba ? { ...campos, pMsg } : { msg: { t: pMsg.t } }), erro = t => resposta({ erro: true, t });
    if (!f.disc) return erro('Escolha a disciplina.');
    const ck = this.pedCheck({ disc: +f.disc, prof: this.profId() }, f, st); if (ck) return erro('Não dá para enviar: ' + ck);
    if (!f.motivo.trim()) return erro('Explique o motivo da aula extra.');
    const limpo = { disc: f.disc, data: '', ini: '', fim: '', sala: f.sala, motivo: '' }, ok = 'Pedido enviado. A escola analisa e você vê a resposta aqui.';
    return this.gravar('pedido', () => criarPedido(pedidoAPI({ ...f, motivo: f.motivo.trim() })), (r, simulado) => {
      if (simulado) return this.setState(s => ({ pedidos: [{ id: Date.now(), prof: this.profId(), disc: +f.disc, data: f.data, ini: f.ini, fim: f.fim, sala: f.sala, motivo: f.motivo.trim(), status: 'pendente', resposta: '', sug: null }].concat(s.pedidos), pF: limpo, pMsg: { erro: false, t: ok } })); // demonstração
      resposta({ erro: false, t: ok }, { pF: limpo });
    }, (t, er) => erro((er && er.status === 409 ? 'Não dá para enviar: ' : '') + t));
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
          return Object.assign(fmtP(p, p), { ok: !ck, ck: ck ? 'Choque: ' + ck : 'Sem choque com professor, turma e sala.', ckCor: ck ? 'var(--aviso)' : 'var(--texto-suave)', aprovarOff: !!ck || !!st.salvando, aprovarO: ck ? 0.4 : 1,
            normal: !rec && !sug, rec, sug, recMotivo: st.recMotivo, recErro: st.recErro, sugF: st.sug, sugErro: st.sugErro,
            apTxt: this.sv('ap-' + p.id, 'Aprovar'), recTxt: this.sv('rec-' + p.id, 'Recusar pedido'), sugTxt: this.sv('sug-' + p.id, 'Enviar sugestão'), ocupado: !!st.salvando, gravErro: st.erroG['ap-' + p.id] || st.erroG['rec-' + p.id] || st.erroG['sug-' + p.id] || '', temGravErro: !!(st.erroG['ap-' + p.id] || st.erroG['rec-' + p.id] || st.erroG['sug-' + p.id]),
            aprovar: () => {
              const c2 = this.pedCheck(p, p, this.state); if (c2) return;
              const ok = 'Aula extra aprovada. Ela entra no quadro e na semana dos alunos.';
              return this.gravar('ap-' + p.id, () => aprovarPedido(p.id), (r, simulado) => {
                if (simulado) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'aprovada', resposta: '' }) : x), msgPed: ok }));
                resposta({ msgPed: ok }, ok);
              }, (t, er) => er && er.status === 409 ? resposta({ pedErros: { ...this.state.pedErros, [p.id]: t } }, t) : resposta({ erroG: { ...this.state.erroG, ['ap-' + p.id]: t } }, t));
            },
            pedirRec: () => this.setState({ recusando: p.id, recMotivo: '', recErro: '', sugerindo: null }), pedirSug: () => this.setState({ sugerindo: p.id, recusando: null, sugErro: '', sug: { data: p.data, ini: p.ini, fim: p.fim, sala: p.sala } }),
            cancelar: () => this.setState({ recusando: null, sugerindo: null }),
            setRec: e => this.setState({ recMotivo: e.target.value, recErro: '' }),
            confRec: () => {
              const motivo = this.state.recMotivo; if (!motivo.trim()) return this.setState({ recErro: 'Escreva o motivo da recusa. O professor vai ver.' });
              const ok = 'Pedido recusado. O professor vê o motivo.', mesmo = s => s.recusando === p.id && s.recMotivo === motivo;
              return this.gravar('rec-' + p.id, () => recusarPedido(p.id, motivo.trim()), (r, simulado) => {
                if (simulado) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'recusada', resposta: motivo.trim() }) : x), recusando: null, msgPed: ok }));
                resposta({ recusando: null, msgPed: ok }, ok, mesmo);
              }, t => resposta({ recErro: t }, t, mesmo));
            },
            setSugData: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { data: e.target.value }), sugErro: '' })), setSugIni: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { ini: e.target.value }), sugErro: '' })), setSugFim: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { fim: e.target.value }), sugErro: '' })), setSugSala: e => this.setState(s => ({ sug: Object.assign({}, s.sug, { sala: e.target.value }), sugErro: '' })),
            sugCk: (() => { const c3 = this.pedCheck(p, st.sug, st); return c3 ? 'Choque: ' + c3 : 'Horário livre.'; })(), sugCkCor: this.pedCheck(p, st.sug, st) ? 'var(--aviso)' : 'var(--texto-suave)',
            confSug: () => {
              const sug = this.state.sug, c4 = this.pedCheck(p, sug, this.state); if (c4) return this.setState({ sugErro: 'Esse horário também tem choque. ' + c4 });
              const ok = 'Sugestão enviada. O professor aceita ou recusa.', mesmo = s => s.sugerindo === p.id && s.sug === sug;
              return this.gravar('sug-' + p.id, () => sugerirPedido(p.id, horarioAPI(sug)), (r, simulado) => {
                if (simulado) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'sugestao', sug: Object.assign({}, sug) }) : x), sugerindo: null, msgPed: ok }));
                resposta({ sugerindo: null, msgPed: ok }, ok, mesmo);
              }, t => resposta({ sugErro: t }, t, mesmo));
            } }); }),
        temPend: pend.length > 0, histLista: hist.map(p => { const q = p.status === 'sugestao' ? p.sug : p; return Object.assign(fmtP(p, q), tagSt(p.status), { resposta: p.resposta, temResp: !!p.resposta }); }), temHist: hist.length > 0,
        optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })), msgPedVis: !!st.msgPed, msgPed: st.msgPed || '', fecharMsgPed: () => this.setState({ msgPed: '' }) };
    }
    const meus = st.pedidos.filter(p => p.prof === this.profId()), d = st.discs.find(x => String(x.id) === f.disc);
    const ck = f.disc && f.data && f.ini && f.fim ? this.pedCheck({ disc: +f.disc, prof: this.profId() }, Object.assign({}, f, { sala: f.sala || (d && d.sala) }), st) : '';
    const setF = k => e => { const v = e.target.value; this.setState(s => { const n = Object.assign({}, s.pF, { [k]: v }); if (k === 'disc' && !s.pF.sala) { const dd = s.discs.find(x => String(x.id) === v); if (dd) n.sala = dd.sala; } return { pF: n, pMsg: null }; }); };
    return { pedEsc: false, pedProf: true, optMinhas: minhas.map(x => ({ v: String(x.id), l: x.nome + ' · ' + nomeTurma(x.turma) })), optSalas: lerLoja().salas.map(s => ({ v: s.id, l: s.nome })),
      pF: f, setPDisc: setF('disc'), setPData: setF('data'), setPIni: setF('ini'), setPFim: setF('fim'), setPSala: setF('sala'), setPMotivo: setF('motivo'), enviarPed: e => this.enviarPed(e),
      pCkVis: !!(f.disc && f.data && f.ini && f.fim), pCk: ck ? 'Choque: ' + ck : 'Horário livre para você, a turma e a sala.', pCkCor: ck ? 'var(--aviso)' : 'var(--texto-suave)', pEnvOff: !!ck || !!st.salvando, pEnvO: ck ? 0.4 : st.salvando === 'pedido' ? 0.6 : 1, pEnvTxt: this.sv('pedido', 'Enviar para análise'),
      pMsgVis: !!(st.pMsg || st.erroG.pedido), pMsg: st.erroG.pedido || (st.pMsg ? st.pMsg.t : ''), pMsgCor: st.erroG.pedido || (st.pMsg && st.pMsg.erro) ? 'var(--aviso)' : 'var(--texto)',
      meusLista: meus.map(p => { const q = p.status === 'sugestao' ? p.sug : p; return Object.assign(fmtP(p, q), tagSt(p.status), { resposta: p.resposta, temResp: !!p.resposta, ehSug: p.status === 'sugestao', original: 'Você pediu ' + DIA_L[dsem(p.data)] + ', ' + ddmm(p.data) + ' · ' + p.ini + '–' + p.fim + '.',
        acTxt: this.sv('ac-' + p.id, 'Aceitar sugestão'), rsTxt: this.sv('rs-' + p.id, 'Recusar'), sgOff: !!st.salvando, sgErro: st.erroG['ac-' + p.id] || st.erroG['rs-' + p.id] || '', sgTemErro: !!(st.erroG['ac-' + p.id] || st.erroG['rs-' + p.id]),
        aceitar: () => {
          const c5 = this.pedCheck(p, p.sug, this.state); if (c5) return this.setState({ pMsg: { erro: true, t: 'A sugestão deixou de estar livre: ' + c5 } });
          const ok = 'Sugestão aceita. A aula extra está no quadro.';
          return this.gravar('ac-' + p.id, () => aceitarSugestao(p.id), (r, simulado) => {
            if (simulado) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'aprovada', data: p.sug.data, ini: p.sug.ini, fim: p.sug.fim, sala: p.sug.sala, sug: null }) : x), pMsg: { erro: false, t: ok } }));
            resposta({ pMsg: { erro: false, t: ok } }, ok, s => s.pF === f);
          }, t => resposta({ pMsg: { erro: true, t } }, t, s => s.pF === f));
        },
        recusar: () => {
          const ok = 'Você recusou a sugestão da escola.';
          return this.gravar('rs-' + p.id, () => recusarSugestao(p.id), (r, simulado) => {
            if (simulado) return this.setState(s => ({ pedidos: s.pedidos.map(x => x.id === p.id ? Object.assign({}, x, { status: 'recusada', resposta: ok, sug: null }) : x) }));
            resposta({ pMsg: { erro: false, t: ok } }, ok, s => s.pF === f);
          }, t => resposta({ pMsg: { erro: true, t } }, t, s => s.pF === f));
        } }); }),
      temMeus: meus.length > 0 };
  }
  valsPainel(st, P, now, fer) {
    const pn = st.painel, esc = P === 'escola', base = { painelVis: !!pn, fecharPainel: () => this.setState({ painel: null }), pAula: false, pEv: false, pEvForm: false, pDisc: false, pCham: false, pNovo: false, painelTitulo: '' };
    if (!pn) return base;
    if (pn.tipo === 'aula') {
      const d = st.discs.find(x => x.id === pn.disc); if (!d) return base;
      const c = this.carga(d, st, fer, now.data, now.min), ch = this.choques(st.discs, st.profs), msgs = pn.itipo === 'grade' && !pn.remarcada ? (ch.M[pn.tkey] || []) : [];
      const prox = this.evVisiveis(st, P).filter(e => e.disc === d.id && (e.fim || e.data) >= now.data).slice(0, 3).map(e => this.chipEv(e));
      const cur = pn.data === now.data && hm(pn.ini) <= now.min && now.min < hm(pn.fim), passado = pn.data < now.data || (pn.data === now.data && hm(pn.fim) <= now.min);
      return Object.assign(base, { painelTitulo: 'Aula', pAula: true, pa: { nome: d.nome, sub: nomeTurma(d.turma) + ' · ' + nomeSala(pn.sala) + ' · ' + this.profNome(d.prof), quando: DIA_L[dsem(pn.data)] + ', ' + ddmm(pn.data) + ' · ' + pn.ini + '–' + pn.fim,
        status: pn.feriado ? 'Sem aula: ' + pn.feriado : pn.cancelada ? 'Aula cancelada' : pn.pendente ? 'Aula extra aguardando análise da escola' : cur ? 'Acontecendo agora' : passado ? 'Aula dada' : pn.remarcada ? 'Remarcada só nesta semana' : pn.itipo === 'extra' ? 'Aula extra aprovada' : 'Prevista',
        cargaTxt: fmtH(c.feito) + ' de ' + d.carga + ' h cumpridas', bar: 'scaleX(' + Math.min(1, c.feito / d.carga).toFixed(3) + ')' }, paChoques: msgs.map(t => ({ t })), paTemCh: esc && msgs.length > 0, paProx: prox, paTemProx: prox.length > 0,
        ...(() => { const ci = this.chamadaInfo(pn, st, now, P), inst = { key: pn.key, tkey: pn.tkey, disc: d, data: pn.data, ini: pn.ini, fim: pn.fim, sala: pn.sala, tipo: pn.itipo, pendente: pn.pendente, remarcada: pn.remarcada, feriado: pn.feriado, cancelada: pn.cancelada, pedido: pn.pedido ? { id: pn.pedido } : null };
          return { paChVis: ci.vis, paChFeita: ci.vis && ci.feita, paChOff: !!ci.off, paChDica: ci.off, paChTemDica: !!ci.off, paChTxt: ci.txt, paChO: ci.off ? 0.4 : 1, paChPrim: ci.feita ? 'var(--superficie)' : 'var(--texto)', paChCor: ci.feita ? 'var(--texto)' : 'var(--fundo)', paCh: () => { if (!ci.off) this.abrirChamada(inst); } }; })(),
        paEditarVis: esc && pn.itipo === 'grade', paEditar: () => this.abrirDisc(d), paPedVis: esc && pn.pendente, paIrPed: () => this.setState({ aba: 'pedidos', painel: null }) });
    }
    if (pn.tipo === 'evento') {
      const e = st.eventos.find(x => x.id === pn.id); if (!e) return base;
      const d = e.disc ? st.discs.find(x => x.id === e.disc) : null, c = this.chipEv(e);
      return Object.assign(base, { painelTitulo: 'Calendário', pEv: true, pe: Object.assign(c, { quando: (e.fim ? ddmm(e.data) + ' a ' + ddmm(e.fim) + ' de ' : DIA_L[dsem(e.data)] + ', ' + e.data.slice(8, 10) + ' de ') + MESES[+e.data.slice(5, 7) - 1] + (e.hi ? ' · ' + e.hi + '–' + e.hf : ''), disc: d ? d.nome + ' · ' + nomeTurma(d.turma) : '', temDisc: !!d, desc: e.desc, temDesc: !!e.desc }),
        peAcoes: esc, peEditar: () => this.editarEvento(e), peExcluir: () => {
          const ok = 'Evento removido do calendário.';
          return this.gravar('excluirEvento', () => apagarEvento(e.id), (r, simulado) => {
            if (simulado) return this.setState(s => ({ eventos: s.eventos.filter(x => x.id !== e.id), painel: null, msgAno: ok }));
            this.responderPainel(pn, { painel: null, msgAno: ok }, ok);
          }, t => { if (this.state.painel === pn) { this.editarEvento(e); this.setState({ eErro: t }); } else this.setState({ msg: { t } }); });
        } });
    }
    if (pn.tipo === 'chamada') {
      const d = st.discs.find(x => x.id === pn.disc); if (!d) return base;
      const lista = this.alunosChamada(d, pn), m = st.chamF || {}, atual = this.chamadaAtual(pn), feita = !!atual, ci = this.chamadaInfo(pn, st, now, P), ed = !ci.off;
      const al = lista.map(a0 => { const nome = a0.nome, id = a0.id, v = m[id], p = v === true, fl = v === false;
        return { nome, iniciais: nome.split(' ').map(x => x[0]).slice(0, 2).join(''), p, f: fl, pBg: p ? 'var(--texto)' : 'transparent', pCor: p ? 'var(--fundo)' : 'var(--texto)', fBg: fl ? 'var(--texto)' : 'transparent', fCor: fl ? 'var(--fundo)' : 'var(--texto)', pPeso: p ? 600 : 500, fPeso: fl ? 600 : 500, cursor: ed ? 'pointer' : 'default',
          marcarP: () => { if (ed) this.setState(s => ({ chamF: Object.assign({}, s.chamF, { [id]: true }), chamErro: '' })); }, marcarF: () => { if (ed) this.setState(s => ({ chamF: Object.assign({}, s.chamF, { [id]: false }), chamErro: '' })); } }; });
      const pres = al.filter(x => x.p).length, semMarca = al.filter(x => !x.p && !x.f).length;
      const voltar = () => this.abrirAula({ key: pn.key, tkey: pn.tkey, disc: d, data: pn.data, ini: pn.ini, fim: pn.fim, sala: pn.sala, tipo: pn.itipo, pendente: pn.pendente, remarcada: pn.remarcada, feriado: pn.feriado, cancelada: pn.cancelada, pedido: pn.pedido ? { id: pn.pedido } : null });
      return Object.assign(base, { painelTitulo: 'Chamada', pCham: true, ch: { rotulo: pn.itipo === 'extra' ? 'Aula extra' : 'Aula da grade', disc: d.nome + ' · ' + nomeTurma(d.turma), quando: DIA_L[dsem(pn.data)] + ', ' + ddmm(pn.data) + ' · ' + pn.ini + '–' + pn.fim + ' · ' + nomeSala(pn.sala),
          bloqueio: !ed, bloqueioTxt: ci.off, editavel: ed, alunos: al, temAlunos: al.length > 0, semAlunos: !al.length, contador: pres + '/' + al.length, faltaTxt: semMarca ? semMarca + ' sem marcar' : 'todos marcados',
          todos: () => this.setState(s => { const c = Object.assign({}, s.chamF); lista.forEach(x => { c[x.id] = true; }); return { chamF: c, chamErro: '' }; }), voltar,
          salvar: () => {
            const S = this.state; if (S.salvando) return;
            const falt = faltamMarcar(lista, S.chamF); if (falt) return this.setState({ chamErro: 'Marque todos os alunos. ' + (falt === 1 ? 'Falta 1.' : 'Faltam ' + falt + '.') });
            const marcas = Object.assign({}, S.chamF), au = this.aulaDe(pn.disc, pn.data, pn.ini);
            // A chamada grava sempre pela API, com a data da aula real.
            return this.gravar('chamada', () => salvarChamada(d.id, { data: au ? au.data : pn.data, presencas: presencasAPI(lista, marcas, atual) }), (r, simulado) => {
              if (simulado) this.setState(s => ({ chamadas: Object.assign({}, s.chamadas, { [pn.key]: marcas }) }));
              if (this.state.painel === pn) voltar(); else this.setState({ msg: { t: 'Chamada salva.' } });
            }, t => this.responderPainel(pn, s => ({ erroG: { ...s.erroG, chamada: t } }), t));
          },
          botao: this.sv('chamada', feita ? 'Salvar alterações' : 'Salvar chamada'), off: !!st.salvando, op: st.salvando === 'chamada' ? 0.6 : 1 }, chamErro: st.chamErro || st.erroG.chamada || '', semAlunosTxt: d.turma ? 'Nenhum aluno matriculado em ' + d.nome + '. Matricule os alunos para fazer a chamada.' : 'Disciplina sem turma: não há alunos para a chamada.' });
    }
    if (pn.tipo === 'turma' || pn.tipo === 'sala') {
      const t = pn.tipo === 'turma';
      return Object.assign(base, { painelTitulo: t ? 'Turma' : 'Sala', pNovo: true, novoTitulo: t ? 'Nova turma' : 'Nova sala', novoAjuda: t ? 'Só o nome. A turma passa a aparecer nos seletores da grade e do calendário.' : 'Só o nome. A sala passa a aparecer nos seletores da grade e dos pedidos.', novoPh: t ? '1º B' : 'Sala 103',
        nomeF: st.nomeF, setNome: e => this.setState({ nomeF: e.target.value, nomeErro: '' }), nomeErro: st.nomeErro || st.erroG[pn.tipo] || '', novoBotao: this.sv(pn.tipo, t ? 'Cadastrar turma' : 'Cadastrar sala'), novoOff: !!st.salvando, novoO: st.salvando === pn.tipo ? 0.6 : 1, salvarNovo: e => this.salvarNovo(e),
        novoVoltaVis: !!pn.volta, novoVoltar: () => this.setState({ painel: pn.volta.painel, dF: pn.volta.dF }) });
    }
    if (pn.tipo === 'eventoForm' && st.eF) {
      const f = st.eF, setE = k => ev => { const v = ev.target.value; this.setState(s => ({ eF: Object.assign({}, s.eF, { [k]: v }), eErro: '' })); };
      return Object.assign(base, { painelTitulo: 'Calendário', pEvForm: true, ef: f, efTitulo: pn.id ? 'Editar evento' : 'Novo evento', optTipos: Object.keys(TIPOS).map(k => ({ v: k, l: TIPOS[k].label })),
        setETipo: setE('tipo'), setETitulo: setE('titulo'), setEData: setE('data'), setEFim: setE('fim'), setEHi: setE('hi'), setEHf: setE('hf'), setEDisc: setE('disc'), setEDesc: setE('desc'),
        quemOps: [[true, 'Todas as turmas'], [false, 'Turmas específicas']].map(([v, l]) => ({ label: l, on: f.todas === v, bg: f.todas === v ? 'var(--texto)' : 'transparent', cor: f.todas === v ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState(s => ({ eF: Object.assign({}, s.eF, { todas: v }), eErro: '' })) })),
        turmasVis: !f.todas, turmasOps: lerLoja().turmas.map(t => { const on = f.turmas.includes(t.id); return { label: t.nome, on, bg: on ? 'var(--texto)' : 'var(--superficie)', cor: on ? 'var(--fundo)' : 'var(--texto)', ir: () => this.setState(s => ({ eF: Object.assign({}, s.eF, { turmas: on ? s.eF.turmas.filter(x => x !== t.id) : s.eF.turmas.concat(t.id) }), eErro: '' })) }; }),
        optDiscE: st.discs.filter(d => f.todas || f.turmas.includes(d.turma)).map(d => ({ v: String(d.id), l: d.nome + ' · ' + nomeTurma(d.turma) })), eErro: st.eErro || st.erroG.evento || '', efBotao: this.sv('evento', 'Publicar no calendário'), efOff: !!st.salvando, efO: st.salvando === 'evento' ? 0.6 : 1, salvarEvento: ev => this.salvarEvento(ev) });
    }
    if (pn.tipo === 'disc' && st.dF) {
      const f = st.dF, errs = this.errosDisc(f, pn.id), set = k => e => { const v = e.target.value; if (v === '__nova') return this.abrirNovo(k === 'turma' ? 'turma' : 'sala', { painel: pn, dF: st.dF }); this.setDF(k, v); };
      const disc = st.discs.find(x => x.id === pn.id), c = disc ? this.carga(disc, st, fer, now.data, now.min) : null;
      return Object.assign(base, { painelTitulo: 'Disciplina', pDisc: true, df: f, dfTitulo: pn.id ? f.nome || 'Disciplina' : 'Nova disciplina', setDNome: set('nome'), setDTurma: set('turma'), setDProf: set('prof'), setDSala: set('sala'), setDCarga: set('carga'),
        optTurmas: [{ v: '', l: 'Sem turma' }].concat(lerLoja().turmas.map(t => ({ v: t.id, l: t.nome }))), optProfs: st.profs.map(p => ({ v: String(p.id), l: p.nome })), optSalas: [{ v: '', l: 'Sem sala' }].concat(lerLoja().salas.map(s => ({ v: s.id, l: s.nome })), this.props.soEditor ? [] : [{ v: '__nova', l: '+ Nova sala…' }]),
        dfCarga: c ? fmtH(c.feito) + ' cumpridas de ' + f.carga + ' h · a grade soma ' + fmtH(c.total) + ' no semestre' : '', dfTemCarga: !!c,
        dfLinhas: f.grade.map((r, i) => ({ n: String(i + 1), dia: r.dia, ini: r.ini, fim: r.fim, sala: r.sala || '', nota: errs[i] || 'Livre para o professor, a turma e a sala.', notaCor: errs[i] ? 'var(--aviso)' : 'var(--texto-suave)', borda: errs[i] ? 'var(--aviso)' : 'var(--borda)',
          setDia: e => this.setLinhaD(r.k, 'dia', e.target.value), setIni: e => this.setLinhaD(r.k, 'ini', e.target.value), setFim: e => this.setLinhaD(r.k, 'fim', e.target.value), setSala: e => { if (e.target.value === '__nova') return this.abrirNovo('sala', { painel: pn, dF: st.dF }); this.setLinhaD(r.k, 'sala', e.target.value); },
          remover: () => this.setState(s => ({ dF: Object.assign({}, s.dF, { grade: s.dF.grade.filter(x => x.k !== r.k) }), dErro: '', dOk: '' })), remLabel: 'Remover horário ' + (i + 1) })),
        dfSemLinhas: !f.grade.length, addLinhaD: () => this.setState(s => { const g = s.dF.grade, u = g[g.length - 1]; return { dF: Object.assign({}, s.dF, { grade: g.concat({ k: Date.now(), dia: u ? String(Math.min(5, +u.dia + 1)) : '1', ini: u ? u.ini : '08:00', fim: u ? u.fim : '09:40', sala: u ? u.sala : s.dF.sala }) }), dErro: '', dOk: '' }; }),
        dErro: st.dErro || st.erroG.disc || '', dOk: st.dOk, temDOk: !!st.dOk, salvarDisc: e => this.salvarDisc(e), dfBotao: this.sv('disc', 'Salvar disciplina'), dfOff: !!st.salvando, dfO: st.salvando === 'disc' ? 0.6 : 1 });
    }
    return base;
  }
}

export default criarDC('GradeAgenda', Template, GradeAgenda);
