import { createRoot } from 'react-dom/client';
import Portal from './Portal';
import './ds/styles.css';
import './portal.css';
import './pseudo.css';

// As opções de diagnóstico ficam disponíveis na entrada de desenvolvimento do comparador.
const query = new URLSearchParams(import.meta.env.DEV ? location.search : '');
const opcao = (nome: string, padrao: string, options: string[]) => {
  const valor = query.get(nome);
  return valor !== null && options.includes(valor) ? valor : padrao;
};

createRoot(document.getElementById('dc-root')!).render(
  <Portal
    inicio={opcao('inicio', 'Apresentação', ['Apresentação', 'Login', 'Primeiro acesso', 'Escola', 'Professor', 'Professor · sem permissão', 'Aluno'])}
    dispositivo={opcao('dispositivo', 'Desktop', ['Desktop', 'Celular'])}
    estado="Normal"
    vista="Protótipo"
    fonte="Apple · SF + New York"
    movimento={opcao('movimento', 'Seguir o sistema', ['Seguir o sistema', 'Completo', 'Reduzido'])}
  />,
);
