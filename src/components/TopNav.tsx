import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { contadoresDoMenu, type ContadoresDoMenu } from "../api";
import { useAuth } from "../auth/AuthContext";
import { DESTINO_ALUNO, DESTINOS_PROFESSOR, ICONE_BUSCA, ICONE_MARCA } from "../destinos";
import Avatar from "../ui/Avatar";

interface TopNavProps {
  aoAbrirBusca: () => void;
  aoSair: () => void;
}

function TopNav({ aoAbrirBusca, aoSair }: TopNavProps) {
  const { sessao } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const barra = useRef<HTMLElement>(null);
  const nome = useRef<HTMLButtonElement>(null);
  const abas = useRef<HTMLElement>(null);
  const [aberta, setAberta] = useState(false);
  const [fixada, setFixada] = useState(false);
  const [contadores, setContadores] = useState<ContadoresDoMenu | null>(null);
  const [passo, setPasso] = useState({ direcao: 0, numero: 0 });
  const ehProfessor = sessao?.perfil === "professor";
  const indice = Math.max(0, DESTINOS_PROFESSOR.findIndex((destino) =>
    destino.caminho === "/" ? pathname === "/" : pathname === destino.caminho || pathname.startsWith(`${destino.caminho}/`)
  ));
  const atual = ehProfessor ? DESTINOS_PROFESSOR[indice] : DESTINO_ALUNO;
  const email = sessao?.email ?? "";
  const nomeDoEmail = email.split("@")[0].replace(/[._-]+/g, " ");

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
        // Sem contador, a navegação continua disponível.
      });
    return () => { cancelado = true; };
  }, [ehProfessor, pathname]);

  useEffect(() => {
    if (!ehProfessor) {
      return;
    }
    const elemento = barra.current!;
    const botao = nome.current!;
    let aberto = false;
    let fixado = false;
    let teclado = false;
    let suprimir = false;
    let permanencia: ReturnType<typeof setTimeout> | undefined;
    let saida: ReturnType<typeof setTimeout> | undefined;
    setAberta(false);
    setFixada(false);

    function expandir(fixar = false) {
      clearTimeout(permanencia);
      clearTimeout(saida);
      aberto = true;
      fixado = fixar || fixado;
      setAberta(true);
      setFixada(fixado);
    }
    function compactar(devolver = false) {
      clearTimeout(permanencia);
      clearTimeout(saida);
      aberto = false;
      fixado = false;
      setAberta(false);
      setFixada(false);
      if (devolver) {
        suprimir = true;
        botao.focus();
        suprimir = false;
      }
    }
    function focoDentro() {
      return teclado && elemento.contains(document.activeElement);
    }
    function aoEntrar(evento: MouseEvent) {
      clearTimeout(saida);
      if (aberto || evento.buttons !== 0) {
        return;
      }
      clearTimeout(permanencia);
      permanencia = setTimeout(() => expandir(), 350);
    }
    function aoSairDaBarra() {
      clearTimeout(permanencia);
      clearTimeout(saida);
      if (aberto) {
        saida = setTimeout(() => {
          if (!fixado && !focoDentro()) {
            compactar();
          }
        }, 500);
      }
    }
    function aoFocar(evento: FocusEvent) {
      if (teclado && !suprimir && evento.relatedTarget !== null) {
        expandir();
      }
    }
    function aoDesfocar(evento: FocusEvent) {
      if (!fixado && !elemento.contains(evento.relatedTarget as Node | null)) {
        compactar();
      }
    }
    function aoRolar() {
      clearTimeout(permanencia);
      if (!focoDentro()) {
        compactar();
      }
    }
    function aoApontar(evento: PointerEvent) {
      teclado = false;
      if (!elemento.contains(evento.target as Node)) {
        compactar();
      } else if (evento.buttons !== 0) {
        clearTimeout(permanencia);
      }
    }
    function registrarTeclado() { teclado = true; }
    function aoTeclar(evento: KeyboardEvent) {
      if ((evento.target as Element | null)?.closest?.(".paleta") || document.querySelector(".paleta") !== null) {
        return;
      }
      if (evento.altKey && /^[1-7]$/.test(evento.key)) {
        if (evento.target instanceof HTMLElement && evento.target.matches("input, textarea, select")) {
          return;
        }
        evento.preventDefault();
        compactar(abas.current?.contains(document.activeElement));
        navigate(DESTINOS_PROFESSOR[Number(evento.key) - 1].caminho);
      } else if (evento.altKey && evento.key.toLowerCase() === "m") {
        evento.preventDefault();
        if (aberto) {
          compactar(true);
        } else {
          flushSync(() => expandir(true));
          abas.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')?.focus();
        }
      } else if (evento.key === "Escape" && aberto) {
        evento.preventDefault();
        compactar(true);
      }
    }
    function aoClicarNome() {
      if (aberto) {
        compactar(true);
      } else {
        expandir(true);
      }
    }
    function aoEscolher(evento: MouseEvent) {
      if (evento.target instanceof Element && evento.target.closest("a")) {
        compactar(true);
      }
    }

    elemento.addEventListener("mouseenter", aoEntrar);
    elemento.addEventListener("mouseleave", aoSairDaBarra);
    elemento.addEventListener("focusin", aoFocar);
    elemento.addEventListener("focusout", aoDesfocar);
    botao.addEventListener("click", aoClicarNome);
    abas.current!.addEventListener("click", aoEscolher);
    window.addEventListener("wheel", aoRolar, { passive: true });
    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("pointerdown", aoApontar, true);
    document.addEventListener("keydown", registrarTeclado, true);
    document.addEventListener("keydown", aoTeclar);
    const menu = abas.current!;
    return () => {
      clearTimeout(permanencia);
      clearTimeout(saida);
      elemento.removeEventListener("mouseenter", aoEntrar);
      elemento.removeEventListener("mouseleave", aoSairDaBarra);
      elemento.removeEventListener("focusin", aoFocar);
      elemento.removeEventListener("focusout", aoDesfocar);
      botao.removeEventListener("click", aoClicarNome);
      menu.removeEventListener("click", aoEscolher);
      window.removeEventListener("wheel", aoRolar);
      window.removeEventListener("scroll", aoRolar);
      document.removeEventListener("pointerdown", aoApontar, true);
      document.removeEventListener("keydown", registrarTeclado, true);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [ehProfessor, navigate, pathname]);

  useLayoutEffect(() => {
    if (!ehProfessor) {
      return;
    }
    const menu = abas.current!;
    function medir() {
      const ativo = menu.querySelector<HTMLAnchorElement>('[aria-current="page"]');
      if (ativo) {
        const item = ativo.getBoundingClientRect();
        const grade = menu.getBoundingClientRect();
        menu.style.setProperty("--marcador-x", `${item.left - grade.left}px`);
        menu.style.setProperty("--marcador-largura", `${item.width}px`);
        menu.style.setProperty("--marcador-escala", String(item.width));
      }
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [ehProfessor, pathname, aberta]);

  function vizinha(direcao: number) {
    setPasso((anterior) => ({ direcao, numero: anterior.numero + 1 }));
    navigate(DESTINOS_PROFESSOR[(indice + direcao + DESTINOS_PROFESSOR.length) % DESTINOS_PROFESSOR.length].caminho);
  }

  return (
    <header ref={barra} className="topnav" data-aberta={aberta} data-fixada={fixada}>
      <div className="topnav-linha">
        <span className="topnav-marca" aria-hidden="true">{ICONE_MARCA}</span>
        {ehProfessor ? (
          <>
            <button type="button" className="topnav-seta" aria-label="Tela anterior" onClick={() => vizinha(-1)}>
              <span key={passo.numero} className={passo.direcao === -1 ? "topnav-passo-anterior" : undefined} aria-hidden="true">‹</span>
            </button>
            <button ref={nome} type="button" className="topnav-atual" aria-expanded={aberta} aria-controls="topnav-abas">
              <span>{atual.rotulo}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
            </button>
            <button type="button" className="topnav-seta" aria-label="Próxima tela" onClick={() => vizinha(1)}>
              <span key={passo.numero} className={passo.direcao === 1 ? "topnav-passo-proximo" : undefined} aria-hidden="true">›</span>
            </button>
          </>
        ) : <span className="topnav-titulo">{atual.rotulo}</span>}
        <span className="topnav-espaco" />
        {ehProfessor && (
          <button className="botao-busca" type="button" aria-label="Buscar (Ctrl K)" onClick={aoAbrirBusca}>
            {ICONE_BUSCA}
            <span className="botao-busca-texto">Buscar...</span>
            <span className="botao-busca-atalho" aria-hidden="true"><kbd>Ctrl</kbd><kbd>K</kbd></span>
          </button>
        )}
        <span className="topnav-email">{email}</span>
        <Avatar nome={nomeDoEmail} />
        <button className="botao-sair" type="button" onClick={aoSair}>Sair</button>
      </div>
      {ehProfessor && (
        <nav ref={abas} id="topnav-abas" className="topnav-abas" aria-label="Menu principal" inert={!aberta}>
          {DESTINOS_PROFESSOR.map((destino, i) => (
            <NavLink key={destino.caminho} to={destino.caminho} end={destino.caminho === "/"} className="topnav-aba" style={{ "--i": i } as CSSProperties}>
              {destino.icone}
              <span>{destino.rotulo}</span>
              {destino.contador && contadores && <span className="nav-contador">{contadores[destino.contador]}</span>}
              <kbd aria-hidden="true">Alt+{i + 1}</kbd>
            </NavLink>
          ))}
          <span className="nav-marcador" aria-hidden="true" />
        </nav>
      )}
    </header>
  );
}

export default TopNav;
