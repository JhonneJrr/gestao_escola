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
  Matricula,
  Nota,
  Presenca,
} from "./types";
import {
  alunosIniciais,
  aulasIniciais,
  avaliacoesIniciais,
  avisosIniciais,
  disciplinasIniciais,
  matriculasIniciais,
  notasIniciais,
  presencasIniciais,
} from "./mock";

export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let bancoAlunos: Aluno[] = [...alunosIniciais];
let bancoDisciplinas: Disciplina[] = [...disciplinasIniciais];
let bancoMatriculas: Matricula[] = [...matriculasIniciais];
let bancoAvaliacoes: Avaliacao[] = [...avaliacoesIniciais];
let bancoNotas: Nota[] = [...notasIniciais];
let bancoAulas: Aula[] = [...aulasIniciais];
let bancoPresencas: Presenca[] = [...presencasIniciais];
let bancoAvisos: Aviso[] = [...avisosIniciais];
let precarregado = false;

export async function precarregar(): Promise<void> {
  await esperar(600);
  precarregado = true;
}

export async function listarAlunos(filtros?: FiltrosAluno): Promise<Aluno[]> {
  const temFiltro =
    filtros?.q !== undefined || filtros?.idade_minima !== undefined || filtros?.media_minima !== undefined;

  if (!precarregado || temFiltro) {
    await esperar(500);
  }

  let resultado = [...bancoAlunos];

  if (filtros?.q !== undefined && filtros.q !== "") {
    const busca = filtros.q.toLowerCase();
    resultado = resultado.filter((aluno) => aluno.nome.toLowerCase().includes(busca));
  }

  if (filtros?.idade_minima !== undefined) {
    const idadeMinima = filtros.idade_minima;
    resultado = resultado.filter((aluno) => aluno.idade >= idadeMinima);
  }

  if (filtros?.media_minima !== undefined) {
    const mediaMinima = filtros.media_minima;
    resultado = resultado.filter((aluno) => {
      const media = calcularMediaGeral(aluno.id);
      return media !== null && media >= mediaMinima;
    });
  }

  return resultado;
}

export async function criarAluno(dados: AlunoEntrada): Promise<Aluno> {
  await esperar(300);

  const jaExiste = bancoAlunos.some((aluno) => aluno.matricula === dados.matricula);
  if (jaExiste) {
    throw new Error("Já existe um aluno com essa matrícula");
  }

  const novoId = Math.max(0, ...bancoAlunos.map((aluno) => aluno.id)) + 1;
  const novoAluno: Aluno = { id: novoId, ...dados };
  bancoAlunos = [...bancoAlunos, novoAluno];

  return novoAluno;
}

export async function excluirAluno(id: number): Promise<void> {
  await esperar(300);

  const existe = bancoAlunos.some((aluno) => aluno.id === id);
  if (!existe) {
    throw new Error("Aluno não encontrado");
  }

  bancoAlunos = bancoAlunos.filter((aluno) => aluno.id !== id);
  bancoMatriculas = bancoMatriculas.filter((matricula) => matricula.aluno_id !== id);
  bancoNotas = bancoNotas.filter((nota) => nota.aluno_id !== id);
  bancoPresencas = bancoPresencas.filter((presenca) => presenca.aluno_id !== id);
}

export async function listarDisciplinas(): Promise<Disciplina[]> {
  if (!precarregado) {
    await esperar(400);
  }
  return [...bancoDisciplinas];
}

export async function listarDisciplinasComContagem(): Promise<DisciplinaComContagem[]> {
  if (!precarregado) {
    await esperar(400);
  }

  return bancoDisciplinas.map((disciplina) => {
    const totalAlunos = bancoMatriculas.filter(
      (matricula) => matricula.disciplina_id === disciplina.id
    ).length;
    return { ...disciplina, totalAlunos };
  });
}

