import { http } from "./http";
import type {
  Aluno,
  AlunoEntrada,
  Aula,
  Avaliacao,
  Aviso,
  AvisoEntrada,
  Disciplina,
  DisciplinaComContagem,
  DisciplinaEntrada,
  FiltrosAluno,
} from "./types";

// ----------------------------- tipos que vem da API (formato dos componentes) -----------------------------

export interface NotaDaMateria {
  avaliacao: Avaliacao;
  valor: number | null;
}

export interface BoletimDaMateria {
  disciplina: Disciplina;
  notas: NotaDaMateria[];
  media: number | null;
  parcial: boolean;
}

export interface AvaliacaoPendente {
  disciplina: Disciplina;
  avaliacao: Avaliacao;
}

export interface AlunoComFrequencia extends Aluno {
  percentual: number | null;
}

export interface FrequenciaDaMateria {
  disciplina: Disciplina;
  percentual: number | null;
}

export interface Situacao {
  mediaGeral: number | null;
  frequenciaGeral: number | null;
  aprovado: boolean | null;
}

interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

// A API entrega listas em paginas de no maximo 100 itens; os seletores do portal precisam da lista inteira
async function todasAsPaginas<T>(caminho: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const itens: T[] = [];
  let pagina = 1;
  while (true) {
    const { data } = await http.get<Pagina<T>>(caminho, { params: { ...params, pagina, tamanho: 100 } });
    itens.push(...data.itens);
    if (data.itens.length === 0 || itens.length >= data.total) {
      return itens;
    }
    pagina += 1;
  }
}

// ----------------------------- infraestrutura -----------------------------

// Acorda a API (o plano gratuito da nuvem dorme): erro aqui nao importa
export async function acordarApi(): Promise<void> {
  try {
    await http.get("/");
  } catch {
    // so aquecimento
  }
}

// ----------------------------- alunos -----------------------------

export async function listarAlunos(filtros?: FiltrosAluno): Promise<Aluno[]> {
  return todasAsPaginas<Aluno>("/alunos", {
    q: filtros?.q === "" ? undefined : filtros?.q,
    idade_minima: filtros?.idade_minima,
    media_minima: filtros?.media_minima,
  });
}

export async function buscarAluno(id: number): Promise<Aluno> {
  const { data } = await http.get<Aluno>(`/alunos/${id}`);
  return data;
}

export async function criarAluno(dados: AlunoEntrada): Promise<Aluno> {
  const { data } = await http.post<Aluno>("/alunos", dados);
  return data;
}

export async function excluirAluno(id: number): Promise<void> {
  await http.delete(`/alunos/${id}`);
}

// ----------------------------- disciplinas -----------------------------

export async function listarDisciplinas(): Promise<Disciplina[]> {
  return todasAsPaginas<Disciplina>("/disciplinas");
}

export async function listarDisciplinasComContagem(): Promise<DisciplinaComContagem[]> {
  const disciplinas = await listarDisciplinas();
  return Promise.all(
    disciplinas.map(async (disciplina) => {
      const alunos = await alunosDaDisciplina(disciplina.id);
      return { ...disciplina, totalAlunos: alunos.length };
    })
  );
}

export async function criarDisciplina(dados: DisciplinaEntrada): Promise<Disciplina> {
  const { data } = await http.post<Disciplina>("/disciplinas", dados);
  return data;
}

export async function excluirDisciplina(id: number): Promise<void> {
  await http.delete(`/disciplinas/${id}`);
}

export async function disciplinasDoAluno(alunoId: number): Promise<Disciplina[]> {
  const { data } = await http.get<Disciplina[]>(`/alunos/${alunoId}/disciplinas`);
  return data;
}

export async function alunosDaDisciplina(disciplinaId: number): Promise<Aluno[]> {
  const { data } = await http.get<Aluno[]>(`/disciplinas/${disciplinaId}/alunos`);
  return data;
}

