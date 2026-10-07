// @ts-nocheck
import React from "react";

const ALUNOS0 = [
  { id: 1, nome: 'Ana Souza', mat: '2026001', idade: 20, media: 9.0, email: 'ana@escola.com', hist: '2026.1', turma: '1A' },
  { id: 2, nome: 'Bruno Lima', mat: '2026002', idade: 22, media: 6.0, email: 'bruno@escola.com', hist: '2026.1', turma: '1A' },
  { id: 3, nome: 'Carla Dias', mat: '2026003', idade: 19, media: 3.8, email: null, turma: '2A' },
  { id: 4, nome: 'Diego Alves', mat: '2026004', idade: 21, media: 8.5, email: 'diego@escola.com', turma: '2A' },
  { id: 5, nome: 'Eva Rocha', mat: '2026005', idade: 23, media: 6.3, email: null, turma: '3A' },
  { id: 6, nome: 'Fabio Neri', mat: '2026006', idade: 20, media: 4.8, email: null }
];
const TURMAS0 = [{ id: '1A', nome: '1º A' }, { id: '2A', nome: '2º A' }, { id: '3A', nome: '3º A' }];
const HOJE = '2026-10-06';

const pD = s => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
const sD = d => d.toISOString().slice(0, 10);
const addD = (s, n) => sD(new Date(pD(s).getTime() + n * 864e5));
const dsem = s => pD(s).getUTCDay() || 7;

const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : NaN; };

