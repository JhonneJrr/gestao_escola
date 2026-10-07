// Estado da API publicado pelo Portal e atualizado após as gravações.
// alunos: lista do estado, já recortada pelo servidor; turmaAluno: turma do próprio aluno (vazio nos outros perfis).
export type AlunoLoja = { id: number; nome: string; turma: string | null };
let dados: any = { perfil: null, usuario: null, semestre: null, disciplinas: [], professores: [], aulas: [], turmas: [], salas: [], eventos: [], pedidos: [], alunos: [] as AlunoLoja[], turmaAluno: '' };
const ouvintes = new Set<() => void>();
let recarga: () => Promise<void>;
export const lerLoja = () => dados;
export function publicar(novos: any) { dados = novos; ouvintes.forEach(fn => fn()); }
export function assinar(fn: () => void) { ouvintes.add(fn); return () => { ouvintes.delete(fn); }; }
export function configurarRecarga(fn: () => Promise<void>) { recarga = fn; }
export async function recarregarLoja() { await recarga(); }