export async function criarDisciplina(dados: DisciplinaEntrada): Promise<Disciplina> {
  await esperar(300);

  const jaExiste = bancoDisciplinas.some(
    (disciplina) => disciplina.nome.toLowerCase() === dados.nome.toLowerCase()
  );
  if (jaExiste) {
    throw new Error("Já existe uma disciplina com esse nome");
  }

  const novoId = Math.max(0, ...bancoDisciplinas.map((disciplina) => disciplina.id)) + 1;
  const novaDisciplina: Disciplina = { id: novoId, ...dados };
  bancoDisciplinas = [...bancoDisciplinas, novaDisciplina];

  return novaDisciplina;
}

export async function excluirDisciplina(id: number): Promise<void> {
  await esperar(300);

  const existe = bancoDisciplinas.some((disciplina) => disciplina.id === id);
  if (!existe) {
    throw new Error("Disciplina não encontrada");
  }

  const idsAvaliacoes = bancoAvaliacoes
    .filter((avaliacao) => avaliacao.disciplina_id === id)
    .map((avaliacao) => avaliacao.id);
  const idsAulas = bancoAulas.filter((aula) => aula.disciplina_id === id).map((aula) => aula.id);

  bancoDisciplinas = bancoDisciplinas.filter((disciplina) => disciplina.id !== id);
  bancoMatriculas = bancoMatriculas.filter((matricula) => matricula.disciplina_id !== id);
  bancoAvaliacoes = bancoAvaliacoes.filter((avaliacao) => avaliacao.disciplina_id !== id);
  bancoNotas = bancoNotas.filter((nota) => !idsAvaliacoes.includes(nota.avaliacao_id));
  bancoAulas = bancoAulas.filter((aula) => aula.disciplina_id !== id);
  bancoPresencas = bancoPresencas.filter((presenca) => !idsAulas.includes(presenca.aula_id));
}

export async function disciplinasDoAluno(alunoId: number): Promise<Disciplina[]> {
  await esperar(300);

  const alunoExiste = bancoAlunos.some((aluno) => aluno.id === alunoId);
  if (!alunoExiste) {
    throw new Error("Aluno não encontrado");
  }

  const idsDisciplinas = bancoMatriculas
    .filter((matricula) => matricula.aluno_id === alunoId)
    .map((matricula) => matricula.disciplina_id);

  return bancoDisciplinas.filter((disciplina) => idsDisciplinas.includes(disciplina.id));
}

export async function alunosDaDisciplina(disciplinaId: number): Promise<Aluno[]> {
  await esperar(300);

  const disciplinaExiste = bancoDisciplinas.some((disciplina) => disciplina.id === disciplinaId);
  if (!disciplinaExiste) {
    throw new Error("Disciplina não encontrada");
  }

  const idsAlunos = bancoMatriculas
    .filter((matricula) => matricula.disciplina_id === disciplinaId)
    .map((matricula) => matricula.aluno_id);

  return bancoAlunos.filter((aluno) => idsAlunos.includes(aluno.id));
}

export async function matricular(alunoId: number, disciplinaId: number): Promise<void> {
  await esperar(300);

  const alunoExiste = bancoAlunos.some((aluno) => aluno.id === alunoId);
  if (!alunoExiste) {
    throw new Error("Aluno não encontrado");
  }

  const disciplinaExiste = bancoDisciplinas.some((disciplina) => disciplina.id === disciplinaId);
  if (!disciplinaExiste) {
    throw new Error("Disciplina não encontrada");
  }

  const jaMatriculado = bancoMatriculas.some(
    (matricula) => matricula.aluno_id === alunoId && matricula.disciplina_id === disciplinaId
  );
  if (jaMatriculado) {
    throw new Error("Este aluno já está matriculado nessa disciplina");
  }

  bancoMatriculas = [...bancoMatriculas, { aluno_id: alunoId, disciplina_id: disciplinaId }];
}

// =========================== AVALIAÇÕES E NOTAS (BOLETIM) ===========================

export async function listarAvaliacoes(disciplinaId: number): Promise<Avaliacao[]> {
  await esperar(300);
  return bancoAvaliacoes.filter((avaliacao) => avaliacao.disciplina_id === disciplinaId);
}

