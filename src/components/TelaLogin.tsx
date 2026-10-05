import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acordarApi } from "../api";
import { useAuth } from "../auth/AuthContext";

function TelaLogin() {
  const { sessao, entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // acorda a API enquanto a pessoa digita (plano gratuito da nuvem dorme)
  useEffect(() => {
    acordarApi();
  }, []);

  // quem ja tem sessao nao precisa ver o login
  useEffect(() => {
    if (sessao) {
      navigate(sessao.perfil === "aluno" ? "/meu-painel" : "/", { replace: true });
    }
  }, [sessao, navigate]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const nova = await entrar(email, senha);
      navigate(nova.perfil === "aluno" ? "/meu-painel" : "/", { replace: true });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="tela-login">
      <div className="tela-login-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
          <path d="M22 10v6"></path>
          <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
        </svg>
      </div>
      <h1>Portal de Gestão Escolar</h1>
      <p className="tela-login-apoio">Entre com o e-mail e a senha da escola.</p>
      <form className="tela-login-formulario" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            required
          />
        </div>
        <div className="tela-login-erro">
          {erro !== "" && <p role="alert" className="campo-erro">{erro}</p>}
        </div>
        <button className="botao-primario" type="submit" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <div className="tela-login-demonstracao">
        <h2>Acessos de demonstração</h2>
        <p>Professor: prof@escola.com</p>
        <p>Aluno: ana@escola.com</p>
        <p>Senha: escola123</p>
      </div>
    </main>
  );
}

export default TelaLogin;
