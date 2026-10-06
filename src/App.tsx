import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import CommandPalette from "./components/CommandPalette";
import PainelAlunos from "./components/PainelAlunos";
import Sidebar from "./components/Sidebar";
import TelaAvisos from "./components/TelaAvisos";
import TelaBoletim from "./components/TelaBoletim";
import TelaDashboard from "./components/TelaDashboard";
import TelaDisciplinas from "./components/TelaDisciplinas";
import TelaFrequencia from "./components/TelaFrequencia";
import TelaLogin from "./components/TelaLogin";
import TelaMatriculas from "./components/TelaMatriculas";
import TelaModoAluno from "./components/TelaModoAluno";
import Topbar from "./components/Topbar";

// Moldura das telas logadas: menu lateral + topo + conteudo
function LayoutPortal() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sessao, sair } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);
  const ehProfessor = sessao?.perfil === "professor";

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto) {
      return;
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.querySelector<HTMLButtonElement>(".botao-menu")?.focus();
    };
  }, [menuAberto]);

  useEffect(() => {
    if (!ehProfessor) {
      return;
    }
    function aoTeclar(evento: KeyboardEvent) {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        setBuscaAberta(true);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [ehProfessor]);

  return (
    <div className="portal">
      <Sidebar
        aberta={menuAberto}
        aoFechar={() => setMenuAberto(false)}
        aoSair={() => {
          sair();
          navigate("/login");
        }}
      />
      <div className="portal-corpo">
        <Topbar mostrarBusca={ehProfessor} aoAbrirMenu={() => setMenuAberto(true)} aoAbrirBusca={() => setBuscaAberta(true)} />
        <main className="portal-conteudo">
          <Outlet />
        </main>
      </div>
      {buscaAberta && <CommandPalette aoFechar={() => setBuscaAberta(false)} />}
    </div>
  );
}

function App() {
  const { pathname } = useLocation();

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
          <Route index element={<TelaDashboard />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          <Route path="alunos" element={<PainelAlunos />} />
          <Route path="disciplinas" element={<TelaDisciplinas />} />
          <Route path="matriculas" element={<TelaMatriculas />} />
          <Route path="boletim" element={<TelaBoletim />} />
          <Route path="frequencia" element={<TelaFrequencia />} />
          <Route path="avisos" element={<TelaAvisos />} />
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
