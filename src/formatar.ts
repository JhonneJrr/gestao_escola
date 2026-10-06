// A API fala AAAA-MM-DD; a tela mostra DD/MM/AAAA
export function formatarDataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  if (!ano || !mes || !dia) {
    return iso;
  }
  return `${dia}/${mes}/${ano}`;
}

export function hojeISO(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-${dia}`;
}

// Duas letras para o avatar: primeira da primeira palavra + primeira da ultima
export function iniciais(texto: string): string {
  const palavras = texto.trim().split(/\s+/).filter((palavra) => palavra !== "");
  if (palavras.length === 0) {
    return "?";
  }
  const primeira = palavras[0][0];
  const ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}
