import { useEffect, useState } from "react";

// Devolve o valor so depois que ele parar de mudar por `ms` (evita uma chamada a cada tecla)
export function useAtraso<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor);

  useEffect(() => {
    const tempo = window.setTimeout(() => setAtrasado(valor), ms);
    return () => window.clearTimeout(tempo);
  }, [valor, ms]);

  return atrasado;
}