export async function criarAvaliacao(disciplinaId: number, nome: string, peso: number): Promise<Avaliacao> {
  await esperar(300);

  const disciplinaExiste = bancoDisciplinas.some((disciplina) => disciplina.id === disciplinaId);
  if (!disciplinaExiste) {
    throw new Error("Disciplina não encontrada");
  }

  const somaAtual = bancoAvaliacoes
    .filter((avaliacao) => avaliacao.disciplina_id === disciplinaId)
    .reduce((soma, avaliacao) => soma + avaliacao.peso, 0);

  if (somaAtual + peso > 100) {
    throw new Error(`A soma dos pesos não pode passar de 100 (já soma ${somaAtual})`);
  }

  const novoId = Math.max(0, ...bancoAvaliacoes.map((avaliacao) => avaliacao.id)) + 1;
  const novaAvaliacao: Avaliacao = { id: novoId, disciplina_id: disciplinaId, nome, peso };
  bancoAvaliacoes = [...bancoAvaliacoes, novaAvaliacao];

  return novaAvaliacao;
}

export async function excluirAvaliacao(id: number): Promise<void> {
  await esperar(300);

  const existe = bancoAvaliacoes.some((avaliacao) => avaliacao.id === id);
  if (!existe) {
    throw new Error("Avaliação não encontrada");
  }

  const temNota = bancoNotas.some((nota) => nota.avaliacao_id === id);
  if (temNota) {
    throw new Error("Não é possível excluir: já existem notas lançadas nessa avaliação");
  }

  bancoAvaliacoes = bancoAvaliacoes.filter((avaliacao) => avaliacao.id !== id);
}

export async function lancarNota(alunoId: number, avaliacaoId: number, valor: number): Promise<void> {
  await esperar(300);

  const avaliacao = bancoAvaliacoes.find((avaliacao) => avaliacao.id === avaliacaoId);
  if (!avaliacao) {
    throw new Error("Avaliação não encontrada");
  }

  const matriculado = bancoMatriculas.some(
    (matricula) => matricula.aluno_id === alunoId && matricula.disciplina_id === avaliacao.disciplina_id
  );
  if (!matriculado) {
    throw new Error("O aluno não está matriculado nessa disciplina");
  }

  const notaExistente = bancoNotas.some(
    (nota) => nota.aluno_id === alunoId && nota.avaliacao_id === avaliacaoId
  );

  if (notaExistente) {
    bancoNotas = bancoNotas.map((nota) => {
      if (nota.aluno_id === alunoId && nota.avaliacao_id === avaliacaoId) {
        return { ...nota, valor };
      }
      return nota;
    });
  } else {
    bancoNotas = [...bancoNotas, { aluno_id: alunoId, avaliacao_id: avaliacaoId, valor }];
  }
}

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

function calcularBoletim(alunoId: number): BoletimDaMateria[] {
  const idsDisciplinas = bancoMatriculas
    .filter((matricula) => matricula.aluno_id === alunoId)
    .map((matricula) => matricula.disciplina_id);

  return bancoDisciplinas
    .filter((disciplina) => idsDisciplinas.includes(disciplina.id))
    .map((disciplina) => {
      const avaliacoes = bancoAvaliacoes.filter((avaliacao) => avaliacao.disciplina_id === disciplina.id);

      const notas: NotaDaMateria[] = avaliacoes.map((avaliacao) => {
        const nota = bancoNotas.find(
          (nota) => nota.aluno_id === alunoId && nota.avaliacao_id === avaliacao.id
        );
        return { avaliacao, valor: nota ? nota.valor : null };
      });

      const lancadas = notas.filter((nota) => nota.valor !== null);

      let media: number | null = null;
      if (lancadas.length > 0) {
        const somaPesos = lancadas.reduce((soma, nota) => soma + nota.avaliacao.peso, 0);
        const somaPonderada = lancadas.reduce((soma, nota) => soma + nota.valor! * nota.avaliacao.peso, 0);
        media = somaPonderada / somaPesos;
      }

      return {
        disciplina,
        notas,
        media,
        parcial: lancadas.length > 0 && lancadas.length < notas.length,
      };
    });
}

function calcularMediaGeral(alunoId: number): number | null {
  const boletim = calcularBoletim(alunoId);
  const medias = boletim.map((materia) => materia.media).filter((media): media is number => media !== null);

  if (medias.length === 0) {
    return null;
  }

  return medias.reduce((soma, media) => soma + media, 0) / medias.length;
}

