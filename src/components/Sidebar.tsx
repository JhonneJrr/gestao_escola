import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { contadoresDoMenu, type ContadoresDoMenu } from "../api";
import { useAuth } from "../auth/AuthContext";
import Avatar from "../ui/Avatar";

interface SidebarProps {
  aberta: boolean;
  aoFechar: () => void;
  aoSair: () => void;
}

interface ItemMenu {
  rotulo: string;
  caminho: string;
  icone: ReactNode;
  contador?: keyof ContadoresDoMenu;
}

interface GrupoMenu {
  titulo: string;
  itens: ItemMenu[];
}

function Sidebar({ aberta, aoFechar, aoSair }: SidebarProps) {
  const { sessao } = useAuth();
  const { pathname } = useLocation();
  const [contadores, setContadores] = useState<ContadoresDoMenu | null>(null);
  const ehProfessor = sessao?.perfil === "professor";

  // contadores atualizam a cada troca de rota (criar/excluir numa tela reflete ao navegar)
  useEffect(() => {
    if (!ehProfessor) {
      return;
    }
    let cancelado = false;
    contadoresDoMenu()
      .then((dados) => {
        if (!cancelado) {
          setContadores(dados);
        }
      })
      .catch(() => {
        // sem contador: o menu continua usavel
      });
    return () => {
      cancelado = true;
    };
  }, [ehProfessor, pathname]);

  const grupos: GrupoMenu[] = ehProfessor
    ? [
        { titulo: "Visão geral", itens: [{ rotulo: "Painel", caminho: "/", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1"></rect>
          <rect width="7" height="5" x="14" y="3" rx="1"></rect>
          <rect width="7" height="9" x="14" y="12" rx="1"></rect>
          <rect width="7" height="5" x="3" y="16" rx="1"></rect>
        </svg>) }] },
        {
          titulo: "Cadastros",
          itens: [
            { rotulo: "Alunos", caminho: "/alunos", contador: "alunos", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <circle cx="9" cy="7" r="4"></circle>
            </svg>) },
            { rotulo: "Disciplinas", caminho: "/disciplinas", contador: "disciplinas", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v16"></path>
              <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"></path>
            </svg>) },
            { rotulo: "Matrículas", caminho: "/matriculas", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
              <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
              <line x1="8" x2="16" y1="12" y2="12"></line>
            </svg>) },
          ],
        },
        {
          titulo: "Acompanhamento",
          itens: [
            { rotulo: "Boletim", caminho: "/boletim", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <path d="M12 11h4"></path>
              <path d="M12 16h4"></path>
              <path d="M8 11h.01"></path>
              <path d="M8 16h.01"></path>
            </svg>) },
            { rotulo: "Frequência", caminho: "/frequencia", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2v3"></path>
              <path d="M16 2v3"></path>
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M3 9h18"></path>
              <path d="m9 15 2 2 4-4"></path>
            </svg>) },
            { rotulo: "Avisos", caminho: "/avisos", contador: "avisos", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
              <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path>
              <path d="M8 6v8"></path>
            </svg>) },
          ],
        },
      ]
    : [{ titulo: "Minha área", itens: [{ rotulo: "Meu painel", caminho: "/meu-painel", icone: (<svg className="sidebar-icone" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>) }] }];

  const email = sessao?.email ?? "";
  const nomeDoEmail = email.split("@")[0].replace(/[._-]+/g, " ");

  return (
    <>
      {aberta && <div className="sidebar-fundo" onClick={aoFechar}></div>}
      <aside className={aberta ? "sidebar sidebar-aberta" : "sidebar"}>
        <div className="sidebar-marca">
          <span className="sidebar-logo">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
              <path d="M22 10v6"></path>
              <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
            </svg>
          </span>
          <div className="sidebar-marca-texto">
            <strong>Portal Escolar</strong>
            <span>Gestão acadêmica</span>
          </div>
        </div>
        <nav aria-label="Menu principal">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="sidebar-grupo">
              <p className="sidebar-grupo-titulo">{grupo.titulo}</p>
              {grupo.itens.map((item) => (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  end={item.caminho === "/"}
                  className={({ isActive }) => (isActive ? "sidebar-item sidebar-item-ativo" : "sidebar-item")}
                >
                  {item.icone}
                  <span className="sidebar-rotulo">{item.rotulo}</span>
                  {item.contador && contadores && (
                    <span className="sidebar-contador">{contadores[item.contador]}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-rodape">
          <Avatar nome={nomeDoEmail} />
          <span className="sidebar-email">{email}</span>
          <button className="botao-sair" type="button" onClick={aoSair}>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
