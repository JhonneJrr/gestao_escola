// Regras puras da Grade e agenda (sem React, sem rede), para testar à parte.
export type AlunoChamada = { id: number | string; nome: string };
type Marcas = Record<string, boolean | null | undefined>;
type Chamada = Record<string, boolean | null> | null | undefined;

// Quem entra na chamada: os matriculados na disciplina mais quem já tem presença registrada naquela aula,
// para uma revisão não perder a marcação de quem saiu da disciplina. A turma cadastral não conta.
export function alunosDaChamada(alunos: AlunoChamada[], matriculas: { aluno_id: number | string; disciplina_id: number | string }[], disciplinaId: number | string, chamada: Chamada): AlunoChamada[] {
  const matriculados = new Set((matriculas || []).filter(m => String(m.disciplina_id) === String(disciplinaId)).map(m => String(m.aluno_id)));
  return (alunos || []).filter(a => matriculados.has(String(a.id)) || (chamada != null && chamada[String(a.id)] != null)).map(a => ({ id: a.id, nome: a.nome }));
}

// Quantos alunos da lista ainda não foram marcados (presente ou falta).
export const faltamMarcar = (lista: AlunoChamada[], marcas: Marcas) => lista.filter(a => marcas[String(a.id)] == null).length;

// Corpo do PUT /disciplinas/{id}/chamada. Quem tinha presença na aula e não aparece na lista mantém o valor que tinha.
export function presencasAPI(lista: AlunoChamada[], marcas: Marcas, chamadaAtual: Chamada) {
  const ids = new Set(lista.map(a => String(a.id)));
  const presencas = lista.map(a => ({ aluno_id: Number(a.id), presente: marcas[String(a.id)] === true }));
  Object.keys(chamadaAtual || {}).forEach(k => { if (!ids.has(k) && chamadaAtual![k] != null) presencas.push({ aluno_id: Number(k), presente: chamadaAtual![k] === true }); });
  return presencas;
}

const ddmmaaaa = (s: string) => s.slice(0, 10).split('-').reverse().join('/');
// Por que a chamada não abre ('' quando abre). Semestre encerrado vence tudo, depois cancelada, feriado e aula futura.
export function motivoSemChamada(o: { encerrado: boolean; encerradoEm?: string | null; semSemestre?: boolean; cancelada?: boolean; feriado?: string; data: string; hoje: string }): string {
  if (o.encerrado) return 'Semestre encerrado' + (o.encerradoEm ? ' em ' + ddmmaaaa(o.encerradoEm) : '') + ': somente leitura.';
  if (o.semSemestre) return 'Sem semestre ativo: somente leitura.';
  if (o.cancelada) return 'Aula cancelada.';
  if (o.feriado) return 'Sem aula: ' + o.feriado + '.';
  if (o.data > o.hoje) return 'A chamada abre no dia da aula.';
  return '';
}

// Feriados por dia. Evento de todas as turmas bloqueia todo mundo; evento de algumas turmas só as aulas delas.
// O mapa devolvido tem as datas gerais como chaves e, à parte (não enumerável), as datas por turma.
export type MapaFeriados = Record<string, string> & { __t?: Record<string, Record<string, string>> };
const proxDia = (s: string) => { const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10) + 1)); return d.toISOString().slice(0, 10); };
export function mapaFeriados(eventos: { tipo: string; titulo: string; data: string; fim?: string; turmas: 'todas' | (string | number)[] }[]): MapaFeriados {
  const geral: MapaFeriados = {}, porTurma: Record<string, Record<string, string>> = {};
  (eventos || []).filter(e => e.tipo === 'feriado').forEach(e => {
    for (let d = e.data; d <= (e.fim || e.data); d = proxDia(d)) {
      if (e.turmas === 'todas') geral[d] = e.titulo;
      else (e.turmas || []).forEach(t => { (porTurma[String(t)] = porTurma[String(t)] || {})[d] = e.titulo; });
    }
  });
  Object.defineProperty(geral, '__t', { value: porTurma, enumerable: false });
  return geral;
}
export const feriadoDaTurma = (mapa: MapaFeriados | null | undefined, turma: string | number | null | undefined, data: string): string =>
  (mapa && (mapa[data] || (turma ? (mapa.__t || {})[String(turma)]?.[data] : '') || '')) || '';