export async function boletimDoAluno(alunoId: number): Promise<BoletimDaMateria[]> {
  await esperar(300);

  const alunoExiste = bancoAlunos.some((aluno) => aluno.id === alunoId);
  if (!alunoExiste) {
    throw new Error("Aluno não encontrado");
  }

  return calcularBoletim(alunoId);
}

export async function mediaGeralDoAluno(alunoId: number): Promise<number | null> {
  await esperar(300);
  return calcularMediaGeral(alunoId);
}

export interface AvaliacaoPendente {
  disciplina: Disciplina;
  avaliacao: Avaliacao;
}

export async function avaliacoesSemNotaLancada(): Promise<AvaliacaoPendente[]> {
  await esperar(300);

  const resultado: AvaliacaoPendente[] = [];

  for (const avaliacao of bancoAvaliacoes) {
    const temAlgumaNota = bancoNotas.some((nota) => nota.avaliacao_id === avaliacao.id);
    if (temAlgumaNota) {
      continue;
    }
    const disciplina = bancoDisciplinas.find((disciplina) => disciplina.id === avaliacao.disciplina_id);
    if (disciplina) {
      resultado.push({ disciplina, avaliacao });
    }
  }

  return resultado;
}

// =========================== FREQUÊNCIA (CHAMADA) ===========================

export async function registrarChamada(
  disciplinaId: number,
  data: string,
  presencas: { aluno_id: number; presente: boolean }[]
): Promise<void> {
  await esperar(300);

  const disciplinaExiste = bancoDisciplinas.some((disciplina) => disciplina.id === disciplinaId);
  if (!disciplinaExiste) {
    throw new Error("Disciplina não encontrada");
  }

  let aula = bancoAulas.find((aula) => aula.disciplina_id === disciplinaId && aula.data === data);
  if (!aula) {
    const novoId = Math.max(0, ...bancoAulas.map((aula) => aula.id)) + 1;
    aula = { id: novoId, disciplina_id: disciplinaId, data };
    bancoAulas = [...bancoAulas, aula];
  }

  const aulaId = aula.id;

  for (const item of presencas) {
    const jaExiste = bancoPresencas.some(
      (presenca) => presenca.aula_id === aulaId && presenca.aluno_id === item.aluno_id
    );

    if (jaExiste) {
      bancoPresencas = bancoPresencas.map((presenca) => {
        if (presenca.aula_id === aulaId && presenca.aluno_id === item.aluno_id) {
          return { ...presenca, presente: item.presente };
        }
        return presenca;
      });
    } else {
      bancoPresencas = [
        ...bancoPresencas,
        { aula_id: aulaId, aluno_id: item.aluno_id, presente: item.presente },
      ];
    }
  }
}

export async function aulasDaDisciplina(disciplinaId: number): Promise<Aula[]> {
  await esperar(300);
  return bancoAulas.filter((aula) => aula.disciplina_id === disciplinaId);
}

export async function presencasDoDia(disciplinaId: number, data: string): Promise<Record<number, boolean>> {
  await esperar(200);

  const aula = bancoAulas.find((aula) => aula.disciplina_id === disciplinaId && aula.data === data);
  const mapa: Record<number, boolean> = {};

  if (!aula) {
    return mapa;
  }

  for (const presenca of bancoPresencas) {
    if (presenca.aula_id === aula.id) {
      mapa[presenca.aluno_id] = presenca.presente;
    }
  }

  return mapa;
}

export interface AlunoComFrequencia extends Aluno {
  percentual: number | null;
}

