import type { Aluno, Aula, Avaliacao, Aviso, Disciplina, Matricula, Nota, Presenca } from "./types";

export const alunosIniciais: Aluno[] = [
  { id: 1, nome: "Ana Beatriz Souza", idade: 19, matricula: "2026001" },
  { id: 2, nome: "Carlos Eduardo Lima", idade: 21, matricula: "2026002" },
  { id: 3, nome: "Fernanda Torres", idade: 17, matricula: "2026003" },
  { id: 4, nome: "Bruno Martins", idade: 20, matricula: "2026004" },
  { id: 5, nome: "Juliana Alves", idade: 18, matricula: "2026005" },
  { id: 6, nome: "Rafael Costa", idade: 22, matricula: "2026006" },
  { id: 7, nome: "Camila Rocha", idade: 16, matricula: "2026007" },
  { id: 8, nome: "Pedro Henrique", idade: 19, matricula: "2026008" },
];

export const disciplinasIniciais: Disciplina[] = [
  { id: 1, nome: "Python", carga_horaria: 40 },
  { id: 2, nome: "Banco de Dados", carga_horaria: 60 },
  { id: 3, nome: "Estrutura de Dados", carga_horaria: 80 },
  { id: 4, nome: "Desenvolvimento Web", carga_horaria: 50 },
];

export const matriculasIniciais: Matricula[] = [
  { aluno_id: 1, disciplina_id: 1 },
  { aluno_id: 1, disciplina_id: 2 },
  { aluno_id: 2, disciplina_id: 1 },
  { aluno_id: 3, disciplina_id: 3 },
  { aluno_id: 4, disciplina_id: 4 },
  { aluno_id: 6, disciplina_id: 2 },
];

export const avaliacoesIniciais: Avaliacao[] = [
  { id: 1, disciplina_id: 1, nome: "P1", peso: 40 },
  { id: 2, disciplina_id: 1, nome: "P2", peso: 60 },
  { id: 3, disciplina_id: 2, nome: "P1", peso: 40 },
  { id: 4, disciplina_id: 2, nome: "P2", peso: 60 },
  { id: 5, disciplina_id: 3, nome: "P1", peso: 40 },
  { id: 6, disciplina_id: 3, nome: "P2", peso: 60 },
  { id: 7, disciplina_id: 4, nome: "P1", peso: 40 },
  { id: 8, disciplina_id: 4, nome: "P2", peso: 60 },
];

export const notasIniciais: Nota[] = [
  { aluno_id: 1, avaliacao_id: 1, valor: 8.0 },
  { aluno_id: 1, avaliacao_id: 2, valor: 8.0 },
  { aluno_id: 1, avaliacao_id: 3, valor: 9.0 },
  { aluno_id: 1, avaliacao_id: 4, valor: 9.0 },
  { aluno_id: 2, avaliacao_id: 1, valor: 4.5 },
  { aluno_id: 3, avaliacao_id: 5, valor: 9.0 },
  { aluno_id: 3, avaliacao_id: 6, valor: 9.0 },
  { aluno_id: 4, avaliacao_id: 7, valor: 6.0 },
  { aluno_id: 6, avaliacao_id: 3, valor: 7.8 },
  { aluno_id: 6, avaliacao_id: 4, valor: 7.8 },
];

export const aulasIniciais: Aula[] = [
  { id: 1, disciplina_id: 1, data: "2026-08-20" },
  { id: 2, disciplina_id: 1, data: "2026-08-27" },
  { id: 3, disciplina_id: 2, data: "2026-08-21" },
  { id: 4, disciplina_id: 2, data: "2026-08-28" },
  { id: 5, disciplina_id: 3, data: "2026-08-24" },
  { id: 6, disciplina_id: 4, data: "2026-08-25" },
];

export const presencasIniciais: Presenca[] = [
  { aula_id: 1, aluno_id: 1, presente: true },
  { aula_id: 1, aluno_id: 2, presente: true },
  { aula_id: 2, aluno_id: 1, presente: true },
  { aula_id: 2, aluno_id: 2, presente: false },
  { aula_id: 3, aluno_id: 1, presente: true },
  { aula_id: 3, aluno_id: 6, presente: true },
  { aula_id: 4, aluno_id: 1, presente: true },
  { aula_id: 4, aluno_id: 6, presente: true },
  { aula_id: 5, aluno_id: 3, presente: true },
  { aula_id: 6, aluno_id: 4, presente: false },
];

export const avisosIniciais: Aviso[] = [
  { id: 1, titulo: "Feriado", mensagem: "Não haverá aula no dia 7 de setembro.", data: "30/08/2026" },
  { id: 2, titulo: "Reunião de pais", mensagem: "Reunião de pais e mestres marcada para o fim do mês.", data: "01/09/2026" },
  { id: 3, titulo: "Prova de Python", mensagem: "A prova da disciplina de Python será no dia 10/09.", data: "05/09/2026" },
];
