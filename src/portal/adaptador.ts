export const fmt = (n: number) => n.toFixed(1).replace('.', ',');
export const pct = (f: number) => Math.round(f * 100) + '%';
export const AVISO = 'var(--aviso)', TINTA = 'var(--texto)';
export const dataHoje = (d: Date, demo: boolean) => demo ? '2026-10-06' : d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export const itensGradeAPI = (grade: any[]) => grade.map((g: any) => ({ dia_semana: g.dia_semana, hora_inicio: g.hora_inicio, hora_fim: g.hora_fim, sala_id: g.sala ? Number(g.sala) : null }));
export const disciplinaAPI = (d: any) => ({ nome: d.nome, carga_horaria: Number(d.carga), professor_id: d.prof ? Number(d.prof) : null, turma_id: d.turma ? Number(d.turma) : null, sala_id: d.sala ? Number(d.sala) : null });
export const horarioAPI = (p: any) => ({ data: p.data, hora_inicio: p.ini || null, hora_fim: p.fim || null, sala_id: p.sala ? Number(p.sala) : null });
export const pedidoAPI = (p: any) => ({ disciplina_id: Number(p.disc), ...horarioAPI(p), motivo: p.motivo });
export const eventoAPI = (e: any) => ({ tipo: e.tipo, titulo: e.titulo, data: e.data, fim: e.fim || null, hora_inicio: e.hi || null, hora_fim: e.hf || null,
  todas_turmas: e.turmas === 'todas', turma_ids: e.turmas === 'todas' ? [] : e.turmas.map(Number), disciplina_id: e.disc ? Number(e.disc) : null, descricao: e.desc });

// Formatos que o Portal publica na loja para a GradeAgenda.
export const alunosLoja = (alunos: any[]) => alunos.map((a: any) => ({ id: a.id, nome: a.nome, turma: a.turma ?? null }));
export const matriculasDe = (mats: Record<string, boolean>) => Object.keys(mats || {}).filter(k => mats[k]).map(k => {
  const [aluno, disciplina] = k.split('-').map(Number);
  return { aluno_id: aluno, disciplina_id: disciplina };
});
// Turma do próprio aluno (texto); vazio nos outros perfis e para aluno sem turma.
export const turmaDoAluno = (usuario: any, alunos: any[]) => usuario?.aluno_id == null ? '' : alunos.find((a: any) => a.id === usuario.aluno_id)?.turma ?? '';

const semestre = (s: any) => s == null ? null : ({
  id: s.id, nome: s.nome, inicio: s.inicio, fim: s.fim,
  encerrado_em: s.encerrado_em == null ? null : s.encerrado_em.slice(0, 10),
});

// Regra de avaliação da escola. Enquanto o servidor não a entrega, vale um único período (o semestre), sem avaliação obrigatória:
// as avaliações que o servidor guarda aparecem como atividades desse período, já publicadas, porque o servidor as mostra ao aluno.
export const regraDoSemestre = (sem: any) => ({
  tipo: 'Semestre', periodos: [{ id: 'p1', nome: 'Semestre', inicio: sem?.inicio ?? '', fim: sem?.fim ?? '', fechado: !!sem?.encerrado_em }],
  itens: [] as any[], extras: { permitido: true, max: 99, peso: 100 }, participacao: { ativo: false, peso: 1 },
  recuperacao: { ativo: false, modo: 'menor' }, final: { ativo: false }, arred: '0,1', mediaMin: 6, freqMin: 75, conselho: false,
});

