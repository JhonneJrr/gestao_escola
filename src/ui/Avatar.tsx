import { iniciais } from "../formatar";

interface AvatarProps {
  nome: string;
  tamanho?: "sm" | "md";
}

function Avatar({ nome, tamanho = "md" }: AvatarProps) {
  return (
    <span className={`avatar avatar-${tamanho}`} aria-hidden="true">
      {iniciais(nome)}
    </span>
  );
}

export default Avatar;