let AID = 1;
const gerarAulas = (d, de, ate) => {
  const r = [];
  for (let s = de; s <= ate; s = addD(s, 1)) { const w = dsem(s); (d.grade || []).forEach(h => { if (h.dia_semana === w) r.push({ aula_id: AID++, disciplina_id: d.id, data: s, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, status: 'agendada', origem: 'grade', chamada: null }); }); }
  return r;
};
const DISC0 = [
  { id: 1, nome: 'Python', carga_horaria: 40, professor_id: 1, turma: '1A', grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }, { dia_semana: 4, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 2, nome: 'Banco de Dados', carga_horaria: 60, professor_id: 1, turma: '2A', grade: [{ dia_semana: 2, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 3, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 3, nome: 'Algoritmos', carga_horaria: 80, professor_id: 2, turma: '1A', grade: [{ dia_semana: 3, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40' }] },
  { id: 4, nome: 'Redes', carga_horaria: 30, professor_id: null, turma: '3A', grade: [] }
];
const SEM0 = { id: 2, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null };

const PROFS0 = [{ id: 1, nome: 'Carlos Mendes', email: 'prof@escola.com', ocupados: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '12:00', motivo: 'Outra escola' }] }, { id: 2, nome: 'Marta Ribeiro', email: 'marta@escola.com' }, { id: 3, nome: 'Paulo Antunes', email: 'paulo@escola.com' }];

const AVISO = 'var(--aviso)', TINTA = 'var(--texto)';

const HIST0 = [{ id: 1, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01', resumo: [
  ['Lógica de Programação', 6, '7,2', '88%', 5, 1], ['Matemática Discreta', 6, '6,4', '81%', 4, 2], ['Introdução à Computação', 6, '7,8', '92%', 6, 0]
].map(r => ({ disc: r[0], alunos: String(r[1]), media: r[2], mediaCor: TINTA, freq: r[3], freqCor: TINTA, aprov: String(r[4]), reprov: String(r[5]), reprovCor: r[5] ? AVISO : TINTA })) }];

function seed() {
  const notas = {}, mats = {}, avals = [];
  const off = { 1: 0.3, 2: -0.3, 3: 0 };
  DISC0.forEach(d => avals.push({ id: d.id * 10 + 1, did: d.id, nome: 'P1', peso: 50 }, { id: d.id * 10 + 2, did: d.id, nome: 'P2', peso: 50 }));
  ALUNOS0.forEach(a => {
    [1, 2, 3].forEach(did => {
      mats[a.id + '-' + did] = true;
      const m = a.media + off[did];
      notas[a.id + '-' + (did * 10 + 1)] = Math.round((m - 0.5) * 10) / 10;
      notas[a.id + '-' + (did * 10 + 2)] = Math.round((m + 0.5) * 10) / 10;
    });
    if ([1, 2, 4, 5].includes(a.id)) mats[a.id + '-4'] = true;
  });
  let aulas = [];
  DISC0.forEach(d => { aulas = aulas.concat(gerarAulas(d, SEM0.inicio, SEM0.fim)); });
  aulas.sort((x, y) => x.data.localeCompare(y.data) || hm(x.hora_inicio) - hm(y.hora_inicio));
  const cont = {};
  aulas.forEach(au => {
    if (au.data === '2026-10-01' && au.disciplina_id === 3) return;
    if (!(au.data < HOJE || (au.data === HOJE && au.hora_inicio === '08:00'))) return;
    const i = cont[au.disciplina_id] = (cont[au.disciplina_id] ?? -1) + 1;
    au.chamada = {};
    ALUNOS0.forEach(a => { if (mats[a.id + '-' + au.disciplina_id]) au.chamada[a.id] = a.id === 3 ? i % 3 === 0 : a.id === 6 ? i % 4 !== 2 : true; });
  });
  aulas.forEach(au => { if (au.data === '2026-10-08' && au.disciplina_id === 3) au.status = 'cancelada'; });
  aulas.push({ aula_id: AID++, disciplina_id: 3, data: '2026-10-09', hora_inicio: '10:00', hora_fim: '11:40', status: 'agendada', origem: 'extra', chamada: null });
  return { notas, mats, avals, aulas };
}

export function estadoDemo(papel: 'escola' | 'prof' | 'aluno') {
  AID = 1;
  const usuario = papel === 'escola' ? { nome: 'Secretaria', email: 'escola@escola.com' }
    : papel === 'prof' ? PROFS0[0] : { nome: 'Ana Souza', email: 'ana@escola.com', aluno_id: 1 };
  return Object.assign(seed(), {
    alunos: ALUNOS0, turmas: TURMAS0, discs: DISC0, profs: PROFS0, semestre: SEM0, historico: HIST0,
    avisos: [
      { id: 3, titulo: 'Lista de grafos', data: '2026-10-02', msg: 'A lista 3 de grafos está no mural da sala. Entrega na aula de quinta.', disciplina_id: 3, autor_id: 2, autor_nome: 'Marta Ribeiro' },
      { id: 2, titulo: 'Prova de Python', data: '2026-09-28', msg: 'A P1 de Python será na aula de terça, 29/09. O conteúdo vai até funções e listas.', disciplina_id: 1, autor_id: 1, autor_nome: 'Carlos Mendes' },
      { id: 1, titulo: 'Bem-vindos ao semestre', data: '2026-09-20', msg: 'Confiram o calendário de aulas de cada disciplina e mantenham a frequência acima de 75%.', disciplina_id: null, autor_id: 'escola', autor_nome: 'Secretaria' }
    ],
    usuario, profId: papel === 'prof' ? 1 : null,
    selAluno: 1, selDisc: 1, notaDisc: 1, notaAval: 11
  });
}

const IA_SUG = ['Monte a grade das disciplinas que ainda estão sem horário.', 'O professor Carlos só pode de manhã. Reorganize as disciplinas dele.', 'Tem algum choque na grade atual?'];
const IA_ERROS = { 'Não configurado': 'O assistente não está configurado neste servidor.', 'Limite de uso': 'O assistente atingiu o limite de uso. Tente de novo em alguns minutos.', 'Sem conexão': 'Não consegui falar com o assistente. Tente de novo.' };
const IA_BASE = { iaMsgs: [], iaTexto: '', iaEnviando: false, iaErro: '', iaProposta: null, iaRecusados: [], iaAplicando: false, iaResultado: null, iaPropIdx: -1, iaDescartada: false, iaUltimo: '' };

const DIA_C = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIA_L = ["", "segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
const ddmm = s => s.slice(8, 10) + "/" + s.slice(5, 7);
class IADemo {
  iaChoques() {
    const st = this.state, r = [], faixa = o => DIA_L[o.dia_semana] + ', ' + o.hora_inicio + '–' + o.hora_fim;
    st.discs.forEach(d => { const pr = st.profs.find(p => p.id === d.professor_id); if (!pr) return;
      (d.grade || []).forEach(o => (pr.ocupados || []).forEach(x => { if (x.dia_semana === o.dia_semana && hm(o.hora_inicio) < hm(x.hora_fim) && hm(x.hora_inicio) < hm(o.hora_fim)) r.push({ d, t: d.nome + ' (' + faixa(o) + ') cai num horário ocupado de ' + pr.nome + (x.motivo ? ': ' + x.motivo : '') + '.' }); })); });
    st.discs.forEach((d, i) => st.discs.slice(i + 1).forEach(e => (d.grade || []).forEach(o => (e.grade || []).forEach(q => { if (o.dia_semana === q.dia_semana && hm(o.hora_inicio) < hm(q.hora_fim) && hm(q.hora_inicio) < hm(o.hora_fim)) r.push({ d: e, t: d.nome + ' e ' + e.nome + ' estão no mesmo horário (' + faixa(o) + ').' }); }))));
    return r;
  }
  iaPlanejar(alvos, soManha) {
    const st = this.state, SL = soManha ? [['08:00', '09:40'], ['10:00', '11:40']] : [['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10'], ['15:30', '17:10']];
    const ids = alvos.map(d => d.id), usados = [], proposta = [], recusados = [];
    st.discs.filter(d => !ids.includes(d.id)).forEach(d => (d.grade || []).forEach(o => usados.push({ dia: o.dia_semana, a: hm(o.hora_inicio), b: hm(o.hora_fim) })));
    alvos.forEach(d => {
      const pr = st.profs.find(p => p.id === d.professor_id);
      if (!pr) return recusados.push({ disciplina_id: d.id, disciplina_nome: d.nome, motivo: 'Está sem professor. Escolha um professor na disciplina antes de montar a grade.' });
      const oc = pr.ocupados || [], k = Math.max(2, (d.grade || []).length), itens = [];
      const livre = (dia, i0, f0) => { const a = hm(i0), b = hm(f0); return !usados.some(u => u.dia === dia && a < u.b && u.a < b) && !oc.some(o => o.dia_semana === dia && a < hm(o.hora_fim) && hm(o.hora_inicio) < b); };
      (d.grade || []).forEach(o => { if (itens.length < k && SL.some(x => x[0] === o.hora_inicio && x[1] === o.hora_fim) && !itens.some(x => x.dia_semana === o.dia_semana) && livre(o.dia_semana, o.hora_inicio, o.hora_fim)) itens.push({ dia_semana: o.dia_semana, hora_inicio: o.hora_inicio, hora_fim: o.hora_fim }); });
      for (const x of SL) for (let dia = 1; dia <= 5 && itens.length < k; dia++) { if (!itens.some(y => y.dia_semana === dia) && livre(dia, x[0], x[1])) itens.push({ dia_semana: dia, hora_inicio: x[0], hora_fim: x[1] }); }
      if (itens.length < k) return recusados.push({ disciplina_id: d.id, disciplina_nome: d.nome, motivo: oc.length ? 'Choca com um horário ocupado de ' + pr.nome + '.' : 'Não há horário livre na janela da escola' + (soManha ? ' de manhã.' : '.') });
      itens.sort((x, y) => x.dia_semana - y.dia_semana || hm(x.hora_inicio) - hm(y.hora_inicio));
      itens.forEach(x => usados.push({ dia: x.dia_semana, a: hm(x.hora_inicio), b: hm(x.hora_fim) }));
      proposta.push({ disciplina_id: d.id, disciplina_nome: d.nome, professor_nome: pr.nome, itens });
    });
    return { proposta, recusados };
  }
  iaResponder(texto) {
    const st = this.state, t = texto.toLowerCase(), lista = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
    const pm = st.profs.find(p => t.includes(p.nome.split(' ')[0].toLowerCase()));
    const fala = (r, intro) => { const pt = []; if (r.proposta.length) pt.push(intro(lista(r.proposta.map(p => p.disciplina_nome)))); if (r.recusados.length) pt.push(lista(r.recusados.map(p => p.disciplina_nome)) + (r.recusados.length === 1 ? ' não coube.' : ' não couberam.')); return pt.join(' ') + (r.proposta.length ? ' Confira e aplique.' : ''); };
    if (/choque|conflit/.test(t) && !/resolv|reorganiz|mont|corrij/.test(t)) {
      const c = this.iaChoques();
      if (!c.length) return { resposta: 'Não encontrei choques. Nenhuma aula cai em horário ocupado de professor, e nenhum horário tem duas disciplinas ao mesmo tempo.' };
      return { resposta: 'Encontrei ' + c.length + (c.length === 1 ? ' choque' : ' choques') + ':\n' + c.map(x => '· ' + x.t).join('\n') + '\n\nSe quiser, peça "Resolva os choques" e eu monto uma proposta.' };
    }
    if (pm && /manh/.test(t)) {
      const alvos = st.discs.filter(d => d.professor_id === pm.id); if (!alvos.length) return { resposta: pm.nome + ' não tem disciplinas neste semestre.' };
      const r = this.iaPlanejar(alvos, true);
      return Object.assign({ resposta: fala(r, n => 'Reorganizei ' + n + ' só de manhã, fora dos horários ocupados de ' + pm.nome + ' e sem choque com as outras disciplinas.') }, r);
    }
    if (/sem hor|mont|resolv|reorganiz|corrij/.test(t)) {
      const sem = st.discs.filter(d => !(d.grade || []).length), ch = /resolv|choque|corrij|reorganiz/.test(t) ? this.iaChoques().map(x => x.d) : [];
      const alvos = sem.concat(ch.filter((d, i, a) => a.indexOf(d) === i && !sem.includes(d)));
      if (!alvos.length) return { resposta: 'Todas as disciplinas já têm horário e não há choques. Nada a mudar.' };
      const r = this.iaPlanejar(alvos, false);
      return Object.assign({ resposta: fala(r, n => 'Encaixei ' + n + ' sem choque com a grade atual nem com os horários ocupados dos professores.') }, r);
    }
    return { resposta: 'Posso montar a grade das disciplinas sem horário, reorganizar as disciplinas de um professor (por exemplo, só de manhã) ou procurar choques na grade atual. Diga qual.' };
  }
  gerarParaDisc(d, grade, sem, aulas) {
    const id = d.id, de = HOJE > sem.inicio ? HOJE : sem.inicio, disc = Object.assign({}, d, { grade });
    const velhas = aulas.filter(a => a.disciplina_id === id);
    const fica = velhas.filter(a => a.origem === 'extra' || a.chamada || a.data < de || a.remarcada_de);
    const canc = velhas.filter(a => a.status === 'cancelada' && a.origem === 'grade' && !a.remarcada_de).map(a => a.data + a.hora_inicio);
    const novas = gerarAulas(disc, de, sem.fim).filter(a => !fica.some(x => (x.origem === 'grade' && x.data === a.data && x.hora_inicio === a.hora_inicio) || x.remarcada_de === a.data));
    novas.forEach(a => { if (canc.includes(a.data + a.hora_inicio)) a.status = 'cancelada'; });
    return { disc, aulas: aulas.filter(a => a.disciplina_id !== id).concat(fica, novas), n: novas.filter(a => a.status !== 'cancelada').length };
  }
  aplicarIA(imediato) {
    const st = this.state; if (!st.iaProposta || !st.iaProposta.length || st.iaAplicando || st.iaResultado) return;
    const fazer = () => {
      const S = this.state, sem = this.ativo();
      if (!sem) return this.setState({ iaAplicando: false, iaResultado: S.iaProposta.map(p => ({ disciplina_id: p.disciplina_id, ok: false, texto: 'Semestre encerrado: somente leitura.' })) });
      let discs = S.discs, aulas = S.aulas; const res = [];
      S.iaProposta.forEach(p => {
        const d = discs.find(x => x.id === p.disciplina_id); if (!d) return res.push({ disciplina_id: p.disciplina_id, ok: false, texto: p.disciplina_nome + ': a disciplina não existe mais.' });
        const errs = this.conflitoGrade(p.itens, d.id, d.professor_id, discs), k = errs.findIndex(Boolean);
        if (k >= 0) return res.push({ disciplina_id: d.id, ok: false, texto: p.disciplina_nome + ': ' + errs[k] });
        const r = this.gerarParaDisc(d, p.itens.map(x => Object.assign({}, x)), sem, aulas); discs = discs.map(x => x.id === d.id ? r.disc : x); aulas = r.aulas;
        res.push({ disciplina_id: d.id, ok: true, texto: p.disciplina_nome + ': ' + r.n + (r.n === 1 ? ' aula gerada' : ' aulas geradas') });
      });
      this.setState({ discs, aulas, iaAplicando: false, iaResultado: res }, () => this.iaRolar());
    };
    if (imediato === true) return fazer();
    this.setState({ iaAplicando: true }); clearTimeout(this.iaT2); this.iaT2 = setTimeout(fazer, this.rm ? 500 : 900);
  }
  iaEstadoAplicar(nome) {
    clearTimeout(this.iaT); clearTimeout(this.iaT2);
    const Q = 'Monte a grade das disciplinas que ainda estão sem horário e resolva os choques.';
    const conv = q => { const r = this.iaResponder(q); return { iaMsgs: [{ papel: 'usuario', texto: q }, { papel: 'ia', texto: r.resposta }], iaProposta: r.proposta || [], iaRecusados: r.recusados || [], iaPropIdx: 1, iaUltimo: q }; };
    const so = q => ({ iaMsgs: [{ papel: 'usuario', texto: q }], iaUltimo: q });
    const E = { 'Vazio': {}, 'Enviando': Object.assign(so(Q), { iaEnviando: true }),
      'Só texto': (() => { const q = IA_SUG[2]; return { iaMsgs: [{ papel: 'usuario', texto: q }, { papel: 'ia', texto: this.iaResponder(q).resposta }], iaUltimo: q }; })(),
      'Com proposta': conv(IA_SUG[1]), 'Com "Não coube"': conv(Q), 'Aplicando': Object.assign(conv(Q), { iaAplicando: true }), 'Aplicada': conv(Q),
      'Erro: não configurado': Object.assign(so(Q), { iaErro: IA_ERROS['Não configurado'] }), 'Erro: limite de uso': Object.assign(so(Q), { iaErro: IA_ERROS['Limite de uso'] }), 'Erro: sem conexão': Object.assign(so(Q), { iaErro: IA_ERROS['Sem conexão'] }) }[nome] || {};
    this.setState({ tela: 'disciplinas' });
    this.abrirIA(Object.assign({}, IA_BASE, E));
    if (nome === 'Aplicada') setTimeout(() => this.aplicarIA(true), 0);
  }
}
export function aplicarIADemo(portal, nome) {
  const demo = Object.create(portal);
  for (const n of Object.getOwnPropertyNames(IADemo.prototype)) if (n !== "constructor") demo[n] = IADemo.prototype[n];
  demo.iaEstadoAplicar(nome);
}

const SEM_GRADE = { nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11' };
const ANO_GRADE = { inicio: '2026-02-02', fim: '2026-12-11' };
const SLOTS = [['08:00', '09:40'], ['10:00', '11:40'], ['13:30', '15:10'], ['15:30', '17:10']];
const JAN = [480, 1030], G0 = 470, G1 = 1040, PX = 1.05;
const PROF_DEMO = 1, TURMA_DEMO = '1A';
const TURMAS = [{ id: '1A', nome: '1º A' }, { id: '2A', nome: '2º A' }, { id: '3A', nome: '3º A' }];
const SALAS = [{ id: '101', nome: 'Sala 101' }, { id: '102', nome: 'Sala 102' }, { id: 'lab', nome: 'Lab. de Informática' }, { id: 'aud', nome: 'Auditório' }];
const nomeTurma = id => (TURMAS.find(t => t.id === id) || {}).nome || id;
const nomeSala = id => (SALAS.find(t => t.id === id) || {}).nome || id || '—';
const gr = (dia, i, sala) => ({ dia_semana: dia, hora_inicio: SLOTS[i][0], hora_fim: SLOTS[i][1], sala });
const DISCS_GRADE = [
  { id: 1, nome: 'Python', sigla: 'PY', turma: '1A', prof: 1, sala: 'lab', carga: 60, grade: [gr(2, 0, 'lab'), gr(4, 0, 'lab')] },
  { id: 2, nome: 'Banco de Dados', sigla: 'BD', turma: '2A', prof: 1, sala: 'lab', carga: 60, grade: [gr(3, 0, 'lab'), gr(4, 1, 'lab')] },
  { id: 3, nome: 'Algoritmos', sigla: 'ALG', turma: '1A', prof: 2, sala: '101', carga: 60, grade: [gr(1, 0, '101'), gr(3, 1, '101')] },
  { id: 4, nome: 'Matemática Discreta', sigla: 'MD', turma: '2A', prof: 2, sala: '102', carga: 60, grade: [gr(1, 1, '102'), gr(5, 0, '102')] },
  { id: 5, nome: 'Redes', sigla: 'RED', turma: '3A', prof: 3, sala: 'lab', carga: 60, grade: [gr(2, 2, 'lab'), gr(4, 2, 'lab')] },
  { id: 6, nome: 'Engenharia de Software', sigla: 'ES', turma: '3A', prof: 4, sala: '101', carga: 60, grade: [gr(1, 2, '101'), gr(3, 2, '101')] },
  { id: 7, nome: 'Estatística', sigla: 'EST', turma: '1A', prof: 4, sala: '102', carga: 40, grade: [gr(2, 1, '102'), gr(5, 0, '102')] },
  { id: 8, nome: 'Sistemas Operacionais', sigla: 'SO', turma: '3A', prof: 3, sala: 'lab', carga: 60, grade: [gr(3, 3, 'lab'), gr(5, 1, 'lab')] },
  { id: 9, nome: 'Inglês Técnico', sigla: 'ING', turma: '2A', prof: 4, sala: '101', carga: 40, grade: [] }
];
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
let EID = 100;
const ev = (tipo, titulo, data, o) => Object.assign({ id: EID++, tipo, titulo, data, fim: '', hi: '', hf: '', turmas: 'todas', disc: null, desc: '' }, o || {});
const EV0 = [
  ev('bimestre', 'Início do 1º bimestre', '2026-02-02'), ev('bimestre', 'Fim do 1º bimestre', '2026-04-17'), ev('bimestre', 'Início do 2º bimestre', '2026-04-20'), ev('bimestre', 'Fim do 2º bimestre', '2026-07-03'),
  ev('bimestre', 'Início do 3º bimestre', '2026-08-03'), ev('bimestre', 'Fim do 3º bimestre', '2026-10-02'), ev('bimestre', 'Início do 4º bimestre', '2026-10-05'), ev('bimestre', 'Fim do ano letivo', '2026-12-11'),
  ev('feriado', 'Carnaval', '2026-02-16', { fim: '2026-02-18' }), ev('feriado', 'Sexta-feira Santa', '2026-04-03'), ev('feriado', 'Tiradentes', '2026-04-21'), ev('feriado', 'Dia do Trabalho', '2026-05-01'),
  ev('feriado', 'Corpus Christi', '2026-06-04'), ev('feriado', 'Recesso escolar', '2026-07-06', { fim: '2026-07-31' }), ev('feriado', 'Independência', '2026-09-07'), ev('feriado', 'Nossa Senhora Aparecida', '2026-10-12'),
  ev('feriado', 'Finados', '2026-11-02'), ev('feriado', 'Consciência Negra', '2026-11-20'),
  ev('prova', 'P2 de Python', '2026-10-13', { hi: '08:00', hf: '09:40', turmas: ['1A'], disc: 1, desc: 'Conteúdo: funções, listas e dicionários.' }),
  ev('prova', 'P2 de Algoritmos', '2026-10-14', { hi: '10:00', hf: '11:40', turmas: ['1A'], disc: 3 }),
  ev('prova', 'P2 de Banco de Dados', '2026-10-21', { hi: '08:00', hf: '09:40', turmas: ['2A'], disc: 2 }),
  ev('prova', 'P2 de Redes', '2026-10-20', { hi: '13:30', hf: '15:10', turmas: ['3A'], disc: 5 }),
  ev('prova', 'Semana de provas finais', '2026-11-30', { fim: '2026-12-04', desc: 'Calendário por turma publicado até 20/11.' }),
  ev('entrega', 'Projeto de Engenharia de Software', '2026-10-09', { turmas: ['3A'], disc: 6, desc: 'Entrega do protótipo e do relatório.' }),
  ev('entrega', 'Lista 3 de Matemática Discreta', '2026-10-27', { turmas: ['2A'], disc: 4 }),
  ev('gincana', 'Gincana de primavera', '2026-10-24', { hi: '08:00', hf: '12:00', desc: 'Equipes por turma. Arrecadação de alimentos.' }),
  ev('evento', 'Feira de ciências', '2026-10-16', { hi: '13:30', hf: '17:10' }), ev('evento', 'Mostra de projetos', '2026-09-19'),
  ev('evento', 'Formatura', '2026-12-12', { hi: '19:00', hf: '22:00', turmas: ['3A'] }),
  ev('reuniao', 'Reunião de pais do 3º bimestre', '2026-10-17', { hi: '09:00', hf: '11:00' }),
  ev('conselho', 'Conselho de classe do 3º bimestre', '2026-10-06', { hi: '17:30', hf: '19:00' })
];
const PED0 = [
  { id: 1, prof: 1, disc: 1, data: '2026-10-09', ini: '10:00', fim: '11:40', sala: 'lab', motivo: 'Revisão para a P2 de Python.', status: 'pendente', resposta: '', sug: null },
  { id: 2, prof: 2, disc: 3, data: '2026-10-08', ini: '13:30', fim: '15:10', sala: '101', motivo: 'Reposição da aula do feriado de 12/10.', status: 'pendente', resposta: '', sug: null },
  { id: 3, prof: 4, disc: 6, data: '2026-09-30', ini: '15:30', fim: '17:10', sala: '101', motivo: 'Apresentação dos projetos.', status: 'aprovada', resposta: '', sug: null },
  { id: 4, prof: 3, disc: 5, data: '2026-09-25', ini: '08:00', fim: '09:40', sala: 'aud', motivo: 'Palestra convidada.', status: 'recusada', resposta: 'O auditório está reservado para a Mostra nesse dia.', sug: null }
];


// Estado da Grade e agenda na demonstração. As disciplinas e os professores do store são os do Portal (o canvas passa o `base` do
// Portal à GradeAgenda); os dados próprios da GradeAgenda (discsGrade, pedidosGrade) só entram nos estados `estado` do canvas.
// Eventos e pedidos seguem o sincBase do canvas: os ids de disciplina da GradeAgenda viram os do Portal pelo nome (ou null).
export function estadoGradeDemo(discsPortal = []) {
  const mapa = {};
  DISCS_GRADE.forEach(g => { const p = discsPortal.find(d => d.nome.trim().toLowerCase() === g.nome.trim().toLowerCase()); mapa[g.id] = p ? p.id : null; });
  return { semestre: SEM_GRADE, ano: ANO_GRADE, profDemo: PROF_DEMO, turmaDemo: TURMA_DEMO,
    discsGrade: DISCS_GRADE, pedidosGrade: PED0.map(p => ({ ...p, aula_id: null })),
    aulas: [], turmas: TURMAS, salas: SALAS,
    eventos: EV0.map(e => e.disc == null ? e : { ...e, disc: mapa[e.disc] }),
    pedidos: PED0.filter(p => mapa[p.disc] != null).map(p => ({ ...p, aula_id: null, disc: mapa[p.disc], prof: (discsPortal.find(d => d.id === mapa[p.disc]) || {}).professor_id || p.prof })),
    iaSugGrade: 'O professor Carlos só pode de manhã. Reorganize as aulas dele.' };
}
