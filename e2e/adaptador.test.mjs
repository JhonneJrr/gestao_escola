import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Detecta nomes/chaves errados, perda de presença falsa e frequência em escala errada.
function montarEstado(usuario, estado) {
  const codigo = ts.transpileModule(readFileSync('src/portal/adaptador.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const modulo = { exports: {} };
  new Function('module', 'exports', codigo)(modulo, modulo.exports);
  return modulo.exports.montarEstado(usuario, estado);
}
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
  semestre: { id: 9, nome: '2026.2', inicio: '2026-08-03', fim: '2026-12-11', encerrado_em: null },
  alunos: [{ id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1' }],
  discs: [{ id: 13, nome: 'Python', carga_horaria: 40, professor_id: 42, grade: [{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '09:40' }] }],
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
    ...esperadoTurma, papel: 'escola', profId: null, usuario: escola, profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com' }],
    historico: [{ id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01', resumo: [
      { disc: 'Lógica', alunos: '3', media: '7,2', mediaCor: 'var(--texto)', freq: '88%', freqCor: 'var(--texto)', aprov: '2', reprov: '1', reprovCor: 'var(--aviso)' },
      { disc: 'Redes', alunos: '0', media: '—', mediaCor: 'var(--texto)', freq: '—', freqCor: 'var(--texto)', aprov: '0', reprov: '0', reprovCor: 'var(--texto)' },
    ] }],
  });
  assert.deepEqual(entrada, copia);
});

test('professor usa o id autenticado e conserva o recorte recebido', () => {
  assert.deepEqual(montarEstado(professor, { ...turma, professores: [professor] }), {
    ...esperadoTurma, papel: 'prof', profId: 42, usuario: professor, profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com' }], historico: [],
  });
});

test('aluno usa aluno_id e marca provisória somente na própria conta', () => {
  assert.deepEqual(montarEstado(aluno, turma), {
    ...esperadoTurma, papel: 'aluno', profId: null, usuario: aluno, profs: [], historico: [],
    alunos: [{ id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1', provisoria: true }],
  });
  const resultado = montarEstado(aluno, { ...turma, alunos: [...turma.alunos, { id: 28, nome: 'Colega', matricula: 'A028', idade: 20, media: 0, email: null, semestre_historico: null }] });
  assert.deepEqual(resultado.alunos, [
    { id: 27, nome: 'Bia', mat: 'A027', idade: null, media: 7.5, email: 'bia@escola.com', hist: '2026.1', provisoria: true },
    { id: 28, nome: 'Colega', mat: 'A028', idade: 20, media: 0, email: null, hist: null },
  ]);
});

test('professor sem disciplina recebe coleções vazias e semestre nulo', () => {
  assert.deepEqual(montarEstado(professor, { ...vazio, professores: [professor] }), {
    papel: 'prof', profId: 42, usuario: professor, semestre: null, historico: [], profs: [{ id: 42, nome: 'Docente', email: 'docente@escola.com' }],
    alunos: [], discs: [], mats: {}, avals: [], notas: {}, aulas: [], avisos: [], metricas: [], selAluno: null, selDisc: null, notaDisc: null, notaAval: '',
  });
});

test('semestre encerrado aceita timestamp com espaço e devolve só a data', () => {
  assert.deepEqual(montarEstado(escola, { ...vazio, semestre: { id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01 12:30:00' } }).semestre,
    { id: 8, nome: '2026.1', inicio: '2026-02-09', fim: '2026-06-26', encerrado_em: '2026-07-01' });
});
