import { createContext, useContext, useState, type ReactNode } from "react";
import { http } from "../http";
import { lerSessao, limparSessao, salvarSessao, type Sessao } from "./sessao";

interface AuthValor {
  sessao: Sessao | null;
  entrar: (email: string, senha: string) => Promise<Sessao>;
  sair: () => void;
}

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao());

  async function entrar(email: string, senha: string): Promise<Sessao> {
    const { data } = await http.post("/auth/login", { email: email.trim(), senha });
    const nova: Sessao = {
      token: data.access_token,
      perfil: data.perfil,
      aluno_id: data.aluno_id,
      email: email.trim().toLowerCase(),
    };
    salvarSessao(nova);
    setSessao(nova);
    return nova;
  }

  function sair() {
    limparSessao();
    setSessao(null);
  }

  return <AuthContext.Provider value={{ sessao, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValor {
  const valor = useContext(AuthContext);
  if (valor === null) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return valor;
}
