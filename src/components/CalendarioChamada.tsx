import { useEffect, useState } from "react";
import type { Aula } from "../types";
import { aulasDaDisciplina } from "../api";
import PainelChamadaDoDia from "./PainelChamadaDoDia";

interface CalendarioChamadaProps {
  disciplinaId: number;
  aoAtualizarFrequencia: () => void;
}

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function paraTextoISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function CalendarioChamada({ disciplinaId, aoAtualizarFrequencia }: CalendarioChamadaProps) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  async function carregarAulas() {
    const dados = await aulasDaDisciplina(disciplinaId);
    setAulas(dados);
  }

  useEffect(() => {
    async function carregarEPosicionar() {
      const dados = await aulasDaDisciplina(disciplinaId);
      setAulas(dados);
      setDiaSelecionado(null);

      // Abre o calendário no mês da última aula registrada da disciplina.
      // Se ainda não houver aula nenhuma, fica no mês atual.
      if (dados.length > 0) {
        const datasOrdenadas = dados.map((aula) => aula.data).sort();
        const ultimaData = datasOrdenadas[datasOrdenadas.length - 1];
        const [anoUltima, mesUltima] = ultimaData.split("-").map(Number);
        setAno(anoUltima);
        setMes(mesUltima - 1);
      }
    }

    carregarEPosicionar();
  }, [disciplinaId]);

  function aoMudarMes(delta: number) {
    const novaData = new Date(ano, mes + delta, 1);
    setAno(novaData.getFullYear());
    setMes(novaData.getMonth());
    setDiaSelecionado(null);
  }

  function aoSalvarDia() {
    carregarAulas();
    aoAtualizarFrequencia();
  }

  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();

  const datasComAula = new Set(
    aulas
      .filter((aula) => {
        const [anoAula, mesAula] = aula.data.split("-").map(Number);
        return anoAula === ano && mesAula === mes + 1;
      })
      .map((aula) => aula.data)
  );

  const celulas: (number | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) {
    celulas.push(null);
  }
  for (let dia = 1; dia <= diasNoMes; dia++) {
    celulas.push(dia);
  }

  return (
    <div className="calendario-chamada">
      <div className="calendario-topo">
        <button type="button" className="calendario-nav" onClick={() => aoMudarMes(-1)} aria-label="Mês anterior">
          ‹
        </button>
        <strong>
          {NOMES_MES[mes]} de {ano}
        </strong>
        <button type="button" className="calendario-nav" onClick={() => aoMudarMes(1)} aria-label="Próximo mês">
          ›
        </button>
      </div>

      <div className="calendario-grade">
        {DIAS_SEMANA.map((diaSemana, indice) => (
          <span key={indice} className="calendario-cabecalho-dia">
            {diaSemana}
          </span>
        ))}

        {celulas.map((dia, indice) => {
          if (dia === null) {
            return <span key={indice} className="calendario-dia calendario-dia-vazio"></span>;
          }

          const dataISO = paraTextoISO(ano, mes, dia);
          const temAula = datasComAula.has(dataISO);
          const selecionado = diaSelecionado === dataISO;
          const classes = ["calendario-dia"];
          if (temAula) classes.push("calendario-dia-com-aula");
          if (selecionado) classes.push("calendario-dia-selecionado");

          return (
            <button
              key={indice}
              type="button"
              className={classes.join(" ")}
              onClick={() => setDiaSelecionado(dataISO)}
            >
              {dia}
            </button>
          );
        })}
      </div>

      {diaSelecionado && (
        <PainelChamadaDoDia
          disciplinaId={disciplinaId}
          data={diaSelecionado}
          aoFechar={() => setDiaSelecionado(null)}
          aoSalvar={aoSalvarDia}
        />
      )}
    </div>
  );
}

export default CalendarioChamada;
