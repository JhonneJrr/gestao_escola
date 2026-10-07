// @ts-nocheck

const ALUNOS0 = [
  { id: 1, nome: 'Ana Souza', mat: '2026001', idade: 20, media: 9.0, email: 'ana@escola.com', hist: '2026.1' },
  { id: 2, nome: 'Bruno Lima', mat: '2026002', idade: 22, media: 6.0, email: 'bruno@escola.com', hist: '2026.1' },
  { id: 3, nome: 'Carla Dias', mat: '2026003', idade: 19, media: 3.8, email: null },
  { id: 4, nome: 'Diego Alves', mat: '2026004', idade: 21, media: 8.5, email: 'diego@escola.com' },
  { id: 5, nome: 'Eva Rocha', mat: '2026005', idade: 23, media: 6.3, email: null },
  { id: 6, nome: 'Fabio Neri', mat: '2026006', idade: 20, media: 4.8, email: null }
];
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
  { id: 1, nome: 'Python', carga_horaria: 40, professor_id: 1, grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }, { dia_semana: 4, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 2, nome: 'Banco de Dados', carga_horaria: 60, professor_id: 1, grade: [{ dia_semana: 2, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 3, hora_inicio: '08:00', hora_fim: '09:40' }] },
  { id: 3, nome: 'Algoritmos', carga_horaria: 80, professor_id: 2, grade: [{ dia_semana: 3, hora_inicio: '10:00', hora_fim: '11:40' }, { dia_semana: 4, hora_inicio: '10:00', hora_fim: '11:40' }] },
  { id: 4, nome: 'Redes', carga_horaria: 30, professor_id: null, grade: [] }
];
const SEM0 = { id: 2, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null };

const PROFS0 = [{ id: 1, nome: 'Carlos Mendes', email: 'prof@escola.com' }, { id: 2, nome: 'Marta Ribeiro', email: 'marta@escola.com' }, { id: 3, nome: 'Paulo Antunes', email: 'paulo@escola.com' }];

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
    alunos: ALUNOS0, discs: DISC0, profs: PROFS0, semestre: SEM0, historico: HIST0,
    avisos: [
      { id: 3, titulo: 'Lista de grafos', data: '2026-10-02', msg: 'A lista 3 de grafos está no mural da sala. Entrega na aula de quinta.', disciplina_id: 3, autor_id: 2, autor_nome: 'Marta Ribeiro' },
      { id: 2, titulo: 'Prova de Python', data: '2026-09-28', msg: 'A P1 de Python será na aula de terça, 29/09. O conteúdo vai até funções e listas.', disciplina_id: 1, autor_id: 1, autor_nome: 'Carlos Mendes' },
      { id: 1, titulo: 'Bem-vindos ao semestre', data: '2026-09-20', msg: 'Confiram o calendário de aulas de cada disciplina e mantenham a frequência acima de 75%.', disciplina_id: null, autor_id: 'escola', autor_nome: 'Secretaria' }
    ],
    usuario, profId: papel === 'prof' ? 1 : null,
    selAluno: 1, selDisc: 1, notaDisc: 1, notaAval: 11
  });
}
