interface CampoBuscaProps {
  valor: string;
  rotulo: string;
  placeholder: string;
  aoMudar: (valor: string) => void;
}

function CampoBusca({ valor, rotulo, placeholder, aoMudar }: CampoBuscaProps) {
  return (
    <div className="campo-busca campo-busca-isolado">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 21-4.34-4.34"></path>
        <circle cx="11" cy="11" r="8"></circle>
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        aria-label={rotulo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
    </div>
  );
}

export default CampoBusca;
