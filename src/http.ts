import axios from "axios";
import { lerSessao, limparSessao } from "./auth/sessao";

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });

http.interceptors.request.use((config) => {
  const sessao = lerSessao();
  if (sessao) {
    config.headers.Authorization = `Bearer ${sessao.token}`;
  }
  return config;
});

export function textoDoErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    if (!erro.response) {
      return "Não foi possível falar com o servidor. Tente de novo em instantes.";
    }
    const detalhe = erro.response.data?.detail;
    if (typeof detalhe === "string") {
      return detalhe;
    }
    if (Array.isArray(detalhe)) {
      return detalhe.map((item) => item.msg).join("; ");
    }
  }
  return "Erro inesperado. Tente de novo.";
}

// Os componentes ja tratam erro como `(erro as Error).message`: aqui todo erro vira Error com texto legivel
http.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url === "/auth/login";
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      limparSessao();
      window.location.assign("/login");
    }
    return Promise.reject(new Error(textoDoErro(erro)));
  }
);
