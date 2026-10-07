// Estado publicado pelo Portal; as coleções da F5b começam vazias.
let dados: any = { perfil: null, usuario: null, semestre: null, disciplinas: [], professores: [], aulas: [], turmas: [], salas: [], eventos: [], pedidos: [] };
const ouvintes = new Set<() => void>();
let recarga: () => Promise<void>;
export const lerLoja = () => dados;
export function publicar(novos: any) { dados = novos; ouvintes.forEach(fn => fn()); }
export function assinar(fn: () => void) { ouvintes.add(fn); return () => { ouvintes.delete(fn); }; }
export function configurarRecarga(fn: () => Promise<void>) { recarga = fn; }
export async function recarregarLoja() { await recarga(); }