export async function matricular(alunoId: number, disciplinaId: number): Promise<void> {
  await http.post(`/alunos/${alunoId}/matricular/${disciplinaId}`);
}

// ----------------------------- avaliacoes e notas -----------------------------

export async function listarAvaliacoes(disciplinaId: number): Promise<Avaliacao[]> {
  const { data } = await http.get<Avaliacao[]>(`/disciplinas/${disciplinaId}/avaliacoes`);
  return data;
}

export async function criarAvaliacao(disciplinaId: number, nome: string, peso: number): Promise<Avaliacao> {
  const { data } = await http.post<Avaliacao>(`/disciplinas/${disciplinaId}/avaliacoes`, { nome, peso });
  return data;
}

export async function excluirAvaliacao(id: number): Promise<void> {
  await http.delete(`/avaliacoes/${id}`);
}

export async function lancarNota(alunoId: number, avaliacaoId: number, valor: number): Promise<void> {
  await http.put(`/avaliacoes/${avaliacaoId}/notas/${alunoId}`, { valor });
}

export async function boletimDoAluno(alunoId: number): Promise<BoletimDaMateria[]> {
  const { data } = await http.get<BoletimDaMateria[]>(`/alunos/${alunoId}/boletim`);
  return data;
}

export async function avaliacoesSemNotaLancada(): Promise<AvaliacaoPendente[]> {
  const { data } = await http.get<AvaliacaoPendente[]>("/avaliacoes/pendentes");
  return data;
}

// ----------------------------- frequencia -----------------------------

export async function registrarChamada(
  disciplinaId: number,
  data: string,
  presencas: { aluno_id: number; presente: boolean }[]
): Promise<void> {
  await http.put(`/disciplinas/${disciplinaId}/chamada`, { data, presencas });
}

export async function aulasDaDisciplina(disciplinaId: number): Promise<Aula[]> {
  const { data } = await http.get<Aula[]>(`/disciplinas/${disciplinaId}/aulas`);
  return data;
}

export async function presencasDoDia(disciplinaId: number, data: string): Promise<Record<number, boolean>> {
  const resposta = await http.get<{ aluno_id: number; presente: boolean }[]>(
    `/disciplinas/${disciplinaId}/chamada`,
    { params: { data } }
  );
  const mapa: Record<number, boolean> = {};
  for (const item of resposta.data) {
    mapa[item.aluno_id] = item.presente;
  }
  return mapa;
}

export async function frequenciaDaTurma(disciplinaId: number): Promise<AlunoComFrequencia[]> {
  const { data } = await http.get<AlunoComFrequencia[]>(`/disciplinas/${disciplinaId}/frequencia`);
  return data;
}

export async function frequenciaDoAluno(alunoId: number): Promise<FrequenciaDaMateria[]> {
  const { data } = await http.get<FrequenciaDaMateria[]>(`/alunos/${alunoId}/frequencia`);
  return data;
}

// ----------------------------- situacao geral do aluno -----------------------------

interface SituacaoDaApi {
  media_geral: number | null;
  frequencia_geral: number | null;
  aprovado: boolean | null;
}

export async function situacaoDoAluno(alunoId: number): Promise<Situacao> {
  const { data } = await http.get<SituacaoDaApi>(`/alunos/${alunoId}/situacao`);
  return { mediaGeral: data.media_geral, frequenciaGeral: data.frequencia_geral, aprovado: data.aprovado };
}

// ----------------------------- avisos -----------------------------

export async function listarAvisos(): Promise<Aviso[]> {
  return todasAsPaginas<Aviso>("/avisos");
}

export async function criarAviso(dados: AvisoEntrada): Promise<Aviso> {
  const { data } = await http.post<Aviso>("/avisos", dados);
  return data;
}

export async function excluirAviso(id: number): Promise<void> {
  await http.delete(`/avisos/${id}`);
}
