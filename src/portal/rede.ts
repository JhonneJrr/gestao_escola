const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let expirou: (() => void) | null = null;
export function aoExpirar(callback: (() => void) | null) { expirou = callback; }
export function guardarToken(token: string) { localStorage.setItem('portal.token', token); }
export function lerToken() { return localStorage.getItem('portal.token'); }
export function apagarToken() { localStorage.removeItem('portal.token'); }

async function pedir<T = any>(caminho: string, corpo?: object, metodo = corpo ? 'POST' : 'GET'): Promise<T> {
  const token = lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(baseURL + caminho, {
      method: metodo,
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(caminho !== '/auth/login' && token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
  } catch { throw { status: 0, detalhe: 'Não foi possível falar com o servidor.' }; }
  if (resposta.status === 204) return undefined as T;
  const dados = await resposta.json();
  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== '/auth/login' && caminho !== '/auth/trocar-senha') {
      apagarToken(); expirou?.();
    }
    throw { status: resposta.status, detalhe: Array.isArray(dados.detail) ? dados.detail.map((e: { msg: string }) => e.msg).join('; ') : dados.detail };
  }
  return dados;
}

export const login = (email: string, senha: string) => pedir('/auth/login', { email, senha });
export const me = () => pedir('/auth/me');
export const estado = () => pedir('/portal/estado');
export const trocarSenha = (senhaAtual: string, senhaNova: string) => pedir('/auth/trocar-senha', { senha_atual: senhaAtual, senha_nova: senhaNova });

type SemestreEntrada = { nome: string; inicio: string; fim: string };
type SemestreSaida = SemestreEntrada & { id: number; encerrado_em: string | null };
type SenhaProvisoria = { senha_provisoria_texto: string };
type ProfessorEntrada = { nome: string; email: string };
type ProfessorSaida = ProfessorEntrada & SenhaProvisoria & { id: number };
type AlunoEntrada = { nome: string; idade: number; matricula: string; media?: number; email?: string };
type AlunoSaida = { id: number; nome: string; idade: number | null; matricula: string; media: number; senha_provisoria_texto?: string };
type DisciplinaEntrada = { nome: string; carga_horaria: number; professor_id?: number };
type DisciplinaSaida = { id: number; nome: string; carga_horaria: number; professor_id: number | null; professor_nome: string | null };
type GradeItem = { dia_semana: number; hora_inicio: string; hora_fim: string };

export const criarSemestre = (corpo: SemestreEntrada) => pedir<SemestreSaida>('/semestres', corpo);
export const encerrarSemestre = (id: number) => pedir<SemestreSaida>(`/semestres/${id}/encerrar`, undefined, 'POST');
export const criarProfessor = (corpo: ProfessorEntrada) => pedir<ProfessorSaida>('/professores', corpo);
export const redefinirProfessor = (id: number) => pedir<SenhaProvisoria>(`/professores/${id}/redefinir-senha`, undefined, 'POST');
export const criarAluno = (corpo: AlunoEntrada) => pedir<AlunoSaida>('/alunos', corpo);
export const atualizarAluno = (id: number, corpo: Partial<AlunoEntrada>) => pedir<AlunoSaida>(`/alunos/${id}`, corpo, 'PATCH');
export const redefinirAluno = (id: number) => pedir<SenhaProvisoria>(`/alunos/${id}/redefinir-senha`, undefined, 'POST');
export const apagarAluno = (id: number) => pedir<void>(`/alunos/${id}`, undefined, 'DELETE');
export const criarDisciplina = (corpo: DisciplinaEntrada) => pedir<DisciplinaSaida>('/disciplinas', corpo);
export const atualizarDisciplina = (id: number, corpo: Partial<Omit<DisciplinaEntrada, 'professor_id'>> & { professor_id?: number | null }) => pedir<DisciplinaSaida>(`/disciplinas/${id}`, corpo, 'PATCH');
export const salvarGrade = (id: number, itens: GradeItem[]) => pedir<{ itens: GradeItem[]; aulas_geradas: number }>(`/disciplinas/${id}/grade`, { itens }, 'PUT');
export const apagarDisciplina = (id: number) => pedir<void>(`/disciplinas/${id}`, undefined, 'DELETE');
export const matricular = (aluno: number, disciplina: number) => pedir<{ mensagem: string }>(`/alunos/${aluno}/matricular/${disciplina}`, undefined, 'POST');
export const desmatricular = (aluno: number, disciplina: number) => pedir<void>(`/alunos/${aluno}/matricular/${disciplina}`, undefined, 'DELETE');

type AvaliacaoEntrada = { nome: string; peso: number };
type AvaliacaoSaida = AvaliacaoEntrada & { id: number; disciplina_id: number };
type Presenca = { aluno_id: number; presente: boolean };
type AulaEntrada = { data: string; hora_inicio?: string | null; hora_fim?: string | null };
type AulaAtualizacao = Partial<AulaEntrada> & { status?: 'agendada' | 'cancelada' };
type AulaSaida = Required<AulaEntrada> & { id: number; disciplina_id: number; status: 'agendada' | 'cancelada'; origem: 'grade' | 'extra'; remarcada_de: string | null };
type AvisoEntrada = { titulo: string; mensagem: string; data: string; disciplina_id?: number };
type AvisoSaida = Omit<AvisoEntrada, 'disciplina_id'> & { id: number; disciplina_id: number | null; disciplina_nome: string | null; autor_nome: string | null };

export const criarAvaliacao = (disciplina: number, corpo: AvaliacaoEntrada) => pedir<AvaliacaoSaida>(`/disciplinas/${disciplina}/avaliacoes`, corpo);
export const apagarAvaliacao = (id: number) => pedir<void>(`/avaliacoes/${id}`, undefined, 'DELETE');
export const salvarNota = (avaliacao: number, aluno: number, valor: number) => pedir<void>(`/avaliacoes/${avaliacao}/notas/${aluno}`, { valor }, 'PUT');
export const apagarNota = (avaliacao: number, aluno: number) => pedir<void>(`/avaliacoes/${avaliacao}/notas/${aluno}`, undefined, 'DELETE');
export const salvarChamada = (disciplina: number, corpo: { data: string; presencas: Presenca[] }) => pedir<void>(`/disciplinas/${disciplina}/chamada`, corpo, 'PUT');
export const atualizarAula = (id: number, corpo: AulaAtualizacao) => pedir<AulaSaida>(`/aulas/${id}`, corpo, 'PATCH');
export const criarAula = (disciplina: number, corpo: AulaEntrada) => pedir<AulaSaida>(`/disciplinas/${disciplina}/aulas`, corpo);
export const criarAviso = (corpo: AvisoEntrada) => pedir<AvisoSaida>('/avisos', corpo);
export const atualizarAviso = (id: number, corpo: Partial<Omit<AvisoEntrada, 'disciplina_id'>>) => pedir<AvisoSaida>(`/avisos/${id}`, corpo, 'PATCH');
export const apagarAviso = (id: number) => pedir<void>(`/avisos/${id}`, undefined, 'DELETE');
