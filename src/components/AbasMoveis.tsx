import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { contadoresDoMenu, type ContadoresDoMenu } from "../api";
import { useAuth } from "../auth/AuthContext";
import { DESTINO_ALUNO, DESTINOS_PROFESSOR, ICONE_BUSCA, ICONE_MAIS, ICONE_MARCA } from "../destinos";
import Avatar from "../ui/Avatar";

interface AbasMoveisProps {
  aoAbrirBusca: () => void;
  aoSair: () => void;
}

function AbasMoveis({ aoAbrirBusca, aoSair }: AbasMoveisProps) {
  const { sessao } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [maisAberto, setMaisAberto] = useState(false);
  const [contadores, setContadores] = useState<ContadoresDoMenu | null>(null);
  const mais = useRef<HTMLButtonElement>(null);
  const folha = useRef<HTMLDivElement>(null);
  const abas = useRef<HTMLElement>(null);
  const ehProfessor = sessao?.perfil === "professor";
  const indice = Math.max(0, DESTINOS_PROFESSOR.findIndex((destino) =>
    destino.caminho === "/" ? pathname === "/" : pathname === destino.caminho || pathname.startsWith(`${destino.caminho}/`)
  ));
  const atual = ehProfessor ? DESTINOS_PROFESSOR[indice] : DESTINO_ALUNO;
  const email = sessao?.email ?? "";
  const nomeDoEmail = email.split("@")[0].replace(/[._-]+/g, " ");

  useEffect(() => {
    setMaisAberto(false);
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
        // Sem contador, a navegação continua disponível.
      });
    return () => { cancelado = true; };
  }, [ehProfessor, pathname]);

  useEffect(() => {
    if (!ehProfessor) {
      return;
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.altKey && /^[1-7]$/.test(evento.key)) {
        if (evento.target instanceof HTMLElement && evento.target.matches("input, textarea, select")) {
          return;
        }
        evento.preventDefault();
        setMaisAberto(false);
        navigate(DESTINOS_PROFESSOR[Number(evento.key) - 1].caminho);
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ehProfessor, navigate]);

  useEffect(() => {
    if (!maisAberto) {
      return;
    }
    const elemento = folha.current!;
    const itens = Array.from(elemento.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>("a[href], button"));
    itens[0].focus();
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setMaisAberto(false);
      } else if (evento.key === "Tab") {
        const primeiro = itens[0];
        const ultimo = itens[itens.length - 1];
        if (!elemento.contains(document.activeElement)) {
          evento.preventDefault();
          (evento.shiftKey ? ultimo : primeiro).focus();
        } else if (evento.shiftKey && document.activeElement === primeiro) {
          evento.preventDefault();
          ultimo.focus();
        } else if (!evento.shiftKey && document.activeElement === ultimo) {
          evento.preventDefault();
          primeiro.focus();
        }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      mais.current?.focus();
    };
  }, [maisAberto]);

  useLayoutEffect(() => {
    if (!ehProfessor) {
      return;
    }
    const menu = abas.current!;
    function medir() {
      const ativo = menu.querySelector<HTMLElement>('[aria-current="page"]') ?? mais.current!;
      const item = ativo.getBoundingClientRect();
      const grade = menu.getBoundingClientRect();
      menu.style.setProperty("--marcador-x", `${item.left - grade.left}px`);
      menu.style.setProperty("--marcador-largura", `${item.width}px`);
      menu.style.setProperty("--marcador-escala", String(item.width));
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [ehProfessor, pathname]);

  return (
    <>
      <header className="topnav topnav-movel" inert={maisAberto}>
        <div className="topnav-linha">
          <span className="topnav-marca" aria-hidden="true">{ICONE_MARCA}</span>
          <span className="topnav-titulo">{atual.rotulo}</span>
          <span className="topnav-espaco" />
          {ehProfessor && <button className="botao-busca" type="button" aria-label="Buscar (Ctrl K)" onClick={aoAbrirBusca}>{ICONE_BUSCA}</button>}
          <Avatar nome={nomeDoEmail} />
          {!ehProfessor && <button className="botao-sair" type="button" onClick={aoSair}>Sair</button>}
        </div>
      </header>
      {ehProfessor && (
        <>
          <nav ref={abas} className="abas-moveis" aria-label="Menu principal" inert={maisAberto}>
            {DESTINOS_PROFESSOR.slice(0, 4).map((destino) => (
              <NavLink key={destino.caminho} to={destino.caminho} end={destino.caminho === "/"}>
                {destino.icone}
                <span>{destino.rotulo}</span>
                {destino.contador && contadores && <span className="nav-contador">{contadores[destino.contador]}</span>}
              </NavLink>
            ))}
            <button ref={mais} type="button" aria-expanded={maisAberto} aria-controls="folha-mais" className={indice >= 4 ? "abas-mais-ativo" : undefined} onClick={() => setMaisAberto(true)}>
              {ICONE_MAIS}<span>Mais</span>
            </button>
            <span className="nav-marcador" aria-hidden="true" />
          </nav>
          <div className="mais-overlay" data-aberta={maisAberto} inert={!maisAberto}>
            <div className="mais-fundo" aria-hidden="true" onClick={() => setMaisAberto(false)} />
            <div ref={folha} id="folha-mais" className="mais-folha" role="dialog" aria-modal={maisAberto ? true : undefined} aria-label="Mais telas">
              {DESTINOS_PROFESSOR.slice(4).map((destino) => (
                <NavLink key={destino.caminho} to={destino.caminho} onClick={() => setMaisAberto(false)}>
                  {destino.icone}<span>{destino.rotulo}</span>
                  {destino.contador && contadores && <span className="nav-contador">{contadores[destino.contador]}</span>}
                </NavLink>
              ))}
              <button type="button" className="botao-sair" onClick={() => { setMaisAberto(false); aoSair(); }}>Sair</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AbasMoveis;
