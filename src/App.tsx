import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { Tela } from "./types";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Cabecalho from "./components/Cabecalho";
import PainelAlunos from "./components/PainelAlunos";
import TelaAvisos from "./components/TelaAvisos";
import TelaBoletim from "./components/TelaBoletim";
import TelaDashboard from "./components/TelaDashboard";
import TelaDisciplinas from "./components/TelaDisciplinas";
import TelaFrequencia from "./components/TelaFrequencia";
import TelaHome from "./components/TelaHome";
import TelaLogin from "./components/TelaLogin";
import TelaMatriculas from "./components/TelaMatriculas";
import TelaModoAluno from "./components/TelaModoAluno";

interface OrigemTransicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface ContextoLayout {
  abrirComTransicao: (novaTela: Tela, evento: React.MouseEvent<HTMLButtonElement>) => void;
}

function caminhoDe(tela: Tela): string {
  if (tela === "home") {
    return "/";
  }
  if (tela === "modoAluno") {
    return "/meu-painel";
  }
  return `/${tela}`;
}

// Moldura das telas logadas: cabecalho + animacao de transicao
function LayoutPortal() {
  const navigate = useNavigate();
  const { sessao, sair } = useAuth();
  const [transicao, setTransicao] = useState<OrigemTransicao | null>(null);

  function abrirComTransicao(novaTela: Tela, evento: React.MouseEvent<HTMLButtonElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    setTransicao({
      x: retangulo.left,
      y: retangulo.top,
      largura: retangulo.width,
      altura: retangulo.height,
    });
    window.setTimeout(() => navigate(caminhoDe(novaTela)), 360);
    window.setTimeout(() => setTransicao(null), 800);
  }

  const inicio = sessao?.perfil === "aluno" ? "/meu-painel" : "/";

  return (
    <div className="pagina">
      {transicao && (
        <div
          className="transicao-card"
          style={
            {
              "--origem-x": `${transicao.x}px`,
              "--origem-y": `${transicao.y}px`,
              "--origem-w": `${transicao.largura}px`,
              "--origem-h": `${transicao.altura}px`,
            } as React.CSSProperties
          }
        ></div>
      )}

      <Cabecalho
        email={sessao?.email ?? ""}
        aoIrParaHome={() => navigate(inicio)}
        aoSair={() => {
          sair();
          navigate("/login");
        }}
      />
      <Outlet context={{ abrirComTransicao } satisfies ContextoLayout} />
    </div>
  );
}

function HomeRota() {
  const { abrirComTransicao } = useOutletContext<ContextoLayout>();
  return <TelaHome aoAbrirTela={abrirComTransicao} />;
}

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const irParaHome = () => navigate("/");

  useEffect(() => {
    if (pathname !== "/alunos") {
      document.title = "Portal de Gestão Escolar";
    }
  }, [pathname]);

  return (
    <Routes>
      <Route path="/login" element={<TelaLogin />} />

      <Route element={<ProtectedRoute perfil="professor" />}>
        <Route element={<LayoutPortal />}>
          <Route index element={<HomeRota />} />
          <Route path="alunos" element={<PainelAlunos aoVoltar={irParaHome} />} />
          <Route path="disciplinas" element={<TelaDisciplinas aoVoltar={irParaHome} />} />
          <Route path="matriculas" element={<TelaMatriculas aoVoltar={irParaHome} />} />
          <Route path="dashboard" element={<TelaDashboard aoVoltar={irParaHome} />} />
          <Route path="boletim" element={<TelaBoletim aoVoltar={irParaHome} />} />
          <Route path="frequencia" element={<TelaFrequencia aoVoltar={irParaHome} />} />
          <Route path="avisos" element={<TelaAvisos aoVoltar={irParaHome} />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute perfil="aluno" />}>
        <Route element={<LayoutPortal />}>
          <Route path="meu-painel" element={<TelaModoAluno />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
