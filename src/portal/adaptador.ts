export const fmt = (n: number) => n.toFixed(1).replace('.', ',');
export const pct = (f: number) => Math.round(f * 100) + '%';
export const AVISO = 'var(--aviso)', TINTA = 'var(--texto)';

const semestre = (s: any) => s == null ? null : ({
  id: s.id, nome: s.nome, inicio: s.inicio, fim: s.fim,
  encerrado_em: s.encerrado_em == null ? null : s.encerrado_em.slice(0, 10),
});

export function montarEstado(usuario: any, estado: any) {
  const discs = estado.disciplinas.map((d: any) => ({ id: d.id, nome: d.nome, carga_horaria: d.carga_horaria, professor_id: d.professor_id, grade: d.grade }));
  const avals = estado.avaliacoes.map((a: any) => ({ id: a.id, did: a.disciplina_id, nome: a.nome, peso: a.peso }));
  return {
    papel: usuario.perfil === 'professor' ? 'prof' : usuario.perfil,
    profId: usuario.perfil === 'professor' ? usuario.id : null, usuario,
    semestre: semestre(estado.semestre),
    historico: estado.semestres_encerrados.map((s: any) => ({ ...semestre(s), resumo: s.resumo.map((r: any) => ({
      disc: r.disciplina.nome, alunos: String(r.total_alunos),
      media: r.media_turma == null ? '—' : fmt(r.media_turma), mediaCor: TINTA,
      freq: r.frequencia_media == null ? '—' : pct(r.frequencia_media / 100), freqCor: TINTA,
      aprov: String(r.aprovados), reprov: String(r.reprovados), reprovCor: r.reprovados > 0 ? AVISO : TINTA,
    })) })),
    profs: estado.professores.map((p: any) => ({ id: p.id, nome: p.nome, email: p.email, ocupados: (p.ocupacoes || []).map((o: any) => ({ dia_semana: o.dia_semana, hora_inicio: o.hora_inicio, hora_fim: o.hora_fim, motivo: o.motivo || '' })) })),
    alunos: estado.alunos.map((a: any) => ({
      id: a.id, nome: a.nome, mat: a.matricula, idade: a.idade, media: a.media, email: a.email, hist: a.semestre_historico,
      ...(a.id === usuario.aluno_id && usuario.senha_provisoria ? { provisoria: true } : {}),
    })),
    discs,
    mats: Object.fromEntries(estado.matriculas.map((m: any) => [m.aluno_id + '-' + m.disciplina_id, true])),
    avals,
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
