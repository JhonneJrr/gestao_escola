// @ts-nocheck
import React from "react";
import { DCLogic, criarDC } from "./dc";
import Template from "./template";

const ALUNOS0 = [
  { id: 1, nome: 'Ana Souza', mat: '2026001', idade: 20, media: 9.0, email: 'ana@escola.com', hist: '2026.1' },
  { id: 2, nome: 'Bruno Lima', mat: '2026002', idade: 22, media: 6.0, email: 'bruno@escola.com', hist: '2026.1' },
  { id: 3, nome: 'Carla Dias', mat: '2026003', idade: 19, media: 3.8, email: null },
  { id: 4, nome: 'Diego Alves', mat: '2026004', idade: 21, media: 8.5, email: 'diego@escola.com' },
  { id: 5, nome: 'Eva Rocha', mat: '2026005', idade: 23, media: 6.3, email: null },
  { id: 6, nome: 'Fabio Neri', mat: '2026006', idade: 20, media: 4.8, email: null }
];
const HOJE = '2026-10-06';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIA_C = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIA_L = ['', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
const pD = s => { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); };
const sD = d => d.toISOString().slice(0, 10);
const addD = (s, n) => sD(new Date(pD(s).getTime() + n * 864e5));
const dsem = s => pD(s).getUTCDay() || 7;
const ddmm = s => s.slice(8, 10) + '/' + s.slice(5, 7);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const hm = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : NaN; };
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const gradeTxt = (g, curto) => {
  if (!g || !g.length) return 'Sem grade definida';
  const grupos = {};
  g.slice().sort((a, b) => a.dia_semana - b.dia_semana || hm(a.hora_inicio) - hm(b.hora_inicio)).forEach(h => { const k = curto ? h.hora_inicio : h.hora_inicio + '–' + h.hora_fim; (grupos[k] = grupos[k] || []).push(DIA_C[h.dia_semana]); });
  return Object.keys(grupos).map(k => { const d = grupos[k].filter((x, i, a) => a.indexOf(x) === i); return (d.length > 1 ? d.slice(0, -1).join(', ') + ' e ' + d[d.length - 1] : d[0]) + ' · ' + k; }).join(' / ');
};
let AID = 1;
const gerarAulas = (d, de, ate) => {
  const r = [];
  for (let s = de; s <= ate; s = addD(s, 1)) { const w = dsem(s); (d.grade || []).forEach(h => { if (h.dia_semana === w) r.push({ aula_id: AID++, disciplina_id: d.id, data: s, hora_inicio: h.hora_inicio, hora_fim: h.hora_fim, status: 'agendada', origem: 'grade', chamada: null }); }); }
  return r;
};
const DISC0 = [
  { id: 1, nome: 'Python', carga_horaria: 40, professor_id: 1, grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }, { dia_semana: 4, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 2, nome: 'Banco de Dados', carga_horaria: 60, professor_id: 1, grade: [{ dia_semana: 2, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 3, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 3, nome: 'Algoritmos', carga_horaria: 80, professor_id: 2, grade: [{ dia_semana: 3, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40' }] },
  { id: 4, nome: 'Redes', carga_horaria: 30, professor_id: null, grade: [] }
];
const SEM0 = { id: 2, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null };
const TELAS_POR = {
  escola: [{ id: 'painel', label: 'Painel' }, { id: 'semestre', label: 'Semestre' }, { id: 'disciplinas', label: 'Disciplinas' }, { id: 'professores', label: 'Professores' }, { id: 'alunos', label: 'Alunos' }, { id: 'boletim', label: 'Matrículas' }, { id: 'frequencia', label: 'Agenda' }, { id: 'avisos', label: 'Avisos' }],
  prof: [{ id: 'painel', label: 'Painel' }, { id: 'frequencia', label: 'Agenda' }, { id: 'disciplinas', label: 'Minhas disciplinas' }, { id: 'alunos', label: 'Meus alunos' }, { id: 'avisos', label: 'Avisos' }],
  aluno: []
};
const TELAS = TELAS_POR.escola;
const PROFS0 = [{ id: 1, nome: 'Carlos Mendes', email: 'prof@escola.com' }, { id: 2, nome: 'Marta Ribeiro', email: 'marta@escola.com' }, { id: 3, nome: 'Paulo Antunes', email: 'paulo@escola.com' }];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EXTRAS = 'Gabriel Costa,Helena Martins,Igor Pereira,Julia Ramos,Kaique Santos,Larissa Melo,Mateus Freitas,Natália Cunha,Otávio Barros,Paula Teixeira,Rafael Moura,Sofia Carvalho,Tiago Nunes,Valéria Pinto,Wagner Azevedo,Yasmin Duarte,Breno Farias,Cecília Rocha,Danilo Prado,Elisa Campos,Felipe Araújo,Giovana Lopes,Heitor Vieira,Isadora Reis,João Batista,Lívia Monteiro,Marcelo Dantas,Nina Albuquerque'.split(',');
const MOLAS = { fast: { k: 1500, z: 1 }, moderate: { k: 620, z: 0.82 }, slow: { k: 320, z: 0.78 } };
const fmt = n => n.toFixed(1).replace('.', ',');
const pct = f => Math.round(f * 100) + '%';
const ini = n => n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
const br = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
const AVISO = 'var(--aviso)', TINTA = 'var(--texto)';
const FUNCOES = [
  { nome: 'Agenda e chamada', curto: 'As aulas do dia, por horário', titulo: 'A chamada sai da agenda do dia.', desc: 'A grade semanal de cada disciplina gera as aulas do semestre. Toda manhã a agenda mostra as aulas de hoje, de todas as disciplinas, com o status de cada uma: agendada, chamada feita ou cancelada.',
    passos: ['Abra a aula de hoje na agenda.', 'Toque em Todos presentes e marque só quem faltou.', 'Salve. A frequência de cada aluno recalcula na hora.'],
    prof: 'Cancela, remarca ou cria uma aula extra pelo menu de cada aula. O calendário do mês mostra um ponto por aula.', aluno: 'Vê a própria frequência por disciplina, com aviso em marrom abaixo de 75%.' },
  { nome: 'Notas e boletim', curto: 'Média ponderada, sem calculadora', titulo: 'Lance a nota. A média se calcula sozinha.', desc: 'Cada disciplina tem avaliações com peso, que somam 100. Ao lançar uma nota, a média ponderada do aluno recalcula; enquanto falta alguma avaliação, a média aparece como parcial.',
    passos: ['Crie as avaliações da disciplina e os pesos.', 'Escolha o aluno e lance a nota de 0 a 10.', 'Errou? O × limpa a nota e ela volta para —.'],
    prof: 'Exporta o boletim de cada aluno em CSV e vê, no painel, quais avaliações ainda estão sem nota.', aluno: 'Vê cada nota assim que é lançada, sem precisar perguntar.' },
  { nome: 'Painel de risco', curto: 'Quem precisa de atenção, primeiro', titulo: 'Quem precisa de atenção aparece primeiro.', desc: 'O painel junta média e frequência de todas as disciplinas e coloca no topo quem está abaixo de 6 ou de 75%, com o motivo escrito ao lado do nome. Não é preciso montar filtro.',
    passos: ['Entre no portal: o painel é a primeira tela.', 'Leia o motivo ao lado de cada nome.', 'Toque no aluno para abrir o detalhe e agir.'],
    prof: 'Também vê o ranking da turma e a média e a frequência gerais, com o mínimo marcado.', aluno: 'Vê a própria situação no topo do painel: aprovado, em risco ou sem dados.' },
  { nome: 'Disciplinas e grade', curto: 'Horários da semana, aulas geradas', titulo: 'Defina a grade uma vez. As aulas aparecem até o fim do semestre.', desc: 'Cada disciplina tem nome, carga horária e uma grade semanal: dia, início e fim. Ao salvar, o portal gera as aulas do semestre e avisa se um horário bate com outra disciplina.',
    passos: ['Crie a disciplina com nome e carga horária.', 'Adicione os horários da semana.', 'Salve: o portal mostra quantas aulas gerou.'],
    prof: 'Matricula e desmatricula alunos na mesma tela e exporta a frequência da turma.', aluno: 'Vê as próximas aulas no próprio painel, só para leitura.' },
  { nome: 'Avisos', curto: 'Um mural, não três grupos', titulo: 'Um mural, não três grupos de mensagem.', desc: 'Publique uma vez e o aviso entra no topo do mural da turma e no painel de cada aluno, do mais novo ao mais antigo. A busca por título acha qualquer aviso antigo.',
    passos: ['Escreva título, data e mensagem.', 'Publique.', 'Edite ou exclua quando precisar.'],
    prof: 'Corrige uma data sem precisar mandar outra mensagem.', aluno: 'Acha a data da prova sem rolar conversa antiga.' },
  { nome: 'Semestre', curto: 'Abre, roda, encerra e fica guardado', titulo: 'O semestre fecha e fica guardado.', desc: 'Só um semestre fica ativo, e tudo pertence a ele: disciplinas, aulas, notas e chamadas. Ao encerrar, notas e chamadas congelam e o resumo por disciplina vai para o histórico.',
    passos: ['Abra o semestre com nome, início e fim.', 'Trabalhe nele o período todo.', 'Encerre: o resumo vai para o histórico, só leitura.'],
    prof: 'Antes de encerrar, vê o resumo: alunos, média, frequência, aprovados e reprovados.', aluno: 'Continua vendo as notas do semestre encerrado, sem nada mudar depois.' },
  { nome: 'Acesso do aluno', curto: 'Senha provisória, troca no 1º acesso', titulo: 'O acesso do aluno nasce com o cadastro.', desc: 'Ao cadastrar o aluno com um e-mail, o portal gera uma senha provisória e mostra uma única vez. No primeiro acesso, o aluno cria a própria senha antes de entrar.',
    passos: ['Cadastre o aluno com o e-mail da escola.', 'Entregue a senha provisória, que aparece uma vez só.', 'No primeiro acesso, ele troca a senha e entra.'],
    prof: 'Redefine a senha quando o aluno esquece, pelo painel do aluno.', aluno: 'Troca a própria senha quando quiser, pelo menu do avatar.' }
];
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
function molaLinear(k, z, ms) {
  const w = Math.sqrt(k), pts = [], N = 40;
  for (let i = 0; i <= N; i++) {
    const t = ms / 1000 * i / N; let x;
    if (z < 1) { const wd = w * Math.sqrt(1 - z * z); x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z * w / wd * Math.sin(wd * t)); }
    else x = 1 - Math.exp(-w * t) * (1 + w * t);
    pts.push(+x.toFixed(4));
  }
  pts[N] = 1;
  return 'linear(' + pts.join(',') + ')';
}

class Component extends DCLogic {
  frameRef = React.createRef();
  mainRef = React.createRef();
  subRef = React.createRef();
  setSub(id) { if (id === this.state.subAba) return; this.setState({ subAba: id, gnMsg: null }, () => { const el = this.subRef.current; if (el && el.animate) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: this.rm ? 100 : 160, easing: 'linear' }); }); }
  notaOk(t) { const x = String(t).trim(), n = parseFloat(x.replace(',', '.')); return /^\d{1,2}([.,]\d)?$/.test(x) && n >= 0 && n <= 10; }
  salvarNotaGrade(key, an, vn) {
    const d = (this.state.gnDraft || {})[key]; if (d == null) return;
    const limpa = () => { const g = Object.assign({}, this.state.gnDraft); delete g[key]; return g; };
    if (String(d).trim() === '') return this.setState({ gnDraft: limpa() });
    if (!this.notaOk(d)) return this.setState({ gnMsg: { erro: true, t: 'Nota de ' + an + ' em ' + vn + ': use um valor de 0 a 10, com até uma casa decimal.' } });
    const n = Math.round(parseFloat(String(d).replace(',', '.')) * 10) / 10;
    this.setState(s => ({ notas: Object.assign({}, s.notas, { [key]: n }), gnDraft: limpa(), gnMsg: { erro: false, t: 'Nota de ' + an + ' em ' + vn + ': ' + fmt(n) + '.' } }));
  }
  telas() { return TELAS_POR[this.state.papel] || TELAS_POR.escola; }
  escopo(S, pid) {
    const ids = new Set(S.discs.filter(d => d.professor_id === pid).map(d => d.id)), mats = {};
    Object.keys(S.mats).forEach(k => { if (S.mats[k] && ids.has(+k.split('-')[1])) mats[k] = true; });
    const al = new Set(Object.keys(mats).map(k => +k.split('-')[0]));
    return Object.assign({}, S, { discs: S.discs.filter(d => ids.has(d.id)), aulas: S.aulas.filter(a => ids.has(a.disciplina_id)), avals: S.avals.filter(a => ids.has(a.did)), mats, alunos: S.alunos.filter(a => al.has(a.id)), avisos: S.avisos.filter(a => !a.disciplina_id || ids.has(a.disciplina_id)) });
  }
  state = Object.assign(seed(), {
    logado: false, papel: null, tela: 'inicio', papelEscolhido: 'prof', faqAberta: 0, loginEmail: '', loginSenha: '', loginErro: '',
    funcSel: 0, navAberta: false, profs: PROFS0, profId: null, discProfF: '', fProf: '', matDisc: '', agProfF: '', agDiscF: '', agErro: '', avDestino: '', subAba: 'alunos', gnDraft: {}, gnMsg: null, semPerm: null, rotaAviso: '', alunoErro: '', alunos: ALUNOS0, discs: DISC0, semestre: SEM0, historico: HIST0,
    avisos: [
      { id: 3, titulo: 'Lista de grafos', data: '2026-10-02', msg: 'A lista 3 de grafos está no mural da sala. Entrega na aula de quinta.', disciplina_id: 3, autor_id: 2, autor_nome: 'Marta Ribeiro' },
      { id: 2, titulo: 'Prova de Python', data: '2026-09-28', msg: 'A P1 de Python será na aula de terça, 29/09. O conteúdo vai até funções e listas.', disciplina_id: 1, autor_id: 1, autor_nome: 'Carlos Mendes' },
      { id: 1, titulo: 'Bem-vindos ao semestre', data: '2026-09-20', msg: 'Confiram o calendário de aulas de cada disciplina e mantenham a frequência acima de 75%.', disciplina_id: null, autor_id: 'escola', autor_nome: 'Secretaria' }
    ],
    q: '', idadeMin: '', mediaMin: '', ordem: 'nome', pagina: 1,
    painel: null, painelUlt: null, fNome: '', fIdade: '', fMat: '', fErro: '',
    fEmail: '', fOk: '', fGrade: [], fData: '', fIni: '', fFim: '', fDisc: '', fTexto: '', editando: false, senhaProv: null, confDesm: null, desmErro: null,
    cham: {}, chamErro: '', sAtual: '', sNova: '', sConf: '', senhaOk: false, menuUser: false, menuAula: null, limpar: null, exportando: null, exportOk: null,
    semConfirm: false, semMsg: '', nsNome: '', nsInicio: '', nsFim: '', nsErro: '',
    discQ: '', selAluno: 1, selDisc: 1, matAluno: '', matMsg: null,
    notaDisc: 1, notaAval: 11, notaValor: '', notaMsg: null, avalNome: '', avalPeso: '', avalMsg: null,
    agDia: HOJE, agMes: HOJE.slice(0, 7),
    avisoQ: '', avisoPagina: 1, avTitulo: '', avData: '2026-10-05', avMsg: '', avErro: '',
    largura: 1280
  });

  componentDidMount() {
    this.aplicarMovimento();
    this.aplicarFonte();
    this.aplicarInicio();
    this.anims = new Map();
    const f = this.frameRef.current;
    f.addEventListener('pointermove', this.onMove);
    f.addEventListener('pointerleave', () => this.esconder());
    f.addEventListener('pointerdown', () => { this.kb = false; });
    f.addEventListener('pointerdown', this.fecharMenus);
    f.addEventListener('click', this.onGapClick);
    f.addEventListener('keydown', this.onKey);
    f.addEventListener('focusin', this.onFocus);
    document.addEventListener('keydown', this.onGlobalKey);
    this.ro = new ResizeObserver(es => { const w = es[0].contentRect.width, h = es[0].contentRect.height; if (Math.abs(w - this.state.largura) > 2 || Math.abs(h - (this.state.altura || 0)) > 2) this.setState({ largura: w, altura: h, funcNaoCabe: false }); this.syncSel(); this.calcFunc(); });
    if (this.mainRef.current) this.mainRef.current.addEventListener('scroll', this.onScrollFunc, { passive: true });
    this.kickF();
    this.revelar();
    this.ro.observe(f);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => this.syncSel());
  }
  componentWillUnmount() { document.removeEventListener('keydown', this.onGlobalKey); this.ro && this.ro.disconnect(); this.selRO && this.selRO.disconnect(); window.removeEventListener('resize', this.resync); }
  aplicarFonte() {
    const f = this.props.fonte ?? 'Apple · SF + New York', de = document.documentElement.style;
    const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif';
    const NY = 'ui-serif, "New York", "Iowan Old Style", Georgia, serif';
    if (f === 'Portal') { de.removeProperty('--fonte-corpo'); de.removeProperty('--fonte-titulo'); }
    else { de.setProperty('--fonte-corpo', SF); de.setProperty('--fonte-titulo', f === 'Apple · SF + New York' ? NY : SF); }
    document.body.style.fontFamily = f === 'Portal' ? '' : SF;
    if (this.ringCtl && this.ringCtl.limparFonte) this.ringCtl.limparFonte();
  }
  aplicarMovimento() {
    const m = this.props.movimento ?? 'Seguir o sistema';
    this.rm = m === 'Completo' ? false : m === 'Reduzido' ? true : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const de = document.documentElement.style;
    de.setProperty('--mola-moderada', this.rm ? 'linear' : molaLinear(620, 0.82, 300));
    de.setProperty('--mola-lenta', this.rm ? 'linear' : molaLinear(320, 0.78, 420));
  }
  componentDidUpdate(pp) {
    if (pp.fonte !== this.props.fonte) this.aplicarFonte();
    if (pp.movimento !== this.props.movimento) { this.aplicarMovimento(); this.forceUpdate(); }
    if (pp.inicio !== this.props.inicio) this.aplicarInicio();
    const st = this.state;
    if (!st.logado && st.tela === 'login' && !st.mg && !this.mgPend) { this.mgPend = true; requestAnimationFrame(() => { this.mgPend = false; const s2 = this.state; if (!s2.logado && s2.tela === 'login' && !s2.mg) this.abrirMergulho(null, null, true); }); }
    requestAnimationFrame(() => { this.syncSel(); this.revelar(); this.calcFunc(); });
  }
  aplicarInicio() {
    const i = this.props.inicio ?? 'Apresentação';
    if (i === 'Primeiro acesso') return this.setState({ logado: false, papel: null, tela: 'primeiro-acesso', painel: null, sNova: '', sConf: '', fErro: '' });
    if (i === 'Apresentação') this.setState({ logado: false, papel: null, tela: 'inicio', painel: null });
    else if (i === 'Login') this.setState({ logado: false, papel: null, tela: 'login', painel: null });
    else if (i === 'Professor') this.entrarComo('prof', 1);
    else if (i === 'Professor · sem permissão') { this.entrarComo('prof', 1); this.setState({ tela: 'disciplinas', semPerm: 3 }); }
    else this.entrarComo(i === 'Aluno' ? 'aluno' : 'escola');
  }
  preCarregar(papel) {
    // ponto de integração: aqui entram as requisições reais (turmas, notas, avisos) do usuário
    return new Promise(r => setTimeout(r, 450));
  }
  entrarAnimado(papel) {
    const ctl = this.ringCtl, mg = this.state.mg;
    if (!ctl || !mg || this.state.saindo) return this.entrarComo(papel);
    this.limparMg();
    const dados = this.preCarregar(papel), sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    this.animarCartao(false);
    this.setState({ saindo: true, mg: { ...mg, fase: 'entrando' } });
    if (document.activeElement) document.activeElement.blur();
    const cx = mg.W / 2, cy = mg.H / 2, Z0 = 1.3, LN = Math.log(10);
    const carregar = () => {
      ctl.esc = null; let pronto = false, fim = 0;
      dados.then(() => { pronto = true; });
      ctl.dive = { dur: 1e9, passo: (t, dt) => {
        const el = t * 1e9 / 1000;
        if (!fim && pronto && el > (this.rm ? 0.6 : 1.1)) fim = el;
        const fd = fim ? (el - fim) / 0.24 : 0;
        ctl.escrever(el, dt, fd > 0 ? fd * 0.35 : 0);
        if (fim && fd >= 1) { ctl.dive = null; this.revelarApp(papel); }
      } };
    };
    if (this.rm) return carregar();
    ctl.kick(2);
    ctl.dive = { dur: 820, passo: (t, dt) => {
      const k = Math.pow(t, 1.7), Z = Z0 * Math.exp(LN * k);
      ctl.draw(dt, { cx, cy, z: Z, a: 1 - sm(0.4, 0.95, k), dz: Z / Z0, escalar: true, cull: [0, 0, mg.W, mg.H] });
      if (t >= 1) { ctl.dive = null; carregar(); }
    } };
  }
  revelarApp(papel) {
    this.setState({ veu: true, saindo: false }, () => {
      this.entrarComo(papel);
      requestAnimationFrame(() => {
        const v = this.veuRef.current;
        if (!v || !v.animate) return this.setState({ veu: false });
        const a = v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: this.rm ? 200 : 420, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
        a.onfinish = () => this.setState({ veu: false });
      });
    });
  }
  veuRef = React.createRef();
  entrarComo(papel, profId) { this.limparMg(); this.setState({ mg: null, logado: true, papel, profId: papel === 'prof' ? (profId || this.state.profId || 1) : null, semPerm: null, rotaAviso: '', subAba: 'alunos', selDisc: papel === 'prof' ? ((this.state.discs.find(d => d.professor_id === (profId || this.state.profId || 1)) || {}).id || this.state.selDisc) : this.state.selDisc, tela: papel === 'aluno' ? 'meu-painel' : 'painel', loginErro: '', painel: null }); }

  // ---------- Fluid engine ----------
  anim(g, kind) {
    const key = kind === 'hov' ? '_fh' : '_fs';
    if (g[key] && g[key].el.isConnected) return g[key];
    const el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    const bg = kind === 'hov' ? (g.dataset.hl === 'dark' ? 'var(--texto-suave)' : 'var(--sunken)') : 'var(--texto)';
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', width: '0px', height: '0px', boxSizing: 'border-box', pointerEvents: 'none', zIndex: kind === 'hov' ? '-2' : '-1', opacity: '0', background: bg });
    if (getComputedStyle(g).position === 'static') g.style.position = 'relative';
    g.style.isolation = 'isolate';
    g.insertBefore(el, g.firstChild);
    const sp = v => ({ x: v, v: 0, t: v });
    const a = { el, s: { x: sp(0), y: sp(0), w: sp(0), h: sp(0) }, o: { x: 0, t: 0, dur: 80 }, tier: 'fast', placed: false };
    g[key] = a; this.anims.set(el, a);
    return a;
  }
  caixa(g, it) {
    const gr = g.getBoundingClientRect(), r = it.getBoundingClientRect();
    const sx = g.offsetWidth ? gr.width / g.offsetWidth || 1 : 1, sy = g.offsetHeight ? gr.height / g.offsetHeight || 1 : 1;
    return { x: (r.left - gr.left) / sx - g.clientLeft + g.scrollLeft, y: (r.top - gr.top) / sy - g.clientTop + g.scrollTop, w: r.width / sx, h: r.height / sy };
  }
  alvo(a, b, tier, snap) {
    a.tier = tier;
    for (const k of ['x', 'y', 'w', 'h']) { const s = a.s[k]; s.t = b[k]; if (snap || this.rm) { s.x = s.t; s.v = 0; } }
    this.kick();
  }
  kick() { if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); } }
  tick = now => {
    const dt = Math.min(0.032, (now - this.last) / 1000); this.last = now;
    let busy = false;
    for (const [el, a] of this.anims) {
      if (!el.isConnected) { this.anims.delete(el); continue; }
      const p = MOLAS[a.tier], c = 2 * Math.sqrt(p.k) * p.z, h = dt / 4;
      for (const k of ['x', 'y', 'w', 'h']) {
        const s = a.s[k];
        for (let i = 0; i < 4; i++) { const f = -p.k * (s.x - s.t) - c * s.v; s.v += f * h; s.x += s.v * h; }
        if (Math.abs(s.x - s.t) > 0.05 || Math.abs(s.v) > 0.5) busy = true; else { s.x = s.t; s.v = 0; }
      }
      const o = a.o;
      if (o.x !== o.t) { const st = dt * 1000 / o.dur; o.x = o.t > o.x ? Math.min(o.t, o.x + st) : Math.max(o.t, o.x - st); busy = true; }
      el.style.transform = `translate3d(${a.s.x.x}px,${a.s.y.x}px,0)`; el.style.width = Math.max(0, a.s.w.x) + 'px'; el.style.height = Math.max(0, a.s.h.x) + 'px';
      el.style.opacity = o.x;
    }
    this.raf = busy ? requestAnimationFrame(this.tick) : 0;
  };
  itens(g, sel) { return [...g.querySelectorAll('[data-fi]')].filter(i => i.closest(sel) === g && !i.disabled); }
  acender(g, it, tier) {
    const a = this.anim(g, 'hov'); const fresh = a.o.t === 0 && a.o.x < 0.05;
    this.alvo(a, this.caixa(g, it), tier, fresh);
    a.o.t = 1; a.o.dur = 80; g._lit = it; this.kick();
  }
  esconder(g) {
    g = g || this.curG; if (!g || !g._fh) return;
    g._fh.o.t = 0; g._fh.o.dur = 60; g._lit = null; this.curG = null; this.kick();
  }
  onMove = e => {
    if (e.pointerType === 'touch') return;
    const g = e.target.closest && e.target.closest('[data-fluid]');
    if (this.curG && this.curG !== g) this.esconder(this.curG);
    if (!g) return;
    const its = this.itens(g, '[data-fluid]'); if (!its.length) return;
    let best = null, bd = Infinity;
    for (const it of its) {
      const r = it.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = it; }
    }
    this.curG = g;
    if (g._lit !== best || !g._fh || g._fh.o.t === 0) this.acender(g, best, g.dataset.tier || 'fast');
  };
  onGapClick = e => {
    const t = e.target;
    if (t.closest('[data-fi],input,select,textarea,button,a,label')) return;
    const g = t.closest('[data-fluid]');
    if (g && g._lit && g.contains(g._lit)) g._lit.click();
  };
  onFocus = e => {
    if (!this.kb) return;
    const it = e.target.closest && e.target.closest('[data-fi]'); if (!it) return;
    const g = it.closest('[data-fluid]'); if (g) { if (this.curG && this.curG !== g) this.esconder(this.curG); this.curG = g; this.acender(g, it, 'fast'); }
  };
  onKey = e => {
    this.kb = true;
    const t = e.target; const it = t.closest && t.closest('[data-fi]'); if (!it) return;
    const sel = '[data-fluid],[data-fluid-sel]'; const g = it.closest(sel);
    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key) && !/INPUT|SELECT|TEXTAREA/.test(t.tagName)) {
      const its = this.itens(g, sel); let i = its.indexOf(it);
      if (e.key === 'Home') i = 0; else if (e.key === 'End') i = its.length - 1;
      else i = Math.max(0, Math.min(its.length - 1, i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1)));
      e.preventDefault(); its[i].focus();
      if (g.hasAttribute('data-fluid-sel')) its[i].click();
    } else if ((e.key === 'Enter' || e.key === ' ') && it.getAttribute('role') === 'button' && t === it) { e.preventDefault(); it.click(); }
  };
  onGlobalKey = e => {
    if (e.key === 'Escape' && (this.state.menuAula != null || this.state.menuUser)) { this.setState({ menuAula: null, menuUser: false }); return; }
    if (e.key === 'Escape' && this.state.painel) { this.fecharPainel(); return; }
    if (e.key === 'Escape' && !this.state.logado && this.state.mg && this.state.mg.fase === 'aberto') { this.fecharMergulho(); return; }
    if (e.altKey && /^[1-9]$/.test(e.key) && +e.key <= this.telas().length && this.state.papel && this.state.papel !== 'aluno') { e.preventDefault(); this.ir(this.telas()[+e.key - 1].id); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') e.preventDefault();
  };
  resync = () => {
    if (this.selPend) return; this.selPend = true;
    requestAnimationFrame(() => {
      this.selPend = false; this.syncSel();
      const g = this.curG; if (g && g._lit && g._fh && g._fh.o.t === 1 && g._lit.isConnected) this.alvo(g._fh, this.caixa(g, g._lit), 'fast', false);
    });
  };
  syncSel() {
    const f = this.frameRef.current; if (!f || !this.anims) return;
    if (!this.selRO && window.ResizeObserver) { this.selRO = new ResizeObserver(this.resync); this.selRO.observe(f); window.addEventListener('resize', this.resync); if (document.fonts) document.fonts.ready.then(this.resync); }
    f.querySelectorAll('[data-fluid-sel]').forEach(g => {
      const on = this.itens(g, '[data-fluid-sel]').find(i => i.getAttribute('data-sel-on') === 'true');
      if (this.selRO) { this.selRO.observe(g); if (on) this.selRO.observe(on); }
      const a = this.anim(g, 'sel');
      if (!on) { a.o.x = a.o.t = 0; a.el.style.opacity = 0; a.placed = false; return; }
      const b = this.caixa(g, on), kind = g.dataset.fluidSel;
      if (kind === 'bar') { b.y = b.y + b.h - 2; b.h = 2; }
      if (kind === 'bartop') { b.h = 2; }
      this.alvo(a, b, 'moderate', !a.placed);
      a.placed = true; a.o.x = a.o.t = 1;
    });
    this.kick();
  }

  // ---------- domínio ----------
  telaRef = React.createRef();
  ir(tela) {
    const S = this.state;
    if (S.logado && S.papel && S.papel !== 'aluno' && !this.telas().some(t => t.id === tela)) { this.setState({ rotaAviso: 'Essa tela não faz parte do perfil ' + (S.papel === 'prof' ? 'Professor' : 'Escola') + '. Você voltou ao início.' }); tela = this.telas()[0].id; }
    else if (S.rotaAviso) this.setState({ rotaAviso: '' });
    if (S.semPerm) this.setState({ semPerm: null });
    const el = this.telaRef.current, m = this.mainRef.current, de = this.state.tela;
    if (tela === de) return this.setState({ navAberta: false, painel: null });
    const ia = this.telas().findIndex(t => t.id === de), ib = this.telas().findIndex(t => t.id === tela);
    const dir = ia < 0 || ib < 0 ? 1 : Math.sign(ib - ia) || 1;
    (this.telaAnims || []).forEach(a => a.cancel()); this.telaAnims = [];
    const trocar = () => this.setState({ tela, navAberta: false, painel: null }, () => { if (m) m.scrollTop = 0; this.entrarTela(dir); });
    if (!el || !el.animate || !this.state.logado) return trocar();
    this.setState({ navAberta: false, painel: null });
    const out = el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: this.rm ? 'none' : 'translateX(' + (-dir * 10) + 'px)' }], { duration: this.rm ? 60 : 80, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    this.telaAnims = [out];
    let feito = false; const ok = () => { if (feito) return; feito = true; if (this.telaAnims[0] === out) trocar(); };
    out.onfinish = ok; setTimeout(ok, 140);
  }
  entrarTela(dir) {
    const el = this.telaRef.current;
    (this.telaAnims || []).forEach(a => a.cancel()); this.telaAnims = [];
    if (!el || !el.animate) return;
    if (this.rm) { this.telaAnims = [el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: 'linear' })]; return; }
    const vh = (this.mainRef.current || el).clientHeight;
    const filhos = [...el.children].filter(c => { const r = c.getBoundingClientRect(); return r.height > 0 && r.top < vh + 200; }).slice(0, 4);
    setTimeout(this.resync, 360);
    this.telaAnims = filhos.map((c, i) => c.animate([{ opacity: 0, transform: 'translateX(' + (dir * 14) + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 20, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
  fecharPainel = () => this.setState({ painel: null, senhaProv: null, menuAula: null, confDesm: null, desmErro: null });
  abrirPainel(p, extra) { this.setState(Object.assign({ painel: p, painelUlt: p, fNome: '', fIdade: '', fMat: '', fEmail: '', fErro: '', fOk: '', fGrade: [], fData: '', fIni: '', fFim: '', fDisc: '', fTexto: '', editando: false, senhaProv: null, confDesm: null, desmErro: null, alunoErro: '', cham: {}, chamErro: '', sAtual: '', sNova: '', sConf: '', senhaOk: false, menuAula: null, menuUser: false, navAberta: false }, extra)); }
  agRef = React.createRef();
  popRef = el => { if (el && el.animate && !this.rm) el.animate([{ opacity: 0, transform: 'translateY(-4px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
  fecharMenus = e => {
    const s = this.state, t = e.target;
    if (s.menuAula != null && !(t.closest && t.closest('[data-menu]'))) this.setState({ menuAula: null });
    if (s.menuUser && !(t.closest && t.closest('[data-menu-user]'))) this.setState({ menuUser: false });
  };
  ativo() { const s = this.state.semestre; return s && !s.encerrado_em ? s : null; }
  idx() {
    const st = this.state;
    if (this._ix && this._ix.a === st.aulas) return this._ix.v;
    const v = {};
    st.aulas.forEach(au => {
      if (au.status === 'cancelada' || !au.chamada) return;
      Object.keys(au.chamada).forEach(k => {
        const val = au.chamada[k]; if (val == null) return;
        const pa = v[k] = v[k] || {}, o = pa[au.disciplina_id] = pa[au.disciplina_id] || { p: 0, t: 0, linha: [] };
        o.t++; if (val) o.p++; o.linha.push({ data: au.data, v: !!val });
      });
    });
    this._ix = { a: st.aulas, v }; return v;
  }
  fr(aid, did) { return (this.idx()[aid] || {})[did] || { p: 0, t: 0, linha: [] }; }
  senhaNova() { const A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 10; i++) s += A[Math.floor(Math.random() * A.length)]; return s.slice(0, 4) + '-' + s.slice(4, 7) + '-' + s.slice(7); }
  copiar(t) { try { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {}); } catch (e) {} this.setState(s => s.senhaProv ? { senhaProv: Object.assign({}, s.senhaProv, { copiado: true }) } : null); }
  exportar(k, nome, linhas) {
    if (this.state.exportando) return;
    this.setState({ exportando: k, exportOk: null });
    setTimeout(() => {
      const cel = c => { const x = String(c == null ? '' : c); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
      const csv = linhas.map(l => l.map(cel).join(';')).join('\n');
      try { const u = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); } catch (e) {}
      this.setState({ exportando: null, exportOk: k });
      setTimeout(() => this.setState(s => s.exportOk === k ? { exportOk: null } : null), 2000);
    }, 650);
  }
  linhasBoletim(aid) {
    const st = this.state, r = [['Disciplina', 'Avaliação', 'Peso', 'Nota', 'Média da disciplina']];
    st.discs.filter(d => st.mats[aid + '-' + d.id]).forEach(d => { const m = this.discMedia(aid, d.id); st.avals.filter(v => v.did === d.id).forEach(v => { const n = st.notas[aid + '-' + v.id]; r.push([d.nome, v.nome, v.peso, n == null ? '' : fmt(n), m ? fmt(m.m) : '']); }); });
    return r;
  }
  irDia(d) {
    const de = this.state.agDia; if (d === de) return;
    const dir = d > de ? 1 : -1;
    this.setState({ agDia: d, agMes: d.slice(0, 7), menuAula: null }, () => {
      const el = this.agRef.current; if (!el || !el.animate) return;
      const mola = getComputedStyle(document.documentElement).getPropertyValue('--mola-moderada').trim();
      let easing = 'cubic-bezier(.2,.8,.2,1)'; try { if (mola && mola !== 'linear' && CSS.supports('transition-timing-function', mola)) easing = mola; } catch (e) {}
      el.animate(this.rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(' + dir * 8 + 'px)' }, { opacity: 1, transform: 'none' }], { duration: this.rm ? 120 : 300, easing: this.rm ? 'linear' : easing });
      this.resync();
    });
  }
  moverMes(n) { const p = this.state.agMes.split('-').map(Number); this.setState({ agMes: sD(new Date(Date.UTC(p[0], p[1] - 1 + n, 1))).slice(0, 7) }); }
  gradeNoDia(dia) { const r = []; (this.vst || this.state).discs.forEach(o => (o.grade || []).forEach(h => { if (h.dia_semana === dia) r.push({ id: o.id, nome: o.nome, ini: h.hora_inicio, fim: h.hora_fim }); })); return r.sort((a, b) => hm(a.ini) - hm(b.ini)); }
  conflitoGrade(rows, ignorar) {
    return rows.map((h, i) => {
      if (!h.hora_inicio || !h.hora_fim) return 'Preencha início e fim.';
      const a = hm(h.hora_inicio), b = hm(h.hora_fim);
      if (!(a < b)) return 'O fim precisa ser depois do início.';
      for (let j = 0; j < rows.length; j++) { if (j === i) continue; const o = rows[j]; if (o.dia_semana === h.dia_semana) return o.hora_inicio === h.hora_inicio && o.hora_fim === h.hora_fim ? 'Horário repetido.' : 'Só uma aula por dia: ' + DIA_L[h.dia_semana] + ' já está no horário ' + (j + 1) + '.'; }
      for (const d of this.state.discs) { if (d.id === ignorar) continue; for (const o of d.grade || []) if (o.dia_semana === h.dia_semana && a < hm(o.hora_fim) && hm(o.hora_inicio) < b) return 'Choca com ' + d.nome + ' (' + DIA_L[o.dia_semana] + ', ' + o.hora_inicio + '–' + o.hora_fim + ').'; }
      return '';
    });
  }
  abrirDisc(d) {
    if (d) return this.abrirPainel({ tipo: 'disc', did: d.id }, { fNome: d.nome, fIdade: String(d.carga_horaria), fProf: d.professor_id != null ? String(d.professor_id) : '', fGrade: (d.grade || []).map((g, i) => ({ k: i + 1, dia_semana: String(g.dia_semana), hora_inicio: g.hora_inicio, hora_fim: g.hora_fim })) });
    this.abrirPainel({ tipo: 'disc', did: null }, { fProf: '', fGrade: [{ k: 1, dia_semana: '1', hora_inicio: '08:00', hora_fim: '09:40' }] });
  }
  addLinha() { this.setState(s => { const g = s.fGrade, u = g[g.length - 1], usados = g.map(r => +r.dia_semana); let d = 1; while (usados.includes(d) && d < 6) d++; return { fGrade: g.concat({ k: Date.now(), dia_semana: String(d), hora_inicio: u ? u.hora_inicio : '08:00', hora_fim: u ? u.hora_fim : '09:40' }), fErro: '', fOk: '' }; }); }
  setLinha(k, campo, v) { this.setState(s => ({ fGrade: s.fGrade.map(r => r.k === k ? Object.assign({}, r, { [campo]: v }) : r), fErro: '', fOk: '' })); }
  remLinha(k) { this.setState(s => ({ fGrade: s.fGrade.filter(r => r.k !== k), fErro: '', fOk: '' })); }
  salvarDisc(e) {
    e.preventDefault();
    const st = this.state, sem = this.ativo(), did = (st.painel || {}).did || null, erro = t => this.setState({ fErro: t, fOk: '' });
    if (!sem) return erro('Sem semestre ativo.');
    const nome = st.fNome.trim(), ch = parseInt(st.fIdade, 10);
    if (!nome) return erro('Informe o nome.');
    if (st.discs.some(d => d.id !== did && d.nome.trim().toLowerCase() === nome.toLowerCase())) return erro('Já existe uma disciplina com esse nome.');
    if (isNaN(ch) || ch <= 0) return erro('A carga horária precisa ser maior que zero.');
    const grade = st.fGrade.map(r => ({ dia_semana: +r.dia_semana, hora_inicio: r.hora_inicio, hora_fim: r.hora_fim }));
    const errs = this.conflitoGrade(grade, did), k = errs.findIndex(Boolean);
    if (k >= 0) return erro('Horário ' + (k + 1) + ': ' + errs[k]);
    const id = did || Date.now(), de = HOJE > sem.inicio ? HOJE : sem.inicio, disc = { id, nome, carga_horaria: ch, professor_id: st.fProf ? +st.fProf : null, grade };
    const velhas = st.aulas.filter(a => a.disciplina_id === id);
    const fica = velhas.filter(a => a.origem === 'extra' || a.chamada || a.data < de || a.remarcada_de);
    const canc = velhas.filter(a => a.status === 'cancelada' && a.origem === 'grade' && !a.remarcada_de).map(a => a.data + a.hora_inicio);
    const novas = gerarAulas(disc, de, sem.fim).filter(a => !fica.some(f => (f.origem === 'grade' && f.data === a.data && f.hora_inicio === a.hora_inicio) || f.remarcada_de === a.data));
    novas.forEach(a => { if (canc.includes(a.data + a.hora_inicio)) a.status = 'cancelada'; });
    const n = novas.filter(a => a.status !== 'cancelada').length;
    const msg = grade.length ? n + (n === 1 ? ' aula gerada' : ' aulas geradas') + ' de ' + ddmm(de) + ' a ' + ddmm(sem.fim) + '.' : 'Salvo. Sem grade, nenhuma aula foi gerada.';
    this.setState(s => ({ discs: did ? s.discs.map(d => d.id === did ? disc : d) : s.discs.concat(disc), aulas: s.aulas.filter(a => a.disciplina_id !== id).concat(fica, novas), selDisc: id, painel: { tipo: 'disc', did: id }, painelUlt: { tipo: 'disc', did: id }, fErro: '', fOk: msg }));
  }
  excluirDisc(id) { this.setState(s => ({ discs: s.discs.filter(x => x.id !== id), aulas: s.aulas.filter(a => a.disciplina_id !== id), matMsg: null })); }
  desmatricular(aid, did) {
    const st = this.state, k = aid + '-' + did;
    if (!this.ativo()) return;
    const temNota = st.avals.some(v => v.did === did && st.notas[aid + '-' + v.id] != null);
    const temFreq = st.aulas.some(a => a.disciplina_id === did && a.chamada && a.chamada[aid] != null);
    if (temNota || temFreq) return this.setState({ confDesm: null, desmErro: { k, t: 'Aluno já tem notas ou frequência nessa disciplina.' } });
    const al = st.alunos.find(a => a.id === aid), d = st.discs.find(x => x.id === did);
    this.setState(s => { const mats = Object.assign({}, s.mats); delete mats[k]; return { mats, confDesm: null, desmErro: null, matMsg: { erro: false, t: (al ? al.nome : 'Aluno') + ' desmatriculado de ' + (d ? d.nome : 'disciplina') + '.' } }; });
  }
  abrirChamada(au) { this.abrirPainel({ tipo: 'chamada', id: au.aula_id }, { cham: Object.assign({}, au.chamada || {}) }); }
  salvarChamada() {
    const st = this.state, au = st.aulas.find(a => a.aula_id === (st.painel || {}).id);
    if (!au || !this.ativo() || au.status === 'cancelada') return;
    const lista = st.alunos.filter(a => st.mats[a.id + '-' + au.disciplina_id] || (au.chamada && au.chamada[a.id] != null));
    const faltam = lista.filter(a => st.cham[a.id] == null).length;
    if (faltam) return this.setState({ chamErro: 'Marque todos os alunos. ' + (faltam === 1 ? 'Falta 1.' : 'Faltam ' + faltam + '.') });
    const ch = {}; lista.forEach(a => { ch[a.id] = !!st.cham[a.id]; });
    this.setState(s => ({ aulas: s.aulas.map(a => a.aula_id === au.aula_id ? Object.assign({}, a, { chamada: ch }) : a), painel: null }));
  }
  setStatus(id, status) { this.setState(s => ({ aulas: s.aulas.map(a => a.aula_id === id ? Object.assign({}, a, { status }) : a), menuAula: null })); }
  abrirRemarcar(au) { this.abrirPainel({ tipo: 'remarcar', id: au.aula_id }, { fData: au.data, fIni: au.hora_inicio || '', fFim: au.hora_fim || '', fErro: au.chamada ? 'Aula já tem presenças: não dá para remarcar.' : '' }); }
  salvarRemarcar(e) {
    e.preventDefault();
    const st = this.state, sem = this.ativo(), au = st.aulas.find(a => a.aula_id === (st.painel || {}).id), erro = t => this.setState({ fErro: t });
    if (!au || !sem) return erro('Sem semestre ativo.');
    if (au.chamada) return erro('Aula já tem presenças: não dá para remarcar.');
    if (!ISO.test(st.fData)) return erro('Escolha a nova data.');
    if (st.fData < sem.inicio || st.fData > sem.fim) return erro('A data precisa estar dentro do semestre (' + br(sem.inicio) + ' a ' + br(sem.fim) + ').');
    if (!st.fIni || !st.fFim) return erro('Preencha início e fim.');
    if (!(hm(st.fIni) < hm(st.fFim))) return erro('O fim precisa ser depois do início.');
    if (st.fData === au.data && st.fIni === au.hora_inicio && st.fFim === au.hora_fim) return erro('Escolha outra data ou outro horário.');
    if (st.aulas.some(a => a.aula_id !== au.aula_id && a.disciplina_id === au.disciplina_id && a.data === st.fData && a.status !== 'cancelada')) return erro('Já existe aula dessa disciplina nesse dia.');
    const nd = st.fData;
    this.setState(s => ({ aulas: s.aulas.map(a => a.aula_id === au.aula_id ? Object.assign({}, a, { data: nd, hora_inicio: s.fIni, hora_fim: s.fFim, status: 'agendada', remarcada_de: a.remarcada_de || (nd !== a.data ? a.data : null) }) : a), painel: null }), () => this.irDia(nd));
  }
  abrirExtra() { const st = this.state; this.abrirPainel({ tipo: 'extra' }, { fData: st.agDia, fDisc: String((st.discs[0] || {}).id || ''), fIni: '', fFim: '' }); }
  salvarExtra(e) {
    e.preventDefault();
    const st = this.state, sem = this.ativo(), erro = t => this.setState({ fErro: t });
    if (!sem) return erro('Sem semestre ativo.');
    const did = +st.fDisc; if (!st.discs.some(d => d.id === did)) return erro('Escolha a disciplina.');
    if (!ISO.test(st.fData)) return erro('Escolha a data.');
    if (st.fData < sem.inicio || st.fData > sem.fim) return erro('A data precisa estar dentro do semestre (' + br(sem.inicio) + ' a ' + br(sem.fim) + ').');
    if (!!st.fIni !== !!st.fFim) return erro('Preencha início e fim, ou deixe os dois vazios.');
    if (st.fIni && !(hm(st.fIni) < hm(st.fFim))) return erro('O fim precisa ser depois do início.');
    if (st.aulas.some(a => a.disciplina_id === did && a.data === st.fData && a.status !== 'cancelada')) return erro('Já existe aula dessa disciplina nesse dia.');
    const au = { aula_id: AID++, disciplina_id: did, data: st.fData, hora_inicio: st.fIni || null, hora_fim: st.fFim || null, status: 'agendada', origem: 'extra', chamada: null };
    this.setState(s => ({ aulas: s.aulas.concat(au), painel: null }), () => this.irDia(au.data));
  }
  resumoSemestre() {
    const st = this.state;
    return st.discs.map(d => {
      const al = st.alunos.filter(a => st.mats[a.id + '-' + d.id]), ms = [], fs = []; let ap = 0, rp = 0;
      al.forEach(a => { const m = this.discMedia(a.id, d.id), o = this.fr(a.id, d.id), f = o.t ? o.p / o.t : null; if (m) ms.push(m.m); if (f != null) fs.push(f); if (m && f != null) { if (m.m >= 6 && f >= 0.75) ap++; else rp++; } });
      const mm = ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : null, ff = fs.length ? fs.reduce((x, y) => x + y, 0) / fs.length : null;
      return { disc: d.nome, alunos: String(al.length), media: mm == null ? '—' : fmt(mm), mediaCor: mm != null && mm < 6 ? AVISO : TINTA, freq: ff == null ? '—' : pct(ff), freqCor: ff != null && ff < 0.75 ? AVISO : TINTA, aprov: String(ap), reprov: String(rp), reprovCor: rp ? AVISO : TINTA };
    });
  }
  abrirSemestre(e) {
    e.preventDefault();
    const st = this.state, erro = t => this.setState({ nsErro: t });
    if (this.ativo()) return erro('Já existe um semestre ativo.');
    const nome = st.nsNome.trim();
    if (!nome) return erro('Dê um nome ao semestre, por exemplo 2027.1.');
    if ([st.semestre].concat(st.historico).some(s => s && s.nome === nome)) return erro('Já existe um semestre com esse nome.');
    if (!ISO.test(st.nsInicio) || !ISO.test(st.nsFim)) return erro('Preencha início e fim.');
    if (st.nsFim <= st.nsInicio) return erro('O fim precisa ser depois do início.');
    const dia = st.nsInicio > HOJE ? st.nsInicio : HOJE;
    this.setState({ semestre: { id: Date.now(), nome, inicio: st.nsInicio, fim: st.nsFim, encerrado_em: null }, discs: [], avals: [], notas: {}, mats: {}, aulas: [], selDisc: null, notaDisc: '', notaAval: '', agDia: dia, agMes: dia.slice(0, 7), nsNome: '', nsInicio: '', nsFim: '', nsErro: '', semMsg: 'Semestre ' + nome + ' aberto. Agora crie as disciplinas.' });
  }
  encerrarSemestre() {
    const sem = this.ativo(); if (!sem) return;
    const snap = Object.assign({}, sem, { encerrado_em: HOJE, resumo: this.resumoSemestre() });
    this.setState(s => ({ semestre: Object.assign({}, s.semestre, { encerrado_em: HOJE }), historico: [snap].concat(s.historico), semConfirm: false, semMsg: '' }));
  }
  validarAluno(id) {
    const st = this.state, idade = parseInt(st.fIdade, 10), em = st.fEmail.trim().toLowerCase();
    if (!st.fNome.trim()) return 'Informe o nome.';
    if (isNaN(idade) || idade < 1 || idade > 120) return 'Idade inválida.';
    if (!/^\d{7}$/.test(st.fMat)) return 'A matrícula tem 7 dígitos.';
    if (st.alunos.some(a => a.id !== id && a.mat === st.fMat)) return 'Matrícula já existe.';
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return 'E-mail inválido.';
    if (em && st.alunos.some(a => a.id !== id && (a.email || '').toLowerCase() === em)) return 'Esse e-mail já é de outro aluno.';
    return '';
  }
  salvarAluno(e) {
    e.preventDefault();
    const id = (this.state.painel || {}).id, er = this.validarAluno(id); if (er) return this.setState({ fErro: er });
    const st = this.state, em = st.fEmail.trim().toLowerCase(), antes = st.alunos.find(a => a.id === id), novoAcesso = !!em && (!antes || (antes.email || '') !== em);
    this.setState(s => ({ alunos: s.alunos.map(a => a.id === id ? Object.assign({}, a, { nome: s.fNome.trim(), idade: parseInt(s.fIdade, 10), mat: s.fMat, email: em || null, provisoria: novoAcesso ? true : a.provisoria }) : a), editando: false, fErro: '', senhaProv: novoAcesso ? { email: em, senha: this.senhaNova(), copiado: false } : null }));
  }
  cadastrarProf(e) {
    e.preventDefault();
    const st = this.state, nome = st.fNome.trim(), em = st.fEmail.trim().toLowerCase(), erro = t => this.setState({ fErro: t });
    if (!nome) return erro('Informe o nome.');
    if (!EMAIL_RE.test(em)) return erro('Informe um e-mail válido.');
    if (em === 'escola@escola.com' || st.profs.some(p => p.email === em) || st.alunos.some(a => a.email === em)) return erro('Este e-mail já está em uso.');
    this.setState(s => ({ profs: s.profs.concat({ id: Date.now(), nome, email: em, provisoria: true }), fErro: '', senhaProv: { email: em, senha: this.senhaNova(), copiado: false, criado: nome } }));
  }
  cadastrarAluno(e) {
    e.preventDefault();
    const er = this.validarAluno(null); if (er) return this.setState({ fErro: er });
    const st = this.state, em = st.fEmail.trim().toLowerCase(), nome = st.fNome.trim();
    const novo = { id: Date.now(), nome, idade: parseInt(st.fIdade, 10), mat: st.fMat, email: em || null, provisoria: !!em };
    this.setState(s => Object.assign({ alunos: s.alunos.concat(novo), fErro: '' }, em ? { senhaProv: { email: em, senha: this.senhaNova(), copiado: false, criado: nome } } : { painel: null }));
  }
  salvarAvisoEd(e) {
    e.preventDefault();
    const st = this.state, id = (st.painel || {}).id, t = st.fNome.trim(), erro = x => this.setState({ fErro: x });
    if (!st.avisos.some(a => a.id === id)) return this.setState({ painel: null });
    if (!t) return erro('Escreva um título.');
    if (!ISO.test(st.fData)) return erro('Escolha a data.');
    if (!st.fTexto.trim()) return erro('Escreva a mensagem.');
    if (st.avisos.some(a => a.id !== id && a.titulo.trim().toLowerCase() === t.toLowerCase() && a.data === st.fData)) return erro('Já existe um aviso com esse título nessa data.');
    this.setState(s => ({ avisos: s.avisos.map(a => a.id === id ? Object.assign({}, a, { titulo: t, data: s.fData, msg: s.fTexto.trim() }) : a), painel: null }));
  }
  trocarSenha(e) {
    e.preventDefault();
    const st = this.state, erro = t => this.setState({ fErro: t });
    if (!st.sAtual) return erro('Informe a senha atual.');
    if (st.sNova.length < 8) return erro('A nova senha precisa de pelo menos 8 caracteres.');
    if (st.sNova === st.sAtual) return erro('A nova senha precisa ser diferente da atual.');
    if (st.sNova !== st.sConf) return erro('A confirmação não confere com a nova senha.');
    this.setState({ senhaOk: true, sAtual: '', sNova: '', sConf: '', fErro: '' });
  }
  salvarPrimeiro(e) {
    e.preventDefault();
    const st = this.state, erro = t => this.setState({ fErro: t });
    if (st.sNova.length < 8) return erro('A nova senha precisa de pelo menos 8 caracteres.');
    if (st.sNova !== st.sConf) return erro('A confirmação não confere com a nova senha.');
    const em = st.primeiroEmail, papel = st.primeiroPapel || 'aluno';
    this.setState(s => ({ sNova: '', sConf: '', fErro: '', profs: s.profs.map(p => p.email === em ? Object.assign({}, p, { provisoria: false }) : p), alunos: s.alunos.map(a => a.email === em ? Object.assign({}, a, { provisoria: false }) : a) }));
    this.entrarComo(papel, papel === 'prof' ? st.profId : null);
  }
  discMedia(aid, did) {
    const av = this.state.avals.filter(v => v.did === did); let s = 0, p = 0, falta = 0;
    av.forEach(v => { const n = this.state.notas[aid + '-' + v.id]; if (n == null) falta++; else { s += n * v.peso; p += v.peso; } });
    return p ? { m: s / p, parcial: falta > 0 } : null;
  }
  resumo(a) {
    if (a.fixo) return a.fixo;
    const { mats, avals, notas, discs } = this.vst || this.state;
    const ds = discs.filter(d => mats[a.id + '-' + d.id]);
    const ms = []; let tp = 0, ta = 0, comNota = 0; const linha = [];
    ds.forEach(d => {
      const m = this.discMedia(a.id, d.id); if (m) ms.push(m.m);
      const o = this.fr(a.id, d.id);
      tp += o.p; ta += o.t;
      o.linha.forEach(x => linha.push({ dia: x.data, v: x.v, d: d.nome }));
      avals.filter(v => v.did === d.id).forEach(v => { if (notas[a.id + '-' + v.id] != null) comNota++; });
    });
    linha.sort((x, y) => String(x.dia).localeCompare(String(y.dia)));
    return { media: ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : null, freq: ta ? tp / ta : null, presencas: tp, faltas: ta - tp, comNota, ds, linha };
  }
  situacao(s) {
    if (s.media == null || s.freq == null) return { tag: 'Sem dados', tagCor: 'var(--texto-suave)', tagBorda: 'var(--borda)' };
    return s.media >= 6 && s.freq >= 0.75 ? { tag: 'Aprovado', tagCor: TINTA, tagBorda: TINTA } : { tag: 'Reprovado', tagCor: AVISO, tagBorda: AVISO };
  }
  vis(a) {
    const s = this.resumo(a), sit = this.situacao(s);
    const mb = s.media != null && s.media < 6, fb = s.freq != null && s.freq < 0.75;
    const linha = s.linha.length ? s.linha : Array.from({ length: 12 }, (_, i) => ({ v: ((i * 7 + a.id) % 10) / 10 < (s.freq ?? 0), dia: i + 1 }));
    return Object.assign({}, a, sit, {
      s, iniciais: ini(a.nome),
      mediaTxt: s.media == null ? '—' : fmt(s.media), freqTxt: s.freq == null ? '—' : pct(s.freq),
      mediaCor: mb ? AVISO : TINTA, freqCor: fb ? AVISO : TINTA,
      mediaBar: `scaleX(${(s.media || 0) / 10})`, freqBar: `scaleX(${s.freq || 0})`,
      spark: linha.slice(-12).map(k => ({ h: k.v ? '16px' : '5px', cor: k.v ? 'var(--texto-suave)' : AVISO })),
      sparkG: linha.slice(-24).map(k => ({ h: k.v ? '40px' : '10px', cor: k.v ? 'var(--texto)' : AVISO, t: `${typeof k.dia === 'string' ? ddmm(k.dia) : 'aula ' + k.dia}${k.d ? ' · ' + k.d : ''} · ${k.v ? 'presente' : 'falta'}` })),
      sparkLabel: `${s.presencas || 0} presenças, ${s.faltas || 0} faltas`,
      motivo: [mb && 'média abaixo de 6', fb && 'frequência abaixo de 75%'].filter(Boolean).join(' · '),
      abrir: () => this.abrirPainel({ tipo: 'aluno', id: a.id }),
      excluir: e => { e && e.stopPropagation(); this.excluirAluno(a.id); }
    });
  }
  boletim(aid) {
    const { discs, mats, avals, notas, limpar } = this.state, pode = !!this.ativo();
    return discs.filter(d => mats[aid + '-' + d.id]).map(d => {
      const m = this.discMedia(aid, d.id), avD = avals.filter(v => v.did === d.id), alvo = limpar ? avD.find(v => aid + '-' + v.id === limpar) : null;
      return {
        id: d.id, nome: d.nome,
        avs: avD.map(v => { const k = aid + '-' + v.id, n = notas[k]; return { nome: v.nome, notaTxt: n == null ? '—' : fmt(n), cor: n != null && n < 6 ? AVISO : TINTA, podeLimpar: pode && n != null, limparLabel: 'Limpar nota ' + v.nome + ' de ' + d.nome, pedirLimpar: e => { if (e) e.stopPropagation(); this.setState({ limpar: k, notaMsg: null }); } }; }),
        mediaTxt: m ? fmt(m.m) : 'sem nota lançada', mediaCor: m && m.m < 6 ? AVISO : m ? TINTA : 'var(--texto-suave)',
        parcial: m && m.parcial ? ' (parcial)' : '',
        confirmando: !!alvo, confTxt: alvo ? 'Limpar ' + alvo.nome + ' de ' + d.nome + ' (' + fmt(notas[limpar]) + ')?' : '',
        cancelarLimpar: () => this.setState({ limpar: null }),
        confirmarLimpar: () => this.setState(s => { const n = Object.assign({}, s.notas); delete n[limpar]; return { notas: n, limpar: null, notaMsg: { erro: false, t: 'Nota ' + (alvo ? alvo.nome : '') + ' de ' + d.nome + ' limpa. Agora aparece como —.' } }; }),
        escolher: () => this.setState({ notaDisc: d.id, notaAval: (avals.find(v => v.did === d.id) || {}).id || '' })
      };
    });
  }
  excluirAluno(id) {
    const al = this.state.alunos.find(a => a.id === id);
    if (al && al.hist) { const t = 'Não dá para excluir: ' + al.nome + ' tem histórico no semestre ' + al.hist + ', que está encerrado.'; if ((this.state.painel || {}).tipo === 'aluno' && this.state.painel.id === id) return this.setState({ alunoErro: t }); return this.abrirPainel({ tipo: 'aluno', id }, { alunoErro: t }); }
    this.setState(s => ({ alunos: s.alunos.filter(a => a.id !== id), painel: null, selAluno: s.selAluno === id ? (s.alunos.find(a => a.id !== id) || {}).id : s.selAluno })); }

  irSecao(id) {
    const m = this.mainRef.current; const el = m && m.querySelector('#' + id); if (!el) return;
    m.scrollTo({ top: el.offsetTop - 72, behavior: this.rm ? 'auto' : 'smooth' });
  }
  setRing = el => { if (el && el === this.ringEl) return; if (this.ring) this.ring(); this.ringEl = el; this.ring = el ? this.iniciarAneis(el) : null; };
  iniciarAneis(cv) {
    const ctx = cv.getContext('2d'); let w = 0, h = 0, dpr = 1, dots = null;
    const css = getComputedStyle(document.documentElement);
    const bg = css.getPropertyValue('--texto').trim() || '#1c1b19', fg = css.getPropertyValue('--fundo').trim() || '#faf9f5';
    const resize = () => {
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const nw = cv.clientWidth, nh = cv.clientHeight; if (nw === w && nh === h) return;
      w = nw; h = nh; cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
      dots = document.createElement('canvas'); dots.width = cv.width; dots.height = cv.height;
      const d = dots.getContext('2d'); d.fillStyle = bg; d.fillRect(0, 0, dots.width, dots.height); d.fillStyle = fg; d.globalAlpha = 0.08;
      for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) d.fillRect(x * dpr, y * dpr, dpr, dpr);
    };
    resize(); const ro = new ResizeObserver(resize); ro.observe(cv);
    const sprites = new Map();
    const glyph = (ch, fs) => {
      const key = ch + fs; let s = sprites.get(key); if (s) return s;
      const c = document.createElement('canvas'), px = Math.ceil(fs * 1.4 * dpr); c.width = c.height = px;
      const g = c.getContext('2d'); g.fillStyle = fg; g.font = '500 ' + (fs * dpr) + 'px ' + (getComputedStyle(document.documentElement).getPropertyValue('--fonte-corpo').trim() || '"Space Grotesk", sans-serif'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, px / 2, px / 2);
      s = { c, half: px / 2 }; sprites.set(key, s); return s;
    };
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => sprites.clear());
    const TXT = 'PORTAL DE GESTÃO ESCOLAR · NOTAS · CHAMADA · AVISOS · BOLETIM · ';
    const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
    let tx = -1e4, ty = -1e4, mx = -1e4, my = -1e4, rot = 0, boost = 0, last = 0, raf = 0, visivel = true, intervalo = 1000 / 30;
    const ctl = this.ringCtl = { tcx: null, tcy: null, tz: 1, cx: null, cy: null, z: 1, k: 6, snap: true, vivo: false };
    const onMove = e => { const r = cv.getBoundingClientRect(); const nx = e.clientX - r.left, ny = e.clientY - r.top; if (tx > -1e3) boost = Math.min(2, boost + Math.hypot(nx - tx, ny - ty) / 300); tx = nx; ty = ny; };
    const onLeave = () => { tx = ty = -1e4; };
    cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerleave', onLeave);
    const io = new IntersectionObserver(es => { visivel = es[0].isIntersecting; }); io.observe(cv);
    const desenhar = (dt, o) => {
      boost *= Math.pow(0.15, dt); if (!this.rm) rot += dt * (0.05 + boost * 0.35);
      if (tx < -1e3) { mx = my = -1e4; } else if (mx < -1e3) { mx = tx; my = ty; } else { const k = Math.min(1, dt * 14); mx += (tx - mx) * k; my += (ty - my) * k; }
      let cx, cy, Z;
      if (o) { cx = o.cx; cy = o.cy; Z = o.z; }
      else {
        const tcx = ctl.tcx ?? w * 0.54, tcy = ctl.tcy ?? h * 0.46;
        if (ctl.snap || ctl.cx == null) { ctl.cx = tcx; ctl.cy = tcy; ctl.z = ctl.tz; ctl.snap = false; }
        else { const q = this.rm ? 1 : Math.min(1, dt * ctl.k); ctl.cx += (tcx - ctl.cx) * q; ctl.cy += (tcy - ctl.cy) * q; ctl.z += (ctl.tz - ctl.z) * q; }
        cx = ctl.cx; cy = ctl.cy; Z = ctl.z;
      }
      const A = o && o.a != null ? o.a : 1, RV = o && o.reveal != null ? o.reveal : Infinity, ESC = !!(o && o.escalar);
      if (!dots || !w || !h) return;
      const dz = (o && o.dz) || 1, dA = o && o.dotsA != null ? o.dotsA : 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
      if (dz === 1 && dA === 1) ctx.drawImage(dots, 0, 0);
      else {
        ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
        const da = dA * Math.max(0, 1 - (dz - 1) / 2.5);
        if (da > 0.01) { ctx.globalAlpha = da; ctx.setTransform(dz, 0, 0, dz, (1 - dz) * cx * dpr, (1 - dz) * cy * dpr); ctx.drawImage(dots, 0, 0); }
      }
      if (A < 0.01) return;
      const cl = o && o.cull, X0 = cl ? Math.max(-20, cl[0]) : -20, Y0 = cl ? Math.max(-20, cl[1]) : -20, X1 = cl ? Math.min(w + 20, cl[2]) : w + 20, Y1 = cl ? Math.min(h + 20, cl[3]) : h + 20;
      const maxR = Math.min(RV + 60, Math.hypot(Math.max(cx - X0, X1 - cx), Math.max(cy - Y0, Y1 - cy)) + 20), RAIO = 120;
      for (let k = 0, r = 30 * Z; r < maxR && k < 40; k++, r += (22 + k * 0.8) * Z) {
        const ra = RV === Infinity ? 1 : Math.max(0, Math.min(1, (RV - r) / 90)); if (ra <= 0) continue;
        const fb = Math.min(15, 8 + r / (70 * Z)), fz = Math.max(1, Math.round(fb * Z));
        const fs = ESC ? Math.round(fb) : fz, sc = ESC ? fb * Z / Math.round(fb) : 1;
        const n = Math.max(6, Math.floor(2 * Math.PI * r / (fz * 0.82)));
        const dir = k % 2 ? 1 : -1, a0 = k * 1.9 + rot * dir * 3.2 * (120 / (r / Z + 80)), passo = 2 * Math.PI / n;
        for (let i = 0; i < n; i++) {
          const th = a0 + i * passo, co = Math.cos(th), si = Math.sin(th);
          let x = cx + r * co, y = cy + r * si;
          if (x < X0 || x > X1 || y < Y0 || y > Y1) continue;
          const ch = TXT[(i + k * 11) % TXT.length]; if (ch === ' ' || hash(k, i) < 0.13) continue;
          let al = (0.5 + 0.5 * hash(i, k)) * A * ra, ang = th + Math.PI / 2;
          if (al < 0.02) continue;
          const dx = x - mx, dy = y - my;
          if (dx > -RAIO && dx < RAIO && dy > -RAIO && dy < RAIO) { const d = Math.hypot(dx, dy); if (d < RAIO) { const f = 1 - d / RAIO, p = f * f * 42; x += dx / (d || 1) * p; y += dy / (d || 1) * p; ang += f * f * 0.9 * dir; al *= 1 - f * 0.55; } }
          const sp = glyph(ch, fs), c = Math.cos(ang) * sc, sn = Math.sin(ang) * sc;
          ctx.globalAlpha = al; ctx.setTransform(c, sn, -sn, c, x * dpr, y * dpr); ctx.drawImage(sp.c, -sp.half, -sp.half);
        }
      }
    };
    const frame = now => {
      raf = requestAnimationFrame(frame);
      if (ctl.dive) { const dv = ctl.dive; if (dv.t0 == null) dv.t0 = now; const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; dv.passo(Math.min(1, (now - dv.t0) / dv.dur), dt); return; }
      if (ctl.pausa) { last = now; return; }
      if (document.hidden || !visivel || !w || now - last < intervalo - 2) return;
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.016; last = now;
      const t0 = performance.now(); desenhar(dt); const custo = performance.now() - t0;
      intervalo = custo > 12 ? 1000 / 24 : custo > 7 ? 1000 / 30 : 1000 / 60;
    };
    ctl.draw = desenhar; ctl.kick = v => { boost = Math.min(2, boost + v); };
    const PAL = ['chamada', 'notas', 'avisos', 'boletim', 'frequência', 'disciplinas', 'turma 2026', 'calendário', 'média', 'presença', 'avaliação', 'matrícula', 'bimestre', 'faltas', 'aula'];
    ctl.escrever = (seg, dt, fade) => {
      let E = ctl.esc;
      if (!E) {
        const FS = 10, LH = 17, adv = FS * 0.64, linhas = [];
        for (let r = 0, y = LH; y < h - 6; r++, y += LH) {
          if (hash(r, 3) < 0.28) continue;
          let x = 16 + Math.floor(hash(r, 7) * 10) * adv * 4, txt = '';
          for (let j = 0; txt.length * adv < w - x - 16; j++) txt += PAL[Math.floor(hash(r, j + 11) * PAL.length)] + (hash(j, r) < 0.3 ? '  ·  ' : '   ');
          linhas.push({ x, y, txt: txt.slice(0, Math.floor((w - x - 16) / adv)), t0: hash(r, 5) * 0.45, cps: 70 + hash(r, 9) * 110, n: 0, al: 0.28 + hash(r, 13) * 0.42 });
        }
        E = ctl.esc = { linhas, FS, adv, t: 0 };
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
      }
      E.t += dt;
      for (const L of E.linhas) {
        const alvo = Math.min(L.txt.length, Math.max(0, Math.floor((E.t - L.t0) * L.cps)));
        for (; L.n < alvo; L.n++) {
          const ch = L.txt[L.n]; if (ch === ' ') continue;
          const sp = glyph(ch, E.FS);
          ctx.globalAlpha = L.al; ctx.setTransform(1, 0, 0, 1, (L.x + L.n * E.adv) * dpr, L.y * dpr); ctx.drawImage(sp.c, -sp.half, -sp.half);
        }
      }
      if (fade) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = Math.min(1, fade); ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height); }
    };
    ctl.redraw = () => { resize(); desenhar(0); };
    ctl.limparFonte = () => { sprites.clear(); desenhar(0); };
    raf = requestAnimationFrame(frame);
    return () => { if (this.ringCtl === ctl) this.ringCtl = null; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerleave', onLeave); };
  }

  geoMergulho(origem) {
    const m = this.mainRef.current, o = this.ringEl.parentElement.parentElement;
    const mr = m.getBoundingClientRect(), or = o.getBoundingClientRect(), W = m.clientWidth, H = m.clientHeight;
    const vis = Math.min(or.bottom, mr.bottom) - Math.max(or.top, mr.top);
    let c, cx, cy;
    if (vis > 160 || !origem) { const t = Math.max(0, or.top - mr.top), l = or.left - mr.left; c = [t, Math.max(0, mr.right - or.right), Math.max(0, mr.bottom - or.bottom), l]; cx = l + or.width * 0.54; cy = or.top - mr.top + or.height * 0.46; }
    else { const br = origem.getBoundingClientRect(), t = br.top - mr.top, l = br.left - mr.left; c = [t, W - l - br.width, H - t - br.height, l]; cx = l + br.width / 2; cy = t + br.height / 2; }
    return { L: mr.left - or.left, T: mr.top - or.top, W, H, c, cx, cy };
  }
  limparMg() { if (this.ringCtl) this.ringCtl.dive = null; (this.mgTimers || []).forEach(clearTimeout); this.mgTimers = []; (this.mgAnims || []).forEach(a => a.cancel()); this.mgAnims = []; }
  inset(c) { return 'inset(' + c.map(n => Math.round(n) + 'px').join(' ') + ')'; }
  animarCartao(entrar) {
    const d = this.ringEl && this.ringEl.parentElement.querySelector('[role=dialog]'); if (!d || !d.animate) return;
    const fora = { opacity: 0, transform: 'scale(.92)' }, dentro = { opacity: 1, transform: 'none' };
    const mola = getComputedStyle(document.documentElement).getPropertyValue('--mola-lenta').trim();
    let easing = 'cubic-bezier(.2,.8,.2,1)'; try { if (mola && mola !== 'linear' && CSS.supports('transition-timing-function', mola)) easing = mola; } catch (e) {}
    if (entrar) setTimeout(this.resync, 600);
    d.animate(entrar ? [fora, dentro] : [dentro, fora], entrar ? { duration: 560, easing } : { duration: 140, easing: 'linear', fill: 'forwards' });
  }
  abrirMergulho(p, ev, instant) {
    const papel = p || this.state.papelEscolhido;
    const ctl = this.ringCtl, m = this.mainRef.current;
    if (!ctl || !m || !this.ringEl) return this.setState({ tela: 'login', papelEscolhido: papel, loginErro: '' });
    this.limparMg();
    if (instant) m.scrollTop = 0;
    const g = this.geoMergulho(ev && ev.currentTarget), rapido = instant;
    if (!instant && this.rm) {
      this.setState({ tela: 'login', papelEscolhido: papel, loginErro: '', mg: { ...g, clip: [0, 0, 0, 0], fase: 'aberto', anim: false } }, () => {
        Object.assign(ctl, { tcx: g.W / 2, tcy: g.H / 2, tz: 1.3, snap: true }); ctl.redraw();
        this.mgAnims = [this.ringEl.parentElement.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'linear' })];
      });
      return;
    }
    this.setState({ tela: 'login', papelEscolhido: papel, loginErro: '', mg: { ...g, clip: rapido ? [0, 0, 0, 0] : g.c, fase: rapido ? 'aberto' : 'abrindo', anim: false } }, () => {
      if (rapido) { Object.assign(ctl, { tcx: g.W / 2, tcy: g.H / 2, tz: 1.3, snap: true }); ctl.redraw(); return; }
      const wr = this.ringEl.parentElement;
      Object.assign(ctl, { tcx: g.cx, tcy: g.cy, tz: 1, snap: true }); ctl.redraw();
      this.mergulhoA(g, 1, () => {
        wr.style.clipPath = 'inset(0px 0px 0px 0px)';
        this.setState(s => s.mg ? { mg: { ...s.mg, clip: [0, 0, 0, 0] } } : null);
        ctl.kick(1.4);
        this.mergulhoB(g, 1, () => Object.assign(ctl, { tcx: g.W / 2, tcy: g.H / 2, tz: 1.3, snap: true }));
        this.mgTimers.push(setTimeout(() => this.setState(s => s.mg ? { mg: { ...s.mg, fase: 'aberto' } } : null, () => this.animarCartao(true)), 200));
      });
    });
  }
  mergulhoA(g, sentido, fim) {
    const ctl = this.ringCtl, wr = this.ringEl.parentElement, left = wr.parentElement.previousElementSibling, m = this.mainRef.current;
    const mr = m.getBoundingClientRect(), lr = left.getBoundingClientRect();
    Object.assign(left.style, { transformOrigin: (g.cx - (lr.left - mr.left)) + 'px ' + (g.cy - (lr.top - mr.top)) + 'px', willChange: 'transform, opacity' });
    const P = [g.c[3], g.c[0], g.W - g.c[1], g.H - g.c[2]], LN = Math.log(7);
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    ctl.dive = { dur: sentido > 0 ? 700 : 640, passo: (t, dt) => {
      const k = sentido > 0 ? Math.pow(t, 1.6) : Math.pow(1 - t, 2.2);
      const Z = Math.exp(LN * k), A = 1 - sm(0.45, 1, k);
      const x0 = g.cx + (P[0] - g.cx) * Z, y0 = g.cy + (P[1] - g.cy) * Z, x1 = g.cx + (P[2] - g.cx) * Z, y1 = g.cy + (P[3] - g.cy) * Z;
      wr.style.clipPath = this.inset([Math.max(0, y0), Math.max(0, g.W - x1), Math.max(0, g.H - y1), Math.max(0, x0)]);
      left.style.transform = 'scale(' + Z.toFixed(4) + ')'; left.style.opacity = String(1 - sm(0, 0.3, k));
      ctl.draw(dt, { cx: g.cx, cy: g.cy, z: Z, a: A, dz: Z, escalar: true, cull: [x0, y0, x1, y1] });
      if (t >= 1) { ctl.dive = null; fim && fim(); }
    } };
  }
  mergulhoB(g, sentido, fim) {
    const ctl = this.ringCtl, cx = g.W / 2, cy = g.H / 2, RM = Math.hypot(g.W, g.H) / 2 + 100;
    ctl.dive = { dur: sentido > 0 ? 780 : 380, passo: (t, dt) => {
      const e = sentido > 0 ? 1 - Math.pow(1 - t, 3) : 1 - t * t;
      ctl.draw(dt, { cx, cy, z: 1.3, reveal: RM * e, dotsA: e });
      if (t >= 1) { ctl.dive = null; fim && fim(); }
    } };
  }
  fecharMergulho() {
    const mg = this.state.mg, ctl = this.ringCtl;
    this.limparMg();
    const fim = () => this.setState({ mg: null, tela: 'inicio', loginErro: '' }, () => { (this.mgAnims || []).forEach(a => a.cancel()); this.mgAnims = []; const c = this.ringCtl; if (this.ringEl) { const wr = this.ringEl.parentElement, left = wr.parentElement.previousElementSibling; wr.style.clipPath = ''; if (left) Object.assign(left.style, { transform: '', opacity: '', transformOrigin: '', willChange: '' }); } if (c) { Object.assign(c, { tcx: null, tcy: null, tz: 1, k: 6, snap: true, vivo: false, pausa: false }); c.redraw(); } });
    if (!mg || !ctl) return fim();
    if (this.rm) { this.mgAnims = [this.ringEl.parentElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'linear', fill: 'forwards' })]; this.setState({ mg: { ...mg, fase: 'fechando' }, loginErro: '' }); this.mgTimers.push(setTimeout(fim, 250)); return; }
    this.animarCartao(false);
    this.setState({ mg: { ...mg, fase: 'fechando' }, loginErro: '' });
    this.mergulhoB(mg, -1, () => this.mergulhoA(mg, -1, fim));
  }

  funcRef = React.createRef(); funcSecRef = React.createRef(); funcMarca = React.createRef(); funcStick = React.createRef(); funcFrame = this.funcStick; funcRoda = React.createRef();
  fp = { p: 0, pt: 0, wt: 0, drag: null, ap: null };
  funcGeo() {
    const m = this.mainRef.current, sec = this.funcSecRef.current, mk = this.funcMarca.current, sk = this.funcStick.current;
    if (!m || !sec || !mk || !sk) return null;
    const ini = mk.offsetTop - 72, fim = sec.offsetTop + sec.offsetHeight - 56 - sk.offsetHeight - 72;
    return { m, sec, ini, fim: Math.max(ini + 1, fim) };
  }
  onScrollFunc = () => { if (this._fsp) return; this._fsp = true; requestAnimationFrame(() => { this._fsp = false; this.calcFunc(); }); };
  calcFunc() {
    const g = this.funcGeo(); if (!g) return;
    this.fp.ap = null; this.kickF();
    if (!this.funcSticky) return;
    if (this.funcFrame.current && this.funcFrame.current.offsetHeight > g.m.clientHeight - 88) { this.setState({ funcNaoCabe: true }); return; }
    if (this.fp.drag || this.fp.voo) return;
    const n = FUNCOES.length, p = Math.max(0, Math.min(1, (g.m.scrollTop - g.ini) / (g.fim - g.ini))), x = p * (n - 1), i = Math.min(n - 1, Math.floor(x)), k = x - i;
    const t = Math.max(0, Math.min(1, (k - 0.25) / 0.5));
    this.fp.pt = i + t * t * (3 - 2 * t); this.fp.wt = 0; this.kickF();
  }
  kickF() { if (!this.rafF) { if (!this.vivoF) this.lastF = null; this.rafF = requestAnimationFrame(this.tickF); } }
  tickF = now => {
    this.rafF = 0; const o = this.fp, N = FUNCOES.length, dt = this.lastF == null ? 0.016 : Math.max(0, Math.min(0.05, (now - this.lastF) / 1000)); this.lastF = now;
    if (!this.funcRoda.current) return;
    if (!o.drag && o.wt && now - o.wt > 150) { o.pt = Math.round(o.pt); o.wt = 0; }
    const q = this.rm ? 1 : 1 - Math.exp(-dt * (o.drag ? 22 : this.funcSticky ? 16 : 8));
    o.p += (o.pt - o.p) * q; let vivo = !!(o.drag || o.wt);
    o.pt = Math.max(0, Math.min(N - 1, o.pt)); o.p = Math.max(0, Math.min(N - 1, o.p));
    if (Math.abs(o.pt - o.p) < 0.0008) o.p = o.pt; else vivo = true;
    if (o.ap !== o.p) { this.aplicarF(); o.ap = o.p; }
    const sel = Math.max(0, Math.min(N - 1, Math.round(o.p))); if (sel !== (this.state.funcSel || 0)) this.setState({ funcSel: sel });
    this.vivoF = vivo; if (vivo) this.kickF();
  };
  espiralF(el, e) {
    const w = el.offsetWidth, h = el.offsetHeight, cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2 + 4, a = R / (4 * Math.PI), T = e * 6 * Math.PI, f2 = v => v.toFixed(1);
    if (T < 0.02) return 'polygon(0 0, 0 0, 0 0)';
    const n = Math.max(8, Math.ceil(T / 0.07)); let s = 'polygon(' + f2(cx) + 'px ' + f2(cy) + 'px';
    for (let j = 0; j <= n; j++) { const th = T * j / n, r = a * th; s += ', ' + f2(cx + r * Math.cos(th - Math.PI / 2)) + 'px ' + f2(cy + r * Math.sin(th - Math.PI / 2)) + 'px'; }
    return s + ')';
  }
  aplicarF() {
    const rd = this.funcRoda.current, sk = this.funcStick.current, pv = this.funcRef.current; if (!rd || !sk || !pv) return;
    const p = this.fp.p, N = FUNCOES.length, W = rd.offsetWidth, H = rd.offsetHeight, f2 = v => v.toFixed(2);
    let mw = 0; rd.querySelectorAll('[data-it]').forEach(el => { const nm = el.querySelector('[data-nm]'), fz = nm ? parseFloat(nm.style.fontSize) || 26 : 26; mw = Math.max(mw, el.offsetWidth * 26 / fz); });
    const arco = W > sk.offsetWidth * 0.8 || W - mw - 30 < 120; this.fpArco = arco; const passo = this.fpPasso = mw * 20 / 26 + 28;
    const circ = rd.querySelector('[data-arco]'), mk = rd.querySelector('[data-marca]');
    let R, CX, CY, A;
    if (arco) { const yb = Math.min(H - 34, H / 2 + 30); R = Math.max(700, W * 1.6); CX = W / 2; CY = yb + R; Object.assign(mk.style, { width: '1px', height: '12px', transform: 'translate(' + f2(W / 2) + 'px,' + f2(yb + 4) + 'px)' }); }
    else { R = Math.max(420, H * 0.92); A = Math.min(280, W - mw - 30); CX = A - R; CY = H / 2; Object.assign(mk.style, { width: '26px', height: '1px', transform: 'translate(' + f2(A - 30) + 'px,' + f2(CY) + 'px)' }); }
    Object.assign(circ.style, { width: 2 * R + 'px', height: 2 * R + 'px', transform: 'translate(' + f2(CX - R) + 'px,' + f2(CY - R) + 'px)' });
    rd.querySelectorAll('[data-it]').forEach(el => {
      const i = +el.getAttribute('data-it'), d = i - p, on = Math.abs(d) < 0.5; let tf, op;
      if (arco) { const fa = -Math.PI / 2 + d * passo / R; tf = 'translate(' + f2(CX + R * Math.cos(fa)) + 'px,' + f2(CY + R * Math.sin(fa)) + 'px) rotate(' + (fa + Math.PI / 2).toFixed(4) + 'rad) translate(-50%,-100%)'; op = Math.max(0, 1 - Math.abs(d) / 2.6); }
      else { const fa = d * 74 / R; tf = 'translate(' + f2(CX + R * Math.cos(fa) + 22) + 'px,' + f2(CY + R * Math.sin(fa)) + 'px) rotate(' + fa.toFixed(4) + 'rad) translateY(-50%)'; op = Math.max(0, 1 - Math.abs(d) / 4.2); }
      el.style.transform = tf; el.style.opacity = op.toFixed(3); el.style.pointerEvents = op < 0.15 ? 'none' : 'auto';
      el.style.color = on ? 'var(--texto)' : 'var(--texto-suave)';
      const nm = el.querySelector('[data-nm]'); if (nm) { nm.style.fontStyle = on ? 'italic' : 'normal'; nm.style.fontSize = arco ? '20px' : '26px'; }
    });
    const i0 = Math.floor(p + 1e-6), fr = p - i0, ease = t => t * t * (3 - 2 * t);
    pv.querySelectorAll('[data-pv]').forEach(el => {
      const i = +el.getAttribute('data-pv'); let op = 0, z = 0, clip = 'none';
      if (i === i0) { op = 1; z = 1; }
      else if (i === i0 + 1 && fr > 0.001) { z = 2; if (this.rm) op = fr; else { op = 1; clip = this.espiralF(el, ease(fr)); } }
      el.style.opacity = op; el.style.visibility = op < 0.005 ? 'hidden' : 'visible'; el.style.zIndex = z; el.style.clipPath = clip;
    });
  }
  funcDown = e => {
    if (e.button > 0) return;
    const rd = e.currentTarget, o = this.fp, sc = rd.getBoundingClientRect().width / (rd.offsetWidth || 1) || 1, N = FUNCOES.length;
    o.drag = { x: e.clientX, y: e.clientY, p0: o.pt, mov: false, id: e.pointerId };
    const mv = ev => {
      const g = o.drag; if (!g) return;
      const dx = (ev.clientX - g.x) / sc, dy = (ev.clientY - g.y) / sc;
      if (!g.mov && Math.hypot(dx, dy) > 6) { if (this.fpArco && Math.abs(dy) > Math.abs(dx)) return fim(ev, true); g.mov = true; try { rd.setPointerCapture(g.id); } catch (er) {} rd.style.cursor = 'grabbing'; }
      if (!g.mov) return;
      ev.preventDefault();
      o.pt = Math.max(0, Math.min(N - 1, this.fpArco ? g.p0 - dx / (this.fpPasso || 200) : g.p0 - dy / 74)); this.kickF();
    };
    const fim = (ev, solto) => {
      const g = o.drag; o.drag = null; rd.style.cursor = 'grab';
      rd.removeEventListener('pointermove', mv); rd.removeEventListener('pointerup', fim); rd.removeEventListener('pointercancel', fim);
      if (solto || !g) return;
      if (g.mov) { this.irFuncao(Math.round(o.pt)); this.arrastouF = true; setTimeout(() => { this.arrastouF = false; }, 0); }
      this.kickF();
    };
    rd.addEventListener('pointermove', mv); rd.addEventListener('pointerup', fim); rd.addEventListener('pointercancel', fim);
  };
  funcKey = e => {
    const t = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!t) return; e.preventDefault(); this.irFuncao(Math.max(0, Math.min(FUNCOES.length - 1, (this.state.funcSel || 0) + t)));
  };
  irFuncao(i) {
    if (this.arrastouF) return;
    const g = this.funcSticky && this.funcGeo();
    if (!g) return this.escolherFuncao(i);
    this.fp.pt = i; this.fp.voo = true; this.kickF(); clearTimeout(this.vooT);
    const fimVoo = () => { this.fp.voo = false; this.calcFunc(); };
    this.vooT = setTimeout(fimVoo, this.rm ? 60 : 700);
    g.m.scrollTo({ top: g.ini + i / (FUNCOES.length - 1) * (g.fim - g.ini), behavior: this.rm ? 'auto' : 'smooth' });
  }
  revelar() {
    const m = this.mainRef.current; if (!m || this.rm || !window.IntersectionObserver) return;
    if (!this.revIO) this.revIO = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const el = e.target; this.revIO.unobserve(el); el.setAttribute('data-revelado', '');
      [...el.children].forEach((c, j) => { if (c.animate) c.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 720, delay: j * 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
    }), { root: m, threshold: 0.12 });
    m.querySelectorAll('[data-revela]:not([data-revelado])').forEach(el => this.revIO.observe(el));
  }
  escolherFuncao(i) { this.fp.pt = i; this.fp.wt = 0; this.kickF(); }
  landingVals(peso, reais) {
    const st = this.state, pr = st.papelEscolhido !== 'aluno', esc = st.papelEscolhido === 'escola';
    this.funcSticky = !this.rm && (this.props.dispositivo ?? 'Desktop') !== 'Celular' && st.largura >= 1060 && (st.altura || 800) >= 600 && !st.funcNaoCabe;
    const escolher = p => this.setState({ papelEscolhido: p, loginErro: '' });
    const irLogin = (p, e) => this.abrirMergulho(p, e);
    const me = reais.find(a => a.id === 1);
    const AV = 'var(--aviso)', TI = 'var(--texto)';
    const recP = [
      ['Painel', 'Quem está em risco, primeiro', 'O painel abre pelos alunos com média abaixo de 6 ou frequência abaixo de 75%, com o motivo escrito ao lado.'],
      ['Frequência', 'Chamada em um toque', 'Escolha o dia no calendário, marque presente ou ausente e salve. A frequência da turma se atualiza na hora.'],
      ['Boletim', 'Notas com peso, sem calculadora', 'Lance P1 e P2; a média ponderada aparece sozinha, com "(parcial)" enquanto falta nota.'],
      ['Disciplinas', 'Disciplinas e matrículas juntas', 'Crie a disciplina e matricule os alunos nela na mesma tela.'],
      ['Avisos', 'Um mural, não três grupos', 'Publique uma vez. Todos os alunos veem no próprio painel, do mais novo ao mais antigo.'],
      ['Teclado', 'De ponta a ponta sem mouse', 'Ctrl K busca qualquer coisa, Alt+1…6 troca de tela e as setas andam pelas listas.']
    ];
    const recA = [
      ['Boletim', 'Seu boletim, sempre em dia', 'Cada nota aparece assim que o professor lança, com a média de cada disciplina.'],
      ['Frequência', 'O aviso chega antes', 'Abaixo de 75% a disciplina fica marcada em marrom, enquanto ainda dá tempo de recuperar.'],
      ['Avisos', 'O mural da turma', 'Datas de prova e recados num lugar só, sem garimpar mensagem antiga.'],
      ['Privacidade', 'Só o que é seu', 'Você vê o seu boletim e a sua frequência. Nada de outro aluno, nada para apagar sem querer.'],
      ['Celular', 'Feito para a palma da mão', 'Abas fixas embaixo, alvos grandes, nenhuma rolagem para o lado.'],
      ['Situação', 'Sem letra miúda', 'Aprovado com média geral a partir de 6 e frequência a partir de 75%. Está escrito no topo do seu painel.']
    ];
    const ledP = [
      { grupo: 'Chamada', total: '~2 h', itens: [['Chamada no papel, aula por aula', '~1 h'], ['Passar tudo a limpo na planilha', '~1 h']] },
      { grupo: 'Notas', total: '~1 h 30', itens: [['Média ponderada na calculadora', '~1 h'], ['Descobrir quem ficou abaixo de 6', '~30 min']] },
      { grupo: 'Avisos', total: '~1 h 30', itens: [['O mesmo aviso em três grupos', '~1 h'], ['Explicar a data da prova de novo', '~30 min']] }
    ];
    const ledA = [
      { grupo: 'Notas', total: '~1 dia', itens: [['Esperar o professor responder a nota', '~1 dia'], ['Calcular se ainda dá para passar', '~30 min']] },
      { grupo: 'Frequência', total: '—', itens: [['Contar as próprias faltas de memória', '~20 min'], ['Descobrir o limite de faltas', '~10 min']] },
      { grupo: 'Avisos', total: '~30 min', itens: [['Achar a data da prova no grupo', '~20 min'], ['Perguntar de novo para a turma', '~10 min']] }
    ];
    const faqL = [
      ['Quem cria o meu acesso?', 'A secretaria cadastra professores e alunos. O acesso usa o e-mail da escola e uma senha.'],
      ['O aluno consegue alterar notas ou faltas?', 'Não. O aluno só lê o próprio boletim, a frequência e o mural. Lançar e editar é só do professor.'],
      ['Como a situação é calculada?', 'Aprovado quando a média geral é pelo menos 6 e a frequência geral é pelo menos 75%. Fora disso, a situação aparece como reprovado ou em risco.'],
      ['Funciona no celular?', 'Sim. No celular as telas viram abas fixas embaixo e todos os alvos têm pelo menos 44px.'],
      ['Os dados são reais?', 'Não. É um projeto de curso; alunos, notas e avisos são fictícios.']
    ];
    return {
      papeisL: [['escola', 'Escola', 'Sou da secretaria', 'Abrir o semestre, cadastrar professores, disciplinas e grade.'], ['prof', 'Professor', 'Sou professor', 'Lançar notas, fazer chamada, publicar avisos.'], ['aluno', 'Aluno', 'Sou aluno', 'Ver boletim, frequência e o mural da turma.']].map(([id, rotulo, titulo, desc]) => { const on = st.papelEscolhido === id; return { rotulo, titulo, desc, on, marca: on ? '●' : '○', cor: on ? 'var(--fundo)' : TI, ir: () => escolher(id) }; }),
      papeis: [['escola', 'Escola'], ['prof', 'Professor'], ['aluno', 'Aluno']].map(([id, label]) => { const on = st.papelEscolhido === id; return { label, on, peso: peso(on), cor: on ? 'var(--fundo)' : TI, ir: () => escolher(id) }; }),
      loginPlaceholder: pr ? 'professor@escola.com' : 'aluno@escola.com',
      continuarTxt: esc ? 'Continuar como escola' : pr ? 'Continuar como professor' : 'Continuar como aluno', demoEmail: esc ? 'escola@escola.com' : pr ? 'prof@escola.com' : 'ana@escola.com',
      continuar: e => irLogin(null, e), irLogin: e => irLogin(null, e), entrarProf: e => irLogin('prof', e), entrarAluno: e => irLogin('aluno', e),
      voltarInicio: () => this.fecharMergulho(),
      ledgerTitulo: pr ? 'O que some da semana do professor.' : 'O que some da semana do aluno.',
      ledgerSub: pr ? 'Estimativa de uma turma de 30 alunos e três disciplinas. Nunca entra no planejamento, mas sempre acontece.' : 'Pequenas esperas que se somam ao longo do semestre, e uma surpresa no fim.',
      ledgerTotal: pr ? '≈ 5 h' : '≈ 1 dia', ledgerUnidade: pr ? 'por semana' : 'por prova',
      ledger: (pr ? ledP : ledA).map(g => ({ grupo: g.grupo, total: g.total, itens: g.itens.map(([t, v]) => ({ t, v })) })),
      ledgerFim: pr ? 'Responder "professor, qual foi minha nota?"' : 'Descobrir a reprovação por falta', ledgerFimV: pr ? '∞' : 'tarde demais',
      recursosRotulo: pr ? 'Para o professor' : 'Para o aluno',
      verDemo: () => this.irSecao('demo'), funcRef: this.funcRef, funcSecRef: this.funcSecRef, funcMarca: this.funcMarca, funcStick: this.funcStick, funcN: String(FUNCOES.length).padStart(2, '0'),
      funcPos: this.funcSticky ? 'sticky' : 'relative', funcSecH: this.funcSticky ? 'calc(100vh + ' + (FUNCOES.length - 1) * 62 + 'vh)' : 'auto',
      funcDica: this.funcSticky ? 'Continue descendo: o mostrador gira e cada tela se abre em espiral sobre a anterior. Também dá para arrastar o mostrador ou clicar numa função.' : 'Arraste o mostrador ou toque numa função: a tela dela se abre em espiral sobre a anterior.', funcTotal: FUNCOES.length + ' no portal',
      funcoes: FUNCOES.map((f, i) => { const on = i === (st.funcSel || 0); return { n: String(i + 1).padStart(2, '0'), nome: f.nome, curto: f.curto, on, peso: peso(on), cor: on ? 'var(--fundo)' : TI, i, ir: () => this.irFuncao(i) }; }),
      funcRoda: this.funcRoda, funcDown: this.funcDown, funcKey: this.funcKey, rodaMinH: st.largura < 900 ? '150px' : '520px',
      fs: (() => { const i = Math.max(0, Math.min(FUNCOES.length - 1, st.funcSel | 0)), f = FUNCOES[i], r = { n: String(i + 1).padStart(2, '0'), nome: f.nome, titulo: f.titulo, desc: f.desc, prof: f.prof, aluno: f.aluno, passos: f.passos.map((t, j) => ({ n: String(j + 1), j: String(j), t })) }; for (let k = 0; k < FUNCOES.length; k++) r['m' + k] = k === i; return r; })(),
      recursos: (pr ? recP : recA).map(([tag, titulo, desc], i) => ({ n: String(i + 1).padStart(3, '0'), tag, titulo, desc })),
      previaPapel: pr ? 'professor' : 'aluno', previaTela: pr ? 'Alunos' : 'Meu painel',
      previa: pr ? reais.map(a => ({ nome: a.nome, sub: a.mat + ' · ' + a.idade + ' anos', tag: a.tag, tagCor: a.tagCor, tagBorda: a.tagBorda, v1: a.mediaTxt, c1: a.mediaCor, v2: a.freqTxt, c2: a.freqCor }))
        : (me ? this.boletim(me.id).map(d => { const o = this.fr(me.id, d.id); const f = o.t ? o.p / o.t : null; return { nome: d.nome, sub: d.avs.map(n => n.nome + ' ' + n.notaTxt).join(' · '), tag: f == null ? 'Sem chamada' : f < 0.75 ? 'Em risco' : 'Em dia', tagCor: f != null && f < 0.75 ? AV : f == null ? 'var(--texto-suave)' : TI, tagBorda: f != null && f < 0.75 ? AV : f == null ? 'var(--borda)' : TI, v1: d.mediaTxt === 'sem nota lançada' ? '—' : d.mediaTxt, c1: d.mediaCor, v2: f == null ? '—' : Math.round(f * 100) + '%', c2: f != null && f < 0.75 ? AV : TI }; }) : []),
      faq: faqL.map(([q, a], i) => { const ab = st.faqAberta === i; return { n: 'P.' + String(i + 1).padStart(3, '0'), q, a, aberta: ab, giro: ab ? 'rotate(45deg)' : 'none', alternar: () => this.setState({ faqAberta: ab ? -1 : i }) }; })
    };
  }

  renderVals() {
    const S0 = this.state, P = this.props;
    const meuProf = S0.papel === 'prof' ? S0.profs.find(p => p.id === S0.profId) || S0.profs[0] : null;
    const st = meuProf ? this.escopo(S0, meuProf.id) : S0; this.vst = st;
    const celular = (P.dispositivo ?? 'Desktop') === 'Celular';
    const compact = celular || st.largura < 720;
    const estadoP = P.estado ?? 'Normal';
    const E = { Vazio: 'vazio', Carregando: 'carregando', Erro: 'erro' }[estadoP] || null;
    const muitos = estadoP === 'Muitos itens';
    const sistema = (P.vista ?? 'Protótipo') === 'Sistema';
    const ehEscola = st.papel === 'escola', ehProf = ehEscola || st.papel === 'prof', tela = st.tela;
    const telaObj = this.telas().find(t => t.id === tela);
    const telaLabel = tela === 'meu-painel' ? 'Meu painel' : tela === 'semestre' ? 'Semestre' : telaObj ? telaObj.label : 'Entrar';
    const idx = this.telas().findIndex(t => t.id === tela);
    const v = {
      sistema, landing: !sistema && !st.logado && tela !== 'primeiro-acesso', primeiro: !sistema && !st.logado && tela === 'primeiro-acesso', semestre: !sistema && st.logado && tela === 'semestre', login: false, painel: !sistema && st.logado && tela === 'painel', alunos: !sistema && st.logado && tela === 'alunos',
      disciplinas: !sistema && st.logado && tela === 'disciplinas', seletor: !sistema && st.logado && tela === 'boletim',
      boletim: tela === 'boletim', frequencia: !sistema && st.logado && tela === 'frequencia',
      avisos: !sistema && st.logado && tela === 'avisos', professores: !sistema && st.logado && ehEscola && tela === 'professores', meu: !sistema && st.logado && tela === 'meu-painel'
    };
    const peso = on => on ? 600 : 500;
    const set = k => e => this.setState({ [k]: e.target.value });

    // alunos
    const base = st.alunos.concat(muitos && !meuProf ? EXTRAS.map((n, i) => ({ id: 100 + i, nome: n, mat: String(2026007 + i), idade: 18 + (i * 5) % 9, fixo: i % 9 === 4 ? { media: null, freq: null, linha: [] } : { media: ((i * 37) % 66 + 32) / 10, freq: 0.55 + ((i * 13) % 46) / 100, linha: [], presencas: 0, faltas: 0, comNota: 0 } })) : []);
    const todos = E === 'vazio' ? [] : base.map(a => this.vis(a));
    let lista = todos.filter(a => {
      const q = st.q.trim().toLowerCase();
      if (q && !a.nome.toLowerCase().includes(q) && !a.mat.includes(q)) return false;
      const im = parseInt(st.idadeMin, 10); if (!isNaN(im) && a.idade < im) return false;
      const mm = parseFloat(String(st.mediaMin).replace(',', '.')); if (!isNaN(mm) && !(a.s.media != null && a.s.media >= mm)) return false;
      return true;
    });
    const ord = st.ordem;
    lista.sort((x, y) => ord === 'media' ? (y.s.media ?? -1) - (x.s.media ?? -1) : ord === 'freq' ? (y.s.freq ?? -1) - (x.s.freq ?? -1) : ord === 'idade' ? x.idade - y.idade : x.nome.localeCompare(y.nome));
    const paginas = Math.max(1, Math.ceil(lista.length / 10)), pag = Math.min(st.pagina, paginas);
    const pagina = lista.slice((pag - 1) * 10, pag * 10);
    const comM = lista.filter(a => a.s.media != null), comF = lista.filter(a => a.s.freq != null);
    const alunosEstado = E && E !== 'vazio' ? E : pagina.length ? null : 'vazio';

    // painel
    const reais = st.alunos.map(a => this.vis(a));
    const risco = E === 'vazio' ? [] : reais.filter(a => a.motivo);
    const riscoEstado = E && E !== 'vazio' ? E : risco.length ? null : 'vazio';
    const mT = reais.filter(a => a.s.media != null), fT = reais.filter(a => a.s.freq != null);
    const mediaT = mT.length ? mT.reduce((x, a) => x + a.s.media, 0) / mT.length : null;
    const freqT = fT.length ? fT.reduce((x, a) => x + a.s.freq, 0) / fT.length : null;
    const semNota = st.avals.filter(av => !Object.keys(st.notas).some(k => k.endsWith('-' + av.id) && st.notas[k] != null)).map(av => ({ did: av.did, disc: (st.discs.find(d => d.id === av.did) || {}).nome, nome: av.nome, peso: av.peso })).filter(s => s.disc);

    // seletor (matrículas/boletim)
    const selA = reais.find(a => a.id === st.selAluno) || reais[0];
    const seletorEstado = E && E !== 'vazio' ? E : (E === 'vazio' || !reais.length) ? 'vazio' : null;
    const notaDiscs = selA ? st.discs.filter(d => st.mats[selA.id + '-' + d.id]) : [];
    const avalDisc = st.discs.find(d => d.id === +st.notaDisc) || st.discs[0];
    const avalsD = avalDisc ? st.avals.filter(a => a.did === avalDisc.id) : [];
    const soma = avalsD.reduce((x, a) => x + a.peso, 0);

    // semestre + agenda
    const sem = st.semestre, ativo = this.ativo(), bloqueado = !ativo, semNome = sem ? sem.nome : '—';
    const discNome = id => (st.discs.find(d => d.id === id) || {}).nome || '—';
    const ordH = (x, y) => (x.hora_inicio ? hm(x.hora_inicio) : 1e4) - (y.hora_inicio ? hm(y.hora_inicio) : 1e4);
    const listaCh = au => st.alunos.filter(a => st.mats[a.id + '-' + au.disciplina_id] || (au.chamada && au.chamada[a.id] != null));
    const infoAula = au => { const feita = !!au.chamada, vals = feita ? Object.values(au.chamada) : []; return { nome: discNome(au.disciplina_id), feita, presentes: vals.filter(Boolean).length, total: feita ? vals.length : listaCh(au).length }; };
    const quando = au => cap(DIA_L[dsem(au.data)]) + ', ' + br(au.data) + (au.hora_inicio ? ' · ' + au.hora_inicio + '–' + au.hora_fim : ' · sem horário');
    const expTxt = k => st.exportando === k ? 'Gerando…' : st.exportOk === k ? 'CSV baixado' : 'Exportar CSV';
    const agDia = st.agDia, agMes = st.agMes;
    const profDe = id => { const d = st.discs.find(x => x.id === id); return d && d.professor_id != null ? d.professor_id : null; };
    const agF = a => !ehEscola || ((!st.agDiscF || String(a.disciplina_id) === st.agDiscF) && (!st.agProfF || (st.agProfF === 'sem' ? profDe(a.disciplina_id) == null : String(profDe(a.disciplina_id)) === st.agProfF)));
    const doDia = E === 'vazio' ? [] : st.aulas.filter(a => a.data === agDia && agF(a)).sort(ordH);
    const agendaEstado = E && E !== 'vazio' ? E : doDia.length ? null : 'vazio';
    const agenda = doDia.map(au => {
      const inf = infoAula(au), canc = au.status === 'cancelada', futuro = au.data > HOJE, passado = au.data < HOJE;
      const s1 = canc ? ['Cancelada', 'var(--texto-suave)', 'var(--borda)', 'line-through'] : inf.feita ? ['Chamada feita (' + inf.presentes + '/' + inf.total + ')', TINTA, TINTA, 'none'] : passado ? ['Agendada · sem chamada', AVISO, AVISO, 'none'] : ['Agendada', 'var(--texto-suave)', 'var(--borda)', 'none'];
      let ac = null;
      if (canc) { if (ativo) ac = ['Reativar', () => this.setStatus(au.aula_id, 'agendada'), false]; }
      else if (inf.feita) ac = ['Ver chamada', () => this.abrirChamada(au), false];
      else if (!futuro && ativo) ac = ['Fazer chamada', () => this.abrirChamada(au), true];
      const menu = !ativo ? [] : [
        canc ? { label: 'Reativar aula', ir: () => this.setStatus(au.aula_id, 'agendada') } : { label: 'Cancelar aula', off: inf.feita, dica: inf.feita ? 'Aula já tem presenças.' : '', ir: () => { if (inf.feita) return this.setState({ menuAula: null, agErro: 'Aula já tem presenças: ' + inf.nome + ' de ' + ddmm(au.data) + ' não pode ser cancelada.' }); this.setState({ agErro: '' }); this.setStatus(au.aula_id, 'cancelada'); } },
        { label: 'Remarcar', ir: () => this.abrirRemarcar(au) }
      ].map(m => ({ label: m.label, ir: m.ir, op: m.off ? 0.45 : 1, dica: m.dica || '', cursor: m.off ? 'not-allowed' : 'pointer', aria: m.off ? 'true' : 'false' }));
      const ab = st.menuAula === au.aula_id;
      const pId = profDe(au.disciplina_id), pObj = pId != null && st.profs.find(p => p.id === pId);
      return { temProf: ehEscola, profTxt: pObj ? pObj.nome : 'Sem professor', profCor: pObj ? 'var(--texto-suave)' : AVISO, hIni: au.hora_inicio || '—', hFim: au.hora_fim || 'sem horário', nome: inf.nome, extra: au.origem === 'extra', temMeta: !!au.remarcada_de, meta: au.remarcada_de ? 'Remarcada de ' + ddmm(au.remarcada_de) : '',
        nomeCor: canc ? 'var(--texto-suave)' : TINTA, nomeRisco: canc ? 'line-through' : 'none', stTxt: s1[0], stCor: s1[1], stBorda: s1[2], stRisco: s1[3],
        temAcao: !!ac, acaoTxt: ac ? ac[0] : '', acao: ac ? ac[1] : null, acaoBg: ac && ac[2] ? TINTA : 'var(--superficie)', acaoCor: ac && ac[2] ? 'var(--fundo)' : TINTA, acaoBorda: ac && ac[2] ? TINTA : 'var(--borda)',
        temMenu: menu.length > 0, menu, menuAberto: ab, menuAria: ab ? 'true' : 'false', alternarMenu: () => this.setState({ menuAula: ab ? null : au.aula_id }) };
    });
    const porData = {}; st.aulas.forEach(a => { if (a.data.slice(0, 7) === agMes && agF(a)) (porData[a.data] = porData[a.data] || []).push(a); });
    const cy = +agMes.slice(0, 4), cm = +agMes.slice(5, 7), nDias = new Date(Date.UTC(cy, cm, 0)).getUTCDate();
    const cal = []; for (let i = 1; i < dsem(agMes + '-01'); i++) cal.push({ ehDia: false, vazio: true });
    let aulasMes = 0;
    for (let d = 1; d <= nDias; d++) {
      const ds = agMes + '-' + String(d).padStart(2, '0'), aus = (porData[ds] || []).slice().sort(ordH), on = ds === agDia, hj = ds === HOJE, tem = aus.length > 0;
      aulasMes += aus.filter(a => a.status !== 'cancelada').length;
      cal.push({ ehDia: true, vazio: false, n: String(d), on, hoje: hj ? 'date' : 'false',
        pontos: aus.slice(0, 3).map(a => a.status === 'cancelada' ? { w: '8px', h: '2px', r: '0', bg: 'currentColor' } : a.chamada ? { w: '6px', h: '6px', r: '50%', bg: 'currentColor' } : { w: '6px', h: '6px', r: '50%', bg: 'transparent' }),
        temMais: aus.length > 3, mais: '+' + (aus.length - 3),
        cor: on ? 'var(--fundo)' : tem || hj ? TINTA : 'var(--texto-suave)', borda: on || hj ? TINTA : tem ? 'var(--borda)' : 'transparent', peso: tem || hj ? 600 : 400, sub: hj ? 'underline' : 'none',
        label: d + ' de ' + MESES[cm - 1] + (hj ? ', hoje' : '') + ': ' + (tem ? aus.length + (aus.length === 1 ? ' aula' : ' aulas') : 'sem aula'), escolher: () => this.irDia(ds) });
    }
    while (cal.length % 7) cal.push({ ehDia: false, vazio: true });
    const aulasSem = st.aulas.filter(a => a.status !== 'cancelada'), ateHoje = aulasSem.filter(a => a.data <= HOJE), comCh = aulasSem.filter(a => a.chamada).length;
    const nSemanas = sem ? Math.max(1, Math.ceil((pD(sem.fim) - pD(sem.inicio) + 864e5) / 6048e5)) : 0;
    const semanaAt = sem ? Math.min(nSemanas, Math.max(1, Math.floor((pD(HOJE) - pD(sem.inicio)) / 6048e5) + 1)) : 0;

    // avisos
    const avBase = (E === 'vazio' ? [] : st.avisos.concat(muitos ? Array.from({ length: 14 }, (_, i) => ({ id: 900 + i, titulo: `Lembrete semanal nº ${i + 1}`, data: `2026-09-${String(19 - i).padStart(2, '0')}`, msg: 'Revisem o conteúdo da semana e tragam dúvidas para a próxima aula.' })) : []));
    const avF = avBase.filter(a => a.titulo.toLowerCase().includes(st.avisoQ.trim().toLowerCase())).sort((x, y) => y.data.localeCompare(x.data));
    const avPags = Math.max(1, Math.ceil(avF.length / 10)), avPag = Math.min(st.avisoPagina, avPags);
    const avP = avF.slice((avPag - 1) * 10, avPag * 10).map(a => Object.assign({}, a, { dataBR: br(a.data), escopo: a.disciplina_id ? discNome(a.disciplina_id) : 'Geral', autor: a.autor_nome || 'Secretaria', podeMexer: ehEscola || (!!meuProf && a.autor_id === meuProf.id), excluir: () => this.setState(s => ({ avisos: s.avisos.filter(x => x.id !== a.id) })), editar: () => this.abrirPainel({ tipo: 'aviso', id: a.id }, { fNome: a.titulo, fData: a.data, fTexto: a.msg }) }));
    const avisosEstado = E && E !== 'vazio' ? E : avP.length ? null : 'vazio';

        const profNome = d => { const p = d.professor_id != null && st.profs.find(x => x.id === d.professor_id); return p ? p.nome : 'Sem professor'; };
    const discF = E === 'vazio' ? [] : st.discs.filter(d => d.nome.toLowerCase().includes(st.discQ.trim().toLowerCase()) && (!st.discProfF || (st.discProfF === 'sem' ? d.professor_id == null : String(d.professor_id) === st.discProfF)));
    const discEstado = E && E !== 'vazio' ? E : !discF.length ? 'vazio' : null;
    const selD = discF.find(d => d.id === st.selDisc) || discF[0];
    const ddAl = selD ? reais.filter(a => st.mats[a.id + '-' + selD.id]) : [];
    const ddAlunos = ddAl.map(a => {
      const m = this.discMedia(a.id, selD.id), o = this.fr(a.id, selD.id), f = o.t ? o.p / o.t : null, k = a.id + '-' + selD.id, conf = st.confDesm === k, er = st.desmErro && st.desmErro.k === k ? st.desmErro.t : '';
      return { nome: a.nome, mat: a.mat, iniciais: ini(a.nome), mediaTxt: m ? fmt(m.m) : '—', mediaCor: m && m.m < 6 ? AVISO : TINTA, freqTxt: f == null ? '—' : pct(f), freqCor: f != null && f < 0.75 ? AVISO : TINTA,
        abrir: () => this.abrirPainel({ tipo: 'aluno', id: a.id }), normal: !conf, confirmando: conf, erro: er, temErro: !!er, podeDesm: ehEscola && !bloqueado, desmLabel: 'Desmatricular ' + a.nome + ' de ' + selD.nome,
        pedirDesm: e => { e.stopPropagation(); this.setState({ confDesm: k, desmErro: null }); }, cancelarDesm: () => this.setState({ confDesm: null }), confirmarDesm: () => this.desmatricular(a.id, selD.id) };
    });
    let dd = {};
    if (selD) {
      const ms = ddAl.map(a => this.discMedia(a.id, selD.id)).filter(Boolean).map(x => x.m);
      let tp = 0, ta = 0; ddAl.forEach(a => { const o = this.fr(a.id, selD.id); tp += o.p; ta += o.t; });
      const mm = ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : null, ff = ta ? tp / ta : null;
      const nav = st.avals.filter(a => a.did === selD.id).length, nAu = st.aulas.filter(a => a.disciplina_id === selD.id && a.status !== 'cancelada').length;
      const slug = selD.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
      dd = { prof: profNome(selD), profCor: selD.professor_id == null ? AVISO : TINTA, nome: selD.nome, meta: selD.carga_horaria + 'h · ' + nav + (nav === 1 ? ' avaliação' : ' avaliações') + ' · ' + nAu + (nAu === 1 ? ' aula' : ' aulas') + ' no semestre', gradeTxt: gradeTxt(selD.grade), semGrade: !(selD.grade || []).length,
        editar: () => this.abrirDisc(selD), alunos: String(ddAl.length), alunosTxt: ddAl.length + ' de ' + reais.length,
        mediaTxt: mm == null ? '—' : fmt(mm), mediaCor: mm != null && mm < 6 ? AVISO : TINTA, freqTxt: ff == null ? '—' : pct(ff), freqCor: ff != null && ff < 0.75 ? AVISO : TINTA,
        excluir: () => this.excluirDisc(selD.id),
        exportar: () => this.exportar('disc', 'frequencia-' + slug + '-' + semNome + '.csv', [['Aluno', 'Matrícula', 'Presenças', 'Aulas com chamada', 'Frequência', 'Média']].concat(ddAl.map(a => { const o = this.fr(a.id, selD.id), m = this.discMedia(a.id, selD.id); return [a.nome, a.mat, o.p, o.t, o.t ? pct(o.p / o.t) : '', m ? fmt(m.m) : '']; }))),
        exportTxt: expTxt('disc'), exportO: st.exportando === 'disc' ? 0.6 : 1 };
    }
    // meu painel
    const me = reais.find(a => a.id === 1) || reais[0] || this.vis(ALUNOS0[0]);
    const meBol = E === 'vazio' ? [] : this.boletim(me.id);
    const proximas = st.aulas.filter(a => a.data >= HOJE && a.status !== 'cancelada' && st.mats[me.id + '-' + a.disciplina_id]).sort((x, y) => x.data.localeCompare(y.data) || ordH(x, y)).slice(0, 5)
      .map(a => ({ quando: a.data === HOJE ? 'Hoje' : DIA_C[dsem(a.data)] + ' ' + ddmm(a.data), hora: a.hora_inicio ? a.hora_inicio + '–' + a.hora_fim : 'sem horário', nome: discNome(a.disciplina_id), extra: a.origem === 'extra' }));

    // painel lateral
    const pu = st.painel || st.painelUlt || {};
    const paAl = pu.tipo === 'aluno' ? (todos.find(a => a.id === pu.id) || reais.find(a => a.id === pu.id)) : null;
    const chAu = pu.tipo === 'chamada' ? st.aulas.find(a => a.aula_id === pu.id) : null;
    const rmAu = pu.tipo === 'remarcar' ? st.aulas.find(a => a.aula_id === pu.id) : null;
    const aberto = !!st.painel;
    const pTr = aberto ? `transform 420ms var(--mola-lenta), opacity 160ms linear, visibility 0s` : `transform 160ms cubic-bezier(.4,0,1,1), opacity 160ms linear, visibility 0s 160ms`;
    const fechadoT = this.rm ? 'none' : compact ? 'translateY(100%)' : 'translateX(100%)';

    return {
      frameRef: this.frameRef, mainRef: this.mainRef, telaRef: this.telaRef, veu: !!st.veu, veuRef: this.veuRef,
      backdrop: celular ? 'var(--sunken)' : 'var(--fundo)', frameW: celular ? '390px' : '100%', frameH: celular ? '844px' : '100vh', frameBorda: celular ? '1px solid var(--borda)' : '0',
      v, logado: st.logado && !sistema, ehProf, desk: !compact, compact, navDesk: ehProf && !compact,
      buscaVisivel: ehProf && !compact, telaLabel, setasVis: ehProf && !compact,
      seloVis: ehEscola && st.logado && !sistema, seloTxt: !sem ? 'Sem semestre' : (compact ? '' : 'Semestre ') + sem.nome + (sem.encerrado_em ? ' · encerrado' : ''),
      seloOn: tela === 'semestre' ? 'page' : 'false', seloBg: tela === 'semestre' ? TINTA : 'var(--superficie)', seloCor: tela === 'semestre' ? 'var(--fundo)' : ativo ? TINTA : AVISO, seloBorda: tela === 'semestre' ? TINTA : ativo ? 'var(--borda)' : AVISO, seloPontoO: ativo ? 1 : 0,
      irSemestre: () => this.ir('semestre'), bloqueado: bloqueado && st.logado, podeEditar: !bloqueado,
      bloqueioTxt: sem && sem.encerrado_em ? 'Semestre encerrado em ' + br(sem.encerrado_em) + ': somente leitura.' : 'Sem semestre ativo.',
      menuUser: !!st.menuUser, alternarMenuUser: () => this.setState(s => ({ menuUser: !s.menuUser })), abrirTrocarSenha: () => this.abrirPainel({ tipo: 'senha' }), popRef: this.popRef,
      usuarioEmail: ehEscola ? 'escola@escola.com' : meuProf ? meuProf.email : 'ana@escola.com', usuarioIniciais: ehEscola ? 'SE' : meuProf ? ini(meuProf.nome) : 'AS',
      usuarioNome: ehEscola ? 'Secretaria' : meuProf ? meuProf.nome : 'Ana Souza', rotuloPerfil: ehEscola ? 'Escola' : ehProf ? 'Professor' : 'Aluno',
      telaAnterior: () => this.ir(this.telas()[(idx + this.telas().length - 1) % this.telas().length].id), telaProxima: () => this.ir(this.telas()[(idx + 1) % this.telas().length].id),
      sair: () => this.setState({ logado: false, papel: null, tela: 'login', painel: null, loginSenha: '', menuUser: false }),
      abrirNav: () => this.setState({ navAberta: true }), fecharNav: () => this.setState({ navAberta: false }),
      navO: st.navAberta ? 1 : 0, navT: st.navAberta || this.rm ? 'none' : 'translateY(-6px)', navPE: st.navAberta ? 'auto' : 'none',
      abas: this.telas().map((t, i) => ({ label: t.label, atalho: 'Alt ' + (i + 1), on: t.id === tela, peso: peso(t.id === tela), ir: () => this.ir(t.id) })),
      abasInferiores: compact && ehProf && st.logado && !sistema,
      abasBaixo: (() => { const TL = this.telas(), ids = TL.length > 5 ? ['painel', 'disciplinas', 'alunos', 'frequencia'] : TL.map(t => t.id), resto = TL.filter(t => !ids.includes(t.id)); return ids.map(id => { const t = TL.find(x => x.id === id); const on = id === tela; return { label: t.label, on, peso: peso(on), cor: on ? TINTA : 'var(--texto-suave)', ir: () => this.ir(id) }; }).concat(resto.length ? [{ label: 'Mais', on: resto.some(t => t.id === tela), peso: 500, cor: 'var(--texto-suave)', ir: () => this.abrirPainel({ tipo: 'mais' }) }] : []); })(),
      abasMais: (() => { const TL = this.telas(), ids = TL.length > 5 ? ['painel', 'disciplinas', 'alunos', 'frequencia'] : TL.map(t => t.id); return TL.filter(t => !ids.includes(t.id)).map(t => ({ label: t.label, peso: t.id === tela ? 600 : 400, ir: () => this.ir(t.id) })); })(),

      // sistema
      escalaEspaco: [[4, 'ícone ↔ texto'], [8, 'rótulo ↔ campo'], [12, 'entre campos, chips'], [16, 'padding de linha, --espaco'], [24, 'entre blocos'], [32, 'cabeçalho ↔ conteúdo'], [48, 'entre seções'], [64, 'respiro final']].map(([n, uso], i) => ({ px: n + 'px', nome: `s${i + 1} · ${n}px`, uso })),
      molasDemo: [
        { nome: 'fast', tier: 'fast', param: 'rigidez 1500 · amortecimento 1,0 · ≈ 80 ms', uso: 'Destaque de hover, foco', celulas: ['A', 'B', 'C', 'D'] },
        { nome: 'moderate', tier: 'moderate', param: 'rigidez 620 · amortecimento 0,82 · ≈ 160 ms', uso: 'Abas, segmentado, seleção', celulas: ['A', 'B', 'C', 'D'] },
        { nome: 'slow', tier: 'slow', param: 'rigidez 320 · amortecimento 0,78 · ≈ 240 ms, folga 2%', uso: 'Painel lateral, folhas', celulas: ['A', 'B', 'C', 'D'] }
      ],
      componentes: [
        { nome: 'ListaFluida', desc: 'Contêiner [data-fluid] de linhas, cartões ou células. Um único destaque --sunken por grupo.', mola: 'fast', anima: 'transform (translate + scale) do destaque até o item mais perto do cursor, inclusive nas lacunas; fade 80 ms na entrada, 60 ms na saída. Clique na lacuna aciona o item aceso.', reduz: 'Destaque salta para o item; só o fade permanece.' },
        { nome: 'Abas', desc: 'Topo (6 telas). Barra de 2px sob a aba ativa.', mola: 'moderate', anima: 'Barra desliza por transform; rótulo vai de 500 para 600 com largura reservada (sem empurrar vizinhos). Setas ←/→ mudam a aba.', reduz: 'Barra troca de lugar sem deslizar.' },
        { nome: 'Segmentado', desc: 'Ordenação, Presente/Ausente. Bloco preto sob a opção ativa, texto vira --fundo.', mola: 'moderate', anima: 'Bloco desliza e muda de largura por scale; cor do texto em 160 ms.', reduz: 'Troca instantânea, cor em fade curto.' },
        { nome: 'SeletorAlunos', desc: 'Lista sempre visível no Boletim, primeiro aluno pré-selecionado. A lista de disciplinas usa o mesmo padrão.', mola: 'fast + moderate', anima: 'Hover fluido por cima; seleção preta desliza entre linhas.', reduz: 'Sem deslizamento.' },
        { nome: 'PainelLateral', desc: 'Detalhe do aluno e cadastros. Direita no desktop (440px), folha de baixo no celular. Esc fecha.', mola: 'slow', anima: 'Entrada por transform com mola lenta (folga 2%); saída em tween de 160 ms, sem reverter a entrada. Fundo escurece por opacity.', reduz: 'Só fade de opacidade.' },
        { nome: 'BarraDeProgresso', desc: 'Média (0–10) e frequência (0–100%). Marrom abaixo do mínimo; marca fina no limite.', mola: 'moderate', anima: 'Preenchimento por scaleX quando o valor muda (nota lançada, chamada salva).', reduz: 'Valor final direto.' },
        { nome: 'TagSituacao', desc: 'Aprovado (contorno tinta), Reprovado (contorno marrom), Sem dados (contorno --borda).', mola: '—', anima: 'Nada. Muda de estado sem animar.', reduz: '—' },
        { nome: 'MiniGrafico', desc: 'Presenças recentes: barra alta = presente, baixa e marrom = falta.', mola: '—', anima: 'Estático.', reduz: '—' },
        { nome: 'Indicador', desc: 'Número grande em Newsreader numa grade de filetes de 1px. Clicável: leva à tela do dado.', mola: 'fast', anima: 'Participa da ListaFluida.', reduz: 'Igual à ListaFluida.' },
        { nome: 'Campo', desc: 'Rótulo em caixa alta + input 1px. Erro em linha reservada de 20px: o layout não pula.', mola: '—', anima: 'Borda vira tinta no foco; mensagem de erro em fade de 120 ms.', reduz: 'Igual.' },
        { nome: 'CartaoDeAviso', desc: 'Título serifado, data DD/MM/AAAA, mensagem, Excluir.', mola: 'fast', anima: 'Participa da ListaFluida do mural.', reduz: 'Igual à ListaFluida.' },
        { nome: 'EstadoLista', desc: 'Vazio, carregando (esqueleto estático, sem loop) e erro com "Tentar de novo".', mola: '—', anima: 'Nada.', reduz: '—' },
        { nome: 'Foco', desc: 'Anel de 3px, offset 2px, --texto, só com :focus-visible. Setas navegam dentro de listas, abas e calendário.', mola: 'fast', anima: 'Destaque da lista segue o foco do teclado.', reduz: 'Igual.' },
        { nome: 'AgendaDoDia', desc: 'Aulas de um dia, de todas as disciplinas, por horário. Seletor anterior / hoje / próximo e botão Aula extra.', mola: 'moderate', anima: 'Trocar de dia: a lista entra em fade com deslize de 8px na direção do dia escolhido.', reduz: 'Só o fade.' },
        { nome: 'LinhaDeAula', desc: 'Hora, disciplina, selo Extra, StatusDaAula e a ação certa: Fazer chamada, Ver chamada ou Reativar. Menu ⋯ ao lado.', mola: 'fast', anima: 'Participa do Fluid Hover da lista.', reduz: 'Destaque salta, sem deslizar.' },
        { nome: 'StatusDaAula', desc: 'Agendada (contorno --borda) · Chamada feita (presentes/total, tinta) · Cancelada (riscada). Aula passada sem chamada fica marrom.', mola: '—', anima: 'Nada. Troca de estado sem animar.', reduz: '—' },
        { nome: 'CalendarioDoMes', desc: 'Mês com ‹ ›. Dia atual sublinhado, dia escolhido em preto, dias sem aula discretos. Clicar troca a agenda.', mola: 'fast + moderate', anima: 'Hover fluido entre os dias; a seleção desliza em 2D.', reduz: 'Sem deslizamento.' },
        { nome: 'PontoDeDisciplina', desc: 'Um por aula do dia, até 3 e depois +N. Cheio = chamada feita, contorno = pendente, traço = cancelada.', mola: '—', anima: 'Estático; inverte de cor junto com o dia selecionado.', reduz: '—' },
        { nome: 'MenuDaAula', desc: 'Cancelar aula, Reativar, Remarcar. Fecha com Esc ou clique fora.', mola: 'fast', anima: 'Entra com fade e 4px de deslize em 160 ms; itens com Fluid Hover.', reduz: 'Aparece sem deslocamento.' },
        { nome: 'EditorDeGrade', desc: 'Lista de LinhaDeGrade (dia da semana, início, fim) com Adicionar horário. Salvar gera as aulas do semestre e mostra "N aulas geradas".', mola: 'slow', anima: 'Entra com o painel lateral; linhas com Fluid Hover.', reduz: 'Só fade do painel.' },
        { nome: 'LinhaDeGrade', desc: 'Dia, início, fim e remover. Validação em linha: fim depois do início, choque com outra disciplina.', mola: '—', anima: 'Borda marrom e mensagem em linha reservada; o layout não pula.', reduz: 'Igual.' },
        { nome: 'CaixaSenhaProvisoria', desc: 'Senha provisória mostrada uma única vez, com Copiar. Aparece ao criar acesso e ao redefinir senha.', mola: '—', anima: 'Nada.', reduz: '—' },
        { nome: 'PaginaDaDisciplina', desc: 'Centro de trabalho da disciplina: cabeçalho, números, grade (só leitura para o professor) e SubAbas.', mola: 'moderate', anima: 'Troca de disciplina com fade curto.', reduz: 'Só o fade.' },
        { nome: 'SubAbas', desc: 'Alunos · Chamada · Avaliações e notas · Avisos da turma. Barra única desliza para a aba ativa; rótulo 500→600 sem mover vizinhos.', mola: 'moderate', anima: 'Conteúdo troca por fade de 160 ms.', reduz: 'Fade sem deslize da barra.' },
        { nome: 'GradeDeNotas', desc: 'Aluno × avaliação. Cada célula lança a nota (Enter ou sair do campo salva) e o × limpa. Média ponderada com "parcial".', mola: 'fast', anima: 'Fluid Hover nas linhas.', reduz: 'Destaque sem deslize.' },
        { nome: 'SeloDeEscopo', desc: '"Geral" ou o nome da disciplina em cada aviso, com o autor ao lado.', mola: '—', anima: 'Não anima.', reduz: '—' },
        { nome: 'EstadoSemPermissao', desc: '"Esta disciplina é de outro professor", com botão de voltar. Nunca mostra erro técnico.', mola: '—', anima: 'Entra com a tela.', reduz: '—' },
        { nome: 'FaixaSemestreEncerrado', desc: '"Semestre encerrado em DD/MM/AAAA: somente leitura" no topo das telas ligadas ao semestre; as ações ficam desabilitadas com o motivo.', mola: '—', anima: 'Não anima.', reduz: '—' },
        { nome: 'RotuloDePerfil', desc: 'Selo "Escola", "Professor" ou "Aluno" ao lado do nome, no menu do avatar.', mola: '—', anima: 'Nada.', reduz: '—' },
        { nome: 'FaixaDePendencias', desc: 'No painel da Escola: disciplinas sem professor, sem grade e semestre sem matrículas. Cada item leva à tela que resolve.', mola: 'fast', anima: 'Fluid Hover nos itens.', reduz: 'Destaque sem deslize.' },
        { nome: 'LinhaDeProfessor', desc: 'Nome, e-mail, disciplinas em chips (ou "Sem disciplina") e Redefinir senha.', mola: 'fast', anima: 'Fluid Hover na lista.', reduz: 'Destaque sem deslize.' },
        { nome: 'SeletorDeProfessor', desc: 'Lista de professores + "Sem professor" no painel da disciplina. Um preenchimento único desliza até o escolhido.', mola: 'moderate', anima: 'Preenchimento desliza; rótulo 500→600 sem mover vizinhos.', reduz: 'Troca sem deslize.' },
        { nome: 'ResumoDeSemestre', desc: 'Por disciplina: alunos, média da turma, frequência média, aprovados e reprovados. Na confirmação de encerrar e no histórico.', mola: '—', anima: 'Sem animação decorativa na confirmação de encerrar.', reduz: '—' }
      ],

      // apresentação
      ...this.landingVals(peso, reais),
      naoLanding: !v.landing && !v.primeiro,
      ...(() => { const mg = st.mg, ab = !!mg && mg.fase === 'aberto'; return {
        mgT: mg ? mg.T + 'px' : '0px', mgL: mg ? mg.L + 'px' : '0px', mgW: mg ? mg.W + 'px' : '100%', mgH: mg ? mg.H + 'px' : '100%', mgZ: mg ? 5 : 0,
        mgClip: mg ? 'inset(' + mg.clip.map(n => Math.round(n) + 'px').join(' ') + ')' : 'none',
        mgTr: 'none',
        mgOp: mg && mg.op === 0 ? 0 : 1, mgOverflow: mg ? 'visible' : 'hidden', navLO: mg ? 0 : 1, navLPE: mg ? 'none' : 'auto', mainOverflow: mg ? 'hidden' : 'auto',
        loginVis: !!mg, cardO: ab ? 1 : 0, cardPE: ab ? 'auto' : 'none', cardT: 'none' }; })(), heroH: celular ? '844px' : '100vh', ringH: compact ? '440px' : 'auto', ringRef: this.setRing,
      heroStats: [['Turma 2026', 'left'], ['Alunos: ' + reais.length, 'center'], ['Disciplinas: ' + st.discs.length, 'right'], ['Avisos: ' + st.avisos.length, 'left'], ['Média: ' + (mediaT == null ? '—' : fmt(mediaT)), 'center'], ['Em risco: ' + risco.length, 'right']].map(([t, al]) => ({ t, al })),
      navL: (compact ? [['Funções', 'recursos'], ['Perguntas', 'perguntas'], ['Entrar', null]] : [['Sem o portal', 'sem-portal'], ['Funções', 'recursos'], ['Em uso', 'demo'], ['Perguntas', 'perguntas'], ['Entrar', null]]).map(([label, id]) => ({ label, ir: () => id ? this.irSecao(id) : this.setState({ tela: 'login' }) })),
      saibaMais: () => this.irSecao('sem-portal'),

      // login
      loginEmail: st.loginEmail, loginSenha: st.loginSenha, loginErro: st.loginErro || ' ', loginErroO: st.loginErro ? 1 : 0,
      setLoginEmail: set('loginEmail'), setLoginSenha: set('loginSenha'),
      entrar: e => { e.preventDefault(); const em = st.loginEmail.trim().toLowerCase(), pf = st.profs.find(p => p.email === em);
        const papel = em === 'escola@escola.com' ? 'escola' : pf ? 'prof' : st.alunos.some(a => a.email && a.email === em) ? 'aluno' : st.papelEscolhido;
        const al = st.alunos.find(a => a.email && a.email === em);
        if ((pf && pf.provisoria) || (papel === 'aluno' && al && al.provisoria)) { this.limparMg(); return this.setState({ mg: null, tela: 'primeiro-acesso', primeiroEmail: em, primeiroPapel: papel, profId: pf ? pf.id : null, sNova: '', sConf: '', fErro: '', loginErro: '' }); }
        this.setState({ profId: pf ? pf.id : papel === 'prof' ? 1 : null }, () => this.entrarAnimado(papel)); },
      demos: [{ papel: 'Escola', email: 'escola@escola.com', p: 'escola' }, { papel: 'Prof. Carlos', email: 'prof@escola.com', p: 'prof' }, { papel: 'Profa. Marta', email: 'marta@escola.com', p: 'prof' }, { papel: 'Aluna', email: 'ana@escola.com', p: 'aluno' }].map(d => ({ papel: d.papel, email: d.email, usar: () => this.setState({ loginEmail: d.email, loginSenha: 'escola123', loginErro: '', papelEscolhido: d.p }) })),

      // painel
      riscoResumo: risco.length === 1 ? '1 aluno em risco' : `${risco.length} alunos em risco`,
      riscoTitulo: meuProf ? 'Seus alunos em risco' : 'Em risco', riscoMediaRot: meuProf ? 'Média na sua disciplina' : 'Média', riscoFreqRot: meuProf ? 'Freq. na sua disciplina' : 'Freq.',
      rankingVis: !meuProf, painelProf: !!meuProf, semNotaTitulo: meuProf ? 'Avaliações suas sem nota' : 'Avaliações sem nenhuma nota',
      ...(() => {
        if (!meuProf) return { hojeAulas: [], temHoje: false, semHoje: false, hojeTxt: '', hojeVazioMsg: '' };
        const hj = E === 'vazio' ? [] : st.aulas.filter(a => a.data === HOJE).sort(ordH);
        const L = hj.map(au => { const inf = infoAula(au), canc = au.status === 'cancelada';
          const s1 = canc ? ['Cancelada', 'var(--texto-suave)', 'var(--borda)', 'line-through'] : inf.feita ? ['Chamada feita (' + inf.presentes + '/' + inf.total + ')', TINTA, TINTA, 'none'] : ['Chamada pendente', AVISO, AVISO, 'none'];
          const ac = canc ? null : inf.feita ? ['Ver chamada', () => this.abrirChamada(au), false] : ativo ? ['Fazer chamada', () => this.abrirChamada(au), true] : null;
          return { hora: au.hora_inicio ? au.hora_inicio + '–' + au.hora_fim : 'sem horário', nome: inf.nome, stTxt: s1[0], stCor: s1[1], stBorda: s1[2], stRisco: s1[3], temAcao: !!ac, acaoTxt: ac ? ac[0] : '', acao: ac ? ac[1] : null, acaoBg: ac && ac[2] ? TINTA : 'var(--superficie)', acaoCor: ac && ac[2] ? 'var(--fundo)' : TINTA, acaoBorda: ac && ac[2] ? TINTA : 'var(--borda)' }; });
        return { hojeAulas: L, temHoje: L.length > 0, semHoje: !L.length, hojeTxt: cap(DIA_L[dsem(HOJE)]) + ', ' + ddmm(HOJE), hojeVazioMsg: !st.discs.length || E === 'vazio' ? 'Você ainda não tem disciplinas neste semestre. Fale com a secretaria.' : 'Nenhuma aula sua hoje.' };
      })(),
      riscoContagem: `${risco.length} de ${reais.length}`, risco, riscoOk: !riscoEstado, riscoEstado,
      ranking: reais.filter(a => a.s.media != null).sort((x, y) => y.s.media - x.s.media).slice(0, 5).map((a, i) => Object.assign(a, { pos: i + 1 + 'º' })),
      indicadores: [
        { rotulo: 'Alunos', valor: String(reais.length), sub: 'matriculados na turma', cor: TINTA, ir: () => this.ir('alunos') },
        { rotulo: 'Média da turma', valor: mediaT == null ? '—' : fmt(mediaT), sub: 'mínimo para aprovar: 6,0', cor: mediaT != null && mediaT < 6 ? AVISO : TINTA, ir: () => this.ir('boletim') },
        { rotulo: 'Frequência média', valor: freqT == null ? '—' : pct(freqT), sub: 'mínimo: 75%', cor: freqT != null && freqT < 0.75 ? AVISO : TINTA, ir: () => this.ir('frequencia') },
        ehEscola ? { rotulo: 'Disciplinas', valor: String(st.discs.length), sub: 'no semestre ' + semNome, cor: TINTA, ir: () => this.ir('disciplinas') } : { rotulo: 'Avaliações sem nota', valor: String(semNota.length), sub: semNota.length ? 'aguardando lançamento' : 'tudo lançado', cor: semNota.length ? AVISO : TINTA, ir: () => this.ir('boletim') }
      ],
      ...(() => {
        if (!ehEscola) return { temPend: false, pendencias: [], pendTxt: '' };
        const sp = st.discs.filter(d => d.professor_id == null), sg = st.discs.filter(d => !(d.grade || []).length), semMat = !!ativo && st.discs.length > 0 && !Object.keys(st.mats).some(k => st.mats[k]);
        const pl = (n, a, b) => n + ' ' + (n === 1 ? a : b);
        const L = [];
        if (sp.length) L.push({ txt: pl(sp.length, 'disciplina sem professor', 'disciplinas sem professor'), det: sp.map(d => d.nome).join(', '), acao: 'Definir professor', ir: () => { this.setState({ discProfF: 'sem', discQ: '', selDisc: sp[0].id }); this.ir('disciplinas'); } });
        if (sg.length) L.push({ txt: pl(sg.length, 'disciplina sem grade', 'disciplinas sem grade'), det: sg.map(d => d.nome).join(', '), acao: 'Definir grade', ir: () => { this.setState({ discProfF: '', discQ: '', selDisc: sg[0].id }); this.ir('disciplinas'); } });
        if (semMat) L.push({ txt: 'Semestre sem matrículas', det: 'nenhum aluno matriculado em ' + semNome, acao: 'Matricular', ir: () => this.ir('boletim') });
        return { temPend: L.length > 0, pendencias: L, pendTxt: L.length === 1 ? '1 item' : L.length + ' itens' };
      })(),
      semNota: semNota.map(x => Object.assign({}, x, { ir: meuProf ? () => { this.setState({ selDisc: x.did, subAba: 'notas' }); this.ir('disciplinas'); } : () => this.ir('boletim') })), semNotaContagem: semNota.length + (semNota.length === 1 ? ' avaliação' : ' avaliações'), irBoletim: () => this.ir('boletim'),
      painelRotulo: (ehEscola ? 'Escola' : meuProf ? meuProf.nome : 'Turma 2026') + ' · semestre ' + semNome,

      // alunos
      alunosTotalTxt: meuProf ? `${todos.length} alunos nas suas disciplinas` : `${todos.length} alunos · turma 2026`, alunosTitulo: meuProf ? 'Meus alunos' : 'Alunos', alunosAdmin: ehEscola,
      colMedia: meuProf ? 'Média na sua disciplina' : 'Média', colFreq: meuProf ? 'Freq. na sua disciplina' : 'Frequência', paAdmin: ehEscola, paMediaRot: meuProf ? 'Média na sua disciplina' : 'Média', paFreqRot: meuProf ? 'Frequência na sua disciplina' : 'Frequência', q: st.q, idadeMin: st.idadeMin, mediaMin: st.mediaMin,
      setQ: e => this.setState({ q: e.target.value, pagina: 1 }), setIdadeMin: e => this.setState({ idadeMin: e.target.value, pagina: 1 }), setMediaMin: e => this.setState({ mediaMin: e.target.value, pagina: 1 }),
      limparFiltros: () => this.setState({ q: '', idadeMin: '', mediaMin: '', pagina: 1 }), limparO: st.q || st.idadeMin || st.mediaMin ? 1 : 0,
      ordens: [['nome', 'Nome'], ['media', 'Média'], ['freq', 'Frequência'], ['idade', 'Idade']].map(([id, label]) => ({ label, on: ord === id, peso: peso(ord === id), cor: ord === id ? 'var(--fundo)' : TINTA, ir: () => this.setState({ ordem: id, pagina: 1 }) })),
      alunosPagina: pagina, alunosOk: !alunosEstado, alunosEstado,
      alunosMostrando: lista.length ? `Mostrando ${(pag - 1) * 10 + 1}–${(pag - 1) * 10 + pagina.length} de ${lista.length}` : 'Nenhum resultado',
      alunosMediaLista: `média ${comM.length ? fmt(comM.reduce((x, a) => x + a.s.media, 0) / comM.length) : '—'} · frequência ${comF.length ? pct(comF.reduce((x, a) => x + a.s.freq, 0) / comF.length) : '—'}`,
      semAnterior: pag <= 1, semProxima: pag >= paginas, antO: pag <= 1 ? 0.4 : 1, proxO: pag >= paginas ? 0.4 : 1,
      paginaAnterior: () => this.setState({ pagina: Math.max(1, pag - 1) }), paginaProxima: () => this.setState({ pagina: Math.min(paginas, pag + 1) }),
      abrirNovoAluno: () => this.abrirPainel({ tipo: 'novoAluno' }),

      // disciplinas
      discTotalTxt: st.discs.length + (st.discs.length === 1 ? ' disciplina' : ' disciplinas') + ' · semestre ' + semNome, discQ: st.discQ, setDiscQ: set('discQ'),
      discLimparVis: !!(st.discProfF || st.discQ.trim()) && !discF.length && !(E && E !== 'vazio'), limparDiscFiltro: () => this.setState({ discProfF: '', discQ: '' }),
      discVazioMsg: st.discs.length && st.discProfF ? 'Nenhuma disciplina com esse filtro.' : st.discs.length ? 'Nenhuma disciplina com esse nome.' : ativo ? 'Nenhuma disciplina neste semestre. Crie a primeira.' : 'Sem semestre ativo.',
      discAdmin: ehEscola && !bloqueado, discAdminH: ehEscola, gradeLeitura: !!meuProf,
      discSub: meuProf ? 'Só as disciplinas que estão no seu nome. A grade é definida pela secretaria.' : 'Cada disciplina tem uma grade semanal. Ao salvar, o sistema gera as aulas do semestre.',
      semPermVis: !!meuProf && !!S0.semPerm, discConteudoVis: !(meuProf && S0.semPerm), voltarMinhas: () => this.setState({ semPerm: null }),
      ...(() => {
        const sa = st.subAba || 'alunos';
        const r = { subRef: this.subRef, subAlunos: sa === 'alunos', subChamada: sa === 'chamada', subNotas: sa === 'notas', subAvisos: sa === 'avisos',
          subAbas: [['alunos', 'Alunos'], ['chamada', 'Chamada'], ['notas', 'Avaliações e notas'], ['avisos', 'Avisos da turma']].map(([id, label]) => ({ label, on: sa === id, peso: peso(sa === id), ir: () => this.setSub(id) })) };
        if (!selD) return Object.assign(r, { scAulas: [], scTem: false, scVazio: true, scResumo: '', gnCols: [], gnLinhas: [], gnTem: false, gnSemAlunos: true, gnSemAvals: false, gnMsg: '', gnMsgCor: TINTA, avsSel: [], somaSelTxt: '', somaSelBar: 'scaleX(0)', notasEditaveis: false, saAvisos: [], saTem: false, saVazio: true });
        const aus = st.aulas.filter(a => a.disciplina_id === selD.id).sort((x, y) => x.data.localeCompare(y.data) || ordH(x, y));
        let k = aus.findIndex(a => a.data > HOJE); if (k < 0) k = aus.length;
        const jan = aus.slice(Math.max(0, k - 6), k + 3);
        r.scAulas = jan.map(au => { const inf = infoAula(au), canc = au.status === 'cancelada', futuro = au.data > HOJE, passado = au.data < HOJE;
          const s1 = canc ? ['Cancelada', 'var(--texto-suave)', 'var(--borda)', 'line-through'] : inf.feita ? ['Chamada feita (' + inf.presentes + '/' + inf.total + ')', TINTA, TINTA, 'none'] : passado ? ['Sem chamada', AVISO, AVISO, 'none'] : futuro ? ['Agendada', 'var(--texto-suave)', 'var(--borda)', 'none'] : ['Hoje · pendente', TINTA, TINTA, 'none'];
          const ac = canc ? null : inf.feita ? ['Ver chamada', () => this.abrirChamada(au), false] : (!futuro && ativo) ? ['Fazer chamada', () => this.abrirChamada(au), true] : null;
          return { dia: DIA_C[dsem(au.data)] + ' ' + ddmm(au.data), hora: au.hora_inicio ? au.hora_inicio + '–' + au.hora_fim : 'sem horário', extra: au.origem === 'extra', stTxt: s1[0], stCor: s1[1], stBorda: s1[2], stRisco: s1[3], temAcao: !!ac, acaoTxt: ac ? ac[0] : '', acao: ac ? ac[1] : null, acaoBg: ac && ac[2] ? TINTA : 'var(--superficie)', acaoCor: ac && ac[2] ? 'var(--fundo)' : TINTA, acaoBorda: ac && ac[2] ? TINTA : 'var(--borda)' }; });
        const feitas = aus.filter(a => a.chamada).length, ate = aus.filter(a => a.data <= HOJE && a.status !== 'cancelada').length;
        Object.assign(r, { scTem: jan.length > 0, scVazio: !jan.length, scResumo: feitas + ' de ' + ate + ' chamadas feitas até hoje', irAgendaDisc: () => { if (ehEscola) this.setState({ agDiscF: String(selD.id), agProfF: '' }); this.ir('frequencia'); } });
        const avs = st.avals.filter(a => a.did === selD.id), als = st.alunos.filter(a => st.mats[a.id + '-' + selD.id]), dr = st.gnDraft || {};
        r.gnCols = avs.map(v => ({ nome: v.nome, peso: 'peso ' + v.peso }));
        r.gnLinhas = als.map(a => { const m = this.discMedia(a.id, selD.id);
          return { nome: a.nome, mat: a.mat, mediaTxt: m ? fmt(m.m) : '—', mediaCor: m && m.m < 6 ? AVISO : TINTA, parcial: m && m.parcial ? 'parcial' : '',
            cels: avs.map(v => { const key = a.id + '-' + v.id, n = st.notas[key], d = dr[key], inval = d != null && String(d).trim() !== '' && !this.notaOk(d);
              return { val: d != null ? d : n != null ? fmt(n) : '', label: 'Nota de ' + a.nome + ' em ' + v.nome, off: bloqueado, cor: n != null && n < 6 && d == null ? AVISO : TINTA, borda: inval ? AVISO : d != null ? TINTA : 'var(--borda-fraca)',
                podeLimpar: n != null && d == null && !bloqueado, limparLabel: 'Limpar nota de ' + a.nome + ' em ' + v.nome,
                mudar: e => { const x = e.target.value; this.setState(s => ({ gnDraft: Object.assign({}, s.gnDraft, { [key]: x }), gnMsg: null })); },
                salvar: () => this.salvarNotaGrade(key, a.nome, v.nome),
                tecla: e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } else if (e.key === 'Escape') this.setState(s => { const g = Object.assign({}, s.gnDraft); delete g[key]; return { gnDraft: g }; }); },
                limpar: () => this.setState(s => ({ notas: Object.assign({}, s.notas, { [key]: null }), gnMsg: { erro: false, t: 'Nota de ' + a.nome + ' em ' + v.nome + ' limpa. Voltou para —.' } })) }; }) }; });
        const somaS = avs.reduce((x, a) => x + a.peso, 0);
        Object.assign(r, { gnTem: als.length > 0 && avs.length > 0, gnSemAlunos: !als.length, gnSemAvals: als.length > 0 && !avs.length, gnMsg: st.gnMsg ? st.gnMsg.t : '', gnMsgCor: st.gnMsg && st.gnMsg.erro ? AVISO : TINTA,
          somaSelTxt: somaS + ' / 100', somaSelBar: 'scaleX(' + Math.min(1, somaS / 100) + ')', notasEditaveis: !bloqueado,
          avsSel: avs.map(a => { const tem = Object.keys(st.notas).some(k2 => k2.endsWith('-' + a.id) && st.notas[k2] != null), off = tem || bloqueado; return { nome: a.nome, peso: a.peso, status: tem ? 'com notas' : 'sem notas', bloqueado: off, opacidade: off ? 0.4 : 1, dica: tem ? 'Só é possível excluir avaliações sem notas' : 'Excluir avaliação', excluir: () => { if (!off) this.setState(s => ({ avals: s.avals.filter(x => x.id !== a.id), avalMsg: { erro: false, t: a.nome + ' excluída.' } })); } }; }),
          criarAvalSel: e => { e.preventDefault(); if (bloqueado) return; const p = parseInt(st.avalPeso, 10); if (!st.avalNome.trim()) return this.setState({ avalMsg: { erro: true, t: 'Dê um nome à avaliação.' } }); if (isNaN(p) || p <= 0) return this.setState({ avalMsg: { erro: true, t: 'O peso precisa ser maior que zero.' } }); if (somaS + p > 100) return this.setState({ avalMsg: { erro: true, t: 'A soma passaria de 100 (hoje: ' + somaS + '). Ajuste o peso.' } }); this.setState(s => ({ avals: s.avals.concat({ id: Date.now(), did: selD.id, nome: st.avalNome.trim(), peso: p }), avalNome: '', avalPeso: '', avalMsg: { erro: false, t: 'Avaliação criada.' } })); } });
        const avT = st.avisos.filter(a => a.disciplina_id === selD.id).sort((x, y) => y.data.localeCompare(x.data));
        Object.assign(r, { saAvisos: avT.map(a => ({ titulo: a.titulo, msg: a.msg, dataBR: br(a.data), autor: a.autor_nome || 'Secretaria' })), saTem: avT.length > 0, saVazio: !avT.length, escreverAvisoTurma: () => { this.setState({ avDestino: String(selD.id) }); this.ir('avisos'); } });
        return r;
      })(),
      discFiltroVis: ehEscola, discProfF: st.discProfF, setDiscProfF: e => this.setState({ discProfF: e.target.value }), profOpcoes: st.profs.map(p => ({ v: String(p.id), l: p.nome })),
      dfProfs: [{ id: '', nome: 'Sem professor', meta: 'fica como pendência' }].concat(st.profs.map(p => { const n = st.discs.filter(d => d.professor_id === p.id && d.id !== pu.did).length; return { id: String(p.id), nome: p.nome, meta: n ? n + (n === 1 ? ' outra disciplina' : ' outras disciplinas') : 'sem disciplina' }; })).map(p => { const on = (st.fProf || '') === p.id; return Object.assign(p, { on, peso: peso(on), cor: on ? 'var(--fundo)' : TINTA, escolher: () => this.setState({ fProf: p.id, fErro: '', fOk: '' }) }); }),
      discLista: discF.map(d => {
        const n = st.alunos.filter(a => st.mats[a.id + '-' + d.id]).length; const on = selD && d.id === selD.id;
        return { nome: d.nome, on, peso: peso(on), cor: on ? 'var(--fundo)' : TINTA, meta: gradeTxt(d.grade, true) + ' · ' + n + (n === 1 ? ' aluno' : ' alunos'), prof: meuProf ? '' : profNome(d), profCor: on ? 'inherit' : d.professor_id == null ? AVISO : 'inherit', escolher: () => this.setState({ selDisc: d.id, matMsg: null, matAluno: '', confDesm: null, desmErro: null }) };
      }),
      dd, ddAlunos, ddOk: !discEstado && !!selD, ddTemAlunos: ddAlunos.length > 0, ddSemAlunos: !!selD && !ddAlunos.length,
      alunoOpcoes: selD ? st.alunos.map(a => ({ v: String(a.id), l: a.nome + (st.mats[a.id + '-' + selD.id] ? ' · já matriculado' : '') })) : [],
      matAluno: st.matAluno, setMatAluno: set('matAluno'),
      discOk: !discEstado, discEstado,
      abrirNovaDisc: () => this.abrirDisc(null),
      ddSemana: (() => {
        if (!selD) return [];
        const dias = [1, 2, 3, 4, 5]; if (st.discs.some(d => (d.grade || []).some(h => h.dia_semana === 6))) dias.push(6); if (st.discs.some(d => (d.grade || []).some(h => h.dia_semana === 7))) dias.push(7);
        return dias.map(dow => { const au = this.gradeNoDia(dow); return { nome: DIA_C[dow], livre: !au.length, aulas: au.map(a => { const at = a.id === selD.id; return { hora: a.ini + '–' + a.fim, nome: a.nome, atual: at ? 'true' : 'false', bg: at ? TINTA : 'transparent', cor: at ? 'var(--fundo)' : TINTA, borda: at ? TINTA : 'var(--borda)', escolher: () => this.setState({ selDisc: a.id, matMsg: null }) }; }) }; });
      })(),

      // seletor
      seletorRotulo: ehEscola ? 'Alunos e disciplinas · semestre ' + semNome : 'Notas por disciplina',
      seletor: reais.map(a => { const on = selA && a.id === selA.id; return { nome: a.nome, mat: a.mat, on, peso: peso(on), cor: on ? 'var(--fundo)' : TINTA, escolher: () => this.setState({ selAluno: a.id, matMsg: null, notaMsg: null }) }; }),
      seletorOk: !seletorEstado && !!selA, seletorEstado, sa: selA || {},
      matricular: e => { e.preventDefault(); if (!selD || bloqueado) return; const al = st.alunos.find(a => a.id === +st.matAluno); if (!al) return this.setState({ matMsg: { erro: true, t: 'Escolha um aluno.' } }); if (st.mats[al.id + '-' + selD.id]) return this.setState({ matMsg: { erro: true, t: `${al.nome} já está matriculado em ${selD.nome}.` } }); this.setState(s => ({ mats: Object.assign({}, s.mats, { [al.id + '-' + selD.id]: true }), matMsg: { erro: false, t: `${al.nome} matriculado em ${selD.nome}.` }, matAluno: '' })); },
      matVis: ehEscola,
      ...(() => {
        const chips = selA ? st.discs.filter(d => st.mats[selA.id + '-' + d.id]).map(d => { const k = selA.id + '-' + d.id, er = st.desmErro && st.desmErro.k === k; return { nome: d.nome, label: 'Desmatricular ' + selA.nome + ' de ' + d.nome, podeX: !bloqueado, confirmando: st.confDesm === k, pedir: () => this.setState({ confDesm: k, desmErro: null, matMsg: null }), cancelar: () => this.setState({ confDesm: null }), confirmar: () => this.desmatricular(selA.id, d.id), temErro: !!er, erro: er ? st.desmErro.t : '' }; }) : [];
        return { matChips: chips, matSemChips: !chips.length, matChipsTxt: chips.length + (chips.length === 1 ? ' disciplina' : ' disciplinas'),
          matDiscOpcoes: st.discs.map(d => ({ v: String(d.id), l: d.nome + (selA && st.mats[selA.id + '-' + d.id] ? ' · já matriculado' : '') })), matDisc: st.matDisc, setMatDisc: set('matDisc'),
          matricularAluno: e => { e.preventDefault(); if (!selA || bloqueado) return; const d = st.discs.find(x => x.id === +st.matDisc); if (!d) return this.setState({ matMsg: { erro: true, t: 'Escolha a disciplina.' } }); if (st.mats[selA.id + '-' + d.id]) return this.setState({ matMsg: { erro: true, t: selA.nome + ' já está matriculado em ' + d.nome + '.' } }); this.setState(s => ({ mats: Object.assign({}, s.mats, { [selA.id + '-' + d.id]: true }), matDisc: '', matMsg: { erro: false, t: selA.nome + ' matriculado em ' + d.nome + '.' } })); } };
      })(),
      matMsg: st.matMsg ? st.matMsg.t : '', matMsgCor: st.matMsg && st.matMsg.erro ? AVISO : TINTA,
      bol: selA ? this.boletim(selA.id) : [],
      exportarBol: () => { if (selA) this.exportar('bol', 'boletim-' + selA.mat + '-' + semNome + '.csv', this.linhasBoletim(selA.id)); }, expBolTxt: expTxt('bol'), expBolO: st.exportando === 'bol' ? 0.6 : 1,
      notaDiscOpcoes: notaDiscs.map(d => ({ v: String(d.id), l: d.nome })), notaDisc: String(st.notaDisc),
      setNotaDisc: e => { const did = +e.target.value; this.setState({ notaDisc: did, notaAval: (st.avals.find(a => a.did === did) || {}).id || '', notaMsg: null, avalMsg: null }); },
      notaAvalOpcoes: avalsD.map(a => ({ v: String(a.id), l: `${a.nome} · peso ${a.peso}` })), notaAval: String(st.notaAval), setNotaAval: e => this.setState({ notaAval: +e.target.value }),
      notaValor: st.notaValor, setNotaValor: set('notaValor'),
      lancarNota: e => { e.preventDefault(); if (bloqueado) return; const n = parseFloat(String(st.notaValor).replace(',', '.')); const av = st.avals.find(a => a.id === +st.notaAval); if (!av) return this.setState({ notaMsg: { erro: true, t: 'Escolha uma avaliação.' } }); if (isNaN(n) || n < 0 || n > 10) return this.setState({ notaMsg: { erro: true, t: 'A nota precisa estar entre 0 e 10.' } }); const k = selA.id + '-' + av.id; const tinha = st.notas[k] != null; this.setState(s => ({ notas: Object.assign({}, s.notas, { [k]: Math.round(n * 10) / 10 }), notaValor: '', notaMsg: { erro: false, t: `${tinha ? 'Nota atualizada' : 'Nota lançada'}: ${av.nome} = ${fmt(n)}.` } })); },
      notaMsg: st.notaMsg ? st.notaMsg.t : '', notaMsgCor: st.notaMsg && st.notaMsg.erro ? AVISO : TINTA,
      avalDiscNome: avalDisc ? avalDisc.nome : '', somaTxt: `${soma} / 100`, somaBar: `scaleX(${Math.min(1, soma / 100)})`,
      avalLista: avalsD.map(a => { const tem = Object.keys(st.notas).some(k => k.endsWith('-' + a.id) && st.notas[k] != null); return { nome: a.nome, peso: a.peso, status: tem ? 'com notas' : 'sem notas', bloqueado: tem, opacidade: tem ? 0.4 : 1, dica: tem ? 'Só é possível excluir avaliações sem notas' : 'Excluir avaliação', excluir: () => this.setState(s => ({ avals: s.avals.filter(x => x.id !== a.id), avalMsg: { erro: false, t: `${a.nome} excluída.` } })) }; }),
      avalNome: st.avalNome, avalPeso: st.avalPeso, setAvalNome: set('avalNome'), setAvalPeso: set('avalPeso'),
      criarAval: e => { e.preventDefault(); if (bloqueado || !avalDisc) return; const p = parseInt(st.avalPeso, 10); if (!st.avalNome.trim()) return this.setState({ avalMsg: { erro: true, t: 'Dê um nome à avaliação.' } }); if (isNaN(p) || p <= 0) return this.setState({ avalMsg: { erro: true, t: 'O peso precisa ser maior que zero.' } }); if (soma + p > 100) return this.setState({ avalMsg: { erro: true, t: `A soma passaria de 100 (hoje: ${soma}). Ajuste o peso.` } }); this.setState(s => ({ avals: s.avals.concat({ id: Date.now(), did: avalDisc.id, nome: st.avalNome.trim(), peso: p }), avalNome: '', avalPeso: '', avalMsg: { erro: false, t: 'Avaliação criada.' } })); },
      avalMsg: st.avalMsg ? st.avalMsg.t : '', avalMsgCor: st.avalMsg && st.avalMsg.erro ? AVISO : TINTA,

      // agenda
      agRef: this.agRef, agenda, agOk: !agendaEstado, agendaEstado,
      agFiltroVis: ehEscola, agProfF: st.agProfF, agDiscF: st.agDiscF, setAgProfF: e => this.setState({ agProfF: e.target.value }), setAgDiscF: e => this.setState({ agDiscF: e.target.value }),
      agFiltrado: !!(st.agProfF || st.agDiscF), limparAgFiltro: () => this.setState({ agProfF: '', agDiscF: '' }), temAgErro: !!st.agErro, agErro: st.agErro, fecharAgErro: () => this.setState({ agErro: '' }),
      temRotaAviso: !!st.rotaAviso, rotaAviso: st.rotaAviso, fecharRotaAviso: () => this.setState({ rotaAviso: '' }),
      agVazioMsg: !st.discs.length ? (meuProf ? 'Você ainda não tem disciplinas neste semestre. Fale com a secretaria.' : 'Nenhuma disciplina neste semestre. Crie em Disciplinas.') : (st.agProfF || st.agDiscF) ? 'Nenhuma aula com esses filtros neste dia.' : meuProf ? 'Nenhuma aula sua neste dia.' : 'Nenhuma aula neste dia.',
      agRotulo: (meuProf ? 'Suas aulas' : 'Todas as disciplinas') + ' · semestre ' + semNome, agTitulo: cap(DIA_L[dsem(agDia)]) + ', ' + ddmm(agDia), agEhHoje: agDia === HOJE,
      agResumo: doDia.length ? doDia.length + (doDia.length === 1 ? ' aula' : ' aulas') + ' · ' + doDia.filter(a => a.chamada).length + ' com chamada' : 'Sem aulas',
      diaAnterior: () => this.irDia(addD(agDia, -1)), diaProximo: () => this.irDia(addD(agDia, 1)), irHoje: () => this.irDia(HOJE),
      cal, agMesTxt: MESES[cm - 1] + ' de ' + cy, aulasMesTxt: aulasMes + (aulasMes === 1 ? ' aula' : ' aulas'), mesAnterior: () => this.moverMes(-1), mesProximo: () => this.moverMes(1),
      abrirExtra: () => this.abrirExtra(),

      // semestre
      semEstado: E && E !== 'vazio' ? E : null, semAtivoVis: !!ativo && !E, semEncerradoVis: !!sem && !!sem.encerrado_em && !E, semNovoVis: E === 'vazio' || (!ativo && !E), semHistVis: !(E && E !== 'vazio'),
      semN: sem ? { nome: sem.nome, periodo: br(sem.inicio) + ' – ' + br(sem.fim), semana: ativo ? 'semana ' + semanaAt + ' de ' + nSemanas : '', discs: String(st.discs.length), aulas: String(aulasSem.length), chamadas: String(comCh), chamadasSub: 'de ' + ateHoje.length + ' aulas até hoje',
        encerradoTxt: sem.encerrado_em ? 'Encerrado em ' + br(sem.encerrado_em) + '. Notas e chamadas estão congeladas; os dados continuam visíveis, só para leitura.' : '' } : {},
      semConfirmVis: !!st.semConfirm && !!ativo, pedirEncerrar: () => this.setState({ semConfirm: true, semMsg: '' }), cancelarEncerrar: () => this.setState({ semConfirm: false }), confirmarEncerrar: () => this.encerrarSemestre(),
      resumoSem: st.semConfirm && ativo ? this.resumoSemestre() : [],
      temSemMsg: !!st.semMsg, semMsg: st.semMsg,
      nsNome: st.nsNome, nsInicio: st.nsInicio, nsFim: st.nsFim, nsErro: st.nsErro,
      setNsNome: e => this.setState({ nsNome: e.target.value, nsErro: '' }), setNsInicio: e => this.setState({ nsInicio: e.target.value, nsErro: '' }), setNsFim: e => this.setState({ nsFim: e.target.value, nsErro: '' }), abrirSemestre: e => this.abrirSemestre(e),
      historico: (E === 'vazio' ? [] : st.historico).map(h => ({ nome: h.nome, periodo: br(h.inicio) + ' – ' + br(h.fim), encerrado: 'Encerrado em ' + br(h.encerrado_em), resumo: h.resumo })),
      semHist: E === 'vazio' || !st.historico.length, histContagem: (E === 'vazio' ? 0 : st.historico.length) + (E !== 'vazio' && st.historico.length === 1 ? ' encerrado' : ' encerrados'),

      // avisos
      avDestinos: (meuProf ? [] : [{ v: '', l: 'Todos (aviso geral)' }]).concat(st.discs.map(d => ({ v: String(d.id), l: d.nome }))),
      avDestinoV: meuProf ? (st.avDestino || String((st.discs[0] || {}).id || '')) : st.avDestino, setAvDestino: e => this.setState({ avDestino: e.target.value, avErro: '' }),
      avDestinoAjuda: meuProf ? 'Só as suas disciplinas. O aviso aparece para os alunos da turma.' : 'Geral aparece para todos; de disciplina, só para a turma.',
      avTitulo: st.avTitulo, avData: st.avData, avMsg: st.avMsg, avErro: st.avErro, avDataBR: br(st.avData),
      setAvTitulo: set('avTitulo'), setAvData: set('avData'), setAvMsg: set('avMsg'),
      publicarAviso: e => { e.preventDefault(); const dst = meuProf ? (+st.avDestino || (st.discs[0] || {}).id || null) : (+st.avDestino || null); if (meuProf && !dst) return this.setState({ avErro: 'Você ainda não tem disciplinas para publicar avisos.' }); if (dst && bloqueado) return this.setState({ avErro: 'Semestre encerrado: avisos de disciplina ficam somente leitura.' }); if (!st.avTitulo.trim()) return this.setState({ avErro: 'Escreva um título.' }); if (br(st.avData) === '—') return this.setState({ avErro: 'Use a data no formato AAAA-MM-DD.' }); if (!st.avMsg.trim()) return this.setState({ avErro: 'Escreva a mensagem.' }); this.setState(s => ({ avisos: [{ id: Date.now(), titulo: s.avTitulo.trim(), data: s.avData, msg: s.avMsg.trim(), disciplina_id: dst, autor_id: meuProf ? meuProf.id : 'escola', autor_nome: meuProf ? meuProf.nome : 'Secretaria' }].concat(s.avisos), avTitulo: '', avMsg: '', avErro: '', avisoPagina: 1 })); },
      avisoQ: st.avisoQ, setAvisoQ: e => this.setState({ avisoQ: e.target.value, avisoPagina: 1 }),
      avisosPagina: avP, avisosOk: !avisosEstado, avisosEstado, avisosPaginado: avPags > 1,
      avisosMostrando: avF.length ? `${(avPag - 1) * 10 + 1}–${(avPag - 1) * 10 + avP.length} de ${avF.length}` : '',
      avisoAnterior: () => this.setState({ avisoPagina: Math.max(1, avPag - 1) }), avisoProxima: () => this.setState({ avisoPagina: Math.min(avPags, avPag + 1) }),

      // meu painel
      me, meBol, meOk: !(E && E !== 'vazio') && meBol.length > 0, meEstado: E && E !== 'vazio' ? E : meBol.length ? null : 'vazio',
      meResumo: me.tag === 'Aprovado' ? `Aprovada até aqui — média ${me.mediaTxt} e frequência ${me.freqTxt}.` : `Atenção: média ${me.mediaTxt}, frequência ${me.freqTxt}.`,
      meFreq: this.resumo(me).ds.map(d => { const o = this.fr(me.id, d.id); const f = o.t ? o.p / o.t : null; const r = f != null && f < 0.75; return { nome: d.nome, txt: f == null ? 'sem chamada' : pct(f) + (r ? ' · em risco' : ''), cor: r ? AVISO : f == null ? 'var(--texto-suave)' : TINTA, bar: `scaleX(${f || 0})` }; }),
      meProximas: proximas, meTemProx: proximas.length > 0, meSemProx: !proximas.length, meRotulo: 'Aluna · matrícula ' + me.mat + ' · semestre ' + semNome,
      exportarMe: () => this.exportar('me', 'boletim-' + me.mat + '-' + semNome + '.csv', this.linhasBoletim(me.id)), expMeTxt: expTxt('me'), expMeO: st.exportando === 'me' ? 0.6 : 1,
      meAvisos: st.avisos.filter(a => !a.disciplina_id || (me && st.mats[me.id + '-' + a.disciplina_id])).sort((x, y) => y.data.localeCompare(x.data)).map(a => Object.assign({}, a, { dataBR: br(a.data), escopo: a.disciplina_id ? discNome(a.disciplina_id) : 'Geral', autor: a.autor_nome || 'Secretaria' })),

      // painel lateral
      pp: { aluno: pu.tipo === 'aluno' && !!paAl, novoAluno: pu.tipo === 'novoAluno', disc: pu.tipo === 'disc', chamada: pu.tipo === 'chamada' && !!chAu, remarcar: pu.tipo === 'remarcar' && !!rmAu, extra: pu.tipo === 'extra', aviso: pu.tipo === 'aviso', senha: pu.tipo === 'senha', mais: pu.tipo === 'mais', prof: pu.tipo === 'prof' },
      painelTitulo: { aluno: 'Aluno', novoAluno: 'Cadastro', disc: 'Disciplina', chamada: 'Chamada', remarcar: 'Remarcar aula', extra: 'Aula extra', aviso: 'Aviso', senha: 'Conta', mais: 'Mais telas', prof: 'Professor' }[pu.tipo] || 'Painel',
      profForm: !st.senhaProv, profSenha: !!st.senhaProv,
      psp: st.senhaProv ? { titulo: st.senhaProv.redef ? 'Nova senha de ' + st.senhaProv.redef : st.senhaProv.criado + ' cadastrado.', sub: st.senhaProv.redef ? 'A senha anterior deixou de valer. No próximo acesso o professor cria a própria senha.' : 'Entregue a senha ao professor. No primeiro acesso ele cria a própria senha.' } : {},
      cadastrarProf: e => this.cadastrarProf(e), abrirNovoProf: () => this.abrirPainel({ tipo: 'prof' }),
      profsTotalTxt: st.profs.length + (st.profs.length === 1 ? ' professor' : ' professores') + ' · semestre ' + semNome,
      profsLista: st.profs.map(p => { const ds = st.discs.filter(d => d.professor_id === p.id); return { nome: p.nome, email: p.email, iniciais: ini(p.nome), semDisc: !ds.length, redefinir: () => this.abrirPainel({ tipo: 'prof', id: p.id }, { profs: st.profs.map(x => x.id === p.id ? Object.assign({}, x, { provisoria: true }) : x), senhaProv: { email: p.email, senha: this.senhaNova(), copiado: false, redef: p.nome } }),
        discs: ds.map(d => ({ nome: d.nome, ir: () => { this.setState({ selDisc: d.id, discQ: '', discProfF: '' }); this.ir('disciplinas'); } })) }; }),
      df: (() => {
        const dsc = st.discs.find(d => d.id === pu.did), de = ativo ? (HOJE > ativo.inicio ? HOJE : ativo.inicio) : null;
        return { semSem: !ativo, ok: !!ativo, titulo: dsc ? 'Editar ' + dsc.nome : 'Nova disciplina', botao: dsc ? 'Salvar' : 'Criar disciplina', fechar: st.fOk ? 'Fechar' : 'Cancelar',
          sub: ativo ? 'Semestre ' + ativo.nome + '. Ao salvar, a grade gera as aulas de ' + ddmm(de) + ' até ' + ddmm(ativo.fim) + '. Só as aulas futuras sem chamada são refeitas; o que já aconteceu não muda.' : '', nLinhas: st.fGrade.length + (st.fGrade.length === 1 ? ' horário' : ' horários') };
      })(),
      dfLinhas: (() => {
        const rows = st.fGrade.map(r => ({ dia_semana: +r.dia_semana, hora_inicio: r.hora_inicio, hora_fim: r.hora_fim })), errs = this.conflitoGrade(rows, pu.did || null);
        return st.fGrade.map((r, i) => {
          const outros = this.gradeNoDia(+r.dia_semana).filter(o => o.id !== pu.did), er = errs[i];
          return { n: String(i + 1), dia: String(r.dia_semana), ini: r.hora_inicio, fim: r.hora_fim, borda: er ? AVISO : 'var(--borda)', notaCor: er ? AVISO : 'var(--texto-suave)',
            nota: er || (outros.length ? 'Também neste dia: ' + outros.map(o => o.nome + ' ' + o.ini).join(' · ') : 'Nenhuma outra aula neste dia.'),
            setDia: e => this.setLinha(r.k, 'dia_semana', e.target.value), setIni: e => this.setLinha(r.k, 'hora_inicio', e.target.value), setFim: e => this.setLinha(r.k, 'hora_fim', e.target.value), remover: () => this.remLinha(r.k), remLabel: 'Remover horário ' + (i + 1) };
        });
      })(),
      dfSemLinhas: !st.fGrade.length, addLinha: () => this.addLinha(), salvarDisc: e => this.salvarDisc(e), fOk: st.fOk,
      ch: chAu ? (() => {
        const canc = chAu.status === 'cancelada', ed = !canc && !!ativo, m = st.cham || {}, lista = listaCh(chAu);
        const al = lista.map(a => { const val = m[a.id], p = val === true, f = val === false;
          return { nome: a.nome, iniciais: ini(a.nome), p, f, corP: p ? 'var(--fundo)' : TINTA, corF: f ? 'var(--fundo)' : TINTA, pesoP: peso(p), pesoF: peso(f), off: ed ? 'false' : 'true', cursor: ed ? 'pointer' : 'default',
            marcarP: () => { if (ed) this.setState(s => ({ cham: Object.assign({}, s.cham, { [a.id]: true }), chamErro: '' })); }, marcarF: () => { if (ed) this.setState(s => ({ cham: Object.assign({}, s.cham, { [a.id]: false }), chamErro: '' })); } }; });
        const pres = al.filter(x => x.p).length, semMarca = al.filter(x => !x.p && !x.f).length;
        return { disc: discNome(chAu.disciplina_id), quando: quando(chAu), rotulo: chAu.origem === 'extra' ? 'Aula extra' : 'Aula da grade',
          bloqueio: !ed, bloqueioTxt: canc ? 'Aula cancelada não aceita chamada. Reative a aula na agenda para fazer a chamada.' : sem && sem.encerrado_em ? 'Semestre encerrado em ' + br(sem.encerrado_em) + ': somente leitura.' : 'Sem semestre ativo: somente leitura.', editavel: ed && !E,
          alunos: al, temAlunos: al.length > 0 && !E, semAlunos: E === 'vazio' || (!E && !al.length), chEstado: E && E !== 'vazio' ? E : null, contador: pres + '/' + al.length, faltaTxt: semMarca ? semMarca + ' sem marcar' : 'todos marcados',
          todos: () => this.setState(s => { const c = Object.assign({}, s.cham); lista.forEach(a => { c[a.id] = true; }); return { cham: c, chamErro: '' }; }),
          salvar: () => this.salvarChamada(), botao: chAu.chamada ? 'Salvar alterações' : 'Salvar chamada' };
      })() : {},
      chamErro: st.chamErro || '',
      rmx: rmAu ? { disc: discNome(rmAu.disciplina_id), de: quando(rmAu) } : {},
      semMin: sem ? sem.inicio : '', semMax: sem ? sem.fim : '', salvarRemarcar: e => this.salvarRemarcar(e),
      exDiscs: st.discs.map(d => ({ v: String(d.id), l: d.nome })), fDisc: st.fDisc, setFDisc: set('fDisc'), salvarExtra: e => this.salvarExtra(e),
      salvarAvisoEd: e => this.salvarAvisoEd(e),
      senhaOkVis: !!st.senhaOk, senhaFormVis: !st.senhaOk, sAtual: st.sAtual, sNova: st.sNova, sConf: st.sConf,
      setSAtual: e => this.setState({ sAtual: e.target.value, fErro: '' }), setSNova: e => this.setState({ sNova: e.target.value, fErro: '' }), setSConf: e => this.setState({ sConf: e.target.value, fErro: '' }), trocarSenha: e => this.trocarSenha(e),
      sNovaHint: st.sNova.length >= 8 ? 'Tamanho ok' : st.sNova.length + '/8 caracteres', sNovaHintCor: st.sNova.length >= 8 ? TINTA : 'var(--texto-suave)',
      pa8: st.sNova.length >= 8 ? '✓' : '·', pa8Cor: st.sNova.length >= 8 ? TINTA : 'var(--texto-suave)', paIg: st.sNova && st.sNova === st.sConf ? '✓' : '·', paIgCor: st.sNova && st.sNova === st.sConf ? TINTA : 'var(--texto-suave)',
      salvarPrimeiro: e => this.salvarPrimeiro(e), primeiroEmail: st.primeiroEmail || 'ana@escola.com', voltarApresentacao: () => this.setState({ tela: 'inicio', fErro: '', sNova: '', sConf: '' }),
      spAluno: !!st.senhaProv && !st.senhaProv.criado, spNovo: !!st.senhaProv && !!st.senhaProv.criado, novoForm: !(st.senhaProv && st.senhaProv.criado),
      sp: st.senhaProv ? { email: st.senhaProv.email, senha: st.senhaProv.senha, copiarTxt: st.senhaProv.copiado ? 'Copiada' : 'Copiar', copiar: () => this.copiar(st.senhaProv.senha), criadoTxt: st.senhaProv.criado ? st.senhaProv.criado + ' cadastrado.' : '' } : {},
      alunoErro: st.alunoErro || '', paVer: !st.editando, paEditando: !!st.editando, salvarAluno: e => this.salvarAluno(e), cancelarEdicao: () => this.setState({ editando: false, fErro: '' }),
      pa: paAl ? Object.assign({}, paAl, {
        presencas: String(paAl.s.presencas ?? 0), faltas: String(paAl.s.faltas ?? 0), faltasCor: paAl.s.freq != null && paAl.s.freq < 0.75 ? AVISO : TINTA, comNota: String(paAl.s.comNota ?? 0), bol: paAl.fixo ? [] : this.boletim(paAl.id),
        temEmail: !!paAl.email, acessoTxt: paAl.email || 'Sem e-mail de acesso. Edite o aluno para criar um.', acessoCor: paAl.email ? TINTA : 'var(--texto-suave)',
        redefinir: () => this.setState(s => ({ alunos: s.alunos.map(x => x.id === paAl.id ? Object.assign({}, x, { provisoria: true }) : x), senhaProv: { email: paAl.email, senha: this.senhaNova(), copiado: false } })),
        editar: () => this.setState({ editando: true, fNome: paAl.nome, fIdade: String(paAl.idade), fMat: paAl.mat, fEmail: paAl.email || '', fErro: '', senhaProv: null }),
        discs: st.discs.filter(d => st.mats[paAl.id + '-' + d.id]).map(d => { const k = paAl.id + '-' + d.id, conf = st.confDesm === k; return { nome: d.nome, normal: !conf, confirmando: conf, podeDesm: ehEscola && !bloqueado, label: 'Desmatricular de ' + d.nome, pedir: () => this.setState({ confDesm: k, desmErro: null }), cancelar: () => this.setState({ confDesm: null }), confirmar: () => this.desmatricular(paAl.id, d.id) }; }),
        semDiscs: !st.discs.some(d => st.mats[paAl.id + '-' + d.id]),
        desmErro: st.desmErro && st.desmErro.k.indexOf(paAl.id + '-') === 0 ? st.desmErro.t : ''
      }) : {},
      fecharPainel: this.fecharPainel, scrimO: aberto ? 0.14 : 0, scrimPE: aberto ? 'auto' : 'none',
      pTop: compact ? '12%' : '56px', pLeft: compact ? '0' : 'auto', pW: compact ? 'auto' : 'min(440px, 100%)',
      pT: aberto ? 'none' : fechadoT, pO: aberto ? 1 : this.rm ? 0 : 1, pVis: aberto ? 'visible' : 'hidden', pTr,
      fNome: st.fNome, fIdade: st.fIdade, fMat: st.fMat, fErro: st.fErro, setFNome: set('fNome'), setFIdade: set('fIdade'), setFMat: set('fMat'),
      fEmail: st.fEmail, setFEmail: set('fEmail'), fData: st.fData, setFData: set('fData'), fIni: st.fIni, setFIni: set('fIni'), fFim: st.fFim, setFFim: set('fFim'), fTexto: st.fTexto, setFTexto: set('fTexto'),
      cadastrarAluno: e => this.cadastrarAluno(e)
    };
  }
}

export default criarDC("Portal Escolar", Template, Component);
