export interface Sessao {
  token: string;
  perfil: "professor" | "aluno";
  aluno_id: number | null;
  email: string;
}

const CHAVE = "portal-escolar-sessao";
let emMemoria: Sessao | null = null;

// localStorage pode estar bloqueado ou com lixo: nesses casos a pessoa so precisa logar de novo
export function lerSessao(): Sessao | null {
  if (emMemoria) {
    return emMemoria;
  }
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) {
      return null;
    }
    const dados = JSON.parse(texto);
    if (
      typeof dados?.token !== "string" || dados.token === "" ||
      (dados.perfil !== "professor" && dados.perfil !== "aluno") ||
      typeof dados.email !== "string" ||
      (typeof dados.aluno_id !== "number" && dados.aluno_id !== null)
    ) {
      return null;
    }
    emMemoria = dados;
    return emMemoria;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: Sessao): void {
  emMemoria = sessao;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    // sem storage: a sessao vive so enquanto a aba estiver aberta
  }
}

export function limparSessao(): void {
  emMemoria = null;
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a limpar
  }
}
