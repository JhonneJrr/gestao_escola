import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AbasMoveis from "./components/AbasMoveis";
import CommandPalette from "./components/CommandPalette";
import PainelAlunos from "./components/PainelAlunos";
import TelaAvisos from "./components/TelaAvisos";
import TelaBoletim from "./components/TelaBoletim";
import TelaDashboard from "./components/TelaDashboard";
import TelaDisciplinas from "./components/TelaDisciplinas";
import TelaFrequencia from "./components/TelaFrequencia";
import TelaLogin from "./components/TelaLogin";
import TelaMatriculas from "./components/TelaMatriculas";
import TelaModoAluno from "./components/TelaModoAluno";
import TopNav from "./components/TopNav";

function useBarraDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 900px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    function aoMudar() { setDesktop(media.matches); }
    aoMudar();
    media.addEventListener("change", aoMudar);
    return () => media.removeEventListener("change", aoMudar);
  }, []);

  return desktop;
}

// Moldura das telas logadas: navegação + conteúdo
function LayoutPortal() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sessao, sair } = useAuth();
  const desktop = useBarraDesktop();
  const [buscaAberta, setBuscaAberta] = useState(false);
  const ehProfessor = sessao?.perfil === "professor";

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

  const Navegacao = desktop ? TopNav : AbasMoveis;

  return (
    <div className="portal">
      <Navegacao
        aoAbrirBusca={() => setBuscaAberta(true)}
        aoSair={() => {
          sair();
          navigate("/login");
        }}
      />
      <main className={!desktop && ehProfessor ? "portal-conteudo portal-conteudo-com-abas" : "portal-conteudo"}>
        <div key={pathname} className="portal-entrada">
          <Outlet />
        </div>
      </main>
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
