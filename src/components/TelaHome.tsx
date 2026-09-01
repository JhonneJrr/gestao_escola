import type { Tela } from "../types";
import CardFuncao from "./CardFuncao";

interface TelaHomeProps {
  aoAbrirTela: (tela: Tela, evento: React.MouseEvent<HTMLButtonElement>) => void;
}

function TelaHome({ aoAbrirTela }: TelaHomeProps) {
  return (
    <div className="tela-home">
      <div className="grade-funcoes">
        <CardFuncao
          titulo="Gestão de Alunos"
          descricao="Listar, filtrar, cadastrar e excluir alunos."
          aoAbrir={(evento) => aoAbrirTela("alunos", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Disciplinas"
          descricao="Ver as disciplinas oferecidas pelo portal."
          aoAbrir={(evento) => aoAbrirTela("disciplinas", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v16"></path>
            <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"></path>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Matrículas"
          descricao="Ver e vincular alunos às disciplinas."
          aoAbrir={(evento) => aoAbrirTela("matriculas", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
            <line x1="8" x2="16" y1="12" y2="12"></line>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Painel"
          descricao="Visão de risco: médias baixas, faltas e avaliações sem nota."
          aoAbrir={(evento) => aoAbrirTela("dashboard", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="9" x="3" y="3" rx="1"></rect>
            <rect width="7" height="5" x="14" y="3" rx="1"></rect>
            <rect width="7" height="9" x="14" y="12" rx="1"></rect>
            <rect width="7" height="5" x="3" y="16" rx="1"></rect>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Boletim"
          descricao="Lançar e consultar as notas de cada aluno."
          aoAbrir={(evento) => aoAbrirTela("boletim", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <path d="M12 11h4"></path>
            <path d="M12 16h4"></path>
            <path d="M8 11h.01"></path>
            <path d="M8 16h.01"></path>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Frequência"
          descricao="Ver a frequência de cada aluno por disciplina."
          aoAbrir={(evento) => aoAbrirTela("frequencia", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v3"></path>
            <path d="M16 2v3"></path>
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <path d="M3 9h18"></path>
            <path d="m9 15 2 2 4-4"></path>
          </svg>
        </CardFuncao>

        <CardFuncao
          titulo="Mural de Avisos"
          descricao="Publicar e ver comunicados do portal."
          aoAbrir={(evento) => aoAbrirTela("avisos", evento)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"></path>
            <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"></path>
            <path d="M8 6v8"></path>
          </svg>
        </CardFuncao>
      </div>
    </div>
  );
}

export default TelaHome;
