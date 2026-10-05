export interface Sessao {
  token: string;
  perfil: "professor" | "aluno";
  aluno_id: number | null;
  email: string;
}

const CHAVE = "portal-escolar-sessao";

// localStorage pode estar bloqueado ou com lixo: nesses casos a pessoa so precisa logar de novo
export function lerSessao(): Sessao | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) {
      return null;
    }
    const dados = JSON.parse(texto);
    if (typeof dados?.token !== "string" || (dados.perfil !== "professor" && dados.perfil !== "aluno")) {
      return null;
    }
    return dados as Sessao;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: Sessao): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    // sem storage: a sessao vive so enquanto a aba estiver aberta
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a limpar
  }
}
