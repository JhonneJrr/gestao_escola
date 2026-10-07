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
