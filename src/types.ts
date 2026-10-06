export interface Aluno {
  id: number;
  nome: string;
  idade: number;
  matricula: string;
}

export interface AlunoEntrada {
  nome: string;
  idade: number;
  matricula: string;
}

export interface Disciplina {
  id: number;
  nome: string;
  carga_horaria: number;
}

export interface DisciplinaEntrada {
  nome: string;
  carga_horaria: number;
}

export interface DisciplinaComContagem extends Disciplina {
  totalAlunos: number;
}

export interface FiltrosAluno {
  q?: string;
  idade_minima?: number;
  media_minima?: number;
}

export interface Matricula {
  aluno_id: number;
  disciplina_id: number;
}

export interface Avaliacao {
  id: number;
  disciplina_id: number;
  nome: string;
  peso: number;
}

export interface Nota {
  aluno_id: number;
  avaliacao_id: number;
  valor: number;
}

export interface Aula {
  id: number;
  disciplina_id: number;
  data: string;
}

export interface Presenca {
  aula_id: number;
  aluno_id: number;
  presente: boolean;
}

export interface Aviso {
  id: number;
  titulo: string;
  mensagem: string;
  data: string;
}

export interface AvisoEntrada {
  titulo: string;
  mensagem: string;
  data: string;
}