export async function frequenciaDaTurma(disciplinaId: number): Promise<AlunoComFrequencia[]> {
  await esperar(300);

  const disciplinaExiste = bancoDisciplinas.some((disciplina) => disciplina.id === disciplinaId);
  if (!disciplinaExiste) {
    throw new Error("Disciplina não encontrada");
  }

  const aulas = bancoAulas.filter((aula) => aula.disciplina_id === disciplinaId);
  const idsAulas = aulas.map((aula) => aula.id);

  const idsAlunos = bancoMatriculas
    .filter((matricula) => matricula.disciplina_id === disciplinaId)
    .map((matricula) => matricula.aluno_id);

  return bancoAlunos
    .filter((aluno) => idsAlunos.includes(aluno.id))
    .map((aluno) => {
      if (aulas.length === 0) {
        return { ...aluno, percentual: null };
      }

      const presencas = bancoPresencas.filter(
        (presenca) => presenca.aluno_id === aluno.id && idsAulas.includes(presenca.aula_id) && presenca.presente
      );

      return { ...aluno, percentual: (presencas.length / aulas.length) * 100 };
    });
}

export interface FrequenciaDaMateria {
  disciplina: Disciplina;
  percentual: number | null;
}

function calcularFrequencia(alunoId: number): FrequenciaDaMateria[] {
  const idsDisciplinas = bancoMatriculas
    .filter((matricula) => matricula.aluno_id === alunoId)
    .map((matricula) => matricula.disciplina_id);

  return bancoDisciplinas
    .filter((disciplina) => idsDisciplinas.includes(disciplina.id))
    .map((disciplina) => {
      const aulas = bancoAulas.filter((aula) => aula.disciplina_id === disciplina.id);

      if (aulas.length === 0) {
        return { disciplina, percentual: null };
      }

      const idsAulas = aulas.map((aula) => aula.id);
      const presencas = bancoPresencas.filter(
        (presenca) => presenca.aluno_id === alunoId && idsAulas.includes(presenca.aula_id) && presenca.presente
      );

      return { disciplina, percentual: (presencas.length / aulas.length) * 100 };
    });
}

function calcularFrequenciaGeral(alunoId: number): number | null {
  const frequencias = calcularFrequencia(alunoId);
  const percentuais = frequencias
    .map((materia) => materia.percentual)
    .filter((percentual): percentual is number => percentual !== null);

  if (percentuais.length === 0) {
    return null;
  }

  return percentuais.reduce((soma, percentual) => soma + percentual, 0) / percentuais.length;
}

export async function frequenciaDoAluno(alunoId: number): Promise<FrequenciaDaMateria[]> {
  await esperar(300);

  const alunoExiste = bancoAlunos.some((aluno) => aluno.id === alunoId);
  if (!alunoExiste) {
    throw new Error("Aluno não encontrado");
  }

  return calcularFrequencia(alunoId);
}

export async function frequenciaGeralDoAluno(alunoId: number): Promise<number | null> {
  await esperar(300);
  return calcularFrequenciaGeral(alunoId);
}

// =========================== SITUAÇÃO GERAL DO ALUNO ===========================

export interface Situacao {
  mediaGeral: number | null;
  frequenciaGeral: number | null;
  aprovado: boolean | null;
}

export async function situacaoDoAluno(alunoId: number): Promise<Situacao> {
  await esperar(300);

  const mediaGeral = calcularMediaGeral(alunoId);
  const frequenciaGeral = calcularFrequenciaGeral(alunoId);

  let aprovado: boolean | null = null;
  if (mediaGeral !== null && frequenciaGeral !== null) {
    aprovado = mediaGeral >= 6 && frequenciaGeral >= 75;
  }

  return { mediaGeral, frequenciaGeral, aprovado };
}

// =========================== AVISOS ===========================

export async function listarAvisos(): Promise<Aviso[]> {
  await esperar(300);
  return [...bancoAvisos].reverse();
}

export async function criarAviso(dados: AvisoEntrada): Promise<Aviso> {
  await esperar(300);

  const novoId = Math.max(0, ...bancoAvisos.map((aviso) => aviso.id)) + 1;
  const novoAviso: Aviso = { id: novoId, ...dados };
  bancoAvisos = [...bancoAvisos, novoAviso];

  return novoAviso;
}

export async function excluirAviso(id: number): Promise<void> {
  await esperar(300);

  const existe = bancoAvisos.some((aviso) => aviso.id === id);
  if (!existe) {
    throw new Error("Aviso não encontrado");
  }

  bancoAvisos = bancoAvisos.filter((aviso) => aviso.id !== id);
}
