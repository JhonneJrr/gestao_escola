import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  perfil: "professor" | "aluno";
}

function ProtectedRoute({ perfil }: ProtectedRouteProps) {
  const { sessao } = useAuth();

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }
  if (sessao.perfil !== perfil) {
    return <Navigate to={sessao.perfil === "aluno" ? "/meu-painel" : "/"} replace />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