export function montarEstado(usuario: any, estado: any) {
  const discs = estado.disciplinas.map((d: any) => ({ id: d.id, nome: d.nome, carga_horaria: d.carga_horaria, professor_id: d.professor_id,
    turma: String(d.turma_id ?? ''), sala: String(d.sala_id ?? ''), grade: d.grade.map((g: any) => ({ dia_semana: g.dia_semana, hora_inicio: g.hora_inicio, hora_fim: g.hora_fim, sala: String(g.sala_id ?? d.sala_id ?? ''), sala_id: g.sala_id ?? null })) }));
  const avals = estado.avaliacoes.map((a: any) => ({ id: a.id, did: a.disciplina_id, nome: a.nome, peso: a.peso, per: 'p1', extra: true }));
  return {
    papel: usuario.perfil === 'professor' ? 'prof' : usuario.perfil,
    profId: usuario.perfil === 'professor' ? usuario.id : null, usuario,
    semestre: semestre(estado.semestre),
    turmas: (estado.turmas || []).map((t: any) => ({ id: String(t.id), nome: t.nome })),
    salas: (estado.salas || []).map((s: any) => ({ id: String(s.id), nome: s.nome })),
    eventos: (estado.eventos || []).map((e: any) => ({ id: e.id, tipo: e.tipo, titulo: e.titulo, data: e.data, fim: e.fim ?? '', hi: e.hora_inicio ?? '', hf: e.hora_fim ?? '',
      turmas: e.todas_turmas ? 'todas' : e.turma_ids.map(String), disc: e.disciplina_id, desc: e.descricao })),
    pedidos: (estado.pedidos || []).map((p: any) => ({ id: p.id, prof: p.professor_id, disc: p.disciplina_id, data: p.data, ini: p.hora_inicio, fim: p.hora_fim,
      sala: String(p.sala_id ?? ''), motivo: p.motivo, status: p.status, resposta: p.resposta,
      sug: p.sugestao ? { data: p.sugestao.data, ini: p.sugestao.hora_inicio, fim: p.sugestao.hora_fim, sala: String(p.sugestao.sala_id ?? '') } : null, aula_id: p.aula_id })),
    historico: estado.semestres_encerrados.map((s: any) => ({ ...semestre(s), resumo: s.resumo.map((r: any) => ({
      disc: r.disciplina.nome, alunos: String(r.total_alunos),
      media: r.media_turma == null ? '—' : fmt(r.media_turma), mediaCor: TINTA,
      freq: r.frequencia_media == null ? '—' : pct(r.frequencia_media / 100), freqCor: TINTA,
      aprov: String(r.aprovados), reprov: String(r.reprovados), reprovCor: r.reprovados > 0 ? AVISO : TINTA,
    })) })),
    profs: estado.professores.map((p: any) => ({ id: p.id, nome: p.nome, email: p.email, ocupados: (p.ocupacoes || []).map((o: any) => ({ dia_semana: o.dia_semana, hora_inicio: o.hora_inicio, hora_fim: o.hora_fim, motivo: o.motivo || '' })) })),
    alunos: estado.alunos.map((a: any) => ({
      id: a.id, nome: a.nome, mat: a.matricula, idade: a.idade, media: a.media, email: a.email, hist: a.semestre_historico,
      turma: a.turma_id == null ? null : String(a.turma_id), turma_nome: a.turma_nome ?? null,
      ...(a.id === usuario.aluno_id && usuario.senha_provisoria ? { provisoria: true } : {}),
    })),
    discs,
    mats: Object.fromEntries(estado.matriculas.map((m: any) => [m.aluno_id + '-' + m.disciplina_id, true])),
    avals, avalMeta: Object.fromEntries(avals.map((a: any) => [a.id, { publicada: true, prazo: '' }])), conselho: {}, regra: regraDoSemestre(estado.semestre),
    notas: Object.fromEntries(estado.notas.map((n: any) => [n.aluno_id + '-' + n.avaliacao_id, n.valor])),
    aulas: estado.aulas.map((a: any) => ({
      aula_id: a.id, disciplina_id: a.disciplina_id, data: a.data, hora_inicio: a.hora_inicio, hora_fim: a.hora_fim,
      status: a.status, origem: a.origem, remarcada_de: a.remarcada_de,
      chamada: a.chamada == null ? null : Object.fromEntries(a.chamada.map((p: any) => [String(p.aluno_id), p.presente])),
    })),
    avisos: estado.avisos.map((a: any) => ({ id: a.id, titulo: a.titulo, data: a.data, msg: a.mensagem, disciplina_id: a.disciplina_id, autor_id: a.autor_id, autor_nome: a.autor_nome })),
    metricas: estado.metricas,
    selAluno: usuario.aluno_id ?? estado.alunos[0]?.id ?? null,
    selDisc: discs[0]?.id ?? null, notaDisc: discs[0]?.id ?? null,
    notaAval: avals.find((a: any) => a.did === discs[0]?.id)?.id ?? '',
  };
}
